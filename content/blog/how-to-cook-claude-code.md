---
title: "How to Cook Claude Code"
summary: "Claude Opus 4.7 scores 87.6% on SWE-Bench Verified. Your daily experience probably does not. The gap is not only the model. It is the setup around it."
postLayout: simple
date: "2026-04-28"
tags:
  - llm
---

Claude Opus 4.7 scores [87.6% on SWE-Bench Verified](https://www.vellum.ai/blog/claude-opus-4-7-benchmarks-explained). Sonnet 4.6 sits at 79.6% at roughly an eighth of the cost. Even Opus 4.6, which most people were running until last month, hits 80.8%. The [public leaderboard](https://www.marc0.dev/en/leaderboard) shows the same order.

Now look at the screenshots in your engineering Slack on Monday morning. Hallucinated imports. Confidently wrong refactors. A function glued on top of another function. Captioned, naturally, "bloody Claude."

There is a gap. The model is genuinely capable. Your daily experience probably does not reflect that.

The gap is not only the model. It is the kitchen.

Here is the recipe.

## Lever 1: a system prompt with teeth

The default behavior of any coding agent is "act as a helpful assistant." That is not a useful default for a working engineer.

You need to turn it into: act like the engineer this codebase already has.

That happens in `CLAUDE.md`, or `AGENTS.md` if you are using Codex or another agent that reads the cross-vendor filename.

Anthropic's [best-practices guide](https://www.anthropic.com/engineering/claude-code-best-practices) suggests keeping this file under 300 lines. The reason is practical: it sits in the model's context every turn. Anything you add is taxed forever. Make it earn its place.

What earns its place is rules with teeth. From a real Go project's `AGENTS.md`:

- Write the failing test before the implementation. No exceptions.
- After every code change, run `golangci-lint run` and `go test ./...`. Both must pass before you stop.
- Use `go get package@latest`, then `go mod tidy`. Do not pin versions on install. Do not edit `go.mod` directly.
- For CLI/TUI output, screenshot it and verify visually before claiming it works.

That is not philosophy. That is "skip this and you break the build, then I have to reroll."

Guardrails. Do this. Do not do that. The model follows them because they are attached to the prompt every turn.

This is also where you encode taste: naming, error handling, what "done" means in this project. The model's defaults are averaged Internet sludge. Your codebase is not.

## Lever 2: distilled context

The next huge token waste is rediscovery.

Every fresh task, the agent greps for your test runner. It opens random files to infer layout. It guesses naming conventions from whatever it happened to read first. Multiply that by every plan, implementation, review pass, and fixer retry, and you have built a furnace that burns tokens producing inconsistent answers.

The fix is to write the architecture down once, in a form the agent can read.

I keep mine in `docs/context/`. A one-page `summary.md`. A `terminology.md` mapping domain terms to definitions. A `practices.md` for invariants and conventions. A `context-map.md` index, under sixty lines, that points to everything else.

Tier 1 docs should be scannable in seconds. Tier 2 docs should stay self-contained per topic. Tier 3 is the codebase itself. Grep-able facts do not belong in docs.

The rules are strict: no dates, no changelogs, no "recent completions," no aspirational standards. Only facts supported by code, config, or tests. When docs conflict with reality, code wins. Context docs are working notes, not holy scripture.

I bottle the workflow as a slash command: [`/project-context`](https://github.com/yarlson/dotfiles/blob/main/.claude/commands/project-context.md). It walks a repo, classifies it as single-project or monorepo, and writes the structure in one shot. Run it once when you onboard a project. Re-run it after major architecture changes. That is the maintenance cost.

This is not novel. It is what we do for new hires. The difference is that with humans you hope they remember it. With agents you can force them to read it.

## Lever 3: slash commands as bottled process

Once guardrails and context exist, the third lever is repeatable workflows.

Anthropic recommends slash commands for inner-loop workflows you run all the time. They live in `.claude/commands/*.md` as plain markdown.

Pick the parts of your job that sound mechanical but still require judgment. Bottle those.

One I use daily is [`/coderabbit`](https://github.com/yarlson/dotfiles/blob/main/.claude/commands/coderabbit.md). It triages CodeRabbit review comments on the current PR. The instruction is explicit: classify every comment into three buckets, fix, optional, skip, and act only on fix. No blind acceptance. No defensive replies. No unrelated refactoring smuggled in with the fixes.

The line baked into the command is: show judgment, not obedience.

That line does a lot of work. Without it, an agent accepts every bot suggestion, churns the diff, and calls itself thorough. With it, the agent does what a competent engineer does on a Friday afternoon: fixes the real issues, ignores the noise, replies tightly, moves on.

The slash command is just the bottle. The process is the part worth keeping.

## Hygiene: do not poison the pot

Three habits separate people who get benchmark-adjacent results from people who get cursed screenshots.

**Use `/clear` often.** Anthropic [recommends clearing context every time you start something new](https://www.anthropic.com/engineering/claude-code-best-practices). Not just for cost. Long contexts degrade output quality, and auto-compaction turns earlier turns into lossy summaries. Starting fresh beats letting an autosummary mutate your prompt.

**Compact persistent findings yourself.** If you keep a notes file the agent accumulates across tasks, do not append forever. When it crosses around 8KB, feed it back through the model with instructions to merge duplicates, drop superseded entries, and keep only actionable rules. Replace the original with the compacted version. The model is fine at compressing structured text. That is much easier than coding.

**Use a separate session for review.** Anthropic recommends a fresh-context session for code review. Reviewing a diff in the same session that wrote it primes the model to defend its own work. A clean session reviews on the merits.

## What this setup buys you

With all three levers in place, you can hand work to the agent without supervising every step.

I have a tool called [`snap`](https://github.com/yarlson/snap) that runs Claude in a loop: plan, implement with TDD, review, fix, commit, push, monitor CI, auto-fix CI failures. snap is thin orchestration. The quality comes from the project having a real `AGENTS.md` and real `docs/context/`.

Without those, snap produces the Monday morning screenshots.

With them, it ships.

Earlier this year I used it to build [`yar`](https://github.com/yarlson/yar), a compiled programming language with its own type checker, garbage collector, and standard library. About 19,000 lines of Go across 73 commits. The design proposals are mine. A lot of the code is snap's.

The output is not perfect. It is better than what I would have produced in the same wall-clock time, because I would have stopped to sleep.

That is not because the model is magic. The same model, run with no `CLAUDE.md` and no distilled context, would have produced something I would be embarrassed to commit.

The model did not change.

The kitchen did.

## The recipe

Take the model that scores 87.6% on SWE-Bench Verified. Put it in a project with an `AGENTS.md` that says "TDD or nothing." Give it `docs/context/` that explains the codebase's invariants. Add a small library of slash commands for repeatable work. Clear context between sessions. Compact what persists. Use a fresh session for review.

The benchmark is the model's ceiling.

Your setup determines how close you actually live to it.

Most people are running the same model on a cold stove and complaining about the food.

Set the kitchen.
