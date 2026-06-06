---
title: "It's Not the Model. It's the System Prompt You Never Wrote."
summary: "Most complaints about coding agents are complaints about empty context. CLAUDE.md, distilled project docs, and a few slash commands change the same model from autocomplete into something useful."
postLayout: simple
date: "2026-04-28"
tags:
  - llm
---

A coworker dropped a screenshot in Slack. Claude had hallucinated half a function, glued it onto a real one, and confidently labeled the result "ready for review." He captioned it: "bloody Claude."

Fair reaction.

I asked which model and interface. The screenshot looked like a cursed Electron wrapper, not the CLI I use every day. Turns out he was running Anthropic's VS Code extension, which the docs frame as the recommended way to use Claude Code in VS Code.

That framing annoys me.

The extension is not why his agent looked stupid.

## What people are actually complaining about

When someone shows me a "Claude is dumb" screenshot, most of the time the same two things are missing.

1. A project prompt that tells the agent what kind of codebase this is, what to do, and what to never do.
2. Distilled context: architecture, conventions, names, and invariants the agent can read without rediscovering them from scratch.

Without those, the model starts from zero every task. It greps for the test runner. It opens random files to infer the layout. It guesses naming from whichever file it saw first.

That is not the model failing in some interesting way. That is the model doing the only thing it can with no real inputs.

The IDE skin around it does not fix this. A nicer prompt box is still just a prompt box.

## Guardrails live in CLAUDE.md

The first lever is the project-level system prompt.

Claude Code reads `CLAUDE.md`. Codex and friends read `AGENTS.md`. Same concept, different filename.

This file is where you write the rules a senior engineer would give a new contributor on day one, except this contributor never gets tired of being told.

Mine are short and aggressive:

- Write the test before the implementation. No exceptions.
- After every code change, run `golangci-lint run` and `go test ./...`. Both must pass before you stop.
- Do not pin dependency versions on install. Use `go get package@latest`, then `go mod tidy`.
- For CLI/TUI output, take a screenshot and verify it visually before claiming it works.

That is not philosophy. That is "if you skip this, you break the build, and I have to reroll."

Guardrails. Do this. Do not do that.

The model follows them because they sit in context every turn.

A `CLAUDE.md` written like this turns "act as a helpful assistant" into "act like the engineer this codebase already has." The difference is not subtle.

## Distilled context beats rediscovery

The second lever is the one most people skip because it requires writing a thing once.

The payoff is that you stop paying for rediscovery on every task.

I have a slash command called [`/project-context`](https://github.com/yarlson/dotfiles/blob/main/.claude/commands/project-context.md). It walks the repo, classifies it as single-project or monorepo, and writes structured docs into `docs/context/`: a one-page `summary.md`, a `terminology.md`, a `practices.md`, and a `context-map.md`.

The rules are strict: no dates, no changelogs, no "recent completions," no aspirational standards. Only facts supported by code, config, or tests. When context conflicts with reality, code wins.

Why does this matter?

Because without it, every agent invocation re-discovers your repo from scratch. Multiply that by every task, reviewer pass, and fixer retry, and you have built a token furnace that returns inconsistent answers.

With `docs/context/` in place, each phase reads the same durable facts. Not the whole repo. Not whatever happened to be open. The actual rules.

The agent stops guessing and starts working.

This is not novel. It is what we do for new hires: `README`, `CONTRIBUTING`, architecture notes. The difference is that with humans you hope they remember it. With agents you can force the read.

## Slash commands are bottled process

Once guardrails and context exist, the third lever is repeatable workflows.

Slash commands are the parts of your job that sound mechanical when described but still require judgment.

One of mine is [`/coderabbit`](https://github.com/yarlson/dotfiles/blob/main/.claude/commands/coderabbit.md). It triages CodeRabbit comments on the current PR with one rule baked in: classify every comment into fix, optional, or skip, and act only on fix. No blind acceptance. No defensive replies. No unrelated refactoring smuggled in alongside the fixes.

Show judgment, not obedience.

That line matters. Without it, the agent accepts every bot suggestion, churns the diff, and congratulates itself for being thorough. With it, the agent behaves like a competent engineer on a Friday afternoon: fix the real ones, ignore the noise, reply tightly, move on.

The slash command is the bottle. The process is the useful part.

## What this setup buys you

I have a tool called [`snap`](https://github.com/yarlson/snap) that runs Claude in a loop: plan, implement with TDD, review, fix, commit, push, monitor CI, auto-fix CI failures.

It depends on the project having a real `AGENTS.md` and a real `docs/context/`. With those in place, it can run unattended for hours and ship.

Earlier this year I used it to build [`yar`](https://github.com/yarlson/yar), a compiled programming language with its own type checker, garbage collector, and standard library. About 19,000 lines of Go across 73 commits. I wrote the design proposals. snap wrote a lot of the code.

The output is not perfect. It is genuinely better than what I would have produced manually in the same wall-clock time, because I would have stopped to sleep.

That outcome is not model magic. It is the model reading an `AGENTS.md` that says "TDD or nothing," a `docs/context/` folder that explains the language's invariants, and slash commands that bottle the boring parts.

The work is in the setup.

And it is mostly a one-time cost.

## Back to the screenshot

When someone shares a "bloody Claude" moment, the useful question is not "which IDE are you using?"

The useful questions are:

- What does your `CLAUDE.md` say?
- What is in your `docs/context/`?
- What slash commands have you written for the work you already repeat?

The IDE is a window into the agent. The agent is whatever you configured it to be.

The recommended way to use a coding agent is not a UI. It is a system prompt with teeth, distilled context the agent can read, and a small library of workflows that capture how you actually work.

Without those, you are driving a car with no fuel and complaining about the dashboard.

With them, you can hand the agent real work and get something worth reviewing.

Write the `CLAUDE.md`.
