---
title: "The Gold Standard: CLI Design Principles for Production Systems"
summary: "Defining the 'Gold Standard' for production-ready CLIs: TTY-aware behavior, clean stdout vs stderr contracts, JSON output for automation, and idempotent mutations."
postLayout: simple
date: "2025-12-09"
tags:
  - cli
---

It always starts the same way. Bash script. Outage. 3 AM. Someone hacks together forty lines of curl and jq, commits it with the message "fix prod," and walks away. Six months later that script is a Python binary distributed to 200 engineers, and it still behaves like something written at 3 AM.

The gap between "script that works on my machine" and "tool that earns trust in production" is genuinely enormous. But it's not mysterious. High-velocity engineering orgs keep converging on the same set of principles. Call it the **Gold Standard** for CLI architecture.

## Context Blindness Will Ruin You

Your CLI serves two masters: the developer at a terminal and the automation pipeline in CI. Most tools pick one and silently destroy the other.

The fix is TTY detection. Your tool checks whether stdout is connected to a terminal or a pipe, then behaves accordingly. Simple concept. Transformative results.

**Interactive (TTY detected):**

- Render progress bars, spinners, colored output
- Prompt for confirmation on destructive actions
- Format data as human-readable tables

**Headless (pipe or redirect detected):**

- Strip all ANSI codes automatically
- Disable animations that pollute logs
- Output structured data formats

```go
if isatty.IsTerminal(os.Stdout.Fd()) {
    // Human is watching: show progress bar
    showProgressBar()
} else {
    // Machine is consuming: silent operation
}
```

Always ship override flags (`--no-color`, `--force-color`). Auto-detection breaks in `tmux` sessions and exotic terminal emulators. When it breaks, your users need a manual lever.

## Stdout Is Your Return Value

Traditional Unix says "silence is golden." Successful commands produce nothing. That philosophy made sense in the 1970s. It doesn't survive contact with modern infrastructure automation.

The **Gold Standard** introduces a cleaner model: every command has a return value. That value lives on stdout.

**Stream contract:**

- **Stdout:** The data payload. The functional return value.
- **Stderr:** Telemetry and metadata. Logs, warnings, progress.

This isn't limited to reads. Write operations return data too:

```bash
# Create returns the resource object
cli create database --name prod-001 --format json
{"id": "db-123", "name": "prod-001", "status": "created"}

# Deploy returns the deployment report
cli deploy app-v2
{"deployment_id": "dep-456", "status": "success", "duration_ms": 2340}
```

Progress indicators go to stderr, so pipelines stay clean:

```bash
cli create database --name prod-001 --format json | jq -r '.id'
# stderr: Creating database... ████████ 100%
# stdout (piped): db-123
```

Why does this matter so much? Because when you violate it, operators can't pipe output without progress logs corrupting the data stream. The workaround becomes `cli get-resource 2>/dev/null | jq`, which silences actual errors. You've traded one problem for a worse one.

## The Output Matrix

Where does each piece go? Here's the contract:

| Command Type | Example            | Stdout Content                               | Stderr Content                        |
| ------------ | ------------------ | -------------------------------------------- | ------------------------------------- |
| Read         | `list`, `status`   | Requested dataset (listings, status objects) | Debug logs, warnings                  |
| Write        | `create`, `update` | Result object (resource ID, summary)         | Progress bars, "Creating..." logs     |
| Operational  | `deploy`, `push`   | Final deployment report                      | Streaming build logs, upload progress |

Print this on a wall. Refer to it during code review. Every violation creates a downstream papercut for someone writing automation against your tool.

## Structured Output Is a Superpower

Look, forcing users to parse ASCII tables with `awk` is genuinely hostile. We needed resource IDs from 300 database instances. The existing CLI output looked like this:

```
┌──────────────┬─────────────┬────────┐
│ ID           │ Status      │ Region │
├──────────────┼─────────────┼────────┤
│ db-prod-001  │ Running     │ us-east│
└──────────────┴─────────────┴────────┘
```

Extracting IDs required fragile regex that broke every time someone added a column. Under the **Gold Standard**, structured output is non-negotiable:

```bash
cli list databases --format json | jq -r '.[].id'
```

**Implementation requirements:**

- Global `--format` flag supporting `json`, `yaml`, `text`
- Consistency across commands. If `list` outputs JSON, `create` must return structured data too
- In headless mode, consider defaulting to JSON rather than tables

## Idempotency: The World Reruns Everything

Network timeouts. Script retries. Impatient operators clicking "run" twice. These aren't edge cases. They're Tuesday.

**Bad (causes duplicate resources):**

```bash
cli create database db-prod-001
# Success: Created db-prod-001

cli create database db-prod-001
# Error: Database db-prod-001 already exists (exit 1)
```

The script sees exit code 1 and reports failure, even though the desired state already exists. That's a pager going off at 2 AM for nothing.

**The Gold Standard (idempotent):**

```bash
cli create database db-prod-001
# Success: Created db-prod-001 (exit 0)

cli create database db-prod-001
# Success: db-prod-001 already exists (exit 0)
```

The goal is state convergence, not action execution. Re-running succeeds with exit 0 because the resource exists. The command achieved its purpose. That's the only thing that should matter.

## Dry-Run: Because You Will Delete the Wrong Thing

Every mutation command needs `--dry-run`. We deleted 40 load balancers because a script had the wrong variable interpolation. A dry-run flag would have shown us the blast radius before we pulled the trigger.

```bash
cli delete resource --filter "env=staging" --dry-run
# Would delete: lb-staging-001, lb-staging-002, lb-staging-003
# (no actual changes made)

cli delete resource --filter "env=staging"
# Error: This will delete 3 resources. Use --yes to confirm.

cli delete resource --filter "env=staging" --yes
# Deleted: lb-staging-001, lb-staging-002, lb-staging-003
```

Interactive mode prompts for confirmation. Headless mode fails unless `--yes` is explicit. Dry-run executes all validation logic and prints exactly what would happen without touching system state. Three layers of protection. You need all of them.

## Configuration: Flags Beat Env Vars Beat Files

The precedence order exists for a reason, and getting it wrong makes your tool unpredictable across environments:

1. **Command flags** (highest priority): `--region us-west`
2. **Environment variables**: `CLI_REGION=us-east`
3. **Local config file**: `./.cli-config`
4. **Global config file**: `~/.config/cli/config`
5. **Defaults** (lowest priority)

This lets developers override locally while respecting containerized CI environments that pipe configuration through env vars.

```bash
# Development: Override with flag
cli deploy --region eu-west

# CI: Reads from environment
export CLI_REGION=us-east
cli deploy
```

But here's the thing most teams miss: document which configuration sources each flag respects. Hidden precedence rules are just bugs you haven't found yet.

## Error Messages That Actually Help

What percentage of your CLI's error messages could a new engineer act on without asking Slack? Be honest.

**Bad:**

```
Error: Invalid argument
```

This tells you nothing. It's the CLI equivalent of a shrug.

**The Gold Standard:**

```
Error: Unknown flag '--fource'
Did you mean '--force'?

Usage: cli delete resource [flags]
  -f, --force    Skip confirmation prompt

See: [https://docs.example.com/cli/delete-resource](https://docs.example.com/cli/delete-resource)
```

We reduced support tickets by 30% after implementing typo suggestions and documentation URLs in errors. Users need concrete next steps. Give them the answer, not a riddle.

## Startup Time: 100ms or You've Already Lost

A CLI is part of the development feedback loop. If `cli --help` takes 2 seconds, developers will avoid using it. They'll find workarounds. Those workarounds will be worse.

**The tradeoffs are real:**

- Native binaries (Go, Rust) start in <50ms
- Python with heavy imports: 200-500ms
- JVM-based tools: 500-2000ms

For frequently used commands, startup latency compounds fast. If you must use a slow runtime, implement a daemon mode. First invocation starts a background process. Subsequent calls use IPC to the running daemon.

For long-running operations, use **Optimistic UI**: acknowledge the command immediately on stderr ("Request queued...") before the operation completes. Nobody should stare at a frozen terminal wondering if the process hung.

## Standard Interface Patterns

**POSIX compliance:**

- Short flags (`-f`) for efficiency
- Long flags (`--force`) for script readability
- Use `--` to delimit flags from positional arguments

**Predictable verbs:**
Use standard verb-noun pairings (`get`, `list`, `create`, `delete`) rather than creative synonyms (`fetch`, `show`, `make`, `remove`). Muscle memory is a superpower. Let it transfer from system tools to your CLI without friction.

**Help that teaches:**
The `--help` output must include concrete, copy-pasteable usage examples. Not just flag definitions. Show common workflows:

```
Examples:
  # Create a database with specific settings
  cli create database --name prod-001 --region us-east --replicas 3

  # List all databases in JSON format
  cli list databases --format json | jq '.[] | select(.status=="running")'
```

## Where This Breaks Down

Not every tool needs the full treatment. Knowing when to skip rules matters as much as knowing the rules.

**Local-only tools:** If your CLI never runs in CI and is purely interactive (like `tig` or `htop`), TTY detection and JSON output are overengineering. Don't build what nobody will use.

**Single-command wrappers:** If the tool does exactly one thing (a `curl` wrapper), progressive disclosure and configuration hierarchy add unnecessary complexity.

**Ultra-high-frequency execution:** If your CLI runs 10,000 times per second in a tight loop, startup time optimization becomes critical, potentially justifying C or assembly.

**Simple mutation scripts:** If you're wrapping a single API call with no retry logic or state management, idempotency guarantees may be overkill.

## The Gold Standard Checklist

- [ ] Detect TTY and adjust output accordingly
- [ ] Separate stdout (data) from stderr (logs)
- [ ] Provide `--format json` for all commands that return data
- [ ] Make mutation commands idempotent (return 0 on no-op)
- [ ] Implement `--dry-run` for destructive actions
- [ ] Use standard flag syntax (`-f`, `--force`)
- [ ] Include "did you mean?" suggestions in errors
- [ ] Follow configuration precedence: flags > env > files > defaults
- [ ] Target <100ms startup time for interactive commands
- [ ] Provide `--yes` to skip interactive prompts in scripts
- [ ] Return structured data on stdout for write operations
- [ ] Show progress indicators only on stderr

Let's talk about what this all adds up to. TTY awareness, clean stream contracts, structured output, idempotency, dry-run, sane configuration, actionable errors, fast startup, standard interfaces. None of these ideas are novel. Every one of them is a solved problem. But the gap between knowing them and shipping a CLI that actually respects all of them is where most tools fall apart. The Gold Standard isn't about individual features. It's about the discipline of treating your CLI as a contract with every human and machine that will ever call it. Build that contract carefully, and your tool earns something scripts never do: trust.

## References

- POSIX Utility Conventions: https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1\_chap12.html
- 12-Factor CLI Apps: https://medium.com/@jdxcode/12-factor-cli-apps-dd3c227a0e46
- TTY Detection in Go: `golang.org/x/term/isatty`
