---
title: "FTL: Single-Server Deployments Without the Cluster"
summary: "FTL deploys Docker apps over SSH with one YAML file, no required registry, Nginx routing, SSL, health checks, and deployment hooks. It is for the space between rsync scripts and a full orchestrator."
postLayout: simple
date: "2025-01-18"
tags:
  - docker
---

Deployment tools eventually disappoint you. Either it's a shell script held together with `rsync` and prayers, or it's a full Kubernetes cluster for an app that serves maybe forty requests per second. I spent years living in that gap — running docker-compose in production, stitching together custom deploy scripts, and pretending it was fine. It wasn't fine.

So I built FTL. The important part is what it does not require: no registry, no orchestrator, no sprawling config. One YAML file, one binary, one SSH connection.

But let me back up.

## The deployment tool landscape is a wasteland

Look, the market has exactly two offerings. Camp one: shell scripts and `rsync`. Works until it doesn't. Camp two: Kubernetes, Nomad, ECS — platforms that treat a three-service web app like it's the Mars rover. Tools like Kamal and Sidekick have tried to carve out middle ground, and they deserve credit for that. But Kamal locks you into single-service thinking. Sidekick skips database provisioning entirely. Neither felt complete.

What I actually needed was tight. Zero-downtime deploys without ceremony. Frontend and backend services in one definition. Database provisioning without bolting on separate tooling. Configuration-driven, not script-driven.

Why is this so hard to find?

## One YAML file. That's it.

I wrote FTL in Go for reasons that sound boring but matter: rock-solid SSH libraries, single-binary distribution, and concurrency primitives that don't fight you when you're juggling five deployment tasks in parallel.

But the real breakthrough was killing config sprawl. A typical docker-compose deployment involves `docker-compose.yml`, `nginx.conf`, deploy scripts, SSL cert automation scripts, maybe a Makefile to glue it all together. Brittle. Hollow. Every new developer on the team asks "wait, which script do I run?"

FTL collapses all of it into one YAML file. Want zero-downtime deploys? Automatic. Need SSL certs? Handled. Running database migrations? Hook them into the deploy step. It's what docker-compose should have been — smart enough to handle the tedious parts, lean enough that you can read the whole thing and understand what's happening.

## Docker Registries Are Optional

Tools like Kamal and Sidekick force you through a Docker registry. Build image, push to registry, pull from registry, run. For every single deploy. Even when your "production infrastructure" is one server in Hetzner.

That middleman is dead weight. FTL can work with registries if you want one. But it doesn't need one. Instead, it performs layer-by-layer analysis and transfers only the changed bits directly over SSH. No registry authentication. No storage costs. No extra network hop. In testing, this dropped deployment times by roughly 60%.

The same philosophy runs through the whole tool. Built-in Nginx config generation handles routing and SSL. Everything travels over plain SSH. All you need is a bare Linux server with SSH access — FTL handles the rest, including installing Docker if it's missing. That simplicity matters.

## Zero-downtime without the orchestrator tax

The trickiest engineering problem was making zero-downtime deploys work without complex orchestration machinery. No sidecars. No service mesh. No control plane.

The solution is a rolling update sequence: start the new container, wait for health checks to pass, update the Nginx configuration to route traffic, then gracefully shut down the old container. Four steps. Careful timing and proper signal handling make it reliable — especially for long-lived connections on the Go backend. Nothing clever. Just earned reliability through getting the sequencing right.

## Database migrations that don't make you sweat

Managing database state during deploys is where most tools either punt or overcomplicate. FTL offers two flavors of deployment hooks — local and remote.

Local hooks automatically create SSH tunnels to your databases. You run migrations from your machine while the database port stays closed on the production server. Security without gymnastics. Remote hooks let you run migrations directly on the server if that's your preference.

Why force one approach? Different teams have different security postures, different compliance requirements, different opinions. FTL gives you both and stays out of the way.

## What FTL doesn't do

I'm not going to pretend it's perfect. No distributed multi-server deployments yet. If you opt into a Docker registry, you're limited to username/password auth. There's no built-in rollback mechanism — though containers are preserved so you can roll back manually. Database backups are your responsibility.

Those limitations are honest. They're the boundaries of a tool that does one thing well rather than a tool that claims to do everything and does most of it poorly.

## How fast, actually?

First deployment to a fresh server takes a few minutes. FTL sets up its environment, installs Docker if needed, transfers all your application layers. That's the slow part.

After that? Subsequent deploys land in about a minute. The speed comes from layer diffing — FTL only pushes what's changed since your last deploy. On the server side, you've got your containers and an Nginx reverse proxy on the host. Nothing else. No agents. No daemons. No monitoring sidecar eating RAM. And the deploys are genuinely zero-downtime. Your users won't notice.

## The Point

I started FTL because the space between "SSH and hope" and "operate a cluster" was empty. Every tool either demanded too little thinking or too much infrastructure. FTL sits in that gap — one binary, one config file, zero-downtime deploys over SSH, no registry required, database migrations built in.

Simplicity isn't the absence of capability. It's the discipline to stop before the tool becomes the thing you're debugging instead of the thing you're shipping.

Full documentation lives at [ftl-deploy.org](https://ftl-deploy.org). The project is open source at [github.com/yarlson/ftl](https://github.com/yarlson/ftl).
