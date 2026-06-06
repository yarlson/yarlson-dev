---
title: "Building an IDE Plugin the Same Week You Build the Language"
summary: "Most languages add tooling years after the compiler. I built the Yar IntelliJ plugin while the compiler was still changing, and that changed the language design."
postLayout: simple
date: "2026-04-05"
tags:
  - yar
  - compilers
---

There is a common language-building pattern: build the compiler, publish it, write some docs, maybe get a few users, then think about editor support two years later.

By then, the language has usually grown tooling-hostile corners. Syntax that is ambiguous without type resolution. Scoping rules that require half the compiler to answer "where is this symbol defined?" Constructs the grammar can parse, but a plugin cannot highlight without semantic context.

I did not want to be two years late.

So while I was adding major features to [Yar](https://github.com/yarlson/yar), methods, generics, closures, interfaces, garbage collection, a package manager, structured concurrency, I built the [IntelliJ plugin](https://github.com/yarlson/yar-plugin) at the same time.

Not later that month. Not once the language stabilized. Same week. Sometimes the same day.

Nineteen plugin commits in seven days, tracking a compiler that was changing under it in real time.

That constraint changed how I thought about the language itself.

## Why IntelliJ, and why from scratch

JetBrains has [Grammar-Kit](https://github.com/JetBrains/Grammar-Kit), a plugin that generates parsers and PSI classes from BNF grammars. You write a BNF grammar and a JFlex lexer, and Grammar-Kit generates the parser plus the PSI tree infrastructure.

PSI is JetBrains' AST-ish model that powers highlighting, navigation, refactoring, formatting, and inspections.

The obvious alternative is LSP, the Language Server Protocol popularized by VS Code. LSP is capable: semantic tokens, document symbols, hover docs, completion, diagnostics, go-to-definition.

But JetBrains PSI goes deeper. Incremental reparsing updates the tree as you type. Refactoring can transform fine-grained PSI elements. Formatting can inspect the file's token stream directly. Inspections can walk a rich in-process tree instead of asking another process for answers over a protocol.

For a language where I control both ends, compiler and plugin, that deeper integration wins.

The Yar grammar started simple: function declarations, struct types, basic expressions. The JFlex lexer tokenized keywords, operators, string literals. Within a few hours, the plugin could highlight Yar files, match braces, and fold code blocks.

But a plugin grammar is not the same as the compiler grammar.

The compiler can reject invalid programs. The plugin has to survive them: half-typed expressions, missing semicolons, incomplete struct literals. Every construct needs error recovery so the PSI tree stays navigable while a human is still typing.

You are not parsing valid Yar.

You are parsing Yar-shaped text in the middle of becoming valid.

## The synchronization problem

Building the plugin was not the hard part. Keeping it alive while the language changed daily was.

On March 29th, Yar gained methods on struct types. The plugin grammar needed receiver syntax in function declarations.

Same day: generics. Type parameter lists, explicit type arguments at call sites, generic struct definitions.

Same day: closures. Anonymous function literals, capture lists, function types as first-class values.

Same day: interfaces. Named interface declarations with method sets.

Each feature touched the grammar, lexer, highlighting rules, completion provider, and reference resolution.

In a traditional timeline, you would batch that work and update tooling once the language settled. But the language was moving at the speed of ideas, and the plugin had to move with it.

The discipline was simple: every time I added a compiler feature, I asked:

- Can the plugin parse this?
- Can it highlight this?
- Can it navigate to the definition?

If the answer was no, the feature was not done.

The compiler PR and plugin PR were parts of the same unit of work.

That caught design problems early. When I implemented generics with explicit type arguments, `Box[i32]{value: 42}`, the plugin grammar had to distinguish a generic type instantiation from an index expression. In the compiler, this was easy because the parser had more context. In the plugin's incremental parser, it was ambiguous.

The workaround was PSI-level lookahead that checked whether the bracket expression was followed by a struct literal. Not elegant. But it worked. More importantly, I found the ambiguity while I could still change the language if I needed to, not two years later when someone filed an LSP bug.

## PSI is deeper than it looks

JetBrains' PSI tree is more than an AST.

Every element in the tree, every keyword, identifier, and whitespace token, is a node. Elements have parents, children, siblings. They implement interfaces like `PsiNamedElement` for things with names and `PsiReference` for things that point somewhere.

The framework uses those interfaces to power features with surprisingly little glue. If a struct declaration implements `PsiNamedElement` with a working `setName()`, and references implement `handleElementRename()`, rename refactoring works across the project. If an identifier reference implements `PsiReference` with a `resolve()` method, go-to-definition works.

Reference resolution was the interesting part. When you write `myStruct.field`, the plugin has to:

1. Resolve `myStruct` to its declaration
2. Find the type of that declaration
3. Look up `field` in that type's members
4. Return the PSI element for the field declaration

For locals, that is straightforward: walk up the PSI tree until you find a matching declaration. For imports, it requires reading other files. For struct literals with named fields, it requires matching the field name against the struct definition. For qualified names like `strings.contains`, it requires resolving the package import, then finding the symbol inside that package.

Cross-package reference resolution, where go-to-definition on `strings.contains` navigates to the `contains` function in the `strings` package, landed sixteen commits into the plugin.

Getting it right meant building a package index that mirrored the compiler's import resolution, but on PSI trees instead of the compiler AST.

Two parsers. Two trees. Two resolution systems. Same answer by different paths.

Redundant? Yes.

Necessary? Also yes. The compiler and editor solve different problems with the same language.

## Completion is more than keywords

Code completion has three layers.

Layer one: keywords. Type `fn`, suggest `fn`. Inside a match block, suggest `case`. Static list, filtered by context. Every plugin ships this.

Layer two: symbols. Type a dot after a variable, suggest fields and methods. Start an import path, suggest packages. This requires PSI reference resolution because the plugin has to know what type a variable has.

Layer three: semantic awareness. Inside a `taskgroup`, suggest `spawn`. Calling a generic function, suggest type arguments. Writing channel code, suggest `chan_send`, `chan_recv`, `chan_close` with signatures. This requires knowing not just which names exist, but which names make sense here.

The Yar plugin implements all three.

The stdlib packages, `strings`, `fs`, `net`, `testing`, have completion entries with hover docs. Builtins like `append`, `len`, `to_str`, and the channel operations have signatures and behavior documented inline. When structured concurrency landed on April 1st, the plugin was updated the same day to complete `taskgroup`, `spawn`, `chan[T]`, and the channel builtins.

Is it perfect? No.

Type inference for fields after a dot is fragile. It works for direct declarations and struggles with complex expressions. Generic type argument completion is keyword-based, not genuinely type-aware.

But it works for the 90% case, and the 90% case is what makes a plugin feel useful instead of decorative.

## The external annotator was the sane compromise

The most pragmatic decision in the plugin was the external annotator.

I did not want to reimplement Yar's type checker in Kotlin. That would be a second compiler, maintained in a second language, with its own bugs. Absolutely not.

So the plugin shells out to the real `yar` binary.

IntelliJ's `ExternalAnnotator` runs as part of background analysis. When you edit a file, the daemon eventually re-analyzes it, and the annotator runs `yar check` against the project directory. It captures diagnostics, parses the `file:line:col: message` format, and maps errors back to source locations.

Red squiggles appear where the compiler found the error. The error message is the compiler's error message, not a plugin approximation.

That means the plugin's errors are exactly as accurate as the compiler.

It also means they are exactly as slow as the compiler. For Yar, that is fine because checks are usually under a second. For a slower language, this would be unusable. The design leans on a property of the compiler. That is a conscious bet.

The plugin detects the `yar` binary through `PATH` and verifies it exists before enabling the annotator. No binary, no squiggles. The feature degrades instead of crashing, which is apparently not a universal habit in plugin land.

## What DX-first language design teaches you

Building the plugin alongside the language created a feedback loop pure compiler work does not have.

When a language feature was hard to support in the plugin, it usually meant the syntax was ambiguous or the scoping rules were unclear. Those problems affect every tool: formatters, linters, docs generators, not just IDE plugins.

Explicit generic type arguments, `first[str](names)` instead of `first(names)` with inference, made plugin completion much simpler. The plugin does not need to run type inference to show which types a generic function was instantiated with. The source says it.

That is an ergonomic tradeoff in the language that pays dividends in every tool that reads the code.

Structured concurrency with `taskgroup` blocks instead of free-floating `spawn` statements had the same effect. The plugin can fold taskgroup blocks and show concurrency structure. If `spawn` could appear anywhere, like `go` in Go, the plugin would have no structural clue about concurrency boundaries.

The language design made the tooling better.

The tooling requirement made the language design better.

Most languages discover these relationships years later, when someone builds an LSP and reports fifty syntax ambiguities the compiler resolved with undocumented heuristics.

Building both at the same time means you discover them while you can still fix them.

The cost is more work upfront.

The payoff is a language that is toolable from day one.

Nineteen commits in seven days. Syntax highlighting, navigation, completion, documentation, formatting, diagnostics, and cross-package resolution.

Not because the plugin is done. It is not.

Because the foundation is good enough that every future language feature starts with the right question:

How will the plugin handle this?

Asked early enough, that question makes both the language and the tooling better.
