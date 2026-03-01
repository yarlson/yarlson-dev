---
title: "When AI Agents Remember: Building Persistent Memory for Autonomous Coding"
summary: "What happens when you give an AI coding agent memory that persists across tasks? It stops repeating the same mistakes. Here's how lgtm and snap use persistent findings, shared context, and self-recovery to close the loop from planning to merged PR."
postLayout: simple
date: "2026-03-01"
tags:
  - llm
  - go
---

I've been building tools that let AI coding agents work autonomously — not just autocomplete a function, but plan a feature, implement it with tests, review their own code, fix issues, and commit. The two tools at the center of this work are [lgtm](https://github.com/yarlson/lgtm) and [snap](https://github.com/yarlson/snap). Both went through rapid development over the past month, and the biggest lesson wasn't about prompts or models. It was about memory.

## The Stateless Agent Problem

The first version of lgtm was essentially a loop: read the PRD, break it into tasks, hand each task to Claude Code, verify the result, commit if it passes. It worked — for about two tasks. By task three, the agent would make the same mistake it made on task one. Wrong test command. Wrong import path. An architectural pattern that had already been tried and rejected.

The issue is obvious in hindsight. Each task started with a blank slate. The agent had no way to know what it had learned five minutes ago.

## Persistent Findings: A Project Memory File

The fix was a file called `findings.md` that lives in `.lgtm/` and accumulates knowledge across the entire run. After each task — whether it succeeds or fails — the system writes what it discovered: which test patterns work, which verification commands are correct, which architectural constraints exist.

Here's the key: findings aren't just logged, they're injected into the planner and implementer prompts for every subsequent task. The agent reads its own history before starting new work.

```go
// Before planning the next task, load accumulated findings
findings, err := findings.Load(".lgtm/findings.md")
if err == nil {
    prompt = prompt + "\n\nProject findings from previous tasks:\n" + findings
}
```

This single change transformed lgtm from a tool that repeated mistakes into one that improved over the course of a project.

## The Compaction Problem

There's an obvious issue with appending findings forever: the file grows, and eventually it fills the context window with redundant information. "Always use `go test ./...` instead of `go test`" doesn't need to appear fourteen times.

The solution is AI-powered self-compaction. When `findings.md` exceeds 8KB, lgtm feeds it back through the LLM with instructions to merge duplicates, remove superseded entries, and keep only actionable rules. The compacted output replaces the original file.

This is a design I hadn't seen elsewhere: using the same LLM that generates findings to periodically compress them. It works because the compaction task is genuinely simpler than the coding task — the model is merging structured text, not reasoning about code. The 8KB threshold was chosen to keep findings well within a single prompt's useful context. After compaction, the file typically shrinks by half.

## Shared Context: Explore Once, Use Everywhere

A related problem showed up when I looked at how many tokens each task was consuming. The decomposer, implementer, reviewer, and fixer were all independently exploring the codebase — reading the same files, building the same mental model, burning the same tokens.

The fix was an explicit explorer phase that runs once at the start of a session. It produces `static.md`, a snapshot of the codebase's architecture, key files, and patterns. Every subsequent phase reads from this shared context instead of exploring independently.

```
Session start
  └─ Explorer → static.md (one-time codebase analysis)
      ├─ Decomposer reads static.md + PRD → tasks
      ├─ Implementer reads static.md + task + findings → code
      ├─ Reviewer reads static.md + diff → feedback
      └─ Fixer reads static.md + feedback → fixes
```

On top of the static context, the decomposer generates per-task `focus.md` files that narrow the scope to the specific files and patterns relevant to each task. The combination of broad static context plus narrow per-task focus gives each phase exactly the right amount of information without redundant exploration.

## Self-Recovery: Escaping Dead Ends

Even with memory and shared context, agents get stuck. A partially implemented feature breaks tests, the fixer can't resolve it after three attempts, and the system enters an infinite retry loop.

The recovery mechanism in lgtm uses a `RecoverableError` type. When the implementer fails verification three times, instead of retrying forever, it:

1. Records what failed and why in `findings.md`
2. Resets the workspace (`git reset --hard` + `git clean`)
3. Returns to the planner with the failure context

The next planning attempt has the finding "Approach X failed because of Y" in its prompt. It plans differently.

This is the piece that makes autonomous operation actually work on real projects. Without it, a single difficult task blocks everything. With it, the system falls back, learns, and tries a different approach.

## Closing the Loop: From Commit to Merged PR

In snap, the same philosophy extends past implementation into the delivery pipeline. After all tasks complete, a postrun phase takes over:

1. **Auto-push** — detects the remote, pushes the branch
2. **PR creation** — calls Claude to generate a title and description from the commit history, opens the PR via `gh`
3. **CI monitoring** — polls GitHub Actions for workflow status, showing a live summary of passing and failing checks
4. **Auto-fix** — if CI fails, fetches the logs (kept in memory, never written to disk), feeds them to Claude, commits the fix, and pushes again. Up to 10 retries.

The CI auto-fix loop is particularly interesting because it creates a feedback cycle between the test environment and the agent. The agent wrote the code, CI found a problem the local tests didn't catch, and now the agent fixes it without human intervention.

The retry limit of 10 prevents runaway loops, and the decision to keep CI logs in memory only (never on disk) avoids polluting the workspace.

## What Actually Matters

After a month of building these systems, my takeaways are practical:

1. **Memory changes everything.** A stateless agent is a demo. A stateful agent is a tool. The implementation is trivial — it's just a file — but the impact on output quality is dramatic.

2. **Explore once.** Repeated codebase exploration is the biggest token waste in multi-phase agentic workflows. A shared context file eliminates it.

3. **Let agents fail gracefully.** Hard failures are fine as long as the system records what happened and has a path to retry differently. The `RecoverableError` pattern in lgtm is simple and directly reusable.

4. **Close the full loop.** The gap between "code committed locally" and "PR merged" is where most autonomous tools stop. Automating push, PR creation, and CI monitoring is what makes the difference between a coding assistant and an autonomous workflow.

These aren't theoretical patterns. They're the result of running lgtm and snap on real projects and watching where they break. The tools are still evolving, but the core insight — that memory, context sharing, and graceful recovery are more important than prompt engineering — has held up.

You can find both tools on GitHub: [lgtm](https://github.com/yarlson/lgtm) and [snap](https://github.com/yarlson/snap).
