---
title: "AI Coding Agents Need a Source of Truth"
summary: "Bigger prompts do not fix drifting agent plans. A good workflow starts with a small brief, human review, task sizing, and checks against real artifacts."
postLayout: simple
date: "2026-05-08"
tags:
  - llm
  - ai
---

When an AI coding agent makes a bad plan, the usual fix is "add more prompt."

More rules. More examples. More warnings. Tell it to be careful. Tell it not to hallucinate. Tell it to respect every engineering acronym we have collected over the last twenty years.

Sometimes that helps a bit.

Usually it hides the actual problem.

The agent does not need a bigger prompt. It needs something true to anchor against.

## A big prompt is not a plan

Long prompts can look serious. They have sections, rules, rubrics, and stern little warnings. They feel like process.

But they do not make the task true.

If the task is vague, the agent fills the gaps. It invents files. It invents requirements. It adds tasks that sound useful but do not match the goal.

That is the expensive kind of wrong: plausible wrong.

Obviously bad output is easy to reject. Plausible wrong output wastes time. You have to compare it against the real task, find the drift, and explain why the confident plan is nonsense.

At that point the human is doing the grounding manually.

The workflow should do that before the agent starts planning.

## Start with a brief

Before the agent writes a plan, make it write a brief.

Not a fake product spec. Not a thirty-page ceremony. Just a small file that says what is known.

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

This is boring. That is why it works.

Now the agent has something to compare against. A task is either supported by the brief or it is not. A feature is either in scope or it is not. An assumption is either written down or it is not.

Without the brief, the agent works from vibes.

With the brief, it has ground.

## The human should edit the brief

The important part is not that the agent writes the brief.

The important part is that a human reviews it before planning starts.

This catches cheap mistakes while they are still cheap. Maybe the agent misunderstood the goal. Maybe it quietly added a non-goal. Maybe it missed a constraint. Maybe an open question blocks the whole thing.

Fixing that in the brief takes a minute.

Fixing it after the agent has written code can take hours.

This pause feels slow only if you ignore the downstream cost. Bad direction gets more expensive at every step.

## Size the task before planning it

Not every task deserves the same workflow.

Some tasks are tiny. Change a label. Fix one error message. Add a missing flag. These should not become a five-part architecture plan.

Some tasks are medium. Add a small feature. Change one flow. Refactor one package. These need a short checklist and a real verification step.

Some tasks are large. They cross boundaries, touch multiple files, and need review points.

The agent should classify the task before it plans the work.

If every request gets the same heavy process, the process becomes noise. You ask for one small fix and get a strategy document. Nobody in their right mind wants that.

Small tasks should stay small.

This is not laziness. It is matching process to risk.

## Review artifacts, not feelings

A critic step can help, but only if it checks something concrete.

"Review this plan" is mush.

Better:

```text
Review this task list against the brief.
Flag any task that:
- is not supported by the brief
- adds a non-goal
- depends on an unstated assumption
- has no verification step
```

Now the critic has a job.

Same thing after implementation:

```text
Check this diff against the brief.
Confirm that:
- the expected behavior is implemented
- non-goals were not added
- tests cover the important paths
- no unrelated files changed
```

That is much better than asking whether the code is "good."

Good according to what?

The brief gives the answer.

## Bigger prompts can hide weak systems

Prompts matter. Clear instructions help. Examples help. Good defaults help.

But after a point, adding more prompt is like adding comments to confusing code. It may explain the mess. It does not fix the structure.

A sane agent workflow is usually boring:

- write a short brief
- let the human edit it
- classify task size
- generate a plan only when needed
- check the plan against the brief
- check the diff against the plan and brief
- run the tests

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
