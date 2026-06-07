---
title: "The CI Pipeline Nobody Owns"
summary: "Your CI pipeline builds the same Docker image three times, a dependency bot eats your runner fleet, and nobody fixes it because nobody owns the system."
postLayout: simple
date: "2026-04-07"
tags:
  - ci
  - platform
---

Your CI pipeline is building the same Docker image three times per run. Backend PRs trigger the TypeScript compiler. A dependency bot opened 24 pull requests in two hours and ate the runner fleet for breakfast.

Right now, someone on your team is staring at a "runner unavailable" error, sighing, and clicking re-run.

Nobody is going to fix this.

Not because it is hard.

Because nobody owns it.

## How a pipeline corrodes

Here is how it usually happens.

A monorepo gets GitHub Actions. Someone creates the initial workflows: Docker build, tests, lint. It works. Different teams add their checks. Frontend adds `tsc`. Backend adds integration tests. Infra adds a security scan.

Each addition is reasonable. Each one is reviewed by someone who understands that specific check.

Nobody reviews the pipeline as a system.

Nobody asks: what happens when all of this runs together?

What happens is this: one PR triggers 47 minutes of CI. The Docker image gets built in three jobs because nobody set up a shared build step. TypeScript runs on a PR that changed only Go. Full-repo lint runs on a README fix. The runner pool runs out of capacity, so half the jobs queue before starting.

The pipeline did not break. It corroded.

One reasonable addition at a time, until the whole thing became slow, expensive, and fragile.

The worst part is that it still technically works. Green checks eventually appear. PRs eventually merge. So nobody escalates it, because "eventually" starts to feel like "fine."

It is not fine.

## The ownership gap

The platform team says: "We manage the runners. We do not own the workflows."

The feature teams say: "We added our checks. We do not own the infrastructure."

Both are correct. Both are describing the hole your CI pipeline fell into.

This is not a tooling problem. GitHub Actions, CircleCI, Jenkins, whatever. The gap is structural. CI sits at the intersection of infrastructure and application logic. Runners, compute, scaling on one side. What to test, lint, and build on the other.

No single team naturally owns both halves.

So nobody owns the whole.

Systems that nobody owns optimize for addition. It is easy to add a check. Easy to add a workflow. Easy to add a bot. Removing things requires understanding the system, and understanding the system is nobody's job.

So what does this cost?

**Money.** Runner spend drifts up by a few thousand dollars a month. Nobody notices because nobody watches the trend. Across a year, you quietly burn $40K on redundant Docker builds and unscoped linting.

**Time.** A PR takes 25 minutes to pass checks and 8 minutes to deploy after merge. Verification is three times longer than deployment. The fix is not "faster runners." The fix is "stop running things that do not apply."

**Trust.** This is the one that hurts. When CI is flaky, engineers stop believing it. They re-run failed jobs without reading logs. They merge around amber checks. They build local workarounds to avoid triggering the full pipeline. CI becomes background noise: technically present, functionally ignored.

At that point, what are you paying for?

## The dependency bot incident

I can picture the review that approved the dependency update bot.

"It'll keep our deps current. Automated PRs. Less toil."

Sure. Good idea.

Except nobody configured concurrency limits.

So the bot opens 24 pull requests in two hours. Each PR triggers the full CI pipeline. Twenty-four simultaneous runs compete for the same runner pool. Engineers trying to merge product work now sit behind automated patch bumps to logging libraries.

That is a self-inflicted denial-of-service attack.

The bot did exactly what it was configured to do. The problem was not the bot. The problem was nobody treated it as a participant in a shared system with finite resources.

The fix is boring: set concurrency limits, batch updates, run them off-peak.

But boring fixes still require an owner. Someone has to notice the problem, understand the pipeline, and have authority to change the config.

When nobody owns the pipeline, even boring fixes do not happen.

## The cost of "saving money"

Runners scale down after business hours to save cloud spend. Reasonable.

Engineers also work late sometimes. When one pushes at 7 PM and a job lands on a runner that starts and immediately dies because the scaling policy is mid-transition, that engineer loses an hour.

The runner did not "flake." It was terminated by policy. But the error says "runner unavailable," which tells the engineer nothing useful.

So they re-run. It fails again. They wait. They try in 20 minutes. Eventually it passes. They go home annoyed.

This happens twice a week to different people, and nobody connects the dots because there is no runner observability and no owner tracking the pattern.

## What actually fixes it

The fixes are not technically interesting. That is the point. The pipeline does not need a grand rewrite. It needs attention from someone with the mandate to treat it as a system.

**Scope checks to what changed.** Path-based filtering. If the PR only touches Go, do not run `tsc`. If it only touches docs, do not build Docker images. Every major CI system supports this. Configuring it is an afternoon. The savings are permanent.

**Kill redundant builds.** Build the Docker image once per pipeline run, publish it to a short-lived tag, and let downstream jobs consume it. Not three identical `docker build` steps because three jobs each live in their own little world.

**Rate-limit bots.** Concurrency limits, batching, off-peak schedules. Fifteen minutes of configuration. The fact that it is not already done tells you everything about ownership.

**Make cost visible.** Attribute runner spend to workflows. Put it on a dashboard. The moment a team lead sees their lint step costs $400/month, they will scope it themselves. People optimize what they can see.

**Give someone the job.** Not a permanent CI department. One engineer, one quarter, with a mandate to audit, measure, and fix. That is enough to break the "nobody owns it, so everyone suffers" loop.

The pipeline does not need a team.

It needs an owner.

## The system nobody admits they built

Your CI pipeline was not designed. It accumulated.

Each piece was reasonable alone. Together, the system is slow, expensive, flaky, and unowned. The fixes are straightforward. The organizational will is the hard part.

CI pipelines are infrastructure pretending to be YAML. They feel like config each team can manage independently. They behave like shared distributed systems with finite resources, cross-team dependencies, and real operating costs.

The moment one team's bot can starve another team's runners, you do not have independent workflows. You have a system.

Systems without owners do not degrade gracefully. They corrode quietly until someone asks why the cloud bill went up $40K and the answer is "nobody was looking."

The engineering is easy.

The hard part is someone saying: this is real infrastructure, it needs a real owner, and that work counts.

If you have been silently re-running failed CI jobs and shrugging, you are not alone.

But the shrug is the problem.
