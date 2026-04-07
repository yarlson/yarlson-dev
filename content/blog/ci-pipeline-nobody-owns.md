---
title: "The CI Pipeline Nobody Owns"
summary: "Your CI pipeline is building the same Docker image three times per run, a dependency bot just DDoS'd your runner fleet, and nobody's going to fix it — because nobody owns it. How shared pipelines corrode without a single bad decision."
postLayout: simple
date: "2026-04-07"
tags:
  - ci
  - platform
---

Your CI pipeline is building the same Docker image three times per run. Backend PRs are triggering the TypeScript compiler. A dependency bot opened 24 pull requests in two hours and ate your entire runner fleet for breakfast. And right now, someone on your team is staring at a "runner unavailable" error, sighing, and clicking re-run.

Nobody is going to fix this. Not because it's hard. Because nobody owns it.

## How a pipeline becomes a disaster without a single bad decision

Here's how it goes. A monorepo gets GitHub Actions. Someone sets up the initial workflows — a Docker build, some tests, a linting step. It works. Different teams add their own checks. A frontend team adds `tsc`. A backend team adds integration tests. An infra team adds a security scan. Each addition is reasonable. Each addition is reviewed and merged by someone who understands that specific check.

But nobody is reviewing the pipeline as a system. Nobody is asking: what happens when all of these run together?

What happens is this: a single PR triggers 47 minutes of CI. The Docker image gets built in three separate jobs because nobody set up a shared build step. The TypeScript compiler runs on a PR that only changed a Go file. A full-repo lint pass fires on a one-line README fix. And somewhere in the middle of all that, the runner pool runs out of capacity, so half the jobs queue for ten minutes before they even start.

The pipeline didn't break. It corroded. Slowly, one reasonable addition at a time, until the whole thing was bloated, expensive, and fragile. And the worst part? It still technically works. Green checkmarks eventually appear. PRs eventually merge. So nobody escalates it, because "eventually" feels like "fine."

It's not fine.

## Let's talk about the ownership gap

The platform team says: "We manage the runners. We don't own the workflows." The feature teams say: "We added our checks. We don't own the infrastructure." Both are correct. Both are describing a hole in the org chart that your CI pipeline fell into.

This isn't a tooling problem. GitHub Actions, CircleCI, Jenkins — it doesn't matter. The gap is structural. CI pipelines sit at the intersection of infrastructure (runners, compute, scaling) and application concerns (what to test, what to lint, what to build). No single team naturally owns both halves. So nobody owns the whole.

And the thing about systems that nobody owns? They optimize for addition. It's easy to add a check. It's easy to add a workflow. It's easy to add a bot. Removing things requires understanding the whole system, and understanding the whole system is nobody's job.

So what does this actually cost?

**Money.** Runner costs drift upward by a few thousand dollars a month. Nobody notices because nobody's watching the trend line. Multiply it across a year and you've quietly burned $40K on redundant Docker builds and unscoped linting. What a concept — paying real money for CI checks that test nothing relevant to the PR they're running on.

**Time.** A PR takes 25 minutes to pass checks and 8 minutes to deploy after merge. Read that again. The verification phase is three times longer than the deployment phase. Something has gone structurally wrong, and the fix isn't "faster runners." The fix is "stop running things you don't need to run."

**Trust.** This is the one that actually kills you. When CI is flaky, engineers stop believing it. They re-run failed jobs without reading the error. They merge with amber checks. They build local workarounds to avoid triggering the full pipeline. The CI system becomes background noise — technically present, functionally ignored. And at that point, what are you even paying for?

## The dependency bot incident (or: how to DDoS yourself)

I can see the configuration review that approved the dependency update bot. "It'll keep our deps current! Automated PRs! Less toil!" Sure. Great.

But here's the thing: nobody configured concurrency limits. So the bot opens 24 pull requests in two hours. Each PR triggers the full CI pipeline. That's 24 simultaneous pipeline runs competing for the same runner pool. Every engineer trying to merge real work is now queued behind two dozen automated dependency bumps, waiting for runners that are busy linting a patch version update to a logging library.

This is a self-inflicted denial-of-service attack. The bot did exactly what it was configured to do. The problem wasn't the bot. The problem was that nobody thought about the bot as a participant in a shared system with finite resources.

The fix is boring: set a concurrency limit, batch updates, run them at 2 AM. But "boring" fixes require someone to notice the problem, understand the system well enough to scope the fix, and have the authority to change the bot's configuration. When nobody owns the pipeline, even boring fixes don't happen.

## After-hours scaling, or: the cost of "saving money"

Runners scale down after business hours to reduce cloud costs. Reasonable. But engineers work late sometimes. And when they push a commit at 7 PM and their CI job gets picked up by a runner that spins up and immediately dies because the scaling policy is mid-transition — well, that engineer just lost an hour of their evening.

The runner didn't crash. It was terminated by the scaling policy. But the error message says "runner unavailable," which tells the engineer nothing. So they re-run the job. It fails again. They wait. They try again in 20 minutes. Eventually it works. They go home annoyed.

This happens twice a week, to different engineers, and nobody connects the dots — because there's no observability on the runners, and there's no owner tracking the pattern.

## What actually fixes this

Look, the fixes aren't technically interesting. That's the point. The pipeline doesn't need a rewrite. It needs attention from someone with the mandate to treat it as a system.

**Scope checks to what changed.** Path-based filtering. If the PR only touches Go files, don't run `tsc`. If it only touches docs, don't build Docker images. This is supported natively by every major CI system. Configuring it is an afternoon of work. The savings are permanent. Boring is a superpower.

**Kill the redundant builds.** One Docker build per pipeline run, published to a short-lived tag, consumed by downstream jobs. Not three identical builds because three jobs each have their own `docker build` step. The plumbing takes a day. The payoff is measured in hours of compute saved per week.

**Rate-limit the bots.** Concurrency limits on automated PRs. Batch dependency updates. Off-peak scheduling. This is fifteen minutes of configuration. The fact that it hasn't been done tells you everything about the ownership gap.

**Make the cost visible.** Attribute runner spend to workflows. Put it on a dashboard. The moment a team lead sees that their linting step costs $400/month in compute, they'll scope it themselves. People optimize what they can measure. They ignore what they can't.

**Give someone the job.** Not a permanent "CI team." One engineer, one quarter, with the mandate to audit, measure, and fix. That's all it takes to break the "nobody owns it, so we all suffer" loop. The pipeline doesn't need a team. It needs an owner.

## The system nobody admits they built

So here's where we are. You've got a CI pipeline that was never designed — it was accumulated. Each piece was reasonable in isolation. The whole thing is slow, expensive, flaky, and unowned. The fixes are straightforward. The organizational will to apply them is not.

CI pipelines are infrastructure that masquerades as configuration. They feel like YAML files that each team manages independently. But they behave like shared distributed systems with finite resources, cross-team dependencies, and real operational costs. The moment one team's bot can starve another team's runners, you don't have a collection of independent workflows. You have a system. And systems without owners don't degrade gracefully — they corrode quietly until someone finally asks why the cloud bill went up $40K and the answer is "nobody was looking."

The engineering is easy. The hard part is someone saying: this is real infrastructure, it needs a real owner, and that work counts.

If you've been silently re-running failed CI jobs and shrugging — you're not alone. But the shrug is the problem.
