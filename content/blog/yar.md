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

Four months ago I was walking my dog and talking to ChatGPT on my phone. A completely normal thing to do, apparently. I asked: "Is it really that hard to create your own programming language and compiler?"

ChatGPT, with the confidence of a consultant who's never touched production, said: "Nah, it's easy. Just use LLVM."

And like an absolute clown, I believed it.

## What I Actually Built

The language is called [Yar](https://github.com/yarlson/yar). It's a compiled language that produces native executables through LLVM IR and clang. The compiler is written in Go. It has its own lexer, parser, type checker, and code generator — no parser generators, no frameworks, just direct Go code that reads `.yar` files and spits out LLVM IR.

Here's what a Yar program looks like:

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

That `!void` return type means the function can fail. The `?` propagates the error to the caller. There are no exceptions. No try/catch. If a function can fail, its signature says so, and the caller deals with it — either propagate with `?`, handle with `or |err| { ... }`, or return the result directly. The compiler rejects anything else.

This isn't a toy language that prints "hello world" and calls it a day. The current feature set includes generics, interfaces, closures, enums with exhaustive pattern matching, structs with methods, pointers, slices, maps, channels, structured concurrency, cross-compilation, a test framework, a dependency manager, and a garbage collector. The standard library covers strings, filesystem, networking, process execution, environment variables, and more.

73 commits. ~19,000 lines of Go. 26 design proposals. One very confused dog.

## The Part That Surprised Me

I expected the parser to be the hard part. It wasn't. Parsing is mechanical — you read tokens, you build a tree, you handle edge cases. The hard parts were the things I didn't anticipate.

**Type checking is where languages live or die.** Figuring out when `i32` can coerce to `i64`, how generic type arguments propagate through nested expressions, whether a pointer receiver method satisfies an interface requirement — this is where you make hundreds of small design decisions that compound into a language that either feels coherent or feels like PHP.

**Error handling design is deceptively consequential.** I went through three iterations. The first had `try`/`catch`. I ripped it out. The second had a `try` operator. Ripped that out too. The final design uses `?` for propagation and `or |err| { ... }` for local recovery. Maps return `!V` on lookup — a missing key is `error.MissingKey`, not a silent zero value. Every function that can fail declares it in the signature. This ended up being the single decision that defines how Yar code reads.

**Code generation is surprisingly straightforward.** LLVM IR is verbose but regular. You emit `alloca` for locals, `getelementptr` for field access, `call` for function calls. The hardest part wasn't generating correct IR — it was generating correct IR for closures, where you need to pack captured variables into an environment struct and thread it through a function pointer.

## Why Not Just Use Go/Rust/Zig?

Fair question. The honest answer: I didn't set out to replace anything. I set out to see if I could build a compiler. The language design emerged from the process.

But along the way, I found myself making opinionated choices that I genuinely like:

Errors are values, but you can't ignore them. Go lets you `_ , _ = someCall()` and move on. Yar doesn't — the compiler rejects unhandled errorable expressions.

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

Add a new case to `Shape` and the compiler tells you everywhere you forgot to handle it. No runtime surprises.

Concurrency uses structured lifetimes instead of fire-and-forget goroutines:

```
taskgroup []void {
    spawn fetch_page(url1, results)
    spawn fetch_page(url2, results)
}
// both tasks are done here — guaranteed
```

Every spawned task finishes before the taskgroup expression completes. No goroutine leaks. No `sync.WaitGroup` ceremony.

Generics require explicit type arguments at every call site:

```
box := Box[i32]{value: 42}
first := first[str](names)
```

No inference, no ambiguity. You always know what types are in play. The compiler monomorphizes before type checking — each instantiation becomes a concrete, non-generic function.

## The AI-Assisted Part

I'll be honest — this project wouldn't exist without AI coding assistants. Not because AI wrote the compiler for me, but because it collapsed the research phase. When I needed to understand LLVM's `getelementptr` semantics, or how to implement a conservative garbage collector, or what the right calling convention is for closures — I could get a working explanation in seconds instead of spending hours on documentation.

The actual implementation was still mine. AI is great at explaining concepts and generating boilerplate, but it doesn't make architectural decisions for you. Every proposal in the `docs/language/proposals/` directory — from the error model to the concurrency design — was a deliberate design choice that required understanding tradeoffs, not just generating code.

The compiler itself is written with the same Go style I use professionally: small packages, explicit error handling, no cleverness. Claude helped with the tedious parts. The interesting parts were still interesting.

## Where It Is Now

Yar can compile real programs. The standard library has 11 packages. There's a [JetBrains plugin](https://github.com/yarlson/yar-plugin) for syntax highlighting. Cross-compilation works for macOS, Linux, and Windows. The test framework discovers and runs tests from `_test.yar` files. Dependencies are managed through `yar.toml` with git-based fetching.

What's missing: a proper M:N scheduler (the current implementation uses POSIX threads directly), an LSP for editor integration, self-hosting (the compiler is still Go, not Yar), and about a thousand small ergonomic improvements that only show up when you try to write real programs.

I documented everything. The language has a style guide called [The Yar Code](https://github.com/yarlson/yar/blob/main/docs/language/the-yar-code.md) — thirteen articles that describe how Yar programs should be written, from error handling to closure semantics to nil safety. Every feature has a design proposal with motivation, alternatives considered, and implementation notes.

## What I Learned

Building a programming language is not easy. ChatGPT lied. But it's also not impossible, and the process teaches you more about language design than any amount of reading. You understand why Go chose `if err != nil` when you try to design something better. You understand why Rust needs lifetimes when you implement a garbage collector and realize how much simpler your life is without them.

The biggest lesson: language design is API design at the largest possible scale. Every syntactic choice, every semantic rule, every error message — it's all UX. And the users are programmers who will spend thousands of hours reading and writing code in whatever you give them. That changes how you think about defaults, explicitness, and the cost of convenience.

I started this project because an AI told me it was easy. It wasn't. But I'm glad it lied.

You can find Yar on GitHub: [github.com/yarlson/yar](https://github.com/yarlson/yar).
