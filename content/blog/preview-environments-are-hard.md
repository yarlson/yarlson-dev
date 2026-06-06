---
title: "Preview Environments Are Easy to Want and Hard to Operate"
summary: "The pitch is obvious: per-PR environments, live links, faster feedback. Then a multi-service stack needs twenty restarts and the pitch meets operations."
postLayout: simple
date: "2026-04-07"
tags:
  - platform
  - docker
---

The pitch is irresistible.

Open a pull request and, within minutes, a running instance of your application appears just for that PR. Reviewers click a link and see the change live. QA does not wait for staging. Frontend and backend engineers validate integration without coordinating in Slack for half a day.

Clean. Fast. Obvious.

Then someone has to operate it.

## The demo vs. the twentieth deploy

The first preview environment demo usually works beautifully. You set it up carefully. You verified the happy path. You know exactly which button to click. People are impressed. Someone says "this changes everything."

The twentieth time a random engineer creates one from a feature branch, it does not start.

A service crashes during init. A queue connection times out. The frontend loads, but every API call returns a 502. The engineer restarts it. Same result. They restart again. This time a different service fails.

One team reported needing roughly twenty restarts to get a multi-service preview environment fully operational. Not because every component was broken. Each component could start eventually. The system just had enough moving parts that startup timing, resource pressure, and initialization order kept producing some new failure.

Twenty restarts. For a developer productivity tool.

That is the gap between preview environments as a concept and preview environments as an operating environment. Vendor pitches usually skip that part because creating environments is not the hard bit.

Keeping them reliable is.

## Config divergence is where the lies start

Preview environments rarely run on identical infrastructure to production. Maybe they use a lightweight Kubernetes distribution. Maybe smaller instances. Maybe a cheaper region. Maybe simplified networking.

Those are reasonable cost choices.

They are also traps.

A service works in production. It works in staging. It fails in preview because the preview infrastructure requires an environment variable production gets implicitly from Kubernetes. A message queue config flag, for example, that is automatic in one setup and manual in the other.

Nobody documented it. Nobody predicted it. It is just what happens when the same app runs on different infrastructure.

Discovering it costs a day: SSH into the container, read raw logs, compare configs, find the missing variable, add it, restart, verify.

Multiply that by every service and the pattern gets clear. Config divergence is not a bug you fix once. It is a category of friction. Every infrastructure difference between preview and production is a potential false positive or false negative.

"It fails here but works in prod."

"It works here but fails in prod."

You can reduce the divergence. You usually cannot eliminate it. And every time you find one, it feels like surely this was the last one.

It never is.

## Quick fixes become permanent

Preview environments need routing. Frontend to backend. Proxy to containers. Requests to the right branch-specific environment.

Simple enough until a container restarts.

The container gets a new IP. The proxy still has the old one cached. Requests fail with a timeout or a vague 502 that tells you nothing useful.

The quick fix: restart the proxy on every deploy.

Blunt. Ugly. Effective.

The proper fix is service discovery, health-check-driven routing, and graceful connection draining. That is real infrastructure work: weeks of implementation, careful testing, blast radius.

So the quick fix stays. It becomes part of the deploy config. Six months later, someone sees "restart proxy" baked into every deploy and asks why. The answer is: because the proper fix was always next quarter, and next quarter never arrived.

This happens everywhere, but preview environments are especially good at collecting these compromises. They sit between production-grade and "good enough for dev." Nothing gets full production treatment, so everything collects workarounds.

## Ephemeral is a policy, not a property

Preview environments are supposed to be temporary.

But temporary is a policy decision, and policy always has edge cases.

Auto-shutdown after a timeout? Good for cost. Bad for the engineer who goes to lunch and comes back to a dead environment. Manual cleanup? Saves nothing, because nobody remembers. Shutdown on PR merge? Reasonable until someone tests a draft PR for a week.

And the moment preview environments become useful enough for daily testing, someone asks for persistence.

"Can you make mine not auto-shutdown?"

The request is reasonable. It is also the beginning of the end of ephemeral.

You say yes because the use case is real. Then another team asks. Then another. Now you operate a fleet of "temporary" environments, some running for three weeks, consuming resources, drifting from their branches, and nobody remembers which ones still matter.

Infrastructure defined as temporary becomes permanent the moment it is useful. Weird how that works.

## Multi-service stacks are where it gets real

The real unlock is multi-service preview environments. Not just your API in isolation, but the API, worker, frontend, queue, and related services from the same set of PRs, all pointed at each other.

That is also where complexity stops being polite.

Each service has its own build, startup sequence, health checks, and config. Linking them into one stack means resolving version dependencies across services. Startup order matters. The worker cannot start before the queue is ready. The frontend cannot be healthy before the API is healthy. A health check that works for one service may say nothing about the whole stack.

The first external tester of a multi-service stack will find bugs within hours. Not because the feature is bad, but because the surface area is huge. N services, each with independent state and startup behavior, coordinated into one environment. You tested the happy path. They found path 47.

"How hard can it be to link four services together?"

Famous last words. The linking is easy. Reliability is the mountain.

## What actually works

Teams that run preview environments successfully have a few habits. None of them are "picked the magic tool."

**They invest more in debugging than creation.** Spinning up an environment is table stakes. Diagnosing why one is broken, without SSH spelunking and half a day of log archaeology, is what decides whether people keep using it. The teams that survive build diagnostics, structured health checks, and runbooks. The teams that do not build a beautiful creation flow and wonder why adoption dies in month two.

**They accept that reliability is ongoing work.** Preview environments are not a feature you ship and forget. They are an operating environment. New services arrive. Infra changes. Dependencies shift. The preview setup has to track all of it, forever.

**They keep scope honest.** Not everything belongs in a preview environment. Third-party OAuth? Contract test it. Payment processing? Stub it. External webhooks? Mock them. Reproducing every external integration turns "ephemeral" into "production, but worse."

**They treat config parity as engineering work.** Every environment variable, feature flag, and infrastructure assumption that differs from production is a possible lie. The winning teams keep a single source of truth and flag divergence automatically, before an engineer loses an afternoon finding it by hand.

## The question nobody asks early enough

The question is not "should we build preview environments?" For many engineering orgs, yes. The value is real.

The better question is: are we willing to operate them?

Not build them. Operate them.

Debug them when they break. Maintain them as the system changes. Invest in the boring tools that make them reliable. Own the lifecycle policy. Keep config honest. Retire the workarounds instead of letting them become folklore.

The pitch describes the creation experience: click a link, see your PR live.

It does not describe the proxy routing to a dead container. It does not describe the three-week investigation into a third-party integration on lightweight infrastructure. It does not describe the twenty restarts.

If you are willing to operate them, preview environments can be one of the best developer experience investments you make.

If the plan is "we'll build it and it'll just work," good luck with that.
