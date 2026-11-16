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
with uncommitted changes, with commits the pull request does not have, or
switched off its `loop-review/<number>` branch is kept and reported. Cached
clones (`_clone`) are kept for the next review. Run
`./test/loop-review-prune.sh` to verify.
