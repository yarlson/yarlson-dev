---
title: "The Details That Make CLI Tools Feel Professional"
summary: "Four real examples from recent Go CLI projects — bracketed paste handling, a scripting DSL, safe symlink restoration, and diff truncation — that show how small decisions separate a script from a tool people trust."
postLayout: simple
date: "2026-03-01"
tags:
  - cli
  - go
---

Your CLI tool works in the demo. You type the happy-path command, the output looks clean, you push to GitHub, you write the README. Done.

But then someone pastes multi-line JSON into your prompt. Someone runs your tool on a fresh laptop with real config files. Someone stages a 5,000-line lockfile update and watches your LLM integration choke on it. And suddenly the tool that "worked" feels brittle, hollow, untrustworthy.

The biggest problem with CLI tools isn't missing features. It's missing empathy for the moment things go sideways.

I kept hitting this wall across four recent projects — [tap](https://github.com/yarlson/tap), [scr](https://github.com/yarlson/scr), [lnk](https://github.com/yarlson/lnk), and [cmt](https://github.com/yarlson/cmt). Each time, the fix was small. A few dozen lines. The trust it earned was not.

## 1. Bracketed Paste: When Users Paste Multi-Line Text

Let's talk about paste. Not typing. Paste.

I added a textarea component to tap, my Go library for interactive CLI prompts, and immediately ran into a problem I hadn't considered. A user copies three lines from their editor, hits Ctrl-V, and the terminal sends those characters one at a time — including the newlines. A newline in an interactive prompt means "submit." So the prompt fires after line one, silently swallowing the rest.

Your user just lost data. They don't know why.

The fix is the ANSI bracketed paste protocol. You send `ESC[?2004h` to tell the terminal you understand paste events, and the terminal wraps pasted content in `ESC[200~` ... `ESC[201~` markers. Your input layer detects the markers and treats everything between them as a single atomic event instead of individual keystrokes.

That's the straightforward part. But here's the thing — how do you store pasted content in a rune buffer that also needs to support cursor navigation?

If you insert the full pasted text inline, your cursor arithmetic breaks. Moving left by one character shouldn't mean navigating through 400 characters of pasted JSON. But you can't ignore the paste content either. It needs to render. It needs to appear in the final output.

The solution I landed on uses Unicode Private Use Area sentinels:

```go
// Each paste gets a unique PUA rune as a placeholder
const puaBase = '\uE000'

func (t *Textarea) insertPaste(content string) {
    id := len(t.pastes)
    t.pastes[id] = content
    t.buffer = insertRune(t.buffer, t.cursor, puaBase+rune(id))
    t.cursor++
}
```

The buffer holds a single PUA rune per paste. Rendering replaces PUA runes with a dimmed `[Text 1]` placeholder. On submit, `resolve()` walks the buffer and swaps each PUA rune for its stored content. Cursor navigation treats each placeholder as one unit.

Look, this might sound over-engineered for a paste feature. One rune per paste, a resolve step, PUA sentinels — who asked for all this machinery? Everyone who's ever pasted multi-line content into a terminal prompt and gotten corrupted output, that's who.

The gap between a demo and a tool lives in exactly these moments.

## 2. A Scripting Language for Terminal Screenshots

scr captures screenshots of terminal interactions. The first version used flags:

```bash
scr --command "vim" --keypresses "i,H,e,l,l,o,Escape,:,w,q,Enter" \
    --delays "0,50ms,50ms,50ms,50ms,50ms,200ms,100ms,100ms,100ms,100ms"
```

This worked. It was also genuinely miserable. You had to count characters, align parallel arrays of keypresses and delays, and the resulting command was unreadable. One missing comma in the delays array shifted every subsequent timing by one keypress. On paper, a complete interface. In production, a footgun.

So I threw it away and wrote a proper lexer and parser for a VHS-compatible scripting DSL.

```bash
scr --command "vim" --input "Type 'Hello' Speed 50ms Escape Sleep 200ms Type ':wq' Enter"
```

Readable. Self-documenting. Not a parallel-array nightmare.

The parser produces typed `Action` structs:

```go
type Action struct {
    Kind    ActionKind
    Content string
    Speed   time.Duration
    Delay   time.Duration
    Repeat  int
}
```

The execution engine processes actions sequentially instead of walking parallel arrays. 430 lines of parser, 434 lines of tests. The tests cover valid scripts, error cases (unterminated strings, unknown commands), edge cases (empty scripts, adjacent sleeps), and repeat semantics (`Down 3` produces three separate Down actions).

The old interface still works for backward compatibility. I haven't used it since writing the parser. Neither has anyone else. When the better interface exists, the worse one dies naturally. No deprecation notice required.

## 3. Safe Symlink Restoration: Don't Delete What You Can't Recreate

lnk manages dotfiles by moving config files into a Git repo and leaving symlinks in their place. When you run `lnk pull` on a new machine, it restores those symlinks. The original implementation of `RestoreSymlinks` had a line that looked like this:

```go
// If something exists at the target path, remove it
os.RemoveAll(targetPath)
// Create the symlink
os.Symlink(repoPath, targetPath)
```

Can you see the bug?

On a fresh machine, `targetPath` might be a real file — the user's actual `.vimrc` that they've been editing for three years — not a stale symlink from a previous sync. `os.RemoveAll` on a real file deletes it permanently. The user runs `lnk pull`, and their config file vanishes.

Gone. No backup. No undo.

This tool didn't fail because the logic was wrong. It failed because it assumed every machine looked like the developer's machine.

The fix differentiates by file type:

```go
info, err := os.Lstat(targetPath)
if err == nil {
    if info.Mode()&os.ModeSymlink != 0 {
        // Stale symlink: safe to remove
        os.Remove(targetPath)
    } else {
        // Real file or directory: back up, don't destroy
        os.Rename(targetPath, targetPath+".lnk-backup")
    }
}
os.Symlink(repoPath, targetPath)
```

`os.Rename` is atomic on the same filesystem. The `.lnk-backup` suffix is visible and grep-able. The test verifies not just that the backup exists but that its contents match the original.

Six lines of code. The trust it preserves is immeasurable.

This is the kind of bug that never shows up in testing because your test environment always has symlinks. It only appears when a real user runs the tool on a real machine for the first time. Empathy for first-run is a superpower.

## 4. Diff Truncation: When the Input Exceeds the Context

cmt generates commit messages by sending your staged diff to an LLM. Works great — until someone stages a 5,000-line dependency update. The diff exceeds the model's context window, the API call either fails or produces garbage, and the user blames the tool.

Not the model. Not the API. The tool. Because the tool should have known better.

The fix is a truncation system that prioritizes files by size:

```typescript
function truncateDiff(files: DiffFile[], maxTokens: number): TruncatedDiff {
  // Sort files smallest first — preserve more whole files
  const sorted = [...files].sort((a, b) => a.tokens - b.tokens);

  let remaining = maxTokens;
  const included: DiffFile[] = [];
  const excluded: DiffFile[] = [];

  for (const file of sorted) {
    if (file.tokens <= remaining) {
      included.push(file);
      remaining -= file.tokens;
    } else {
      excluded.push(file);
    }
  }

  return { included, excluded, truncated: excluded.length > 0 };
}
```

Sorting smallest-first means you keep as many whole files as possible within the token budget. A 20-line config change stays visible even when a 4,000-line lockfile gets excluded. And when truncation happens, the user sees exactly what's going on:

```
⚠ Diff truncated: 3 files excluded (package-lock.json, yarn.lock, go.sum)
  Included: 12 files (2,847 tokens)
```

The user knows what the model sees and what it doesn't. They can make an informed decision about whether the generated message captures the full picture. No guessing. No silent degradation.

The truncation threshold is configurable in `.cmt.json`, so teams can tune it based on their model and typical diff sizes. But the default works well enough that most users never touch it.

## The Common Thread

Paste handling, a scripting DSL, safe file operations, context-aware truncation. Four different tools, four different problem domains, the same underlying pattern: a tool that works on the happy path but corrodes the moment reality shows up.

Why does this keep happening? Because we test on our machines, with our workflows, under our assumptions. The edge cases live on someone else's machine. Someone else's clipboard. Someone else's staging area with a 5,000-line lockfile diff.

I've started running a checklist against every CLI tool I build:

- **What happens when the user pastes?** (Not types — pastes.)
- **What happens when the input is too large?** (Not typical — maximum.)
- **What happens on a fresh machine?** (Not your machine — someone else's.)
- **What happens when someone scripts this?** (Not interactive use — automation.)

These aren't glamorous features. They don't make demos look better. They don't get mentioned in launch tweets. But they're the weight that separates a tight, earned tool from a script someone tries once and uninstalls.

The real craft of CLI development isn't the feature list. It's the handful of decisions that make someone trust your tool enough to keep using it six months later.

You can find the tools on GitHub: [tap](https://github.com/yarlson/tap), [scr](https://github.com/yarlson/scr), [lnk](https://github.com/yarlson/lnk), [cmt](https://github.com/yarlson/cmt).
