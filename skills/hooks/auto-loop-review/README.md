# auto-loop-review

Starts `/loop-review <url>` in a Cursor `agent` tab in Orca after a Claude Code
session opens a pull request, the way it used to be done by hand (139 times
between 2026-11-08 and 2026-11-21).

- `stop.mjs` is a `Stop` hook, linked into `~/.claude/settings.json` by
  `skills/hooks.mjs`. It reads only the turn that just ended and only
  `glab mr create` / `gh pr create` calls that printed a URL. The review runs
  in the checkout the call ran in (its last `cd`, else the session's
  directory), and only if a remote of that checkout is the pull request's
  repo and that checkout is open in Orca (`orca worktree show`); otherwise it
  says so and schedules nothing. A `cd` or a create that is only quoted, and a
  `cd` in a subshell that has already ended, do not count; a quote inside a
  heredoc does not hide the create that follows it. It writes
  `~/.cache/auto-loop-review/<url>.json` (one per pull request, so it never
  schedules one twice) and starts `launch.mjs` detached, so the turn ends at
  once.
- `launch.mjs` asks GitHub or GitLab for the pull request and skips it if it
  is no longer open, or if it was created more than a minute before the call
  that printed it: a create call can print an old URL (an MR that already
  exists, a script that echoes one). A host that does not answer is asked
  twice more. Detection itself stays a plain match on
  the command text, because a create that runs from a script written in a
  heredoc is real. Otherwise it runs `orca agent launch --agent cursor
  --worktree path:<tree> --prompt "/loop-review <url>" --surface terminal
  --focus`, so the review starts right when the turn that opened the pull
  request ends, and Orca switches to its tab. The outcome goes to the state
  file, `launcher.log` and a macOS notification.

Turn it off: `CLAUDE_AUTO_LOOP_REVIEW=off`, or per repo
`git config claude.autoLoopReview false`. Deleting a pull request's state file
lets it be scheduled again.

Tests: `node --test`.
