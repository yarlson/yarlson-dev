---
title: "The Gold Standard: CLI Design Principles for Production Systems"
summary: "Defining the 'Gold Standard' for production-ready CLIs: TTY-aware behavior, clean stdout vs stderr contracts, JSON output for automation, and idempotent mutations."
postLayout: simple
date: "2025-12-09"
tags:
  - cli
---

Most internal tooling starts as a bash script hacked together during an outage. It evolves into a Python script, then eventually a compiled binary distributed to the entire engineering org.

The problem is that most of these tools remain "scripts" at heart—fragile, unpredictable, and hostile to automation. To fix this, high-velocity engineering organizations are converging on a rigorous set of design principles—a **Gold Standard** for CLI architecture.

## The Core Problem: Context Blindness

Production CLIs serve two masters: the developer at a terminal and the script running in CI. Most tools optimize for one and break the other.

The **Gold Standard** requires TTY detection—your tool must know whether stdout is connected to a terminal or a pipe, then behave accordingly.

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

Always provide override flags (`--no-color`, `--force-color`) because auto-detection fails in edge cases like `tmux` sessions or exotic terminal emulators.

## The "Return Value" Paradigm: Stdout as Data

Traditional Unix philosophy says "silence is golden"—successful commands should produce no output. The **Gold Standard** introduces a modern model: every command has a return value that belongs on stdout.

**Stream contract:**

- **Stdout:** The data payload—the functional return value
- **Stderr:** Telemetry and metadata—logs, warnings, progress

This isn't just about read operations. Write operations return data too:

```bash
# Create returns the resource object
cli create database --name prod-001 --format json
{"id": "db-123", "name": "prod-001", "status": "created"}

# Deploy returns the deployment report
cli deploy app-v2
{"deployment_id": "dep-456", "status": "success", "duration_ms": 2340}
```

Progress indicators and logs go to stderr, so pipelines stay clean:

```bash
cli create database --name prod-001 --format json | jq -r '.id'
# stderr: Creating database... ████████ 100%
# stdout (piped): db-123
```

## The Output Matrix: What Goes Where

| Command Type | Example            | Stdout Content                               | Stderr Content                        |
| ------------ | ------------------ | -------------------------------------------- | ------------------------------------- |
| Read         | `list`, `status`   | Requested dataset (listings, status objects) | Debug logs, warnings                  |
| Write        | `create`, `update` | Result object (resource ID, summary)         | Progress bars, "Creating..." logs     |
| Operational  | `deploy`, `push`   | Final deployment report                      | Streaming build logs, upload progress |

When we violated this, operators couldn't pipe CLI output because progress logs mixed with data. The workaround was `cli get-resource 2>/dev/null | jq`, which silenced actual errors.

## Structured Output is Not Optional

Forcing users to parse ASCII tables with `awk` is hostile design. We needed resource IDs from 300 database instances. The existing CLI output looked like this:

```
┌──────────────┬─────────────┬────────┐
│ ID           │ Status      │ Region │
├──────────────┼─────────────┼────────┤
│ db-prod-001  │ Running     │ us-east│
└──────────────┴─────────────┴────────┘
```

Extracting IDs required fragile regex. Under the **Gold Standard**, structured output is a requirement.

```bash
cli list databases --format json | jq -r '.[].id'
```

**Implementation requirements:**

- Global `--format` flag supporting `json`, `yaml`, `text`
- Consistency across commands—if `list` outputs JSON, `create` must also return structured data
- In headless mode, consider defaulting to JSON rather than tables

## Idempotency: Handle Re-runs Gracefully

Network timeouts, script retries, and impatient operators clicking "run" twice are facts of life. Your CLI must not break when commands repeat.

**Bad (causes duplicate resources):**

```bash
cli create database db-prod-001
# Success: Created db-prod-001

cli create database db-prod-001
# Error: Database db-prod-001 already exists (exit 1)
```

The script sees exit code 1 and reports failure, even though the desired state exists.

**The Gold Standard (idempotent):**

```bash
cli create database db-prod-001
# Success: Created db-prod-001 (exit 0)

cli create database db-prod-001
# Success: db-prod-001 already exists (exit 0)
```

The goal is state convergence, not action execution. Re-running succeeds with exit 0 because the resource exists—the command achieved its purpose.

## Dry-Run: Preview Before Destruction

Every mutation command needs `--dry-run`. We deleted 40 load balancers because a script had the wrong variable interpolation. A dry-run would have shown the intent before executing it.

```bash
cli delete resource --filter "env=staging" --dry-run
# Would delete: lb-staging-001, lb-staging-002, lb-staging-003
# (no actual changes made)

cli delete resource --filter "env=staging"
# Error: This will delete 3 resources. Use --yes to confirm.

cli delete resource --filter "env=staging" --yes
# Deleted: lb-staging-001, lb-staging-002, lb-staging-003
```

Interactive mode prompts for confirmation. Headless mode fails unless `--yes` is explicit. Dry-run executes all validation logic and prints exactly what would happen without altering system state.

## Configuration Hierarchy: Flags Beat Env Vars Beat Files

The precedence order matters for portability across development and production:

1. **Command flags** (highest priority): `--region us-west`
2. **Environment variables**: `CLI_REGION=us-east`
3. **Local config file**: `./.cli-config`
4. **Global config file**: `~/.config/cli/config`
5. **Defaults** (lowest priority)

This allows local overrides during development while respecting containerized CI environments that rely on environment variables.

```bash
# Development: Override with flag
cli deploy --region eu-west

# CI: Reads from environment
export CLI_REGION=us-east
cli deploy
```

## Error Messages Must Be Actionable

**Bad:**

```
Error: Invalid argument
```

**The Gold Standard:**

```
Error: Unknown flag '--fource'
Did you mean '--force'?

Usage: cli delete resource [flags]
  -f, --force    Skip confirmation prompt

See: [https://docs.example.com/cli/delete-resource](https://docs.example.com/cli/delete-resource)
```

We reduced support tickets by 30% after implementing suggestion logic for typos and including documentation URLs in errors. Users need concrete next steps, not vague failure descriptions.

## Startup Time: First Response Under 100ms

A CLI is part of the development feedback loop. If `cli --help` takes 2 seconds, developers get frustrated.

**Trade-offs:**

- Native binaries (Go, Rust) start in \<50ms
- Python with heavy imports: 200-500ms
- JVM-based tools: 500-2000ms

For frequently used commands, startup latency compounds. If you must use a slow runtime, implement a daemon mode where the first invocation starts a background process and subsequent calls use IPC to the running daemon.

For long-running operations, use **Optimistic UI**—acknowledge the command immediately on stderr ("Request queued...") before the operation completes to prevent the appearance of a hung process.

## Standard Interface Patterns

**POSIX compliance:**

- Short flags (`-f`) for efficiency
- Long flags (`--force`) for script readability
- Use `--` to delimit flags from positional arguments

**Predictable verbs:**
Use standard verb-noun pairings (`get`, `list`, `create`, `delete`) rather than creative synonyms (`fetch`, `show`, `make`, `remove`). Muscle memory should transfer from system tools to your CLI.

**Help that teaches:**
The `--help` output must include concrete, copy-pasteable usage examples, not just flag definitions. Show common workflows:

```
Examples:
  # Create a database with specific settings
  cli create database --name prod-001 --region us-east --replicas 3

  # List all databases in JSON format
  cli list databases --format json | jq '.[] | select(.status=="running")'
```

## Where This Breaks Down

**Local-only tools:** If your CLI never runs in CI and is purely interactive (like `tig` or `htop`), TTY detection and JSON output are overengineering.

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
- [ ] Follow configuration precedence: flags \> env \> files \> defaults
- [ ] Target \<100ms startup time for interactive commands
- [ ] Provide `--yes` to skip interactive prompts in scripts
- [ ] Return structured data on stdout for write operations
- [ ] Show progress indicators only on stderr

## References

- POSIX Utility Conventions: https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1\_chap12.html
- 12-Factor CLI Apps: https://medium.com/@jdxcode/12-factor-cli-apps-dd3c227a0e46
- TTY Detection in Go: `golang.org/x/term/isatty`
