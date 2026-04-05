---
title: "I Asked ChatGPT If Building a Language Was Hard. Now I Have a Compiler."
summary: "Four months ago I asked ChatGPT a dumb question while walking my dog. It told me building a programming language wasn't that hard. So I built one — a compiled language with explicit error handling, generics, structured concurrency, and a garbage collector. Here's what happened."
postLayout: simple
date: "2026-04-01"
tags:
  - go
  - llm
---

![Yar](./images/yar-banner.jpg)

Four months ago I was walking my dog, talking to ChatGPT on my phone like a normal, well-adjusted person. I asked it a simple question: "Is it really that hard to create your own programming language and compiler?"

ChatGPT, with the confidence of a consultant who's never touched production, said: "Nah, it's easy. Just use LLVM."

And like a fool who's never met a rabbit hole he didn't dive into, I believed it. 73 commits, ~19,000 lines of Go, and 26 design proposals later — I have a compiled language with its own type system, garbage collector, and standard library. The dog is fine. Confused, but fine.

## Let's Talk About What This Actually Is

The language is called [Yar](https://github.com/yarlson/yar). It compiles to native executables through LLVM IR and clang. The compiler is written in Go — its own lexer, parser, type checker, and code generator. No parser generators, no frameworks, no magic. Just direct Go code that reads `.yar` files and spits out LLVM IR.

Here's what Yar code looks like:

```
package main

import "strings"

fn greet(name str) !void {
    if strings.contains(name, " ") {
        return error.InvalidName
    }
    print("hello, " + name + "\n")
}

fn main() !i32 {
    greet("world")?
    return 0
}
```

That `!void` return type means the function can fail. The `?` propagates the error to the caller. There are no exceptions. No try/catch. No silently swallowing failures and hoping for the best. If a function can fail, its signature says so, and the caller deals with it — propagate with `?`, handle with `or |err| { ... }`, or return the result directly. The compiler rejects anything else.

This isn't a toy that prints "hello world" and calls it a day. Generics, interfaces, closures, enums with exhaustive pattern matching, structs with methods, pointers, slices, maps, channels, structured concurrency, cross-compilation, a test framework, a dependency manager, and a garbage collector. All of it working. All of it tested.

## The Hard Part Wasn't What I Expected

I expected the parser to be the wall. It wasn't. Parsing is mechanical — you read tokens, you build a tree, you handle edge cases. It's tedious, not hard. But here's where it gets interesting: the parts that genuinely crushed me were the ones I didn't even know existed when I started.

**Type checking is where languages live or die.** When does `i32` coerce to `i64`? How do generic type arguments propagate through nested expressions? Does a pointer receiver method satisfy an interface requirement? These aren't individual problems — they're hundreds of small design decisions that compound. Get them right and the language feels coherent, like the type system is helping you think. Get them wrong and you've built PHP. There is no middle ground.

**Error handling design is deceptively consequential.** I went through three iterations. The first had `try`/`catch`. I ripped it out — it was hollow, a ceremony that hid the flow of errors instead of making it explicit. The second had a `try` operator. Ripped that out too. The final design uses `?` for propagation and `or |err| { ... }` for local recovery. Maps return `!V` on lookup — a missing key is `error.MissingKey`, not a silent zero value. Every function that can fail declares it in the signature.

This ended up being the single decision that defines how Yar code reads. Not the syntax. Not the generics. The error model. And I say that as someone who spent weeks on generics.

**Code generation is surprisingly straightforward.** LLVM IR is verbose but regular. You emit `alloca` for locals, `getelementptr` for field access, `call` for function calls. The hardest part wasn't generating correct IR — it was generating correct IR for closures, where you need to pack captured variables into an environment struct and thread it through a function pointer. But once you understand the pattern, it's mechanical. The real complexity was always upstream in the type checker.

## Why Not Just Use Go/Rust/Zig?

Fair question. And the honest answer is: I didn't set out to replace anything. I set out to see if I could build a compiler. The language design emerged from the process.

But along the way, I started making opinionated choices. And those choices turned into something I genuinely like.

Errors are values, but you can't ignore them. Go lets you `_ , _ = someCall()` and walk away. Yar doesn't — the compiler rejects unhandled errorable expressions. Explicitness is a superpower.

Enums are closed and `match` is exhaustive:

```
enum Shape {
    case Circle { radius i32 }
    case Rect { w i32, h i32 }
}

fn area(s Shape) i32 {
    match s {
        case Shape.Circle { radius } {
            return radius * radius * 3
        }
        case Shape.Rect { w, h } {
            return w * h
        }
    }
}
```

Add a new case to `Shape` and the compiler tells you everywhere you forgot to handle it. No runtime surprises. No silent default branch quietly doing the wrong thing. What a concept.

Concurrency uses structured lifetimes instead of fire-and-forget goroutines:

```
taskgroup []void {
    spawn fetch_page(url1, results)
    spawn fetch_page(url2, results)
}
// both tasks are done here — guaranteed
```

Every spawned task finishes before the taskgroup expression completes. No goroutine leaks. No `sync.WaitGroup` ceremony. No "I think everything finished, probably, let me add a sleep to be safe."

Generics require explicit type arguments at every call site:

```
box := Box[i32]{value: 42}
first := first[str](names)
```

No inference, no ambiguity. You always know what types are in play. The compiler monomorphizes before type checking — each instantiation becomes a concrete, non-generic function. Is it more verbose? Yes. Do you ever stare at a generic call wondering what type it resolved to? No. That tradeoff was deliberate, and I'd make it again.

## The AI-Shaped Elephant in the Room

Look, this project wouldn't exist without AI coding assistants. Not because AI wrote the compiler — but because it collapsed the research phase from days to minutes. LLVM's `getelementptr` semantics? Working explanation in seconds. How to implement a conservative garbage collector? Solid starting point instead of three hours in documentation that assumes you already know what you're doing. The right calling convention for closures? Answered before I finished the question.

But here's the thing about AI and compilers: AI is genuinely excellent at explaining concepts and generating boilerplate. It is genuinely terrible at making architectural decisions. Every proposal in the `docs/language/proposals/` directory — from the error model to the concurrency design — was a deliberate design choice that required understanding tradeoffs between alternatives I had to live with. AI doesn't live with your tradeoffs. You do.

The compiler is written with the same Go style I use professionally. Small packages. Explicit error handling. No cleverness. Claude handled the tedious parts. The interesting parts were still interesting.

## Where It Stands

Yar compiles real programs. The standard library has 11 packages. There's a [JetBrains plugin](https://github.com/yarlson/yar-plugin) for syntax highlighting. Cross-compilation works for macOS, Linux, and Windows. The test framework discovers and runs tests from `_test.yar` files. Dependencies are managed through `yar.toml` with git-based fetching.

What's missing: a proper M:N scheduler (the current implementation uses POSIX threads directly — functional, not elegant), an LSP for editor integration, self-hosting (the compiler is still Go, not Yar), and about a thousand small ergonomic improvements that only surface when you try to write real programs in the thing. The kind of cuts you don't feel until you're using your own knife.

I documented everything. The language has a style guide called [The Yar Code](https://github.com/yarlson/yar/blob/main/docs/language/the-yar-code.md) — thirteen articles covering how Yar programs should be written, from error handling to closure semantics to nil safety. Every feature has a design proposal with motivation, alternatives considered, and implementation notes. Because if there's one thing building a language teaches you, it's that undocumented assumptions are time bombs.

## What This Taught Me

Building a programming language is not easy. ChatGPT lied. But the process teaches you more about language design than any amount of reading ever could.

You understand why Go chose `if err != nil` when you try to design something better and realize every alternative has its own cost. You understand why Rust needs lifetimes when you implement a garbage collector and notice how much simpler your life is without manual memory management — and how much runtime overhead you're paying for that simplicity. You understand why every language eventually grows a `nil` — and why fighting that instinct is worth the effort.

The biggest lesson: language design is API design at the largest possible scale. Every syntactic choice, every semantic rule, every error message — it's all UX. And the users are programmers who will spend thousands of hours reading and writing in whatever you give them. That changes how you think about defaults, explicitness, and the cost of convenience. Convenience is a loan. Explicitness is equity.

So here we are. I started this project because an AI told me it was easy. It wasn't easy. It was genuinely, absurdly, beautifully hard. And I'm glad it lied, because I wouldn't have started if it hadn't.

You can find Yar on GitHub: [github.com/yarlson/yar](https://github.com/yarlson/yar).
