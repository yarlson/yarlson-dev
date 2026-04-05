---
title: "When AI Agents Remember: Building Persistent Memory for Autonomous Coding"
summary: "What happens when you give an AI coding agent memory that persists across tasks? It stops repeating the same mistakes. Here's how lgtm and snap use persistent findings, shared context, and self-recovery to close the loop from planning to merged PR."
postLayout: simple
date: "2026-03-01"
tags:
  - llm
  - go
---

AI coding agent demos all look the same. Feed it a task, watch it autocomplete, applaud. But hand it a second task that depends on the first? It forgets everything. The model that just figured out your test runner will blunder into the wrong command again three minutes later like nothing happened.

I've been building [lgtm](https://github.com/yarlson/lgtm) and [snap](https://github.com/yarlson/snap) — tools that let agents plan features, implement them with tests, review their own code, fix issues, and commit. The biggest lesson wasn't about prompts or models. It was about memory. A flat file. Genuinely the simplest thing in the entire stack. And it changed everything.

## The Stateless Agent Problem

The first version of lgtm was a loop: read the PRD, break it into tasks, hand each one to Claude Code, verify the result, commit if it passes. Worked great for about two tasks. By task three, the agent was making the exact same mistake it made on task one. Wrong test command. Wrong import path. An architectural pattern already tried and rejected.

Why? Because each task started with a blank slate. The agent had zero access to what it learned five minutes ago. This is the default state of every agentic workflow people are shipping right now, and nobody talks about it.

## Persistent Findings: A Project Memory File

Look, the fix is embarrassingly simple. A file called `findings.md` that lives in `.lgtm/` and accumulates knowledge across the entire run. After each task — success or failure — the system writes what it discovered. Which test patterns work. Which verification commands are correct. Which architectural constraints exist.

But here's the thing: findings aren't just logged. They're injected into the planner and implementer prompts for every subsequent task. The agent reads its own history before touching new work.

```go
// Before planning the next task, load accumulated findings
findings, err := findings.Load(".lgtm/findings.md")
if err == nil {
    prompt = prompt + "\n\nProject findings from previous tasks:\n" + findings
}
```

One file. One concatenation. That single change transformed lgtm from a tool that repeated mistakes into one that genuinely improved over the course of a project.

## The Compaction Problem

Appending findings forever has an obvious failure mode: the file bloats, the context window fills with redundant garbage, and "Always use `go test ./...` instead of `go test`" shows up fourteen times like a broken mantra.

The solution is AI-powered self-compaction. When `findings.md` exceeds 8KB, lgtm feeds it back through the LLM with instructions to merge duplicates, remove superseded entries, and keep only actionable rules. The compacted output replaces the original file.

Using the same LLM that generates findings to periodically compress them — I hadn't seen this pattern elsewhere. It works because compaction is genuinely simpler than coding. The model is merging structured text, not reasoning about logic. The 8KB threshold keeps findings well within a single prompt's useful context. After compaction, the file typically shrinks by half.

Self-compacting memory is a superpower.

## Shared Context: Explore Once, Use Everywhere

Let's talk about token waste. When I profiled how many tokens each task consumed, the numbers were absurd. The decomposer, implementer, reviewer, and fixer were all independently exploring the codebase — reading the same files, building the same mental model, burning the same tokens. Four phases doing the same work. Four times the cost.

The fix is an explicit explorer phase that runs once at session start. It produces `static.md`, a snapshot of the codebase's architecture, key files, and patterns. Every subsequent phase reads from this shared context instead of exploring on its own.

```
Session start
  └─ Explorer → static.md (one-time codebase analysis)
      ├─ Decomposer reads static.md + PRD → tasks
      ├─ Implementer reads static.md + task + findings → code
      ├─ Reviewer reads static.md + diff → feedback
      └─ Fixer reads static.md + feedback → fixes
```

On top of the static context, the decomposer generates per-task `focus.md` files that narrow scope to the specific files and patterns relevant to each task. Broad static context plus narrow per-task focus. Each phase gets exactly the right amount of information. No redundant exploration. No wasted tokens.

## Self-Recovery: Escaping Dead Ends

Even with memory and shared context, agents get stuck. A partially implemented feature breaks tests, the fixer flails for three attempts, and suddenly you're watching an infinite retry loop burn through your API budget. Sound familiar?

The recovery mechanism in lgtm uses a `RecoverableError` type. When the implementer fails verification three times, instead of retrying forever, it:

1. Records what failed and why in `findings.md`
2. Resets the workspace (`git reset --hard` + `git clean`)
3. Returns to the planner with the failure context

The next planning attempt has "Approach X failed because of Y" sitting right there in its prompt. It plans differently.

This is the piece that makes autonomous operation actually viable on real projects. Without it, one difficult task blocks everything. With it, the system falls back, learns, and routes around the problem. Graceful failure isn't a nice-to-have — it's table stakes for anything that runs without a human babysitter.

## Closing the Loop: From Commit to Merged PR

Here's where most autonomous coding tools stop: code committed locally. Great. Now what? You still have to push, open the PR, watch CI, fix whatever CI catches that local tests missed. That last mile is where snap takes over.

After all tasks complete, a postrun phase kicks in:

1. **Auto-push** — detects the remote, pushes the branch
2. **PR creation** — calls Claude to generate a title and description from the commit history, opens the PR via `gh`
3. **CI monitoring** — polls GitHub Actions for workflow status, showing a live summary of passing and failing checks
4. **Auto-fix** — if CI fails, fetches the logs (kept in memory, never written to disk), feeds them to Claude, commits the fix, and pushes again. Up to 10 retries.

The CI auto-fix loop creates a genuine feedback cycle between the test environment and the agent. The agent wrote the code. CI found a problem local tests didn't catch. The agent fixes it without human intervention. That loop — write, test, fail, learn, fix — is what turns a coding assistant into an autonomous workflow. The retry limit of 10 prevents runaway loops, and keeping CI logs in memory only avoids polluting the workspace.

## What Actually Matters

Memory, shared context, graceful recovery. Three patterns. None of them require clever prompting or exotic model capabilities. All of them require caring about the boring infrastructure that sits between the LLM and the actual work.

A stateless agent is a demo. A stateful agent is a tool. The implementation is trivial — it's just a file — but the impact on output quality is dramatic. Repeated codebase exploration is the single biggest token waste in multi-phase agentic workflows, and a shared context file eliminates it overnight. Hard failures are fine as long as the system records what happened and has a path to retry differently. And the gap between "code committed locally" and "PR merged" is where you either build a toy or build something people actually use.

These aren't theoretical patterns. They're what fell out of running lgtm and snap on real projects and watching where they broke. The tools keep evolving. But the core insight — that memory, context sharing, and graceful recovery matter more than prompt engineering — has held up under every project I've thrown at it.

Both tools are on GitHub: [lgtm](https://github.com/yarlson/lgtm) and [snap](https://github.com/yarlson/snap). Go build something that remembers.
