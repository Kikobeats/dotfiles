# auto-loop-review

Starts `/loop-review <url>` in a Cursor `agent` tab in Orca after a Claude Code
session opens a pull request, the way it used to be done by hand (139 times
between 2026-11-08 and 2026-11-21).

- `stop.mjs` is a `Stop` hook, linked into `~/.claude/settings.json` by
  `skills/hooks.mjs`. It reads only the turn that just ended and only
  `glab mr create` / `gh pr create` calls that printed a URL. The review runs
  in the checkout the call ran in (its last `cd`, else the session's
  directory), and only if that checkout's `origin` is the pull request's
  repo and that checkout is open in Orca (`orca worktree show`); otherwise it
  says so and schedules nothing. It writes
  `~/.cache/auto-loop-review/<url>.json` (one per pull request, so it never
  schedules one twice) and starts `wait.mjs` detached.
- `wait.mjs` first asks GitHub or GitLab when the pull request was created
  and drops it if that is more than a minute before the call that printed it:
  a create call can print an old URL (an MR that already exists, a script that
  echoes one). Detection itself stays a plain match on the command text,
  because a create that runs from a script written in a heredoc is real. It
  then waits until the session's transcript has not changed for 10 minutes,
  so a reviewer never edits the tree while the session is still pushing or
  watching CI, skips a pull request that is no longer open or that got a
  `/loop-review` typed by hand after it was scheduled, and otherwise runs
  `orca agent launch --agent cursor --worktree path:<tree> --prompt
  "/loop-review <url>" --surface terminal --focus`, so Orca switches to the
  new tab. It gives up after 4 hours. The outcome goes to the state file,
  `waiter.log` and a macOS notification.

Turn it off: `CLAUDE_AUTO_LOOP_REVIEW=off`, or per repo
`git config claude.autoLoopReview false`. Cancel one pending review by
deleting its state file.

Tests: `node --test lib.test.mjs`.
