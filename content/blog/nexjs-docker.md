---
title: "Deploying NextJS with App Router: It's Not Just for Vercel Anymore"
summary: "Deploying a NextJS app with the App Router outside of Vercel's infrastructure is possible using Docker and Docker Compose. This setup uses Nginx for static asset serving and as a reverse proxy for the Node.js app. This post will explain the process step-by-step for those new to Docker."
postLayout: simple
date: "2024-08-11"
tags:
  - docker
  - nextjs
---

There's a misconception that deploying NextJS apps with the new App Router beyond Vercel's infrastructure is difficult. This isn't true. This post will explain how to deploy a NextJS app using Docker and Docker Compose, with Nginx serving static assets and acting as a reverse proxy.

## The Building Blocks: What's Used

The tools used in this deployment process are:

1. NextJS: The React framework with the App Router.
2. Docker: The containerization platform.
3. Docker Compose: The tool for managing multi-container setups.
4. Nginx: The web server for handling static assets and reverse proxy requests.

## Step 1: Preparing Your NextJS App

The first step is to prepare the NextJS app for deployment. The key is to use the `standalone` output option in the `next.config.mjs` file. This creates a standalone build that includes all necessary dependencies.

Here's what the `next.config.mjs` should look like:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
};

export default nextConfig;
```

This configuration change tells NextJS to bundle everything the app needs to run independently.

## Step 2: Crafting the Dockerfile

The next step is to create the Dockerfile. This uses a multi-stage build process to keep the final image efficient.

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

This multi-stage build consists of:

1. Dependencies Stage: Installs production dependencies.
2. Builder Stage: Builds the NextJS app, creating the standalone build.
3. Runner Stage: Sets up the environment to run the NextJS app.
4. Nginx Stage: Prepares Nginx to serve static files and act as a reverse proxy.

## Step 3: Configuring Nginx

Nginx is configured to direct requests appropriately. Here's the `nginx.conf` file:

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

This configuration:

- Sets up an upstream server for the NextJS app.
- Configures handling for different types of requests.
- Sets up caching and performance optimizations.

## Step 4: Orchestrating with Docker Compose

Docker Compose is used to coordinate the NextJS app and Nginx. Here's the `docker-compose.yml` file:

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

This compose file:

- Defines two services: the NextJS app and Nginx.
- Sets up a network for them to communicate.
- Exposes port 80 for incoming web traffic.

## Deployment Process

To deploy the app:

1. Ensure Docker and Docker Compose are installed on the server.
2. Copy the NextJS project files, `Dockerfile`, `nginx.conf`, and `docker-compose.yml` to the server.
3. Navigate to the project directory in the terminal.
4. Run the following command:

   ```
   docker-compose up -d --build
   ```

This command builds the Docker images and starts the containers in detached mode.

## Conclusion

Deploying a NextJS app with the App Router beyond Vercel is achievable using Docker and Nginx. This setup creates a deployment environment that allows for control over the infrastructure.
