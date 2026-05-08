---
title: "The Build Cache Was Not Broken"
summary: "Docker cache problems are often not Docker problems. They are usually Dockerfile problems: unstable inputs, bad COPY order, and layers that depend on too much."
postLayout: simple
date: "2026-05-08"
tags:
  - docker
  - ci
---

A slow Docker build is easy to blame on Docker.

I have done it. The build takes too long, the cache does not hit, CI burns time, and the first reaction is: BuildKit is bad, the runner is slow, the registry is slow, everything is slow.

But most of the time the cache is not broken. The Dockerfile is just asking the cache to do impossible work.

The cache is simple. It looks at the inputs for a layer. If they changed, it rebuilds the layer and everything after it. It does not know that a change is "small". It does not know that a version string is "only metadata". It only sees changed input.

That is the whole game.

## Volatile values near the top are poison

This is a common mistake:

```dockerfile
FROM node:22

ARG GIT_SHA
ENV GIT_SHA=$GIT_SHA

WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build
```

It looks normal. It is also a cache killer.

`GIT_SHA` changes on every commit. Because it is near the top, every layer after it becomes dirty. Then `COPY . .` copies the whole repository before `npm ci`, so almost any file change can invalidate dependency install.

The cache is not being stupid. It is doing exactly what the Dockerfile says.

A better shape is boring:

```dockerfile
FROM node:22 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
COPY --from=build /app/dist ./dist

ARG GIT_SHA
LABEL org.opencontainers.image.revision=$GIT_SHA
```

The lockfile controls dependency install. Source code controls the build. Metadata is added late.

Nothing clever. Just honest inputs.

## COPY order is part of the architecture

People often treat Dockerfile order like formatting. It is not formatting.

This line:

```dockerfile
COPY . .
```

is a very big statement. It says every file in the repository is an input to the next layer.

If the next layer installs dependencies, then your README, tests, docs, and local scripts now all decide whether dependencies must be installed again.

That is usually wrong.

This is better:

```dockerfile
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build
```

Now the dependency layer depends on the files that actually describe dependencies.

This sounds obvious because it is obvious. Many good performance fixes are like that. They are not genius. They are just the system finally telling the truth.

## Do not install everything just to remove half of it

Another pattern I dislike:

```dockerfile
RUN npm ci
RUN npm run build
RUN npm prune --omit=dev
```

It works. It also makes the package manager do extra work.

You install the full dependency tree, build the app, then ask the package manager to cut the tree down for runtime. For small projects this is fine. For bigger projects it becomes slow and noisy.

A cleaner version is to separate build dependencies from runtime dependencies:

```dockerfile
FROM node:22 AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22 AS build-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM build-deps AS build
COPY . .
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
```

More stages. Less confusion.

The runtime image gets runtime dependencies. The build stage gets build dependencies. There is no cleanup step pretending to be architecture.

## Cache mounts are not exciting, but they help

Package managers already have caches. npm, pnpm, Go, Cargo, pip — they all try to avoid downloading the same things again.

But in CI, those caches often disappear on every run.

BuildKit cache mounts fix that:

```dockerfile
RUN --mount=type=cache,target=/root/.npm npm ci
```

or:

```dockerfile
RUN --mount=type=cache,target=/pnpm/store pnpm install --frozen-lockfile
```

This is not a big idea. It is just giving the package manager a stable place to keep work it already knows how to reuse.

Boring. Useful. Exactly the kind of thing CI needs.

## The build gets faster when the graph gets honest

When a build is slow, ask simple questions:

- Does this layer depend on the layer above it?
- Does this ARG need to be this early?
- Does changing source code really require installing dependencies again?
- Does the runtime image need build tools?
- Are we copying too much too soon?

These questions are not fancy. But they find real problems.

A Docker build is a dependency graph written as a file. If the graph lies, the cache suffers. If the graph is honest, the cache starts working.

The cache was not broken.

We just kept changing its inputs and acting surprised when it rebuilt things.
