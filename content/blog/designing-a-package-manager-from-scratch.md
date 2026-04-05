---
title: "Designing a Package Manager When You Don't Have One"
summary: "When the Yar compiler couldn't import code across project boundaries, I had to build a package manager from nothing. Git-based fetching, alias-based imports, content-addressed caching, transitive resolution — and zero registry. Here's every decision that mattered."
postLayout: simple
date: "2026-04-05"
tags:
  - yar
  - compilers
---

Every programming language hits the same wall. You can compile programs. You can write a standard library. You can even get other people interested. But the moment someone tries to use a library from a different project, they discover there's no way to do it. Copy-paste is the package manager. And copy-paste doesn't version, doesn't verify, and doesn't resolve dependencies.

[Yar](https://github.com/yarlson/yar) hit that wall last week. The compiler could resolve imports from the local directory tree and from the embedded stdlib. That was it. Want to use someone else's code? Literally copy it into your project. Want to update it? Copy it again. Want to know what version you're running? Good luck.

So I built a package manager. From scratch. In about 2,400 lines of Go. And the decisions that shaped it are more interesting than the code itself.

## No Registry. Not Yet, Not Ever (Probably)

The first decision was the biggest: no central registry. No npm. No crates.io. No PyPI. Just Git.

This sounds limiting. It's not. Every serious package manager eventually grows a registry because registries solve real problems — discovery, namespace control, download speed, metadata indexing. But registries also create real problems. They become single points of failure. They need hosting, governance, abuse prevention, and someone to run them at 3 AM when the CDN certificate expires. For a language that has maybe three users (one of whom is me, and another is my TOML parser), a registry is pure overhead.

Git solves the distribution problem without any infrastructure. Every dependency is a repository URL plus a version pin. Clone it, hash it, cache it. The URL is the namespace. Git is the transport. Done.

```toml
[package]
name = "myapp"
version = "0.1.0"

[dependencies]
http = { git = "https://github.com/user/yar-http.git", tag = "v0.3.1" }
json = { git = "https://github.com/user/yar-json.git", rev = "a1b2c3d" }
local_lib = { path = "../my-local-lib" }
```

Three dependency types: git with a tag, git with a specific commit, or a local path for development. Exactly one of `tag`, `rev`, or `branch` must be specified for git dependencies. No ranges. No semver resolution. No "compatible with ^1.2.3" ambiguity. You pin a version. You get that version. If you want a different version, you change the pin.

Is this less convenient than automatic semver resolution? Yes. Does it eliminate an entire category of "works on my machine" bugs where two developers resolve to different patch versions? Also yes. That tradeoff was deliberate.

## The Alias Problem

Here's where it gets interesting. Most package managers use the repository path as the import path. Go does this: `import "github.com/user/repo/pkg"`. It's transparent. It's also verbose, and it means your source code is coupled to a URL that might change.

Yar uses alias-based imports instead. In `yar.toml`, each dependency gets a short alias — that alias becomes the import path in your source code:

```
import "http"
import "http/router"
```

The mapping from `"http"` to `https://github.com/user/yar-http.git` lives in the manifest. The source code never sees a URL. If the upstream repo moves, you update the TOML file. The `.yar` files don't change.

But aliases create a constraint: they must be valid Yar import path segments. That means `[a-zA-Z_][a-zA-Z0-9_]*`. No hyphens, no dots, no slashes. `my-cool-lib` is not a valid alias. This is annoying for exactly five seconds, and then you realize it forces every import to be a clean, readable identifier. The TOML says `json_utils = { git = "..." }` and the code says `import "json_utils"`. No ambiguity about what name refers to what package.

## Resolution Order: Local Wins

When the compiler encounters an import path, it checks three places in order:

1. Local packages in the project directory
2. Dependencies declared in `yar.toml`
3. The standard library

Local always wins. This means you can shadow a dependency with a local package of the same name — useful for testing, useful for patching, and occasionally useful for shooting yourself in the foot. But the alternative — making it impossible to override a dependency locally — is worse. Trust the developer. If they shadow a dependency, they meant to.

Dependencies shadow stdlib. This one was harder to decide. If you declare a dependency with the alias `strings`, it shadows the stdlib `strings` package. On one hand, this is dangerous. On the other hand, if you can't shadow stdlib, then stdlib package names become reserved words that no dependency can ever use. The Go ecosystem learned this lesson with packages like `context` that started as third-party and moved to stdlib. I'd rather have a clear shadowing rule than a reserved namespace that grows with every stdlib addition.

## Content-Addressed Caching

Fetching a git repository every time you build is unacceptable. The cache design is straightforward: a global directory under `~/.cache/yar/deps/` where each dependency is stored by a content hash.

The hash is SHA-256 over the entire dependency tree at the pinned commit. Not the commit hash — the content hash. Why? Because a git commit hash identifies a point in history, but a content hash identifies what you're actually compiling. If someone force-pushes a different tree to the same tag (please don't), the content hash catches it. The lockfile stores both the commit SHA and the content hash, and the fetch step verifies both.

```
# yar.lock (generated)
[[dependencies]]
alias = "http"
git = "https://github.com/user/yar-http.git"
tag = "v0.3.1"
commit = "a1b2c3d4e5f6..."
hash = "sha256:9f86d081884c7d659..."
```

If the cached content doesn't match the lockfile hash, the dependency is re-fetched. If the re-fetched content still doesn't match, the build fails. No silent corruption. No stale caches pretending to be fresh.

## Transitive Resolution

This is where most package managers get complicated. Dependency A depends on B, B depends on C, and C depends on a different version of A. The diamond problem. The nightmare scenario that makes semver resolution NP-hard in the general case.

Yar's approach is simple, almost aggressively so: transitive dependencies are resolved by reading `yar.toml` in each fetched dependency. If two dependencies declare the same alias pointing to different versions, that's a conflict, and the build fails with a clear error message.

No automatic resolution. No "pick the newer one." No SAT solver. If your dependency tree has a conflict, you fix it — either by updating one of the dependencies to use a compatible version, or by providing an explicit override in the root manifest.

This will not scale to an ecosystem with thousands of packages and deep dependency trees. It doesn't need to. It needs to work correctly for the dependency trees that actually exist today, which are shallow and small. Building a SAT solver for a problem that has three inputs is engineering for a fantasy. If the ecosystem grows to the point where automatic resolution matters, I'll add it then, with real usage data to inform the design. Not before.

## The Lockfile Dance

The lockfile workflow follows a pattern that every package manager has converged on because it's the only one that works:

1. `yar lock` reads `yar.toml`, fetches everything, resolves transitive dependencies, computes hashes, and writes `yar.lock`
2. `yar build` reads `yar.lock` and uses the cached, verified dependencies
3. `yar update` re-resolves and regenerates the lockfile
4. `yar.lock` goes into version control

The lockfile is the source of truth for reproducible builds. The manifest is the source of truth for intent. If they diverge — if someone edits `yar.toml` without running `yar lock` — the build tells you. Loudly.

Path dependencies (local overrides) are deliberately excluded from the lockfile. They resolve directly from the filesystem at build time. This means local development can iterate without regenerating the lock, but it also means your CI should always build from a clean state with only git dependencies. A local path dependency that works on your machine but doesn't exist in CI is a bug in your workflow, not in the package manager.

## Compiler Integration

The most satisfying part of the whole implementation was how cleanly it plugged into the existing compiler. The package loader already had a resolution function that mapped import paths to directories. Adding dependency support meant inserting one new step between "check local" and "check stdlib":

The dependency index is built once at the start of compilation from `yar.toml` and `yar.lock`. Each alias maps to a directory in the cache. When the loader encounters an import path that doesn't match a local package, it splits the path on the first segment, looks it up in the dependency index, and — if found — resolves the rest of the path relative to the cached dependency directory.

One hundred and four lines of Go for the package resolution integration. The fetcher, resolver, manifest parser, and lockfile handler are larger. But the point of contact with the compiler is small. That's the design goal: the package manager is a separate concern that happens to feed directories into the same resolution pipeline the compiler already had.

## What I'd Do Differently

Shallow clones. The current implementation does a full `git clone` before checking out the pinned revision. For small repositories this is fine. For anything with a long history, it's wasteful. A shallow clone to depth 1 at the target ref would be faster and use less disk. I know this. I shipped without it because the implementation was correct and the optimization can come later without changing any external behavior.

I'd also add a `yar why` command — something that shows you why a transitive dependency exists and which direct dependency pulled it in. Every package manager eventually needs this, and it's easier to build when the resolution data structures are fresh in your head than six months later.

## The Honest Assessment

This package manager is simple. Deliberately, almost stubbornly simple. It doesn't have lockfile merging, dependency graph visualization, vulnerability scanning, or automatic updates. It has a manifest, a lockfile, a cache, and a resolution order. It fetches code from Git and verifies the hash.

And for a language with a small ecosystem and shallow dependency trees, that's exactly the right amount of package manager. Every feature I didn't build is a feature I don't have to maintain, debug, or explain. The package manager that exists, works, and is honest about its limitations beats the package manager that handles every edge case and ships next year.

Simplicity compounds. I keep saying it because I keep proving it.
