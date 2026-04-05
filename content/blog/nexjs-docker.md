---
title: "Deploying NextJS with App Router: It's Not Just for Vercel Anymore"
summary: "Deploying a NextJS app with the App Router outside of Vercel's infrastructure is possible using Docker and Docker Compose. This setup uses Nginx for static asset serving and as a reverse proxy for the Node.js app. This post will explain the process step-by-step for those new to Docker."
postLayout: simple
date: "2024-08-11"
tags:
  - docker
  - nextjs
---

A few times a year someone on Twitter declares that NextJS is "locked in" to Vercel. That deploying the App Router anywhere else is some Herculean ordeal requiring blood sacrifice and a DevRel contact. Look, I get where the anxiety comes from. Vercel makes deployment a one-click affair, and the NextJS docs don't exactly shout about alternatives. But here's the thing: deploying NextJS on your own infrastructure is genuinely straightforward. A Dockerfile, an Nginx config, a compose file. That's it.

Let's talk about what you actually need.

## The Building Blocks

Four pieces. Nothing exotic.

1. **NextJS** with the App Router.
2. **Docker** for containerization.
3. **Docker Compose** for orchestrating multiple containers.
4. **Nginx** for serving static assets and proxying everything else to Node.

You probably have opinions about half of these already. Good. Keep them. Nothing here requires you to adopt a new religion.

## Preparing the NextJS App

The single most important thing is the `standalone` output option in `next.config.mjs`. Without it, you're dragging your entire `node_modules` into production like a ball and chain. With it, NextJS bundles only what the app actually needs to run.

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
};

export default nextConfig;
```

One line. That's the difference between a bloated image and a lean one. `standalone` is a superpower.

## The Dockerfile

Multi-stage builds are the move here. Four stages, each with a clear job, and the final images contain only what they need to run. No build tools. No dev dependencies. No leftover artifacts.

```dockerfile
# Stage 1: Dependencies
FROM node:22.6.0-alpine3.20 AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production --no-audit --prefer-offline --silent

# Stage 2: Builder
FROM node:22.6.0-alpine3.20 AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED 1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Stage 3: Runner (Node.js app)
FROM node:22.6.0-alpine3.20 AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.next/standalone ./

EXPOSE 3000

CMD ["node", "server.js"]

# Stage 4: Nginx
FROM nginx:1.27.0-alpine3.19 AS nginx

# Copy the built Next.js static files
COPY --from=builder /app/public /usr/share/nginx/html
COPY --from=builder /app/.next/static /usr/share/nginx/html/_next/static

COPY --from=builder /app/app/favicon.ico /usr/share/nginx/html/favicon.ico

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

Notice the `NEXT_TELEMETRY_DISABLED` flag? You're building inside a container. Phoning home to Vercel's analytics during a CI build is pointless. Kill it.

The **deps** stage installs production dependencies. The **builder** stage compiles the app. The **runner** stage is the actual Node.js process — stripped down, production-only. And the **nginx** stage grabs the static assets and serves them directly, no Node.js round-trip required.

Why not just let Node serve everything? Because Nginx is genuinely better at serving static files. It's been doing this for decades. Let each tool do what it's good at.

## Configuring Nginx

This is where most people overthink things. The Nginx config has one real job: serve static assets directly, proxy everything else to the NextJS upstream.

```nginx
user nginx;
worker_processes auto;

error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    multi_accept on;
    use epoll;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    upstream nextjs_upstream {
        server nextjs:3000;
        keepalive 64;
    }

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;

        location / {
            proxy_pass http://nextjs_upstream;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /_next/static {
            alias /usr/share/nginx/html/_next/static;
            expires 365d;
            access_log off;
            add_header Cache-Control "public, max-age=31536000, immutable";
        }

        location /static {
            expires 365d;
            access_log off;
            add_header Cache-Control "public, max-age=31536000, immutable";
        }

        location = /favicon.ico {
            log_not_found off;
            access_log off;
            expires 365d;
            add_header Cache-Control "public, max-age=31536000, immutable";
        }

        location = /robots.txt {
            log_not_found off;
            access_log off;
        }

        gzip_static on;
    }
}
```

The `/_next/static` location block is the important one. Those are your hashed, immutable build artifacts — CSS, JS chunks, images processed by Next. Serve them directly from disk with a year-long cache header. `immutable` tells the browser to never even bother revalidating. The `keepalive 64` on the upstream keeps persistent connections to the Node process, so you're not paying TCP handshake costs on every proxied request.

Everything else at `/` falls through to the NextJS server for SSR, API routes, whatever dynamic work your app does.

## Orchestrating with Docker Compose

Two services. One network. Nothing clever.

```yaml
services:
  nextjs:
    build:
      context: .
      target: runner
    container_name: nextjs-app
    restart: always

  nginx:
    build:
      context: .
      target: nginx
    container_name: nextjs-nginx
    restart: always
    ports:
      - "80:80"
    depends_on:
      - nextjs

networks:
  default:
    name: nextjs-network
```

The `target` field in each service's build config is doing the heavy lifting. Both services build from the same Dockerfile but stop at different stages. The `depends_on` ensures Nginx doesn't start trying to proxy to a Node process that isn't up yet. And `restart: always` means if something crashes at 3 AM, Docker picks it back up without paging you.

## Deploying

Get Docker and Docker Compose on your server. Copy your project files over — the app source, the `Dockerfile`, `nginx.conf`, and `docker-compose.yml`. Then:

```
docker-compose up -d --build
```

That builds both images and starts them in the background. Done. Your NextJS app is running behind Nginx on port 80.

Want to update? Pull your new code, run the same command. Docker rebuilds only the layers that changed.

The whole setup — multi-stage builds, Nginx for static assets, Docker Compose for orchestration — gives you a production deployment you actually control. You can put this on a $5 VPS, a bare-metal server, or behind whatever load balancer your team already runs. No vendor lock-in, no magic platform abstractions, no surprise bills when your site gets a traffic spike.

NextJS without Vercel isn't some act of rebellion. It's just infrastructure. And infrastructure, when you strip away the marketing, is genuinely not that complicated. Keep it boring. Ship your app.
