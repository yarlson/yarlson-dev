---
title: "The Details That Make CLI Tools Feel Professional"
summary: "Four real examples from recent Go CLI projects — bracketed paste handling, a scripting DSL, safe symlink restoration, and diff truncation — that show how small decisions separate a script from a tool people trust."
postLayout: simple
date: "2026-03-01"
tags:
  - cli
  - go
---

There's a gap between a CLI tool that works and one that feels right. It's rarely about features — it's about the details you discover only when someone uses your tool in ways you didn't anticipate. Over the past month, working on [tap](https://github.com/yarlson/tap), [scr](https://github.com/yarlson/scr), [lnk](https://github.com/yarlson/lnk), and [cmt](https://github.com/yarlson/cmt), I kept running into the same pattern: a small, seemingly insignificant decision that turned out to be the difference between users trusting the tool or abandoning it.

Here are four of those decisions.

## 1. Bracketed Paste: When Users Paste Multi-Line Text

When I added a textarea component to tap (my Go library for interactive CLI prompts), I hit a problem I hadn't thought about: paste. A user copies three lines from their editor and pastes them into the prompt. Without special handling, the terminal sends those characters one at a time — including the newlines. A newline in an interactive prompt usually means "submit." So the user pastes three lines and the prompt submits after the first one, silently dropping the rest.

The fix is the ANSI bracketed paste protocol. You tell the terminal "I understand paste events" by sending `ESC[?2004h`, and then the terminal wraps pasted content in `ESC[200~` ... `ESC[201~` markers. Your input layer detects the markers and treats everything between them as a single atomic paste event instead of individual keystrokes.

That's the straightforward part. The interesting problem is: how do you store pasted content in a rune buffer that also needs to support cursor navigation?

If you insert the full pasted text inline, your cursor arithmetic breaks. Moving the cursor left by one should skip one character, not navigate through 400 characters of pasted JSON. But you can't just ignore the paste content either — it needs to render and be included in the final output.

The solution I landed on uses Unicode Private Use Area (PUA) sentinels:

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

The buffer holds a single PUA rune per paste. Rendering replaces PUA runes with a dimmed `[Text 1]` placeholder. On submit, `resolve()` walks the buffer and replaces each PUA rune with its stored content. Cursor navigation treats each placeholder as one unit.

This might sound over-engineered for a paste feature. But without it, users who paste multi-line content into a textarea get corrupted output and they don't know why. With it, paste works exactly as expected and cursor navigation stays correct. That's the gap between a demo and a tool.

## 2. A Scripting Language for Terminal Screenshots

scr captures screenshots of terminal interactions. The first version used flags:

```bash
scr --command "vim" --keypresses "i,H,e,l,l,o,Escape,:,w,q,Enter" \
    --delays "0,50ms,50ms,50ms,50ms,50ms,200ms,100ms,100ms,100ms,100ms"
```

This worked but was miserable to use. You had to count characters, align parallel arrays of keypresses and delays, and the resulting command was unreadable. One missing comma in the delays array shifted every subsequent timing by one keypress.

I wrote a proper lexer and parser for a VHS-compatible scripting DSL:

```bash
scr --command "vim" --input "Type 'Hello' Speed 50ms Escape Sleep 200ms Type ':wq' Enter"
```

The parser produces typed `Action` structs with kind, content, speed, delay, and repeat count fields. The execution engine processes actions sequentially instead of walking parallel arrays.

```go
type Action struct {
    Kind    ActionKind
    Content string
    Speed   time.Duration
    Delay   time.Duration
    Repeat  int
}
```

The parser is 430 lines with 434 lines of tests. The tests cover valid scripts, error cases (unterminated strings, unknown commands), edge cases (empty scripts, adjacent sleeps), and repeat semantics (`Down 3` produces three separate Down actions).

The old interface still works for backward compatibility, but I haven't used it since writing the parser. Neither has anyone else. When the better interface exists, the worse one dies naturally.

## 3. Safe Symlink Restoration: Don't Delete What You Can't Recreate

lnk manages dotfiles by moving config files into a Git repo and leaving symlinks in their place. When you run `lnk pull` on a new machine, it restores those symlinks. The original implementation of `RestoreSymlinks` had a line that looked like this:

```go
// If something exists at the target path, remove it
os.RemoveAll(targetPath)
// Create the symlink
os.Symlink(repoPath, targetPath)
```

Can you see the bug? On a fresh machine, `targetPath` might be a real file — the user's actual `.vimrc` that they've been editing — not a stale symlink from a previous sync. `os.RemoveAll` on a real file deletes it permanently. The user runs `lnk pull`, and their config file vanishes.

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

The backup uses `os.Rename`, which is atomic on the same filesystem. The `.lnk-backup` suffix is visible and grep-able. And the test verifies not just that the backup exists but that its contents match the original.

This is the kind of bug that doesn't show up in testing because your test environment always has symlinks. It only appears when a real user runs the tool on a real machine for the first time. The fix is six lines of code. The trust it preserves is immeasurable.

## 4. Diff Truncation: When the Input Exceeds the Context

cmt generates commit messages by sending your staged diff to an LLM. It works great — until someone stages a 5,000-line dependency update. The diff exceeds the model's context window, the API call either fails or produces garbage, and the user blames the tool.

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

Sorting by size smallest-first means you keep as many whole files as possible within the token budget. A 20-line config change stays visible even when a 4,000-line lockfile is excluded. And when truncation happens, the user sees a warning:

```
⚠ Diff truncated: 3 files excluded (package-lock.json, yarn.lock, go.sum)
  Included: 12 files (2,847 tokens)
```

The user knows what the model sees and what it doesn't. They can make an informed decision about whether the generated commit message captures the full picture.

The truncation threshold is configurable in `.cmt.json`, which means teams can tune it based on their model and typical diff sizes. But the default works well enough that most users never change it.

## The Common Thread

All four of these examples share the same structure: a tool that works in the happy path but breaks in a realistic edge case. The fix is always small — a few dozen lines at most. The impact is disproportionate.

I've started applying a checklist when building CLI tools:

- **What happens when the user pastes?** (Not types — pastes.)
- **What happens when the input is too large?** (Not typical — maximum.)
- **What happens on a fresh machine?** (Not your machine — someone else's.)
- **What happens when someone scripts this?** (Not interactive use — automation.)

These aren't glamorous features. They don't make demos look better. But they're the reason someone keeps using your tool six months after installing it.

You can find the tools on GitHub: [tap](https://github.com/yarlson/tap), [scr](https://github.com/yarlson/scr), [lnk](https://github.com/yarlson/lnk), [cmt](https://github.com/yarlson/cmt).
