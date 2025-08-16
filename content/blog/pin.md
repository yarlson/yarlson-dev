---
title: "Introducing pin: A Minimal CLI Spinner for Go"
summary: "Frustrated with complex spinner libraries for your CLI apps? Meet pin—a lightweight, customizable, and dependency-free spinner built with only Go's standard library, designed to keep your terminal outputs clean and efficient."
postLayout: simple
date: "2025-02-10"
tags:
  - go
---

For a while, I was frustrated with existing CLI spinner libraries in Go—they either brought in too many dependencies or simply didn’t meet the needs of my projects. That’s why I built **pin**: a lightweight, dependency-free spinner library that does exactly what you need, without any extra fuss.

## What is pin?

`pin` is a simple terminal spinner for your CLI applications written in Go. It supports customizable spinner colors, text colors, prefixes, and even dynamic message updates. The goal was to create something minimal that leverages only the Go standard library, making it easy to integrate and maintain.

## Key Features

- **Customizable:** Easily adjust spinner colors, text colors, prefixes, separators, and more.
- **Dynamic Updates:** Update the spinner message on the fly.
- **Dependency-Free:** No third-party packages—just Go.
- **Piped Output Handling:** Automatically disables animations when the output isn’t attached to a TTY (e.g., when using `./myapp | tee output.txt`), preventing control characters from cluttering your logs.

## Installation

```bash
go get github.com/yarlson/pin
```

## Quick Start

Here’s a simple example to get you started:

```go
package main

import (
    "context"
    "time"

    "github.com/yarlson/pin"
)

func main() {
    p := pin.New("Loading...",
        pin.WithSpinnerColor(pin.ColorCyan),
        pin.WithTextColor(pin.ColorYellow),
    )
    cancel := p.Start(context.Background())
    defer cancel()

    // Simulate work
    time.Sleep(3 * time.Second)

    p.UpdateMessage("Almost done...")
    time.Sleep(2 * time.Second)

    p.Stop("Done!")
}
```

## Final Thoughts

If you’ve ever spent more time wrestling with a library than building your project, give **pin** a try. It’s a simple tool that just works—no extra dependencies, no unnecessary complexity, just what you need for your CLI applications.

Check out the source code and contribute on [GitHub](https://github.com/yarlson/pin).

Happy coding!
