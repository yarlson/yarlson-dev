---
title: "Why I Created Zero: A Lightweight SSL Certificate Manager"
summary: "In the world of web development, securing your applications with SSL/TLS certificates is non-negotiable. However, managing SSL certificates can be a daunting task, especially when you're dealing with multiple domains, renewals, and the complexities of the ACME protocol. This is why I created Zero, a lightweight SSL certificate manager designed to simplify the process of obtaining, renewing, and managing SSL/TLS certificates."
postLayout: simple
date: "2025-01-27"
tags:
  - docker
---

SSL certificates should be boring infrastructure. You point a tool at a domain, it gets the cert, it renews the cert, you never think about it again. That's the whole job.

So why does every existing solution make this feel like configuring a space shuttle?

## The landscape is wrong

**Certbot** is the default answer, and it works. But it drags Python into your container, demands you understand its config file hierarchy, and turns "renew a certificate" into an afternoon of debugging when Docker gets involved. For a single domain on a small VPS, it's a forklift where you need a hand truck.

**Traefik** handles certs automatically — as a side effect of being a full reverse proxy and load balancer. Adopting Traefik's entire ecosystem to get free SSL is like buying a restaurant because you wanted lunch.

**Caddy** is genuinely great. Automatic HTTPS, minimal config, batteries included. But it _is_ the web server. If you're already running Nginx — and most of us are — Caddy doesn't slot in. It replaces.

What I wanted was simpler: a single binary that obtains certs, renews them, and tells Nginx to reload. Nothing more.

## So I built Zero

[Zero](https://github.com/yarlson/zero) is a single-purpose SSL certificate manager written in Go. No Python runtime. No web server bundled in. No ecosystem to adopt.

It does four things:

1. Runs an HTTP server on port 80 to handle ACME challenges
2. Redirects all other HTTP traffic to HTTPS
3. Checks certificates daily and renews them 30 days before expiry
4. Executes a post-renewal hook — like reloading Nginx in a sibling container

That's it. Simplicity is a superpower.

## Docker Compose, the real-world version

Here's how Zero actually runs in production:

```yaml
volumes:
  certs:

services:
  zero:
    image: yarlson/zero:latest
    ports:
      - "80:80"
    volumes:
      - certs:/certs
    command:
      - -d
      - example.com
      - -e
      - user@example.com
      - -c
      - /certs
      - --hook
      - nginx -s reload
      - --hook-container
      - nginx
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - certs:/etc/nginx/certs:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - zero
    restart: unless-stopped
```

Zero gets the cert, writes it to a shared volume, reloads Nginx. Nginx serves HTTPS. Renewals happen silently at 2 AM. You deploy this once and forget about it.

## 1.2 MiB

Let's talk about resource usage. Here's `docker stats` from a real deployment:

```bash
aerie@pdg:~$ docker stats --no-stream
CONTAINER ID   NAME                       CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
4d533325bc1d   ftl-flask-demo-zero        0.00%     1.238MiB / 961.6MiB   0.13%     3.44kB / 2.03kB   0B / 0B           5
279fae42a9a6   ftl-flask-demo-proxy       0.00%     4.691MiB / 961.6MiB   0.49%     985kB / 1.06MB    2.86MB / 24.6kB   2
2472f07ebcd4   ftl-flask-demo-flask-app   0.01%     101.7MiB / 961.6MiB   10.57%    3.44MB / 4.21MB   26.3MB / 0B       4
c4ba57ee6afb   ftl-flask-demo-postgres    0.01%     25.14MiB / 961.6MiB   2.61%     3.62MB / 2.87MB   15MB / 287kB      9
```

Zero: **1.238 MiB**. The Nginx proxy next to it uses nearly four times that. On a cheap VPS with a gig of RAM, this matters. Every megabyte you don't burn on infrastructure is a megabyte your app can use.

## Zero inside FTL

Zero also serves as the SSL backbone of [FTL (Faster Than Light)](https://github.com/yarlson/ftl), my deployment tool for single-server setups. FTL takes a YAML config, provisions containers, wires up Nginx as a reverse proxy, and hands certificate management entirely to Zero.

```yaml
project:
  name: my-project
  domain: my-project.example.com
  email: my-project@example.com

server:
  host: my-project.example.com
  user: my-project
  ssh_key: ~/.ssh/id_rsa

services:
  - name: web
    path: ./src
    port: 80
    health_check:
      path: /
    routes:
      - path: /

dependencies:
  - "postgres:16"
```

No SSL section. No certificate flags. FTL reads the domain and email, Zero handles the rest. Certificates appear, renewals happen, Nginx reloads — all invisible. That's the whole point.

## The thesis

Look, SSL certificate management is a solved problem that the existing tools insist on making unsolved. Certbot is too heavy. Traefik is too much. Caddy is the wrong shape if you already have a web server.

Zero does one thing well: it gets your certs, renews your certs, and stays out of your way. A single Go binary, a couple megabytes of RAM, zero ongoing attention required.

Sometimes the best tool is the one you stop thinking about the moment you deploy it.
