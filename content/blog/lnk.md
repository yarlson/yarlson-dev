---
title: "Lnk: Simplify Your Dotfiles with a Git-Native CLI"
summary: "Manage your dotfiles effortlessly: Lnk uses Git to move files into ~/.config/lnk, create reliable symlinks, handle host-specific overrides, and run bootstrap scripts automatically—no more messy bash hacks."
postLayout: simple
date: "2025-06-03"
tags:
  - git
---

I never planned to build yet another dotfiles manager, I just got fed up. Between bouncing between machines and losing track of my config tweaks, I realized something had to change. Enter Lnk: a Git-native, minimalistic tool that handles dotfiles the way they should be handled, simple, reliable, and completely unobtrusive.

## Why I Made Lnk

Ever spent 30 minutes hunting down where you stashed your `~/.vimrc` on a freshly provisioned VM? Yeah, me too. Most dotfile workflows involve a tangle of bash scripts, awkward symlink hacks, or half-baked tools that inevitably break on the next OS update. I wanted something that felt like a natural extension of Git, no magical file formats, no convoluted templating, no failures in the middle of a pull because of a missed dependency.

So one Saturday, fueled by coffee and frustration, I fired up my IDE and sketched out a design:

- **Move files safely** into a centralized repo.
- **Create portable, relative symlinks** so nothing breaks if you clone somewhere else.
- **Support host-specific overrides** without forcing you to juggle dozens of branches.
- **Run bootstrap scripts** automatically when you clone or update.

A few evenings later, Lnk was born. It wasn’t rocket science, it’s just Git plus symlinks plus a little bootstrap magic. But that combination solved all the headaches I’d been dealing with for years.

## What Lnk Solves

1. **No More Manual Symlinks.** Instead of `ln -s` commands scattered across README files, Lnk handles everything automatically. Add a file, and Lnk moves it into `~/.config/lnk` (your Git repo) and puts a symlink back where it belongs.
2. **Host-Specific Configs That Don’t Bite.** You can keep, say, work-related SSH keys and laptop-specific tmux settings in separate subfolders. Lnk treats them as first-class citizens, you don’t have to script around weird directory names or environment variables.
3. **Bootstrap Scripts That Actually Run.** Clone your dotfiles on a new machine, and if you have a `bootstrap.sh`, Lnk runs it immediately. No more “Oops, I forgot to install my favorite Vim plugins” moments.
4. **Git-Native Workflow.** You still use `git add`, `git commit`, and `git push`. Nothing exotic. If you already know Git, Lnk feels instantly familiar.

Ever wonder why some tools promise “one-size-fits-all” and then make your life harder? Lnk cuts the fluff and focuses on doing one job really well, keeping your dotfiles under version control and your workflow painless.

## How to Install Lnk

Getting started is a breeze, pick whichever you prefer:

### Quick Install (Recommended)

```bash
curl -sSL https://raw.githubusercontent.com/yarlson/lnk/main/install.sh | bash
```

One command, and Lnk is in your `/usr/local/bin`. It even auto-detects your OS (Linux, macOS, Windows under Git Bash) and fetches the latest release.

### Homebrew (macOS/Linux)

```bash
brew tap yarlson/lnk
brew install lnk
```

Homebrew handles everything for you, including updates. Just `brew upgrade lnk` whenever you want to catch new features.

### Manual Download

```bash
# Linux x86_64 example
wget https://github.com/yarlson/lnk/releases/latest/download/lnk_Linux_x86_64.tar.gz
tar -xzf lnk_Linux_x86_64.tar.gz
sudo mv lnk /usr/local/bin/
```

Substitute the URL for your platform (arm64, Windows, etc.) if needed. After that, typing `lnk --version` should print something like `v1.0.0`.

## Getting Started: Basic Usage

Once installed, open a terminal and run:

```bash
lnk init
```

That creates `~/.config/lnk` and initializes it as a Git repo. From there, Lnk is ready to go. Let’s walk through a common workflow.

### 1. Initialize Your Dotfiles Repo

- **With no remote** (start from scratch):

  ```bash
  lnk init
  ```

  This simply sets up your local repo in `~/.config/lnk`.

- **Clone an existing repo** (and run bootstrap):

  ```bash
  lnk init -r git@github.com:you/dotfiles.git
  ```

  Lnk clones your dotfiles straight into `~/.config/lnk` and, if it finds a `bootstrap.sh`, kicks off your machine setup automatically.

- **Skip bootstrap** (if you want to run it later):

  ```bash
  lnk init -r git@github.com:you/dotfiles.git --no-bootstrap
  ```

### 2. Add Files to Be Managed

- **Common config** (shared across all machines):

  ```bash
  lnk add ~/.vimrc ~/.bashrc ~/.gitconfig
  ```

  Lnk moves each file into `~/.config/lnk`, commits it to Git, and leaves a symlink at the original path. Edit `~/.vimrc` as if nothing changed, Lnk keeps things transparent.

- **Host-specific config** (machine-specific overrides):

  ```bash
  lnk add --host work ~/.ssh/config ~/.tmux.conf
  ```

  This puts your SSH config and tmux settings into `~/.config/lnk/work.lnk`, and symlinks back to their home paths only if your hostname matches “work.” On your laptop, you can have different files under `laptop.lnk/` and it won’t clash.

### 3. Commit & Push

Once you’ve added files, simply run:

```bash
lnk push "Initial config commit"
```

Under the hood, Lnk stages everything, commits with your message, and pushes to the remote (if you set one). No more juggling `git add -A` inside a hidden folder, Lnk handles it all.

### 4. Pull & Sync on a New Machine

On a fresh workstation or server:

```bash
lnk init -r git@github.com:you/dotfiles.git
# → runs bootstrap automatically if present
lnk pull
```

Lnk fetches the latest commits, updates your local Git copy, and restores symlinks. If you’ve got host-specific files, add `--host laptop` or whatever you named your host, and Lnk pulls those too.

### 5. Run Bootstrap Manually (When Needed)

If you skipped bootstrap during `init`, you can run it any time:

```bash
lnk bootstrap
```

That executes `bootstrap.sh` inside your dotfiles repo, installing packages, setting up plugins, or anything else you’ve scripted.

## A Few Tips & Tricks

- **Check status quickly:**

  ```bash
  lnk status
  ```

  Just like `git status`, but friendly to your symlinks. It tells you what’s changed locally and if you’re ahead/behind your remote.

- **List managed files:**

  ```bash
  lnk list         # common only
  lnk list --host work
  lnk list --all   # everything
  ```

  Handy when you forget exactly which files Lnk is tracking.

- **Remove a file:**

  ```bash
  lnk rm ~/.vimrc
  ```

  Lnk moves the file back to your home directory, deletes the symlink, and updates the Git index.

## Why Lnk Feels Different

You might be thinking, “Why not just clone a bare repo and run a few symlinks manually?” Fair point. But every time I tried that, I ended up writing another helper script that half-broke on macOS, or I forgot to `git update-index --assume-unchanged` on certain files, and chaos ensued.

Lnk solves that by:

- **Abstracting away boilerplate.** You don’t need to memorize platform-specific quirks, Lnk’s got you covered.
- **Keeping everything relative.** Move your dotfiles folder anywhere (home, `~/Documents`, even an external drive), and Lnk’s symlinks still work.
- **Providing host isolation.** Your office workstation’s secrets stay separate from your home laptop’s quirks.

Ever had someone ask “How do I sync my dotfiles?” and you began a ten-minute explanation of merging branches? With Lnk, you can say, “Just `lnk init` on a new box,” and be done before they finish their coffee.

Whether you bounce between Linux, macOS, or even Windows Subsystem for Linux, Lnk unifies your workflow. It’s not perfect, there’s always room for new features, but it does one thing really well: giving you a rock-solid way to manage dotfiles across any machine. Give it a try, and get those config headaches out of your life.

You can find Lnk on GitHub: [https://github.com/yarlson/lnk](https://github.com/yarlson/lnk)
