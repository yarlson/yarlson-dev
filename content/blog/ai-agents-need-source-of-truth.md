---
title: "AI Coding Agents Need a Source of Truth"
summary: "Bigger prompts do not fix bad agent plans. A good agent workflow starts with a small brief, human review, task sizing, and checks against concrete artifacts."
postLayout: simple
date: "2026-05-08"
tags:
  - llm
  - ai
---

When an AI coding agent makes a bad plan, the first reaction is usually to add more prompt.

Add more rules. Add more examples. Add more principles. Tell it to be careful. Tell it not to hallucinate. Tell it to follow every engineering acronym we have collected over the last twenty years.

Sometimes that helps a little.

Most of the time it hides the real problem.

The agent does not need a longer prompt. It needs a source of truth.

## A big prompt is not a plan

Long prompts can look serious. They have sections, rules, rubrics, and warnings. They sound like process.

But a long prompt does not mean the agent knows what is true.

If the task is vague, the agent will fill the gaps. It will invent files. It will invent requirements. It will add tasks that sound useful but do not match the actual goal.

This is the worst kind of wrong: plausible wrong.

Obviously bad output is easy to reject. Plausible wrong output wastes time. You have to read it carefully, compare it with the real task, and find the places where it drifted.

At that point the human is doing the grounding work manually.

That is the part the workflow should handle.

## Start with a brief

Before the agent writes a plan, make it write a brief.

Not a big document. Not a fake product spec. Just a small file that says what is known.

Example:

```markdown
# Brief

Goal:
- Add CSV import for contacts.

Expected behavior:
- User can upload a CSV file.
- The app validates required columns.
- Invalid rows are shown before import.
- Valid rows can be saved.

Non-goals:
- No Excel support.
- No background jobs.
- No new schema editor.

Open questions:
- Maximum file size?
- Should duplicate rows be skipped or rejected?
```

This is simple. That is why it works.

Now the agent has something to compare against. A task is either supported by the brief or it is not. A feature is either in scope or it is not. An assumption is either written down or it is not.

Without a brief, the agent works from vibes.

With a brief, it has ground.

## The human should edit the brief

The important step is not that the agent writes the brief.

The important step is that the human reviews it before planning starts.

This catches the cheap mistakes early. Maybe the agent misunderstood the goal. Maybe it added a non-goal. Maybe it missed a constraint. Maybe there is an open question that must be answered first.

Fixing that in the brief takes one minute.

Fixing it after the agent writes code can take hours.

This pause can feel slow, but it is not slow. It is the cheapest place to correct the direction.

Bad direction gets more expensive at every step.

## Size the task before planning it

Not every task needs the same workflow.

Some tasks are tiny. Change a label. Fix one error message. Add a missing flag. These should not become a large plan.

Some tasks are medium. Add a small feature. Change one flow. Refactor one package. These need a short checklist and tests.

Some tasks are large. They touch many files, have tradeoffs, and need review points.

The agent should decide the size before it plans the work.

If every task gets the same heavy process, the process becomes noise. You ask for one small fix and get a five-part architecture plan. Nobody wants that.

Small tasks should stay small.

This is not about being lazy. It is about matching the workflow to the risk.

## Review artifacts, not feelings

A critic step can be useful, but only if it checks something concrete.

"Review this plan" is too vague.

Better:

```text
Review this task list against the brief.
Flag any task that:
- is not supported by the brief
- adds a non-goal
- depends on an unstated assumption
- has no verification step
```

Now the critic has a real job.

The same idea works after implementation:

```text
Check this diff against the brief.
Confirm that:
- the expected behavior is implemented
- non-goals were not added
- tests cover the important paths
- no unrelated files changed
```

This is much better than asking the model whether the code is "good".

Good according to what?

The brief gives the answer.

## Bigger prompts can hide weak systems

Prompts matter. Clear instructions help. Examples help. Good defaults help.

But after a point, adding more prompt is like adding more comments to confusing code. It may explain the mess. It does not fix the structure.

A better agent workflow is usually boring:

- write a short brief
- let the human edit it
- classify task size
- generate a plan only when needed
- check the plan against the brief
- check the diff against the plan and brief
- run tests

This is not magic. It is normal engineering discipline around a tool that is very good at sounding confident.

That confidence is useful when it is grounded.

It is expensive when it is not.

## The real output is the workflow

The best agent setups do not depend on one perfect prompt.

They use small artifacts that keep each other honest.

The brief grounds the plan. The plan guides the diff. The tests check the diff. The critic checks whether each step stayed inside the brief.

That chain matters more than the model sounding smart.

The agent did not fail because it lacked instructions.

It failed because it lacked ground.

Give it a small truth first. Then let it work.
