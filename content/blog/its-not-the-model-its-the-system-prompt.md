---
title: "It's Not the Model. It's the System Prompt You Never Wrote."
summary: "Most complaints about coding agents are really complaints about empty context. CLAUDE.md, distilled project docs, and a few well-named slash commands turn the same model from 'crappy autocomplete' into something that runs unattended for hours and ships."
postLayout: simple
date: "2026-04-28"
tags:
  - llm
---

A coworker dropped a screenshot in Slack the other day. Claude had hallucinated half a function, glued it onto a real one, and confidently labeled the result "ready for review." He captioned it: "bloody Claude." The collective sigh in the channel was audible.

I asked which model and which interface. The screenshot looked like a crappy Electron app, not the CLI I use every day. Turns out he was running Anthropic's VS Code extension — billed by the docs as "the recommended way to use Claude Code in VS Code."

I give up on that framing. The extension isn't why his agent looked stupid.

## What People Are Actually Complaining About

When someone shows me a "Claude is dumb" screenshot, ninety percent of the time the same two things are missing.

1. Any system prompt that tells the agent what kind of project this is, what to do, and what to never do.
2. Any distilled context — a summary of the architecture, the conventions, the names of things — that the agent can read without rebuilding it from scratch every session.

Without these, the model is starting from absolute zero on every task. It greps for the test runner. It opens three random files to figure out the layout. It guesses the naming scheme. That's not the model failing. That's the model doing the only thing it can with no inputs.

The IDE skin around the model doesn't fix this. A nicer panel for typing prompts is still a panel for typing prompts.

## Guardrails Live in CLAUDE.md

The first lever is the project-level system prompt. Claude Code reads `CLAUDE.md`. Codex and friends read `AGENTS.md`. Same idea, different filename. This file is where you write the rules a senior engineer would tell a new contributor on day one — except the new contributor never tires of being told.

Mine are short and aggressive. Things like:

- Write the test before the implementation. No exceptions.
- After every code change, run `golangci-lint run` and `go test ./...`. Both must pass before you stop.
- Don't pin dependency versions on install — `go get package@latest`, then `go mod tidy`.
- For CLI/TUI output, take a screenshot and verify it visually before claiming it works.

That's not philosophy. That's "if you skip this, you're going to break the build, and I'm going to have to reroll." Guardrails. Do this, don't do that. The model genuinely follows them, because they're sitting in its context every single turn.

A `CLAUDE.md` written like this turns "act as a helpful assistant" — which is the default — into "act as the engineer this codebase already has." The difference in output is not subtle.

## Distilled Context Beats On-Demand Exploration

The second lever is the one most people skip, because it requires writing a thing once. The payoff is that you stop paying for it on every task.

I have a slash command called [`/project-context`](https://github.com/yarlson/dotfiles/blob/main/.claude/commands/project-context.md). It walks the repo, classifies it as single-project or monorepo, and writes structured documents into `docs/context/` — a one-page `summary.md`, a `terminology.md`, a `practices.md`, and a `context-map.md` index. The rules are strict: no dates, no changelogs, no "recent completions," no aspirational standards. Only facts supported by code, config, or tests. When context conflicts with reality, code wins.

Why does this matter? Because without it, every agent invocation re-discovers your repo from scratch. Multiply that by every task, every reviewer pass, every fixer retry, and you've built a token furnace that produces inconsistent answers.

With `docs/context/` in place, every phase reads the same distilled facts. Not the entire repo. Not whatever happened to be open. The actual, durable rules. The agent stops guessing and starts working.

This isn't novel. It's exactly what we do for new hires. We write a `CONTRIBUTING.md`, a `README.md`, an architecture doc. The only difference is that for a new hire you can hope they remember it. For an agent you can guarantee they read it on every turn.

## Slash Commands Are Bottled Engineering Process

Once you've got guardrails and context, the third lever is repeatable workflows. Slash commands. These are the parts of your job that feel mechanical when described — "go through CodeRabbit's review comments, decide which are real, fix those, push, resolve threads" — but require enough judgment that you don't want to skip the judgment.

I have one called [`/coderabbit`](https://github.com/yarlson/dotfiles/blob/main/.claude/commands/coderabbit.md). It does exactly that workflow, with one rule baked in: classify every comment into three buckets — fix, optional, skip — and act only on fix. No blind acceptance. No defensive replies. No unrelated refactoring smuggled in alongside the fixes. Show judgment, not obedience.

That last line matters. Without it, an agent will accept every suggestion the bot makes, churn the diff, and convince itself it's being thorough. With it, the agent does what a competent engineer does on a Friday afternoon — fixes the real ones, ignores the noise, replies tightly, and moves on.

The slash command is the bottle. The workflow is the lightning.

## What This Setup Actually Buys You

I'll show you the receipts. I have a tool called [`snap`](https://github.com/yarlson/snap) that runs Claude in a loop — plan, implement with TDD, review, fix, commit, push, monitor CI, auto-fix CI failures. It depends on the project having a real `AGENTS.md` and a real `docs/context/`. With those in place, it runs unattended for hours and ships.

Earlier this year I used it to build [`yar`](https://github.com/yarlson/yar) — a compiled programming language with its own type checker, garbage collector, and standard library. About 19,000 lines of Go across 73 commits. I wrote the design proposals. snap wrote a lot of the code. The output is not perfect. It is genuinely better than what I would have produced manually in the same wall-clock time, because I would have stopped to sleep.

That outcome is not because the model is magic. It's because the model is reading an `AGENTS.md` that says "TDD or nothing," a `docs/context/` that explains the language's invariants, and a set of slash commands that bottle the boring parts. The work is in the configuration, and it's a one-time cost.

## Back to the Screenshot

So when someone in Slack shares a "bloody Claude" moment, the question isn't "which IDE are you using." The question is: what does your `CLAUDE.md` say? What's in your `docs/context/`? What slash commands have you written for the parts of your job you've already done a hundred times?

The IDE is a window into the agent. The agent is whatever you configured it to be. The recommended way to use a coding agent isn't a UI. It's a system prompt with teeth, a distilled context the agent can actually read, and a small library of bottled processes that capture how you actually work.

Without those, you're driving a car with no fuel and complaining about the dashboard.

With them, you can hand the keys to the agent on Friday evening and have something worth reviewing on Monday morning.

Write the `CLAUDE.md`.
