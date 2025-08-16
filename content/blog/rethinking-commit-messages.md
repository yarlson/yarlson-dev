---
title: "git-gen: Rethinking Commit Messages"
summary: "git-gen is a bash script that uses Anthropic's Claude model to generate Git commit messages. This experiment has led me to reconsider our approach to version control workflows."
postLayout: simple
date: "2024-07-12"
tags:
  - git
---

As a developer deeply involved in both small-scale projects and large codebases, I've often pondered the impact of our tools on code quality. Recently, I created git-gen, a bash script that uses Anthropic's Claude model to generate Git commit messages. This experiment has led me to reconsider our approach to version control workflows.

## The Myth of "AI Can't Understand Our Code"

I've heard developers argue that as projects grow larger and more complex, AI-generated commit messages become less useful or accurate. This sentiment is particularly prevalent when discussing large-scale software projects. But this view misses a crucial point: commit messages should focus on changes, not overall project complexity.

To be clear, there are aspects of commit messages that do become more challenging as projects grow:

1. Maintaining consistency across a larger team of contributors.
2. Capturing the context of changes in an increasingly complex codebase.
3. Balancing brevity with the need for detailed explanations in critical changes.

However, these challenges aren't unique to AI-generated messages. In fact, a tool like git-gen can help address these issues by providing a consistent baseline.

## The git-gen Way: Simplicity Meets Accuracy

Let's break down how git-gen works:

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

This process focuses entirely on the specific changes being committed, not the overall size or complexity of the project.

## Addressing Common Counterarguments

Let's tackle some arguments against using AI for commit messages:

1. "AI doesn't understand our project's conventions."

   While AI might not inherently understand project-specific conventions, it analyzes the actual code changes. If your code follows consistent patterns, the generated messages will reflect that.

2. "Generated messages won't capture the nuances of our codebase."

   On the contrary, because git-gen focuses on changes rather than the entire codebase, it often produces messages that are concise and clear, reflecting the specific modifications made.

3. "In a large project, no one will notice the difference."

   Actually, in large projects, consistent commit messages become even more crucial for navigation and understanding. git-gen can help maintain this consistency.

## The Real Impact on Codebases

The argument that AI-generated commit messages become less useful as projects grow larger simply doesn't hold water. Here's why:

1. **Consistency**: git-gen provides a consistent format for commit messages, crucial in maintaining clear and readable version histories.

2. **Focus on Changes**: git-gen focuses on what's changed, not the entire codebase complexity.

3. **Time Savings**: Developers can focus more on writing quality code, letting git-gen handle the initial draft of commit messages.

4. **Learning Tool**: For newcomers to a project, generated commit messages can provide quick insights into the project's evolution and coding patterns.

## Wrapping Up: AI's Place in Our Git Workflows

The idea that AI-generated commit messages will somehow degrade as your project grows larger is a misconception. It's based on a misunderstanding of how tools like git-gen work and what makes a good commit message in the first place.

Consider trying git-gen in your projects. You might find that it helps maintain clean, consistent, and informative commit histories.

What's your experience with commit messages in large projects? Have you experimented with AI assistance in your development workflows? Your insights could provide valuable perspective on this evolving aspect of software development.
