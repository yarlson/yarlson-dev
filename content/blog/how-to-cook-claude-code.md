---
title: "How to Cook Claude Code"
summary: "Claude Opus 4.7 scores 87.6% on SWE-Bench Verified. Your daily experience probably doesn't reflect that. The gap isn't the model — it's the kitchen. Three levers, a few hygiene habits, and the same model goes from autocomplete to autonomous shipping."
postLayout: simple
date: "2026-04-28"
tags:
  - llm
---

Claude Opus 4.7 scores [87.6% on SWE-Bench Verified](https://www.vellum.ai/blog/claude-opus-4-7-benchmarks-explained). Sonnet 4.6 sits at 79.6% — at roughly an eighth of the cost. Even Opus 4.6, which most people were running until last month, hits 80.8%. The [public leaderboard](https://www.marc0.dev/en/leaderboard) confirms the order.

Now look at the screenshots in your engineering Slack on a Monday morning. Hallucinated imports. Confidently wrong refactors. A function glued on top of another function. Captioned, of course, "bloody Claude."

There's a gap. The model is genuinely capable. Your daily experience isn't reflecting it. The gap isn't the model. It's the kitchen.

Here's the recipe.

## Lever 1: A System Prompt With Teeth

The default behavior of any coding agent is "act as a helpful assistant." That's not a useful default for a working engineer. You need to upgrade it to "act as the engineer this codebase already has." That happens in `CLAUDE.md` — or `AGENTS.md` if you're on Codex or another agent that reads the cross-vendor filename.

Anthropic's [best-practices guide](https://www.anthropic.com/engineering/claude-code-best-practices) suggests keeping this file under 300 lines, and the reasoning is concrete: it sits in the model's context every single turn. Anything you add is taxed forever. Earn its place.

What earns its place is rules with teeth. From a real Go project's `AGENTS.md`:

- Write the failing test before the implementation. No exceptions.
- After every code change, run `golangci-lint run` and `go test ./...`. Both must pass before you stop.
- Use `go get package@latest`, then `go mod tidy`. Don't pin versions on install. Don't edit `go.mod` directly.
- For CLI/TUI output, screenshot it and verify visually before claiming it works.

That's not philosophy. That's "skip this and you'll break the build, and I'm going to have to reroll." Guardrails. Do this, don't do that. The model genuinely follows them, because they're attached to the prompt every single turn.

This is also where you encode taste — naming conventions, error-handling style, what "done" actually means in your project. The model's defaults are an averaged-Internet hallucination of your codebase. Yours are not.

## Lever 2: Distilled Context

The next-largest token waste is rediscovery. Every fresh task, the agent greps for your test runner. It opens random files to figure out the layout. It infers naming conventions from whichever file you happened to open last. Multiply that by every plan, every implementation, every reviewer pass, every fixer retry, and you've built a furnace that burns tokens producing inconsistent answers.

The fix is to write the architecture down once, in a form the agent can read.

I keep mine in `docs/context/`. A one-page `summary.md`. A `terminology.md` mapping domain terms to definitions. A `practices.md` for invariants and conventions. A `context-map.md` index — under sixty lines — that points to everything else. Tier 1 docs are scannable in seconds. Tier 2 docs are 250 lines max, self-contained per topic. Tier 3 is the codebase itself — grep-able facts don't belong in docs.

The rules I enforce on this folder are strict: no dates, no changelogs, no "recent completions," no aspirational standards. Only facts supported by code, config, or tests. When docs conflict with reality, code wins. Context documents are working hypotheses, not authoritative specs.

I bottle this whole thing as a slash command — [`/project-context`](https://github.com/yarlson/dotfiles/blob/main/.claude/commands/project-context.md) — that walks any repo, classifies it as single-project or monorepo, and writes the structure in one shot. Run it once when you onboard a project. Re-run it after major architectural shifts. That's the entire maintenance cost.

This isn't novel. It's exactly what we do for new hires. The difference is that for a human you can hope they remember it. For an agent you can guarantee they read it on every turn.

## Lever 3: Slash Commands as Bottled Process

Once guardrails and context are in place, the third lever is repeatable workflows. Anthropic's own guidance is to use slash commands for every inner-loop workflow you do many times a day. They live in `.claude/commands/*.md` as plain markdown.

Pick the parts of your job that feel mechanical when described but require judgment to execute. Bottle those.

A real one I use daily is [`/coderabbit`](https://github.com/yarlson/dotfiles/blob/main/.claude/commands/coderabbit.md). It triages CodeRabbit's review comments on the current PR. The instruction is explicit: classify every comment into three buckets — fix, optional, skip — and act only on fix. No blind acceptance. No defensive replies. No unrelated refactoring smuggled in alongside the fixes. The line baked into the command is **show judgment, not obedience**.

That last line is doing heavy lifting. Without it, an agent will accept every suggestion the bot makes, churn the diff, and convince itself it's being thorough. With it, the agent does what a competent engineer does on a Friday afternoon — fixes the real ones, ignores the noise, replies tightly, moves on.

The slash command is the bottle. The workflow is the lightning. You write each one once. You run it for the rest of the project's life.

## Hygiene: Don't Poison the Pot

Three small habits separate the people who get the benchmark numbers from the people who get the screenshots.

**Use `/clear` often.** Anthropic [recommends clearing context every time you start something new](https://www.anthropic.com/engineering/claude-code-best-practices). Not just for cost — long contexts genuinely degrade output quality, and once auto-compaction kicks in, your earlier turns get summarized into something lossy. Starting fresh beats letting an autosummary corrupt your prompt.

**Compact persistent findings yourself.** If you keep a long-running notes file the agent accumulates across tasks, don't append forever. When it crosses ~8KB, feed it back through the model with instructions to merge duplicates, drop superseded entries, and keep only actionable rules. The compacted output replaces the original. The model is fine at compressing structured text — that's a much simpler task than coding.

**Use a separate session for review.** Anthropic specifically recommends a fresh-context session for code review. Reviewing your own diff in the same session that wrote it primes the model to defend the work it just produced. A clean session reviews on the merits.

## What This Setup Actually Buys You

Once all three levers are in place, you can hand work to the agent without supervising every step. I have a tool called [`snap`](https://github.com/yarlson/snap) that runs Claude in a loop — plan, implement with TDD, review, fix, commit, push, monitor CI, auto-fix CI failures. snap is essentially a thin orchestrator. The quality comes from the project having a real `AGENTS.md` and a real `docs/context/`. Without those, snap produces the Monday morning screenshots. With them, it ships.

Earlier this year I used it to build [`yar`](https://github.com/yarlson/yar) — a compiled programming language with its own type checker, garbage collector, and standard library. About 19,000 lines of Go across 73 commits. The design proposals are mine. A lot of the code is snap's. The output is not perfect. It is genuinely better than what I would have produced in the same wall-clock time, because I would have stopped to sleep.

That outcome isn't because the model is magic. The same model, run with no `CLAUDE.md` and no distilled context, would have produced something I'd be embarrassed to commit. The model didn't change. The kitchen did.

## The Recipe

Take the model that scores 87.6% on SWE-Bench Verified. Put it in a kitchen with an `AGENTS.md` that says "TDD or nothing." Hand it a `docs/context/` that explains your codebase's invariants. Give it a small library of slash commands that bottle the boring parts. Clear context between sessions. Compact what persists. Use a fresh session for review.

The benchmark is the model's ceiling. Your setup determines how close to it you actually live.

Most people are running the same model on a stove with no fuel and complaining about the food.

Set the kitchen.
