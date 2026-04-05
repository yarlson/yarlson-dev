---
title: "Lnk: Simplify Your Dotfiles with a Git-Native CLI"
summary: "Manage your dotfiles effortlessly: Lnk uses Git to move files into ~/.config/lnk, create reliable symlinks, handle host-specific overrides, and run bootstrap scripts automatically—no more messy bash hacks."
postLayout: simple
date: "2025-06-03"
tags:
  - git
---

Dotfiles setups all collapse into the same thing: a pile of bash scripts held together by hope and `ln -s` commands nobody remembers writing. You provision a new VM, spend thirty minutes hunting for your `.vimrc`, realize the symlink script doesn't work on macOS, fix it, break something else. Repeat forever.

I got tired of the cycle. So I built Lnk.

## The Problem Is Always the Same

Let's talk about what dotfile management actually looks like in practice. You start with a Git repo. You write some symlink logic. Maybe a Makefile. Then you need host-specific configs, so you add branching or environment variables or both. Then you get a new laptop and the bootstrap is manual because you forgot to script half of it. Then you switch to a tool that promises to fix everything and instead introduces YAML templating and a dependency on Ruby.

But here's the thing. Dotfiles are just files. They live in known locations. They need symlinks. They need version control. They occasionally need per-machine overrides. That's it. Four requirements. Why does every solution turn this into a distributed systems problem?

Lnk does exactly those four things:

- **Move files safely** into a centralized repo.
- **Create portable, relative symlinks** so nothing breaks if you clone somewhere else.
- **Support host-specific overrides** without forcing you to juggle dozens of branches.
- **Run bootstrap scripts** automatically when you clone or update.

Git plus symlinks plus a little bootstrap magic. Simple is a superpower.

## What This Actually Solves

**No more manual symlinks.** Instead of `ln -s` commands scattered across README files that nobody reads, Lnk handles everything automatically. Add a file, it moves into `~/.config/lnk`, symlink goes back where it belongs. Done.

**Host-specific configs that don't bite.** Work SSH keys go in one subfolder, laptop tmux settings in another. Lnk treats them as first-class citizens. No scripting around weird directory names. No environment variable gymnastics.

**Bootstrap scripts that actually run.** Clone your dotfiles on a new machine, and if there's a `bootstrap.sh`, Lnk executes it immediately. No more "I forgot to install my Vim plugins" twenty minutes into a pairing session.

**Git-native workflow.** You still use `git add`, `git commit`, `git push`. Nothing exotic. If you know Git, you already know how Lnk works.

Why do so many tools promise "one-size-fits-all" and then make your life genuinely harder? Lnk cuts the fluff. One job. Done well.

## How to Install Lnk

Pick whichever path makes sense for you.

### Quick Install (Recommended)

```bash
curl -sSL https://raw.githubusercontent.com/yarlson/lnk/main/install.sh | bash
```

One command. Lnk lands in `/usr/local/bin`. It auto-detects your OS (Linux, macOS, Windows under Git Bash) and fetches the latest release.

### Homebrew (macOS/Linux)

```bash
brew tap yarlson/lnk
brew install lnk
```

Homebrew handles everything, including updates. Just `brew upgrade lnk` when you want new features.

### Manual Download

```bash
# Linux x86_64 example
wget https://github.com/yarlson/lnk/releases/latest/download/lnk_Linux_x86_64.tar.gz
tar -xzf lnk_Linux_x86_64.tar.gz
sudo mv lnk /usr/local/bin/
```

Substitute the URL for your platform (arm64, Windows, etc.) if needed. After that, `lnk --version` should print something like `v1.0.0`.

## Getting Started

Open a terminal. Run this:

```bash
lnk init
```

That creates `~/.config/lnk` and initializes it as a Git repo. From there, Lnk is ready. Let's talk about the actual workflow.

### 1. Initialize Your Dotfiles Repo

- **Start from scratch** (no remote):

  ```bash
  lnk init
  ```

  Sets up your local repo in `~/.config/lnk`. Nothing more.

- **Clone an existing repo** (and run bootstrap):

  ```bash
  lnk init -r git@github.com:you/dotfiles.git
  ```

  Lnk clones your dotfiles straight into `~/.config/lnk`. If it finds a `bootstrap.sh`, it kicks off your machine setup automatically.

- **Skip bootstrap** (run it later):

  ```bash
  lnk init -r git@github.com:you/dotfiles.git --no-bootstrap
  ```

### 2. Add Files to Be Managed

- **Common config** (shared across all machines):

  ```bash
  lnk add ~/.vimrc ~/.bashrc ~/.gitconfig
  ```

  Lnk moves each file into `~/.config/lnk`, commits it to Git, and leaves a symlink at the original path. Edit `~/.vimrc` like nothing changed. Lnk stays out of your way.

- **Host-specific config** (machine-specific overrides):

  ```bash
  lnk add --host work ~/.ssh/config ~/.tmux.conf
  ```

  SSH config and tmux settings land in `~/.config/lnk/work.lnk/`, symlinked back to their home paths only if your hostname matches "work." Your laptop gets its own files under `laptop.lnk/`. No clashes. No drama.

### 3. Commit & Push

```bash
lnk push "Initial config commit"
```

Under the hood, Lnk stages everything, commits with your message, pushes to the remote. No more juggling `git add -A` inside a hidden folder.

### 4. Pull & Sync on a New Machine

```bash
lnk init -r git@github.com:you/dotfiles.git
# → runs bootstrap automatically if present
lnk pull
```

Lnk fetches the latest commits, updates your local Git copy, restores symlinks. Host-specific files? Add `--host laptop` and Lnk pulls those too.

### 5. Run Bootstrap Manually

Skipped bootstrap during `init`? Run it whenever:

```bash
lnk bootstrap
```

Executes `bootstrap.sh` inside your dotfiles repo. Packages, plugins, whatever you've scripted.

## Tips & Tricks

- **Check status:**

  ```bash
  lnk status
  ```

  Like `git status`, but aware of your symlinks. Shows local changes and whether you're ahead or behind the remote.

- **List managed files:**

  ```bash
  lnk list         # common only
  lnk list --host work
  lnk list --all   # everything
  ```

  For when you forget what Lnk is tracking. You will forget.

- **Remove a file:**

  ```bash
  lnk rm ~/.vimrc
  ```

  Moves the file back to your home directory, deletes the symlink, updates the Git index. Clean.

## Why This Feels Different

Look, you could clone a bare repo and write symlink scripts yourself. I've done it. Repeatedly. Every time, I ended up writing another helper that half-broke on macOS, or I forgot `git update-index --assume-unchanged` on some file, and chaos followed.

Lnk eliminates that entire category of problem. It abstracts away platform-specific quirks. It keeps symlinks relative, so you can move your dotfiles folder anywhere and nothing breaks. It isolates host configs so your office workstation's secrets never bleed into your personal laptop.

Someone asks "How do I sync my dotfiles?" and instead of a ten-minute explanation involving merge strategies, you say "`lnk init` on the new box." Conversation over before the coffee's done.

Dotfile management doesn't need to be clever. It needs to be boring and reliable. Lnk is genuinely both. It works across Linux, macOS, WSL. It does one thing, and it does it well. That's the whole pitch.

Give it a try: [github.com/yarlson/lnk](https://github.com/yarlson/lnk)
