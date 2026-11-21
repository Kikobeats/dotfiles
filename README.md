<p align="center">
  <img src="https://i.imgur.com/xDDKc2C.png" width="300">
  <h3 align="center">Kikobeats dotfiles</h3>
  <h5 align="center">Latest version tested: macOS Sequoia 15.7.1</h5>
</p>

## Usage

```bash
git clone https://github.com/Kikobeats/dotfiles && cd dotfiles && ./sync.sh
./boostrap.sh
```

## Recording mode

Fish shows a grey inline autosuggestion after the cursor, which reads as noise
in a screen recording. Toggle it off before hitting record, back on after:

```fish
recording_on   # autosuggestions hidden
recording_off  # autosuggestions restored
```

The flag is a universal variable, so every open terminal changes at once and
the setting survives a restart. Run `./test/recording.sh` to verify.

## Loop review cleanup

`/loop-review` keeps one worktree per pull request under
`~/.cache/loop-review/<host>/<repo>/<number>`, on a `loop-review/<number>`
branch, so the next run on that pull request reuses it. Once the pull request
is merged, the tree is dead weight:

```bash
loop-review-prune --dry-run   # list what would go
loop-review-prune             # remove merged trees and their branches
loop-review-prune --closed    # also remove pull requests closed without merging
```

It asks `gh` (GitHub) or `glab` (GitLab) for each pull request's state. A tree
with uncommitted changes, with commits that are neither in the pull request
nor on any remote branch, or switched off its `loop-review/<number>` branch is
kept and reported. Commits already pushed to some remote branch do not keep
the tree, since removing it loses nothing. Cached
clones (`_clone`) are kept for the next review. Run
`./test/loop-review-prune.sh` to verify.

## Automatic loop review

When a Claude Code session opens a pull request (`gh pr create` or
`glab mr create`), a `Stop` hook starts `/loop-review <url>` in a Cursor
`agent` tab in Orca and switches to it, once the session has been quiet for 10
minutes so the reviewer never edits the tree while the session still works on
it. It skips pull requests that are closed or that got a `/loop-review` typed
by hand. `node skills/index.mjs` wires it into `~/.claude/settings.json`; see
`skills/hooks/auto-loop-review/README.md`.

```bash
CLAUDE_AUTO_LOOP_REVIEW=off claude           # off for one session
git config claude.autoLoopReview false       # off for one repo
rm ~/.cache/auto-loop-review/<pr>.json       # cancel one pending review
```

Run `cd skills && node --test` to verify.

## Contribution stats

How many commits, pull requests and projects you touched in a period,
across GitHub and GitLab:

```bash
git-stats                         # current month
git-stats october                 # most recent October (also: oct)
git-stats 2026-10                 # a month
git-stats 2026                    # a year
git-stats 2026-10-01..2026-10-15  # any range, inclusive
git-stats october --repos         # per-project breakdown
git-stats october --json
```

It uses the `gh` and `glab` logins, and skips whichever one is missing or
logged out.

- **commits**: yours on a project's default branch, dated by commit date, so
  pushes, rebases and force-pushes do not count again. GitHub uses its own
  contribution count. GitLab leaves merge commits out, so clicking Merge on
  an MR is not a commit.
- **PRs**: pull requests (GitHub) and merge requests (GitLab) you opened.
- **projects**: projects that got a commit or a PR from you. GitHub returns
  at most 100 repositories per list; a full list is a lower bound, shown
  with `+`.

Periods are whole UTC days, because GitHub rounds every query to UTC days.
GitHub reports private contributions it will not attribute to a repository
(commits, PRs, issues and reviews in private repos) on a separate line, and
they are not in the totals. A GitLab project you can no longer read is
skipped and counted on a separate line.

Run `node --test test/git-stats.test.js test/git-stats.cli.test.js` to verify.
