---
title: "The Hidden Cost of UI Frameworks for CLI Tasks in Go"
summary: "Discover why using modern UI frameworks for simple CLI tasks in Go can lead to unnecessary complexity. Learn about choosing the right tools for CLI development and the importance of matching solutions to problems."
postLayout: simple
date: "2024-12-01"
tags:
  - go
---

A couple of weeks ago, while working on [ftl](https://github.com/yarlson/ftl), I needed to add progress indicators. Simple spinners, nothing fancy - just a way to show users that something was happening during long-running operations. What followed was an unexpected journey through the Go ecosystem that taught me valuable lessons about choosing the right tools for CLI development.

## The Allure of Modern UI Frameworks

When you start looking for ways to implement CLI interfaces in Go, you'll quickly encounter Bubbletea. Its demos are impressive: beautiful terminal applications with rich interactivity, smooth animations, and elegant state management. The promise of bringing The Elm Architecture to terminal applications is enticing. Who wouldn't want their CLI to be as well-architected as a modern web application?

This is where the trap lies.

## The Reality Check: CLI vs UI

Command-line interfaces are fundamentally different from user interfaces. They follow different patterns, have different user expectations, and serve different purposes. While a web application needs to manage complex state transitions and handle multiple user interactions simultaneously, a CLI tool typically processes commands in a linear fashion.

Let's look at a simple example: adding a progress spinner while downloading a file.

With a traditional CLI library like chelnak/ysmrr, you might write:

```go
spinner := ysmrr.NewSpinner("Downloading file...")
spinner.Start()
// Do the work
downloadFile()
spinner.Stop()
```

Simple, intuitive, and follows the natural flow of CLI operations.

Now, with Bubbletea, you need to:

1. Define your model structure
2. Implement state update methods
3. Handle view rendering
4. Set up message passing
5. Manage component lifecycle

What should be a few lines of code becomes a complex state machine. Here's what it might look like:

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

## My Journey Through Libraries

Initially, I tried pterm for ftl. While it seemed promising at first, I quickly ran into data race issues. The problem has been documented but remains unresolved. This was a dealbreaker for a tool that needs to be reliable.

In my search for alternatives, I explored:

- **pterm**: Had to abandon it due to data races
- **briandowns/spinner**: Simple but lacks support for multiple spinners
- **bubbletea**: Brought unnecessary complexity for simple CLI tasks
- **chelnak/ysmrr**: The solution I ultimately chose - simple, reliable, and fits CLI patterns

## Why I Chose chelnak/ysmrr

After experiencing the issues with more complex solutions, chelnak/ysmrr was exactly what I needed:

1. **Simplicity**: The API follows traditional CLI patterns
2. **Reliability**: No data races or complex state management
3. **Maintainability**: The code remains clear and straightforward
4. **Multiple Spinners**: When I needed them, they just worked

## Lessons Learned

1. **Match the Tool to the Task**: CLI tools don't need UI frameworks. They need libraries that support common CLI patterns.

2. **Consider the Full Cost**: The true cost of a framework isn't just in the initial implementation - it's in the ongoing maintenance, debugging, and cognitive overhead.

3. **Value Simplicity**: In CLI development, simple and reliable beats feature-rich and complex.

4. **Trust Traditional Patterns**: CLI patterns have evolved over decades. There's usually a good reason why they work the way they do.

## When Might You Want Bubbletea?

Bubbletea isn't a bad framework - it's just often used for the wrong purposes. Consider it when:

- Building a full-screen terminal user interface
- Creating an interactive application with complex state
- Developing a terminal-based game or rich text editor

But for typical CLI tools? Stick with libraries that match CLI patterns.

## Conclusion

The next time you're adding features to your CLI tool, resist the urge to reach for a UI framework. Consider whether a simpler, more focused library might be a better fit. Your future self will thank you for it.

Remember: Just because you can build your CLI like a web application doesn't mean you should.

## Resources

- [ftl](https://github.com/yarlson/ftl) - My CLI project where I learned these lessons
- [chelnak/ysmrr](https://github.com/chelnak/ysmrr) - The spinner library I recommend
- [12 Factor CLI Apps](https://medium.com/@jdxcode/12-factor-cli-apps-dd3c227a0e46) - Great guidelines for CLI development
- [Command Line Interface Guidelines](https://clig.dev/) - Best practices for CLI design
