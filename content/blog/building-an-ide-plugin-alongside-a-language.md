---
title: "Building an IDE Plugin the Same Week You Build the Language"
summary: "Most languages ship tooling years after the compiler. I built the Yar IntelliJ plugin in parallel with the compiler itself — 19 commits tracking language changes in real time. Here's why DX-first language development changes how you think about design."
postLayout: simple
date: "2026-04-05"
tags:
  - yar
  - compilers
---

Here's a pattern so common it's practically a law: someone builds a programming language, publishes a compiler, writes documentation, maybe attracts a few users — and then, two years later, starts thinking about editor support. By that point, the language has corners that are genuinely hostile to tooling. Syntax that's ambiguous without full type resolution. Scoping rules that require running half the compiler to answer "where is this symbol defined?" Constructs that a grammar can parse but a plugin can't highlight without semantic context.

I didn't want to be two years late. So when I started adding major features to [Yar](https://github.com/yarlson/yar) — methods, generics, closures, interfaces, garbage collection, a package manager, structured concurrency — I built the [IntelliJ plugin](https://github.com/yarlson/yar-plugin) at the same time. Not "later that month." Not "once the language stabilized." The same week. Sometimes the same day. Nineteen commits to the plugin in seven days, tracking a compiler that was changing under it in real time.

And that constraint — keeping tooling in lockstep with design — changed how I thought about the language itself.

## Why IntelliJ, and Why From Scratch

JetBrains provides a tool called [Grammar-Kit](https://github.com/JetBrains/Grammar-Kit) — a plugin for IntelliJ that generates parsers and PSI (Program Structure Interface) classes from BNF grammars. You write a BNF grammar, a JFlex lexer specification, and Grammar-Kit generates the parser and PSI tree infrastructure — JetBrains' version of an AST that powers everything from highlighting to navigation to refactoring.

The alternative is LSP — the Language Server Protocol that VS Code popularized. LSP is genuinely capable: semantic tokens, document symbols, hover documentation, completion, diagnostics, go-to-definition — it covers a lot of ground. But JetBrains' PSI model goes deeper. Incremental reparsing that updates the tree in-place as you type. Fine-grained PSI-level code transformations for refactoring. Direct access to the file's token stream for formatting. The ability to build rich, stateful inspections that walk the tree with full context. LSP communicates through a request-response protocol between processes; PSI gives you the tree itself, in-process, mutable. For a language where I control both ends — compiler and plugin — that deeper integration wins.

The BNF grammar for Yar started simple. Function declarations, struct types, basic expressions. The JFlex lexer tokenized keywords, operators, string literals. Within a few hours, the plugin could highlight Yar files with real syntax coloring, match braces, and fold code blocks.

But here's the thing about a BNF grammar for a plugin: it's not the same grammar as the compiler's parser. The compiler's parser can reject invalid programs. The plugin's parser has to handle them gracefully — half-typed expressions, missing semicolons, incomplete struct literals. Every construct needs error recovery rules so the PSI tree stays navigable even when the code is broken. You're not parsing valid Yar. You're parsing Yar-shaped text that a human is currently editing.

## The Synchronization Problem

The real challenge wasn't building the plugin. It was keeping it alive while the language changed daily.

On March 29th, Yar gained methods on struct types. The plugin grammar needed receiver syntax in function declarations. Same day: generics landed. The grammar needed type parameter lists, explicit type arguments at call sites, and generic struct definitions. Same day: closures. Anonymous function literals, capture lists, function types as first-class values. Same day: interfaces. Named interface declarations with method sets.

Each of these features changed the grammar, the lexer, the highlighting rules, the completion provider, and the reference resolution logic. In a traditional language development timeline, you'd batch these changes and update tooling once things settled. But things weren't going to settle. The language was moving at the speed of ideas, and the plugin had to move with it.

The discipline this forced was simple: every time I added a language feature to the compiler, I immediately asked "can the plugin parse this? Can it highlight this? Can it navigate to the definition?" If the answer was no, the feature wasn't done. The compiler PR and the plugin PR were parts of the same unit of work.

This caught design problems early. When I implemented generics with explicit type arguments — `Box[i32]{value: 42}` — the plugin grammar had to distinguish between a generic type instantiation and an index expression. In the compiler, this was easy because the parser had full context. In the plugin's incremental parser, it was ambiguous. The resolution was to use PSI-level lookahead that checked whether the bracket expression was followed by a struct literal. Not elegant. But it worked, and the fact that I discovered the ambiguity while building the plugin — rather than two years later when someone tried to write an LSP — meant I could still change the syntax if needed.

## PSI: The Surprisingly Deep Abstraction

JetBrains' PSI tree is more than an AST. Every element in the tree — every keyword, every identifier, every whitespace token — is a node. Elements have parents, children, siblings. They implement interfaces like `PsiNamedElement` (for things with names) and `PsiReference` (for things that point to other things). The framework uses these interfaces to power features with surprisingly little glue: if your struct declaration implements `PsiNamedElement` with a working `setName()` method, and your references implement `handleElementRename()`, the rename refactoring works across the project. If your identifier reference implements `PsiReference` with a `resolve()` method, go-to-definition works.

The reference resolution was the most interesting part. When you write `myStruct.field` in Yar, the plugin needs to:

1. Resolve `myStruct` to its declaration
2. Find the type of that declaration
3. Look up `field` in that type's members
4. Return the PSI element for the field declaration

For local variables, this is straightforward — walk up the PSI tree until you find a declaration with the matching name. For imported symbols, it requires reading other files. For struct literals with named fields, it requires matching the field name against the struct definition. For qualified names like `strings.contains`, it requires resolving the package import first, then finding the symbol within that package.

Cross-package reference resolution — where `go-to-definition` on `strings.contains` navigates you to the `contains` function in the `strings` package — was sixteen commits into the plugin. Getting it right required building a package index that mirrored the compiler's import resolution, but operated on PSI trees instead of the compiler's AST. Two parsers, two trees, two resolution systems, arriving at the same answer by different paths. Redundant? Yes. Necessary? Also yes. The compiler and the editor solve different problems with the same grammar.

## Completion: More Than Keywords

Code completion in a plugin has three layers, and most language plugins only implement the first one.

Layer one: keywords. When you type `fn`, suggest `fn`. When you're inside a match block, suggest `case`. This is trivial — a static list filtered by context. Every plugin ships this.

Layer two: symbols. When you type a dot after a variable, suggest its fields and methods. When you start an import path, suggest available packages. This requires the PSI reference resolution from above — you need to know what type a variable has to suggest its members.

Layer three: semantic awareness. When you're inside a `taskgroup` block, suggest `spawn`. When you're calling a generic function, suggest type arguments based on the expected types. When you're writing a channel operation, suggest `chan_send`, `chan_recv`, `chan_close` with their signatures. This requires understanding not just what names exist, but what names make sense in the current context.

The Yar plugin implements all three. The stdlib packages — `strings`, `fs`, `net`, `testing` — each have completion entries with documentation that appears on hover. Builtins like `append`, `len`, `to_str`, and the channel operations have their signatures and behavior documented inline. When structured concurrency landed on April 1st, the plugin was updated the same day to complete `taskgroup`, `spawn`, `chan[T]`, and the channel builtins with full documentation.

Is it perfect? No. The type inference for suggesting struct fields after a dot is fragile — it works for direct declarations but struggles with complex expressions. The completion for generic type arguments is keyword-based rather than genuinely type-aware. But it works for the 90% case, and the 90% case is what makes a plugin feel responsive rather than decorative.

## The External Annotator: Bridging Plugin and Compiler

The most pragmatic decision in the entire plugin was the external annotator. Rather than reimplementing Yar's type checker in Kotlin (which would be a second compiler maintained in a second language — genuinely terrible idea), the plugin shells out to the actual `yar` binary.

IntelliJ's `ExternalAnnotator` API runs as part of the IDE's background analysis pipeline — when you edit a file, the daemon eventually re-analyzes it, and the annotator fires `yar check` against the project directory. It captures the diagnostic output, parses the `file:line:col: message` format, and maps errors back to source locations in the editor. Red squiggles appear on the line where the compiler found the error. The error message is the compiler's error message, not a plugin approximation.

This means the plugin's error reporting is always exactly as accurate as the compiler. It also means it's exactly as slow — a full check on every analysis pass. For a language with fast compilation (Yar checks most programs in under a second), this is fine. For a language with slow compilation, it would be unusable. The design leans on a property of the compiler that isn't guaranteed, and that's a conscious bet.

The plugin detects the `yar` binary through `PATH` and verifies it exists before enabling the annotator. No binary, no squiggles. The feature degrades gracefully rather than crashing — which, in the JetBrains plugin ecosystem, is not the default behavior. I've seen plugins that assume their external tool exists and throw `NullPointerException` on every keystroke when it doesn't.

## What DX-First Language Design Teaches You

Building the plugin alongside the language created a feedback loop that pure compiler development doesn't have. When a language feature was hard to support in the plugin, it was usually because the syntax was ambiguous or the scoping rules were unclear. Those are problems that affect every tool that processes the language — formatters, linters, documentation generators, not just IDE plugins.

Generic type arguments being explicit (`first[str](names)` instead of `first(names)` with inference) made plugin completion dramatically simpler. The plugin doesn't need to run type inference to show you what types a generic function was instantiated with — the source code already says. That's an ergonomic tradeoff in the language that pays dividends in every tool that reads the code.

Structured concurrency with `taskgroup` blocks instead of free-floating `spawn` statements meant the plugin could fold taskgroup blocks and show their structure. If `spawn` could appear anywhere (like `go` in Go), the plugin would have no structural clue about concurrency boundaries. The language design made the tooling better. The tooling requirement made the language design better.

Most languages discover these relationships years after shipping, when someone tries to build an LSP and reports fifty syntax ambiguities that the compiler's parser resolved through heuristics nobody documented. Building both at the same time means you discover them while you can still fix them. The cost is higher upfront effort. The payoff is a language that's genuinely toolable from day one.

Nineteen commits in seven days. Syntax highlighting, navigation, completion, documentation, formatting, error reporting, and cross-package resolution. Not because the plugin is finished — it isn't — but because the foundation is solid enough that every future language feature starts with the question: "How will the plugin handle this?"

And that question, asked early enough, makes both the language and the tooling better.
