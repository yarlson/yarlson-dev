---
title: "FTL: Production Deployments Without The Complexity"
summary: "A technical deep-dive into FTL, a deployment tool that brings zero-downtime updates and production-grade features to Docker-based applications without the complexity of container orchestration platforms. Learn about the engineering decisions behind direct container layer transfers, automated SSL management, and flexible database deployment strategies that make FTL a compelling alternative to traditional CI/CD pipelines."
postLayout: simple
date: "2025-01-18"
tags:
  - docker
---

After years of deploying applications with various technology stacks in production using docker-compose, I started feeling there should be a better way. While docker-compose got the job done, deployment automation was always a custom script on top. And while Kubernetes offers powerful container orchestration, rolling updates, and an extensive ecosystem, setting up and maintaining a cluster for basic applications felt like overkill. I wanted something that sat in that sweet spot between running docker-compose commands over SSH and managing a full container cluster.

Most deployment tools seem to fall into two camps: either they're too simplistic (rsync scripts), or they're full-blown orchestration platforms that feel like overkill for smaller projects. Tools like Kamal (Ruby) and Sidekick (Go) have emerged to fill this gap, but they either lock you into single-service deployments or lack database provisioning. I needed something that could handle zero-downtime deployments without complexity, manage both frontend and backend services, deal with databases and dependencies without separate tooling, and stay lightweight and configuration-driven.

I landed on Go for FTL because it solved my biggest headaches - I needed solid SSH handling for remote ops, wanted to give users a single binary that "just works" on any platform, and the concurrency primitives made sense for juggling multiple deployment tasks. But the real breakthrough was realizing I could ditch the sprawl of config files. Instead of juggling docker-compose.yml, nginx.conf, deploy scripts, and SSL cert automation, everything lives in one YAML file that defines your entire stack. Want zero-downtime deploys? They're automatic. Need SSL certs? FTL handles it. Running database migrations? Hook them into the deploy step. It's basically what I wished docker-compose could do out of the box – smart enough to handle the tedious stuff but not so clever that you can't figure out what's going on under the hood.

A major pain point with tools like Kamal and Sidekick is their reliance on external Docker registries - you're forced to push and pull images through a registry even for a simple deployment. I wanted to cut out this middleman. FTL can work with registries if you want, but it doesn't need one - it performs layer-by-layer analysis and transfers only the changed bits directly over SSH. This dropped deployment times by ~60% in testing, plus you don't need to deal with registry authentication or storage costs. The same philosophy applied to other components: built-in Nginx config generation handles routing and SSL, and everything works over plain SSH. All you need is a bare Linux server with SSH access - FTL handles the rest, even installing Docker if it's not there.

The trickiest technical challenge was handling zero-downtime deployments without complex orchestration. The solution was a rolling update process that starts the new container, waits for health checks to pass, updates the Nginx configuration to route traffic, and gracefully shuts down the old container. This required careful timing and proper signal handling, especially for the Go backend service.

Managing database state during deployments was another interesting challenge to solve. FTL offers two types of deployment hooks - local and remote. With local hooks, it automatically creates SSH tunnels to your databases, so you can run migrations from your machine while keeping the database port closed on the production server. Or if you prefer, you can use remote hooks to run migrations directly on the server. This dual approach gives developers the flexibility to handle database changes however they prefer while keeping everything secure.

Being honest, FTL isn't perfect. It doesn't support distributed deployments across multiple servers yet. If you opt to use a Docker registry (which is entirely optional), you're limited to username/password authentication. There's no built-in rollback mechanism (though containers are preserved for manual rollback), and database backups must be handled externally. But for its intended use case – deploying modern web applications without unnecessary complexity – it works remarkably well.

How fast is it? First deployment to a fresh server takes a few minutes - FTL needs to set up its environment, install Docker if needed, and transfer all your application layers. Once that's done, subsequent deploys are pretty snappy, usually clocking in around a minute. The speed comes from the way FTL handles container layers: it only pushes what's changed since your last deploy. On the server side, you've just got your containers and a Nginx reverse proxy running on the host - nothing fancy, just the essentials. And yeah, those deployments are genuinely zero-downtime - your users won't notice a thing when you push updates.

Looking ahead, I'm actively working on automated database backups, multi-server deployment support, and better logging and monitoring integration. But the core goal remains the same: making deployments simple again.

Full documentation is available at https://ftl-deploy.org. The project is open source at https://github.com/yarlson/ftl - if you're tired of complex deployments too, I'd appreciate a star. It helps other developers find a simpler way to ship their code.

Written by a developer who just wanted deployments to be simple again.
