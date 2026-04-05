---
title: "The Hidden Cost of UI Frameworks for CLI Tasks in Go"
summary: "Discover why using modern UI frameworks for simple CLI tasks in Go can lead to unnecessary complexity. Learn about choosing the right tools for CLI development and the importance of matching solutions to problems."
postLayout: simple
date: "2024-12-01"
tags:
  - go
---

I needed a spinner. A loading indicator. The kind of thing that tells a user "hang on, something's happening" while a server gets provisioned or a file gets downloaded. Four lines of code, tops. Instead, I ended up neck-deep in The Elm Architecture, writing message-passing pipelines for a progress dot that spins.

Let's talk about how that happens.

## The Demo Trap

Search for "Go CLI library" and Bubbletea will find you within thirty seconds. The demos are gorgeous. Smooth animations, rich interactivity, elegant state management borrowed from functional frontend frameworks. It looks like the future of terminal applications, and your brain immediately starts whispering: _wouldn't it be nice if your tool looked like that?_

But here's the thing. You're not building a terminal application. You're building a CLI tool. Those are genuinely different things, and treating them as interchangeable is where the wheels come off.

## CLIs Are Not UIs

A command-line tool processes commands in a straight line. Start, do work, print output, exit. A user interface manages state across time, handles concurrent interactions, re-renders on change. Bolting a UI architecture onto a linear workflow is like installing a commercial kitchen to make toast.

Look, here's what a spinner should look like in a CLI tool. This uses chelnak/ysmrr:

```go
spinner := ysmrr.NewSpinner("Downloading file...")
spinner.Start()
// Do the work
downloadFile()
spinner.Stop()
```

Three moving parts. Reads top to bottom. Does what it says. Now here's the Bubbletea version of the same thing:

1. Define your model structure
2. Implement state update methods
3. Handle view rendering
4. Set up message passing
5. Manage component lifecycle

A spinner. Five architectural decisions. Here's the code:

```go
type model struct {
    downloading bool
    progress    int
    error       error
}

func (m model) Init() tea.Cmd {
    return downloadCmd
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case downloadMsg:
        m.downloading = true
        return m, tickCmd
    case tickMsg:
        // Handle progress updates
        // Manage state transitions
        // Deal with errors
        // ...
    }
    return m, nil
}

func (m model) View() string {
    if m.downloading {
        return "⠋ Downloading..."
    }
    return "Done!"
}
```

You wrote a state machine. For a dot that rotates.

## What I Actually Tried

I was building [ftl](https://github.com/yarlson/ftl) and needed progress indicators. Started with pterm. Seemed fine until it wasn't -- data races, documented but unresolved. Dealbreaker. A CLI tool that crashes randomly is worse than one with no spinner at all.

So I went shopping:

- **pterm**: Data races. Abandoned.
- **briandowns/spinner**: Clean, but no support for multiple spinners. Too limited.
- **bubbletea**: Built a working prototype. Immediately regretted every line.
- **chelnak/ysmrr**: Simple API, no races, multiple spinners that just work.

The pattern here is obvious. The libraries that tried to be more ended up delivering less. The one that stayed focused on the actual problem solved it completely.

## Why ysmrr Won

Simplicity is a superpower. The API follows traditional CLI patterns -- start thing, do work, stop thing. No data races because there's no complex state to race over. The code stays readable six months later because there's nothing clever in it. When I needed multiple spinners, they worked without a migration to a different mental model.

That's it. That's the whole pitch. It does the job and gets out of the way.

## So When Does Bubbletea Make Sense?

Bubbletea is genuinely excellent software built for a specific purpose. If you're creating a full-screen terminal application -- a file manager, a database browser, a text editor -- it's the right call. The Elm Architecture earns its keep when you have real state to manage across real user interactions.

But how many of us are building terminal text editors? Most Go CLI tools run a command, do a thing, and exit. That workflow doesn't need an architecture. It needs a library.

## The Uncomfortable Truth

The framework instinct is strong in this industry. We reach for the most powerful tool available because it feels responsible. Professional. But power you don't need isn't free. It's complexity you carry, bugs you debug, abstractions you explain to the next person who opens your code.

CLI tools have worked a certain way for decades. Linear execution, simple output, predictable behavior. Those patterns survived because they're right. Wrapping them in a reactive UI framework doesn't improve them. It just makes them harder to maintain.

Matching the tool to the task -- actually matching it, not reaching for the impressive option -- is the skill that separates shipping software from architecture tourism. Your CLI doesn't want to be a web app. Let it be a CLI.

Build the simple thing. Ship it. Move on.

## Resources

- [ftl](https://github.com/yarlson/ftl) - My CLI project where I learned these lessons
- [chelnak/ysmrr](https://github.com/chelnak/ysmrr) - The spinner library I recommend
- [12 Factor CLI Apps](https://medium.com/@jdxcode/12-factor-cli-apps-dd3c227a0e46) - Great guidelines for CLI development
- [Command Line Interface Guidelines](https://clig.dev/) - Best practices for CLI design
