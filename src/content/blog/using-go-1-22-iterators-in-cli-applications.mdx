---
title: "Using Go 1.22's New Iterators in CLI Applications"
summary: "Go 1.22 introduces built-in support for iterators, providing a memory-efficient and composable way to handle data streams. This post explains how to use these iterators in CLI applications, complete with code examples and best practices."
postLayout: simple
date: "2024-10-26"
tags:
  - go
---

Go 1.22 introduced a neat feature that I've been experimenting with lately: built-in support for iterators via the new `iter` package. This addition simplifies handling data streams, especially in command-line applications. I thought I'd share how I used these iterators in a CLI tool I was working on.

### The Problem

I needed to create a CLI that performs a long-running task and outputs status updates as it progresses. Traditionally, you might use channels or process everything upfront, but those approaches can be cumbersome or inefficient for this use case.

### Enter Go 1.22 Iterators

The new iterator support allows functions to yield values one at a time, which is perfect for streaming data or handling ongoing tasks. The best part is that you can use these iterators directly in `for...range` loops without additional complexity.

Here's how I set it up.

### Defining Event Types

First, I defined an `EventType` to represent different stages of the task:

```go
type EventType string

const (
    EventTypeStart  EventType = "start"
    EventTypeUpdate EventType = "update"
    EventTypeEnd    EventType = "end"
    EventTypeError  EventType = "error"
)
```

And a `CommandEvent` struct to hold the event data:

```go
type CommandEvent struct {
    Type    EventType
    Message string
}
```

### Creating a Custom Iterator Type

To make the code cleaner, I introduced a custom iterator type:

```go
type CommandEventIterator func(yield func(*CommandEvent, error) bool)
```

This type represents a function that yields `*CommandEvent` values, possibly returning an error.

### Implementing the Iterator Function

Next, I wrote the `CommandEventStream` function, which simulates a long-running task:

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

This function yields start, update, and end events, and simulates an error at 60% progress.

### Consuming the Iterator in `main`

The beauty of Go 1.22's iterators is that you can use them directly in a `for...range` loop without any additional setup. Here's how I used the iterator in the `main` function:

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

### Running the Program

When I run the program, I get:

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

Each message appears every 2 seconds, simulating the task's progression.

### Benefits of This Approach

Using iterators like this has several advantages:

- **Efficiency**: Processes one event at a time without loading everything into memory.
- **Simplicity**: The code is straightforward and easy to follow.
- **Error Handling**: Errors are managed within the iterator, keeping the `main` function clean.
- **No Extra Concurrency**: We don't need to set up channels or goroutines; the iterator works seamlessly with `for...range`.

### How It Works Under the Hood

The `for...range` loop over the iterator function works because Go 1.22's iterator model allows the runtime to manage the control flow between the iterator and the loop. When the loop runs, it repeatedly calls the iterator function, and each call to `yield` passes a value back to the loop variables.

This means that the iterator function and the loop execute in the same goroutine, and there's no need for additional concurrency mechanisms.

### Conclusion

I found the new iterator support in Go 1.22 to be a valuable addition. It made handling a long-running task in a CLI application much simpler. Defining a custom iterator type improved the readability of my code, and the overall pattern feels natural.

If you're working with Go and need to process data streams or handle tasks that produce incremental output, I'd recommend giving the new iterators a try.

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

### Final Thoughts

Go's iterator pattern introduced in version 1.22 is a game-changer for handling streams of data in a clean and efficient manner. By using a custom iterator type, we can write code that's both readable and maintainable.

One of the standout benefits is that we don't need to manage channels or goroutines explicitly. The iterator integrates seamlessly with `for...range`, simplifying the code and reducing potential errors.

If you haven't tried out the new `iter` package yet, it's worth exploring in your next Go project.
