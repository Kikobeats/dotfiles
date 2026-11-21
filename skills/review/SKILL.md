---
name: review
description: Start /loop-review for this branch's pull request, or a given one, in a Cursor agent tab in Orca.
argument-hint: "[pr url or number]"
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

!`node "$HOME/.claude/skills/review/review.mjs" $ARGUMENTS 2>&1 || true`

Reply with the line above exactly as printed, and nothing else. Do not run any tool.
