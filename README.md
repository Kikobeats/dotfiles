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

## Review command

`/review` in Claude Code starts `/loop-review` in a Cursor `agent` tab in Orca,
the way it is typed by hand, and switches to that tab:

```
/review                  # the pull request of this branch
/review 2097             # a pull request of this repo by number
/review <pr url>         # a pull request of this repo by URL
```

`skills/review/review.mjs` does the work and the model only repeats its one
line of output. It reads the pull request with `gh` or `glab`, and stops with one
line saying why when the checkout is not the pull request's repo, the pull
request is not open, or the checkout is not open in Orca. `node
skills/index.mjs` links it into `~/.claude/skills/review`. Run `cd skills &&
node --test hooks.test.mjs linked-skills.test.mjs review/lib.test.mjs review/review.test.mjs` to verify.

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
