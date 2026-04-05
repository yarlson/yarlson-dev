---
title: "git-gen: Rethinking Commit Messages"
summary: "git-gen is a bash script that uses Anthropic's Claude model to generate Git commit messages. This experiment has led me to reconsider our approach to version control workflows."
postLayout: simple
date: "2024-07-12"
tags:
  - git
---

You've stared at a commit message prompt and typed "fix stuff." Your team lead has opened a git log, seen forty lines of "fix stuff," and quietly died inside. We've been writing commit messages by hand for decades, and most of them are genuinely terrible.

So I built git-gen, a bash script that uses Claude to generate commit messages from staged diffs. And the thing that surprised me wasn't that it worked. It's that it forced me to rethink what commit messages are actually for.

## "AI Can't Understand Our Code"

This is the objection I hear most. Projects get big, codebases get gnarly, and surely no language model can grasp the full picture well enough to describe what changed.

But here's the thing: commit messages aren't supposed to describe the full picture. They describe a diff. A narrow slice. The delta between two states. And a focused diff is exactly the kind of input a language model handles well.

Does scaling a codebase make commit messages harder? Sure. Maintaining consistency across dozens of contributors is hard. Capturing context in a sprawling monorepo is hard. Knowing when a one-liner needs a paragraph of explanation is hard. But none of that is unique to AI-generated messages. Human-written messages fail at all of this too. Constantly.

## How git-gen Actually Works

Look, the implementation is almost embarrassingly simple:

```bash
changes=$(git diff --cached)
prompt="Generate a concise git commit message for the following changes:\n\n$changes"

response=$(curl -sS https://api.anthropic.com/v1/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $ANTHROPIC_API_KEY" \
  -d '{
    "model": "claude-2.0",
    "prompt": "'"$prompt"'",
    "max_tokens_to_sample": 300,
    "temperature": 0.7
  }')

commit_message=$(echo "$response" | jq -r '.completion')
```

Grab the staged changes. Send them to Claude. Get a message back. That's it. No project-wide indexing. No dependency graph analysis. Just the diff. The thing that actually matters.

## Let's Talk About the Counterarguments

"AI doesn't understand our project's conventions." Maybe not your naming scheme for feature branches. But it reads the code you're committing. If your code follows patterns, the messages reflect those patterns. Conventions live in the code. The model reads the code.

"Generated messages won't capture nuance." This one's backwards. Because git-gen operates on the diff alone, it produces messages that are tight and specific. No rambling about architectural motivation. No copy-pasting Jira ticket descriptions. Just what changed, stated plainly. That's not a limitation. That's a feature.

"In a large project, nobody reads commit messages anyway." If that's true at your company, the problem isn't the messages. It's the culture. And a tool that generates consistently readable messages is a better starting point for fixing that culture than hoping every engineer will suddenly start caring about their prose.

## What This Actually Changes

Consistency is a superpower. Not the exciting kind. The kind that compounds over six months until someone runs `git log --oneline` and can actually follow the story of a feature branch. git-gen gives you that baseline for free.

It also gives developers their attention back. Writing a good commit message takes real cognitive effort. Not a lot. But enough that most people skip it when they're deep in a problem. Offloading the first draft to a model means the message gets written while the developer stays in flow. You can always edit it. You rarely need to.

And for new engineers joining a project, a clean commit history is genuinely one of the fastest ways to understand how a codebase evolved. Not documentation. Not architecture diagrams. The log. The sequence of small, described changes that got the code from there to here.

## The Bigger Point

The fear that AI-generated commit messages degrade at scale comes from a misunderstanding of what the tool is doing. It's not trying to comprehend your entire system. It's reading a diff and describing it. That task doesn't get harder as your repo grows. The diff stays the same size whether the project is ten files or ten thousand.

We've cargo-culted the idea that commit messages require deep human judgment. Some do. Most don't. Most are a renamed variable, a fixed edge case, a bumped dependency. The ceremony we've built around writing those messages by hand is habit, not necessity.

Give git-gen a few weeks on a real project. Watch the log. You'll notice something: the messages are fine. They're clear, they're consistent, and they took zero effort. That frees you up to spend your actual judgment on the commits that genuinely need it.

That's not replacing craftsmanship. That's knowing where to apply it.
