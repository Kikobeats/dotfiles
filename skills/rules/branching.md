# Branching — branches, not worktrees

This rule overrides the "Branching" section of the base CLAUDE.md. Where they
disagree, this one wins.

Never create a git worktree. Skip the worktree setup block, the bootstrap
block, `EnterWorktree`, and the "WRONG TREE" guard. Work in the checkout you
were started in.

## Setup — once per task, before the first write

```bash
SLUG=fix-login                                                    # <- the task, kebab-case

git fetch -q origin 2>/dev/null
git remote set-head -a origin >/dev/null 2>&1
BASE=$(git symbolic-ref -q --short refs/remotes/origin/HEAD)
for c in origin/main origin/master main master; do
  [ -n "$BASE" ] && break
  git rev-parse -q --verify "$c" >/dev/null && BASE=$c
done
[ -n "$BASE" ] || { echo "STOP: cannot find a base branch"; exit 1; }

OWNER=$(git config claude.branchPrefix)
[ -n "$OWNER" ] || OWNER=$(gh api user --jq .login 2>/dev/null)
[ -n "$OWNER" ] || OWNER=$(git config user.email | cut -d@ -f1)

git switch --no-track -c "$OWNER/$SLUG" "$BASE" || exit 1
```

Uncommitted changes that are not yours travel with `git switch -c`. Leave them
alone: never stage, commit, stash, or discard them. Stage only the files you
changed, by path, never `git add -A` or `git add .`.

The triage block's Branch line reports the branch name and the checkout path.

## Shipping

Same as the base CLAUDE.md: rebase on `$BASE`, push the branch, open a PR with
`gh pr create`, let a human merge it. Never push to the default branch, never
merge your own PR unless Kiko says so. `git config claude.mode solo` does not
change this: solo only means no worktree here, it never means no PR.

After the PR is open, switch back to the branch you started on so the next
task does not stack on this one.
