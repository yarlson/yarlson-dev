---
title: "Using Go 1.22's New Iterators in CLI Applications"
summary: "Go 1.22 introduces built-in support for iterators, providing a memory-efficient and composable way to handle data streams. This post explains how to use these iterators in CLI applications, complete with code examples and best practices."
postLayout: simple
date: "2024-10-26"
tags:
  - go
---

Go CLI tools hit the same wall. You have a long-running task, you want to stream status updates to the terminal, and now you're staring at a channel, a goroutine, a `select` block, and a `done` signal that you will absolutely forget to close at least once. Channels are genuinely great concurrency primitives. But reaching for them when you don't actually need concurrency? That's cargo-culted complexity.

Go 1.22 shipped something better for this exact problem: built-in iterator support via the `iter` package. And it is a superpower.

### What I was building

A CLI that performs a long-running task and prints status updates as it goes. Start, progress, error, done. Simple requirements. The kind of thing that shouldn't require you to think about goroutine lifecycles.

Let's talk about how iterators make this trivially clean.

### Defining event types

First, a straightforward `EventType` and a struct to carry data:

```go
type EventType string

const (
    EventTypeStart  EventType = "start"
    EventTypeUpdate EventType = "update"
    EventTypeEnd    EventType = "end"
    EventTypeError  EventType = "error"
)
```

```go
type CommandEvent struct {
    Type    EventType
    Message string
}
```

Nothing fancy. Just typed strings and a struct. Moving on.

### A custom iterator type

Here's where it gets interesting:

```go
type CommandEventIterator func(yield func(*CommandEvent, error) bool)
```

One line. That's your entire streaming abstraction. A function that yields `*CommandEvent` values and errors, one at a time, directly into a `for...range` loop. No channels. No goroutines. No close signals.

Why does this matter? Because the calling code doesn't need to know anything about how events are produced. It just ranges over them. The iterator owns the control flow, yields when it has something, and stops when it's done.

### The iterator function

Here's the implementation that simulates a task with progress updates and an error at 60%:

```go
func CommandEventStream() CommandEventIterator {
    return func(yield func(*CommandEvent, error) bool) {
        // Start event
        if !yield(&CommandEvent{
            Type:    EventTypeStart,
            Message: "Task started",
        }, nil) {
            return
        }

        // Simulate task with possible error
        for i := 1; i <= 5; i++ {
            time.Sleep(2 * time.Second)

            // Simulate an error at 60%
            if i == 3 {
                if !yield(nil, fmt.Errorf("an error occurred at %d%% progress", i*20)) {
                    return
                }
                continue
            }

            // Update event
            if !yield(&CommandEvent{
                Type:    EventTypeUpdate,
                Message: fmt.Sprintf("Task progress: %d%%", i*20),
            }, nil) {
                return
            }
        }

        // End event
        if !yield(&CommandEvent{
            Type:    EventTypeEnd,
            Message: "Task completed",
        }, nil) {
            return
        }
    }
}
```

Look, the `if !yield(...) { return }` pattern takes a minute to internalize. But once you do, it reads like a script: emit start, loop through updates, handle the error case, emit end. The yield returns false when the consumer breaks out of the loop, and you just... return. That's the entire cancellation mechanism.

### Consuming it

But here's the thing. The consumer side is where this pattern genuinely shines:

```go
func main() {
    fmt.Println("Starting the CLI application with error handling...")

    for event, err := range CommandEventStream() {
        if err != nil {
            fmt.Println("Error:", err)
            continue
        }

        switch event.Type {
        case EventTypeStart:
            fmt.Println("Start:", event.Message)
        case EventTypeUpdate:
            fmt.Println("Update:", event.Message)
        case EventTypeEnd:
            fmt.Println("End:", event.Message)
        }
    }

    fmt.Println("CLI application has finished.")
}
```

A `for...range` loop. That's it. No channel reads, no goroutine cleanup, no deferred closes, no `sync.WaitGroup`. Just iterate over events and handle them. The iterator and the loop run in the same goroutine, so there's zero concurrency overhead.

### Output

```
Starting the CLI application with error handling...
Start: Task started
Update: Task progress: 20%
Update: Task progress: 40%
Error: an error occurred at 60% progress
Update: Task progress: 80%
Update: Task progress: 100%
End: Task completed
CLI application has finished.
```

Each line appears every two seconds. Streaming output with no buffering, no memory accumulation, no concurrency bugs waiting to surface in production.

### Why this is better

Four things:

- **Memory**: One event in memory at a time. Not a slice of all events. Not a buffered channel.
- **Readability**: The producer reads top-to-bottom like a script. The consumer is a plain loop.
- **Error handling**: Errors flow through the same yield mechanism. No separate error channel, no panics to recover from.
- **No concurrency tax**: Same goroutine, same stack. You don't pay for what you don't use.

How many times have you seen a channel-based approach where someone forgot to drain the channel, or didn't close it, or introduced a deadlock because the producer and consumer had different assumptions about buffering? Iterators eliminate that entire category of bug.

### Under the hood

Go 1.22's iterator model lets the runtime manage control flow between the iterator function and the `for...range` loop. Each call to `yield` passes a value back to the loop variables and suspends the iterator until the loop body completes. Same goroutine, cooperative scheduling, no magic.

This is the same pattern that Python generators and C# enumerators have used for years. But it's Go, so it compiles to a single binary and runs without a runtime interpreter. That combination of ergonomics and performance is genuinely hard to find.

### Full Code Example

Here's the entire `main.go` file for reference:

```go
package main

import (
    "fmt"
    "time"
)

// EventType represents the type of event.
type EventType string

const (
    EventTypeStart  EventType = "start"
    EventTypeUpdate EventType = "update"
    EventTypeEnd    EventType = "end"
    EventTypeError  EventType = "error"
)

// CommandEvent represents an event during the execution of a command.
type CommandEvent struct {
    Type    EventType
    Message string
}

// CommandEventIterator is a custom iterator type for CommandEvent and error.
type CommandEventIterator func(yield func(*CommandEvent, error) bool)

// CommandEventStream returns a CommandEventIterator.
// It simulates a long-running process that yields command events over time.
func CommandEventStream() CommandEventIterator {
    return func(yield func(*CommandEvent, error) bool) {
        // Start event
        if !yield(&CommandEvent{
            Type:    EventTypeStart,
            Message: "Task started",
        }, nil) {
            return
        }

        // Simulate task with possible error
        for i := 1; i <= 5; i++ {
            time.Sleep(2 * time.Second)

            // Simulate an error at 60%
            if i == 3 {
                if !yield(nil, fmt.Errorf("an error occurred at %d%% progress", i*20)) {
                    return
                }
                continue
            }

            // Update event
            if !yield(&CommandEvent{
                Type:    EventTypeUpdate,
                Message: fmt.Sprintf("Task progress: %d%%", i*20),
            }, nil) {
                return
            }
        }

        // End event
        if !yield(&CommandEvent{
            Type:    EventTypeEnd,
            Message: "Task completed",
        }, nil) {
            return
        }
    }
}

func main() {
    fmt.Println("Starting the CLI application with error handling...")

    for event, err := range CommandEventStream() {
        if err != nil {
            fmt.Println("Error:", err)
            continue
        }

        switch event.Type {
        case EventTypeStart:
            fmt.Println("Start:", event.Message)
        case EventTypeUpdate:
            fmt.Println("Update:", event.Message)
        case EventTypeEnd:
            fmt.Println("End:", event.Message)
        }
    }

    fmt.Println("CLI application has finished.")
}
```

Go 1.22's iterators aren't flashy. They don't introduce new syntax or require framework buy-in. They just give you a clean, composable, zero-overhead way to stream values through a `for...range` loop. For CLI tools that need to report progress, handle errors inline, and stay readable six months later, this pattern replaces channels, callbacks, and hand-rolled state machines with something that looks like... a loop.

Simplicity is a superpower. Use it.
