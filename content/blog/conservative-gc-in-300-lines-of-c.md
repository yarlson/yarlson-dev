---
title: "Conservative Garbage Collection in 300 Lines of C"
summary: "Implementing a garbage collector for the Yar compiler meant scanning the stack without knowing what's a pointer. Mark-and-sweep, conservative scanning via setjmp, heap growth targeting, and the fun part: making it work when threads are running."
postLayout: simple
date: "2026-04-05"
tags:
  - yar
  - compilers
---

The [Yar compiler](https://github.com/yarlson/yar) allocates heap memory for pointers, slices, maps, closures, interfaces, and string operations. For the first few months, none of it was ever freed. Every `append`, every string concatenation, every closure capture allocated memory that lived until the process exited.

For a compiler that runs, produces an executable, and quits, this was fine. Technically. The OS reclaims everything on exit anyway. But the moment Yar started supporting longer-running programs — a TCP server that accepts connections, a test runner that executes dozens of test functions — the "just leak everything" strategy went from "technically fine" to "your test suite uses 400MB for reasons nobody can explain."

So I wrote a garbage collector. Conservative, non-moving, mark-and-sweep. About 300 lines of C embedded in the runtime. And the most interesting part wasn't the algorithm — it was the constraints.

## What "Conservative" Means and Why It Matters

A precise garbage collector knows exactly which values on the stack and in heap objects are pointers. It has a type map for every stack frame and every object layout. It can tell you: this 8-byte value at offset 24 in the stack frame is a pointer to a heap object. That 8-byte value next to it is an integer. The GC never confuses the two.

Building a precise collector requires the compiler to emit metadata — stack maps, object layouts, pointer bitmaps — that describe where pointers live at every point in the program. LLVM has support for this through its `gc.statepoint` infrastructure, but it's complex, brittle, and tightly coupled to the code generator. For a language where the runtime is a single C file compiled alongside the user's LLVM IR, precise GC would mean threading metadata from the Yar compiler through LLVM IR emission through clang linking into the C runtime. That's a six-month project disguised as a feature.

A conservative collector takes a different bet: treat everything that looks like a pointer as a pointer. Scan the stack, scan the registers, scan heap objects — and if a value happens to be a valid address within the managed heap, assume it's a pointer and keep the target alive.

The cost: you might keep objects alive that aren't actually referenced. An integer whose value happens to look like a heap address will pin that object. In practice, this is rare. Heap addresses are large numbers in specific ranges. Random integers almost never fall in that range. And even when they do, the worst case is a memory leak for one GC cycle — not a correctness bug, not a crash, not a use-after-free.

The benefit: zero compiler cooperation. The runtime can collect garbage without any metadata from the compiler, without any changes to LLVM IR emission, without any special calling conventions. The GC is entirely a runtime concern. User code doesn't know it exists.

That's the tradeoff. And for a language that's still iterating on its type system, code generator, and calling conventions daily, keeping the GC decoupled from the compiler is worth the occasional false retention.

## The Allocation Side

Every heap allocation in Yar goes through a single function: `yar_gc_alloc`. It allocates a block with a small header — the block size, a marked bit, and a pointer to the next block in the allocation list:

```c
typedef struct yar_gc_block {
    size_t size;
    int marked;
    struct yar_gc_block *next;
} yar_gc_block;
```

The block header sits immediately before the user-visible memory. When you allocate 64 bytes, the runtime actually allocates `sizeof(yar_gc_block) + 64`, sets up the header, links it into the global allocation list, and returns a pointer past the header. The user code sees a normal pointer. The GC sees the header.

After every allocation, the runtime checks whether total allocated bytes have exceeded the heap target. If they have, it triggers a collection. This is the simplest possible triggering strategy — no generational heuristics, no remembered sets, no allocation-rate smoothing. Just a threshold.

The heap target grows after each collection based on how much live data survived. If 2MB survived, the next target is 4MB (2x the live set). This prevents the pathological case where a program with a legitimately large live set triggers collection on every single allocation. The target tracks the working set. The collections happen when you're actually accumulating garbage, not when you're just using memory.

## The Scanning Trick: setjmp

Here's where conservative collection gets fun. To find all live pointers, you need to scan the stack. But in C, you can't portably enumerate stack contents. There's no API for "give me every value currently on the stack." The stack is just memory. You need its bounds and a way to read it.

The bounds are the easier part. When the runtime initializes, it records the stack top — a pointer to a local variable in `main`, which sits near the base of the stack. During collection, a local variable in the GC function marks the current stack position. Everything between those two addresses is stack.

But registers are the hard part. The CPU might be holding a pointer in a register that hasn't been spilled to the stack yet. If the GC only scans stack memory, it misses register-held pointers, and live objects get collected. That's a use-after-free. Game over.

The classic trick: `setjmp`. Calling `setjmp` saves the current register state — including all general-purpose registers — into a `jmp_buf` structure on the stack. The GC then scans the `jmp_buf` as part of its stack scan, catching any register-held pointers:

```c
void yar_gc_collect(void) {
    jmp_buf regs;
    volatile int stack_marker = 0;

    if (yar_gc_collecting) return;  // prevent re-entrance
    yar_gc_collecting = 1;

    if (setjmp(regs) == 0) {
        // Scan registers (saved in jmp_buf)
        yar_gc_mark_range(&regs, ((const char *)&regs) + sizeof(regs));
        // Scan stack
        if (yar_gc_stack_top != NULL) {
            yar_gc_mark_range((const void *)&stack_marker, yar_gc_stack_top);
        }
    }

    // Sweep unmarked blocks...
}
```

The `volatile` on `stack_marker` prevents the compiler from optimizing it away — we need its address to be a real stack location. The re-entrance guard (`yar_gc_collecting`) prevents infinite recursion if the allocation inside `setjmp` somehow triggers another collection. Belt and suspenders.

The `setjmp` trick is older than most programmers reading this. Boehm's conservative GC uses it. So does Lua's. It's not clever. It's battle-tested. And it works on every platform where `setjmp` saves registers — which is every platform that matters.

## Mark and Sweep

The mark phase walks every word-aligned value in the scanned range and checks whether it could be a pointer into the managed heap:

```c
static void yar_gc_mark_pointer(const void *candidate) {
    yar_gc_block *block = yar_gc_blocks;
    while (block != NULL) {
        void *start = (void *)(block + 1);  // user data starts after header
        void *end = (char *)start + block->size;
        if (candidate >= start && candidate < end) {
            if (!block->marked) {
                block->marked = 1;
                // Recursively scan the block's contents
                yar_gc_mark_block(block);
            }
            return;
        }
        block = block->next;
    }
}
```

For every candidate pointer that matches a managed block, the block is marked and its contents are recursively scanned. This handles nested pointers — a struct on the heap containing a pointer to another struct on the heap. The recursion follows the object graph conservatively, just like the stack scan.

The sweep phase is a linked list traversal with removal:

```c
yar_gc_block **link = &yar_gc_blocks;
while (*link != NULL) {
    yar_gc_block *block = *link;
    if (!block->marked) {
        *link = block->next;
        yar_gc_bytes -= block->size;
        free(block);
        continue;
    }
    block->marked = 0;
    link = &block->next;
}
```

Unmarked blocks are freed. Marked blocks have their mark bit cleared for the next cycle. The double-pointer traversal (`**link`) avoids special-casing the head of the list. It's a pattern that shows up in every linked-list removal implementation, and it's still satisfying every time.

## The Concurrency Wrinkle

The GC worked. Then I added structured concurrency — `taskgroup` blocks with `spawn`-ed tasks running on POSIX threads — and it stopped working.

The problem: a spawned task allocates memory on a different thread. The GC, triggered by an allocation on the main thread, scans the main thread's stack. It doesn't scan the spawned task's stack. Pointers held only by the spawned task aren't found. The GC frees them. The spawned task dereferences freed memory. Crash.

The fix has two parts. First, mutual exclusion: a mutex around the allocation list so concurrent allocations don't corrupt the linked list. Second, and more importantly: the GC suppresses collection entirely while tasks are active.

```c
static int yar_runtime_active_tasks = 0;
static pthread_mutex_t yar_task_mutex = PTHREAD_MUTEX_INITIALIZER;

void yar_gc_collect(void) {
    if (yar_runtime_tasks_active()) return;  // suppress during concurrency
    // ... normal collection
}
```

Every `spawn` increments the active task counter. Every task completion decrements it. While any task is running, the GC doesn't collect. Memory accumulates. When all tasks finish — at the end of the `taskgroup` block, where structured concurrency guarantees everything has completed — the next allocation that exceeds the heap target triggers a collection that can safely scan the stack.

Is this optimal? No. A production-quality concurrent GC would scan all thread stacks, use safepoints or handshakes to coordinate, and collect while tasks are running. That's thousands of lines of careful, platform-specific code. Suppressing collection during taskgroups is simple, correct, and works because taskgroups are scoped — they don't run forever. The memory pressure during a taskgroup is bounded by the taskgroup's lifetime.

For a language that just gained concurrency this week, "correct and simple" beats "optimal and fragile." The concurrent GC can come later, when the scheduler moves from POSIX threads to an M:N model and the runtime already needs thread coordination infrastructure. Building that infrastructure now, for a GC that's 300 lines and works fine with the suppression strategy, would be engineering for a future that hasn't earned the complexity yet.

## What a Small GC Teaches You

The entire garbage collector — allocation, mark, sweep, concurrency guards, heap growth targeting, configuration via environment variables — is about 300 lines of C. It collects garbage correctly. It doesn't fragment memory (because it uses `malloc`/`free` under the hood, delegating fragmentation management to the system allocator). It doesn't pause for longer than a full heap scan takes, which for programs with reasonable heap sizes is negligible.

It's not generational. It's not incremental. It's not concurrent. It doesn't compact. It doesn't have weak references or finalizers. It doesn't expose any knobs to user code. It's invisible.

And here's what building it taught me: the gap between "no GC" and "a simple GC" is enormous. The gap between "a simple GC" and "a sophisticated GC" is an optimization problem. The first step changes what programs you can write. The second step changes how fast they run. Both matter. But the first step matters more, and it's a lot smaller than people think.

Three hundred lines. Mark and sweep. Conservative scanning with `setjmp`. A heap target that tracks your live set. A mutex and a suppression flag for threads. That's a garbage collector. Not the world's best garbage collector. But a garbage collector that works, that's correct, and that turned "programs leak memory until they die" into "programs manage memory automatically."

Sometimes the boring solution is the right one. And sometimes 300 lines of C is all the runtime you need.
