---
title: "Introducing pin: A Minimal CLI Spinner for Go"
summary: "Frustrated with complex spinner libraries for your CLI apps? Meet pin—a lightweight, customizable, and dependency-free spinner built with only Go's standard library, designed to keep your terminal outputs clean and efficient."
postLayout: simple
date: "2025-02-10"
tags:
  - go
---

I kept reaching for spinners in CLI tools and kept regretting it. Most of the libraries I tried were either heavier than I wanted for a tiny bit of terminal animation, or they made choices that didn't fit how I like my CLIs to behave.

So I built `pin`.

## What is pin?

`pin` is a small terminal spinner for Go CLI apps. You can change spinner and text colors, add a prefix, tweak separators, and update the message while it's running. The big constraint is intentional: it uses only the Go standard library. That keeps it easy to audit, easy to vendor, and less likely to surprise you later.

## Key features

- Configure spinner color, text color, prefix, separator, and other small formatting details.
- Update the spinner message while work is in progress.
- No third-party dependencies. Standard library only.
- Detects when output is piped or redirected and disables animation so control characters don't end up in logs (for example: `./myapp | tee output.txt`).

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

## Final thoughts

If you just want a spinner that looks decent, stays out of your way, and doesn't drag extra packages into a small CLI, `pin` is meant for that.

Source is on GitHub: [github.com/yarlson/pin](https://github.com/yarlson/pin). If you run into something awkward, issues and PRs are welcome.
