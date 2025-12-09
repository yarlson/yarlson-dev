---
title: "CLI Design Principles for Production Systems"
summary: "Practical rules for production-ready CLIs: TTY-aware behavior, clean stdout vs stderr contracts, JSON output for automation, idempotent mutations with dry-runs, actionable errors, sane config precedence, and sub-100ms startup times."
postLayout: simple
date: "2025-12-09"
tags:
  - cli
---

Most internal tooling starts as a bash script hacked together during an outage. It evolves into a Python script, then eventually a compiled binary distributed to the entire engineering org.

The problem is that most of these tools remain "scripts" at heart—fragile, unpredictable, and hostile to automation.

## The Core Problem: Context Blindness

Production CLIs serve two masters: the developer at a terminal and the script running in CI. Most tools optimize for one and break the other. The solution is TTY detection—your tool must know whether stdout is connected to a terminal or a pipe, then behave accordingly.

**Interactive (TTY detected):**

- Render progress bars, spinners, colored output
- Prompt for confirmation on destructive actions
- Format data as human-readable tables

**Headless (pipe or redirect detected):**

- Strip all ANSI codes automatically
- Disable animations that pollute logs
- Output only parseable data to stdout

```go
if isatty.IsTerminal(os.Stdout.Fd()) {
    // Human is watching: show progress bar
    showProgressBar()
} else {
    // Machine is consuming: silent operation
}
```

Always provide override flags (`--no-color`, `--force-color`) because auto-detection fails in edge cases like `tmux` sessions or exotic terminal emulators.

## Stdout vs. Stderr: The Contract You Cannot Break

**Rule:** Stdout is the return value. Stderr is everything else.

When we violated this rule, operators couldn't pipe our CLI output because progress logs mixed with data payloads. The workaround was `cli get-resource 2>/dev/null | jq`, which silenced actual errors.

**Correct implementation:**

- Stdout: Requested data only (JSON, CSV, raw text)
- Stderr: Logs, warnings, progress indicators, errors

This allows clean composition:

```bash
cli get-resource | jq '.id' | xargs cli delete-resource
```

Progress bars appear on screen (stderr), but the pipeline receives clean data (stdout). If this doesn't work, your streams are wrong.

## Machine-Readable Output: JSON is Not Optional

Forcing users to parse ASCII tables with `awk` is hostile design. We needed resource IDs from 300 database instances. The existing CLI output looked like this:

```
┌──────────────┬─────────────┬────────┐
│ ID           │ Status      │ Region │
├──────────────┼─────────────┼────────┤
│ db-prod-001  │ Running     │ us-east│
└──────────────┴─────────────┴────────┘
```

Extracting IDs required fragile regex. With `--format json`:

```bash
cli list-databases --format json | jq -r '.[].id'
```

**Implementation pattern:**

- Default to human-readable tables for interactive use
- Provide `--format` flag supporting `json`, `yaml`, `text`
- In headless mode, consider defaulting to JSON

## Idempotency: Handle Re-runs Gracefully

Network timeouts, script retries, and impatient operators clicking "run" twice are facts of life. Your CLI must not break when commands repeat.

**Bad (causes duplicate resources):**

```bash
cli create-database db-prod-001
# Success: Created db-prod-001

cli create-database db-prod-001
# Error: Database db-prod-001 already exists (exit 1)
```

The script sees exit code 1 and reports failure, even though the desired state exists.

**Good (idempotent):**

```bash
cli create-database db-prod-001
# Success: Created db-prod-001 (exit 0)

cli create-database db-prod-001
# Success: db-prod-001 already exists (exit 0)
```

Re-running succeeds with exit 0. The resource exists; the operation achieved its goal.

## Dry-Run: Preview Before Destruction

Every mutation command needs `--dry-run`. We deleted 40 load balancers because a script had the wrong variable interpolation. A dry-run would have shown the intent before executing it.

```bash
cli delete-resource --filter "env=staging" --dry-run
# Would delete: lb-staging-001, lb-staging-002, lb-staging-003
# (no actual changes made)

cli delete-resource --filter "env=staging"
# Error: This will delete 3 resources. Use --yes to confirm.

cli delete-resource --filter "env=staging" --yes
# Deleted: lb-staging-001, lb-staging-002, lb-staging-003
```

Interactive mode prompts for confirmation. Headless mode fails unless `--yes` is explicit.

## Error Messages Must Be Actionable

**Bad:**

```
Error: Invalid argument
```

**Good:**

```
Error: Unknown flag '--fource'
Did you mean '--force'?

Usage: cli delete-resource [flags]
  -f, --force    Skip confirmation prompt

See: https://docs.example.com/cli/delete-resource
```

We reduced support tickets by 30% after implementing suggestion logic for typos and including documentation URLs in errors.

## Configuration Hierarchy: Flags Beat Env Vars Beat Files

The precedence order matters for portability:

1. **Command flags** (highest priority): `--region us-west`
2. **Environment variables**: `export APP_REGION=us-east`
3. **Local config file**: `./.app-config`
4. **Global config file**: `~/.config/app/config`
5. **Defaults** (lowest priority)

This allows local overrides during development while respecting containerized CI environments that rely on environment variables.

```bash
# Development: Override with flag
cli deploy --region eu-west

# CI: Reads from environment
export APP_REGION=us-east
cli deploy
```

## Startup Time: First Response Under 100ms

A CLI is part of the development feedback loop. If `cli --help` takes 2 seconds, developers get frustrated.

**Trade-offs:**

- Native binaries (Go, Rust) start in <50ms
- Python with heavy imports: 200-500ms
- JVM-based tools: 500-2000ms

For frequently used commands, startup latency compounds. We rewrote a Python CLI in Go and reduced `time cli status` from 380ms to 45ms.

If you must use a slow runtime, implement a persistent daemon mode where the first invocation starts a background process and subsequent calls are IPC to the running daemon.

## Where This Breaks Down

**Local-only tools:** If your CLI never runs in CI and is purely interactive (like `tig` or `htop`), TTY detection and JSON output are overengineering.

**Single-command wrappers:** If the tool does exactly one thing (`curl` wrapper), progressive disclosure and configuration hierarchy add unnecessary complexity.

**Ultra-high-frequency execution:** If your CLI runs 10,000 times per second in a tight loop, startup time optimization becomes critical, potentially justifying C or assembly.

## Implementation Checklist

- [ ] Detect TTY and adjust output accordingly
- [ ] Separate stdout (data) from stderr (logs)
- [ ] Provide `--format json` for all data commands
- [ ] Make mutation commands idempotent
- [ ] Implement `--dry-run` for destructive actions
- [ ] Use standard flag syntax (`-f`, `--force`)
- [ ] Include "did you mean?" suggestions in errors
- [ ] Follow configuration precedence: flags > env > files > defaults
- [ ] Target <100ms startup time for interactive commands
- [ ] Provide `--yes` to skip interactive prompts in scripts

## References

- POSIX Utility Conventions: https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1_chap12.html
- 12-Factor CLI Apps: https://medium.com/@jdxcode/12-factor-cli-apps-dd3c227a0e46
- TTY Detection in Go: `golang.org/x/term/isatty`
