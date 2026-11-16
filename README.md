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
