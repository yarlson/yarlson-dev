---
title: "Introducing pin: A Minimal CLI Spinner for Go"
summary: "Frustrated with complex spinner libraries for your CLI apps? Meet pin—a lightweight, customizable, and dependency-free spinner built with only Go's standard library, designed to keep your terminal outputs clean and efficient."
postLayout: simple
date: "2025-02-10"
tags:
  - go
---

Most Go CLI spinner libraries have the same problem: they want to be frameworks. You pull in one dependency for a tiny rotating character in your terminal, and suddenly you're carrying transitive dependencies, ANSI abstractions you didn't ask for, and an API surface that assumes you're building a dashboard.

All I wanted was a dot that spins.

## So I built pin

`pin` is a terminal spinner for Go. It does colors, prefixes, separators, and live message updates. That's it. But here's the thing that actually matters: it uses only the Go standard library. Zero external dependencies.

Why does that matter? Because dependencies are promises. Every `go get` you run is a bet that some stranger's weekend project will keep working the way you expect. For something as trivial as a spinner, that bet is genuinely not worth taking. `pin` is easy to audit, easy to vendor, and it will never surprise you with a breaking change three levels deep in your dependency tree.

## What you get

- Spinner color, text color, prefix, separator — the small formatting knobs you actually need.
- Live message updates while work is in progress. Because "Loading..." isn't helpful for thirty seconds straight.
- Pipe detection. When stdout isn't a terminal, `pin` disables animation so you don't get escape codes polluting your log files (try `./myapp | tee output.txt` — it just works).
- Standard library only. I keep saying it because it's genuinely the whole point.

## Installation

```bash
go get github.com/yarlson/pin
```

## Quick start

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

Look, it's a spinner. The API should fit in your head in thirty seconds, and this one does.

## Why not just use [popular library]?

Fair question. If you're already deep in a CLI framework that bundles its own spinner, use that. Seriously. But if you're writing a small tool — a deployment script, a code generator, a quick utility — and you want a clean loading indicator without adopting someone else's opinions about terminal rendering, `pin` exists for exactly that moment.

Simplicity is a superpower. A spinner with no dependencies is a spinner that never breaks because somebody else shipped a bad release on a Friday afternoon.

The source is on GitHub: [github.com/yarlson/pin](https://github.com/yarlson/pin). If something feels off, issues and PRs are welcome. It's small enough that you could read the whole thing over coffee.
