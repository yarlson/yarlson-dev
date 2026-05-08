---
title: "Good CLI Design Is Mostly Silence"
summary: "A CLI is not only a user interface. It is also an API for scripts. Quiet mode, stdout, stderr, colors, and exit codes need clear contracts."
postLayout: simple
date: "2026-05-08"
tags:
  - cli
---

A good CLI knows when not to print.

That sounds small, but it is one of the biggest differences between a toy command and a tool people can use every day.

A terminal command has two kinds of users. Sometimes a person is reading the output. Sometimes a script is reading it. The script is less forgiving.

A person can ignore a progress line. A script cannot. A person can understand that `Done!` is not part of the JSON. A script cannot. A person can scroll past a tip. A script stores it in a file and breaks the next command.

Output is not decoration. Output is an interface.

## Quiet means quiet

`--quiet` should have a strong meaning.

It should not mean "print fewer messages". It should not mean "hide the banner but keep the tips". It should not mean "be quiet except during setup".

Quiet means: if the command succeeds and there is nothing important to say, print nothing.

This matters for automation.

Bad quiet mode looks like this:

```text
Initializing...
Done!
Tip: run tool status next
```

That is fine for a demo. It is bad for scripts.

If a user asks for quiet output, they probably want to compose your command with something else. They may redirect stdout. They may compare output. They may run it in CI.

Do not make them clean up your friendly messages.

## stdout is for data

stdout and stderr are different tools.

Use stdout for the result the user asked for. Use stderr for logs, warnings, progress, and diagnostics.

If I run this:

```bash
tool list --json > items.json
```

then `items.json` should contain JSON. Not JSON plus `Fetching items...`. Not JSON plus a warning. Not JSON plus a version update message.

Just JSON.

This rule sounds strict because it needs to be strict. The moment diagnostics leak into stdout, the command becomes harder to use in pipes and scripts.

A CLI that mixes data and logs is not friendly. It is messy.

## Color must be controlled

Color is useful for humans. It makes errors easier to see and status output easier to scan.

But color should never surprise the caller.

A good CLI needs a way to control it:

```bash
--color=auto
--color=always
--color=never
```

or something similar.

Auto is a good default. Use color when stdout is a terminal. Do not use color when output is redirected.

ANSI codes in logs are annoying. ANSI codes in JSON are worse. They are small invisible bugs that travel through files, CI logs, and copy-pasted error reports.

Color is a feature. It should stay in its lane.

## Exit codes are output too

Exit codes are part of the API.

A command can print perfect text and still be bad if the exit code is wrong.

For example, a diff command can use exit codes like this:

- `0`: no diff
- `1`: diff found
- `2`: command failed

That makes it useful in scripts:

```bash
if tool diff --quiet; then
  echo "clean"
else
  echo "changed"
fi
```

No parsing. No grep. No guessing.

This is the point. A script should not need to read English sentences to understand what happened.

## Human output and machine output are different

Human output should be readable:

```text
3 files changed

  modified  ~/.config/app/config.yaml
  missing   ~/.ssh/example_key
  stale     ~/bin/helper

Run `tool apply` to restore them.
```

Machine output should be stable:

```json
{
  "changed": true,
  "items": [
    {"path": "~/.config/app/config.yaml", "status": "modified"},
    {"path": "~/.ssh/example_key", "status": "missing"},
    {"path": "~/bin/helper", "status": "stale"}
  ]
}
```

Do not try to make one format do both jobs.

Text output can change as the tool gets better. JSON output should be treated like a contract. If people build scripts on it, breaking it is a real breaking change.

## Good hints are short and optional

A CLI should help users discover the next command. But it should not turn every success message into a tutorial.

This is too much:

```text
Success! Your project is initialized!
Here are 12 commands you can run next...
```

This is better:

```text
Initialized ~/.config/example

Next:
  tool status
  tool apply
```

Short. Useful. Easy to ignore.

And of course: no hints in quiet mode, no hints in JSON, no hints in stdout when stdout is meant for data.

The same rule appears again and again. Be helpful, but respect the contract.

## Silence is part of the design

Good CLI design is not only about commands and flags. It is about trust.

Can I pipe this command into another command?
Can I redirect the output to a file?
Can I use the exit code in CI?
Can I turn off color?
Can I ask it to be quiet and believe it?

If the answer is yes, the tool feels solid.

The best CLI output is often the output you do not print.

Not because minimalism is cool. Because silence gives control back to the caller.
