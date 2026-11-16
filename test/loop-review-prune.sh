#!/usr/bin/env bash
set -euo pipefail

prune="$(cd "$(dirname "$0")/../bin" && pwd)/loop-review-prune"
sandbox="$(cd "$(mktemp -d)" && pwd -P)"
trap 'rm -rf "$sandbox"' EXIT

export LOOP_REVIEW_CACHE="$sandbox/cache"
export FAKE_PULL_REQUESTS="$sandbox/pull-requests"
export GIT_CONFIG_GLOBAL="$sandbox/gitconfig"
export GIT_CONFIG_NOSYSTEM=1
git config --global user.name test
git config --global user.email test@example.com
git config --global init.defaultBranch main

mkdir -p "$sandbox/fakebin"
cat >"$sandbox/fakebin/gh" <<'EOF'
#!/usr/bin/env bash
pull_request="${3#https://github.com/}"
cat "$FAKE_PULL_REQUESTS/github.com/${pull_request/\/pull\///}"
EOF
cat >"$sandbox/fakebin/glab" <<'EOF'
#!/usr/bin/env bash
path="${2#projects/}"
project="${path%/merge_requests/*}"
cat "$FAKE_PULL_REQUESTS/gitlab.com/${project//%2F//}/${path##*/}"
EOF
chmod +x "$sandbox/fakebin/gh" "$sandbox/fakebin/glab"
export PATH="$sandbox/fakebin:$PATH"

failures=0

check() {
  local description="$1"
  shift
  if "$@"; then
    echo "ok - $description"
  else
    echo "not ok - $description"
    failures=$((failures + 1))
  fi
}

new_clone() {
  local clone="$1"
  git init -q --bare "$sandbox/remotes/${clone//\//_}.git"
  git clone -q "$sandbox/remotes/${clone//\//_}.git" "$clone" 2>/dev/null
  git -C "$clone" commit -q --allow-empty -m init
  git -C "$clone" push -q origin HEAD:main
}

review_tree() {
  local clone="$1" tree="$2"
  git -C "$clone" worktree add -q -b "loop-review/$(basename "$tree")" "$tree" origin/main
  git -C "$tree" commit -q --allow-empty -m "fix from review of $tree"
  git -C "$tree" push -q origin "HEAD:refs/heads/feature-$(basename "$tree")"
}

github_pull_request() {
  local slug="$1" number="$2" state="$3" sha="$4"
  mkdir -p "$FAKE_PULL_REQUESTS/github.com/$slug"
  echo "$state $sha" >"$FAKE_PULL_REQUESTS/github.com/$slug/$number"
}

gitlab_merge_request() {
  local slug="$1" number="$2" state="$3" sha="$4"
  mkdir -p "$FAKE_PULL_REQUESTS/gitlab.com/$slug"
  printf '{"state": "%s", "sha": "%s"}\n' "$state" "$sha" >"$FAKE_PULL_REQUESTS/gitlab.com/$slug/$number"
}

head_of() { git -C "$1" rev-parse HEAD; }
has_branch() { git -C "$1" rev-parse -q --verify "refs/heads/$2" >/dev/null; }
exists() { [ -e "$1" ]; }
missing() { [ ! -e "$1" ]; }
output_has() { grep -qF -- "$1" "$sandbox/output"; }

app="$sandbox/app"
new_clone "$app"
cache_app="$LOOP_REVIEW_CACHE/github.com/acme/app"

review_tree "$app" "$cache_app/1"
github_pull_request acme/app 1 merged "$(head_of "$cache_app/1")"

review_tree "$app" "$cache_app/2"
github_pull_request acme/app 2 open "$(head_of "$cache_app/2")"

review_tree "$app" "$cache_app/3"
github_pull_request acme/app 3 closed "$(head_of "$cache_app/3")"

review_tree "$app" "$cache_app/4"
github_pull_request acme/app 4 merged "$(head_of "$cache_app/4")"
touch "$cache_app/4/notes.txt"

review_tree "$app" "$cache_app/5"
github_pull_request acme/app 5 merged "$(head_of "$cache_app/5")"
git -C "$cache_app/5" commit -q --allow-empty -m "fix a blocked run committed but never pushed"

review_tree "$app" "$cache_app/6"
older_head="$(head_of "$cache_app/6")"
git -C "$cache_app/6" commit -q --allow-empty -m "the author pushed after the review"
git -C "$cache_app/6" push -q origin HEAD:refs/heads/feature-6
github_pull_request acme/app 6 merged "$(head_of "$cache_app/6")"
git -C "$cache_app/6" reset -q --hard "$older_head"
git -C "$cache_app/6" push -q origin --delete feature-6
git -C "$cache_app/6" fetch -q --prune origin

review_tree "$app" "$cache_app/7"
github_pull_request acme/app 7 merged "$(head_of "$cache_app/7")"
git -C "$cache_app/7" switch -q -c something-else

review_tree "$app" "$cache_app/8"
github_pull_request acme/app 8 merged "$(git -C "$cache_app/8" rev-parse HEAD~1)"

review_tree "$app" "$cache_app/9"
github_pull_request acme/app 9 merged "$(head_of "$cache_app/9")"
mkdir -p "$sandbox/shared_node_modules"
touch "$sandbox/shared_node_modules/keep-me"
ln -s "$sandbox/shared_node_modules" "$cache_app/9/node_modules"
printf 'node_modules\n' >"$app/.git/info/exclude"

review_tree "$app" "$cache_app/10"

mkdir -p "$cache_app/349.stale-0503836" "$cache_app/11"
touch "$cache_app/349.stale-0503836/kept" "$cache_app/11/kept"

lib_clone="$LOOP_REVIEW_CACHE/github.com/acme/lib/_clone"
new_clone "$lib_clone"
review_tree "$lib_clone" "$LOOP_REVIEW_CACHE/github.com/acme/lib/12"
github_pull_request acme/lib 12 merged "$(head_of "$LOOP_REVIEW_CACHE/github.com/acme/lib/12")"

api="$sandbox/api"
new_clone "$api"
gitlab_tree="$LOOP_REVIEW_CACHE/gitlab.com/microlink/tools/api/2032"
review_tree "$api" "$gitlab_tree"
gitlab_merge_request microlink/tools/api 2032 merged "$(head_of "$gitlab_tree")"

status=0
"$prune" --dry-run >"$sandbox/output" || status=$?
check "a dry run reports what it would remove" output_has "would remove  acme/app#1"
check "a dry run removes nothing" exists "$cache_app/1"
check "a dry run keeps the branch" has_branch "$app" loop-review/1
check "a dry run exits 1 when a pull request cannot be read" [ "$status" -eq 1 ]

status=0
"$prune" >"$sandbox/output" || status=$?
cat "$sandbox/output"

check "a merged pull request loses its tree" missing "$cache_app/1"
check "a merged pull request loses its loop-review branch" eval '! has_branch "$app" loop-review/1'
check "the worktree is unregistered, not just deleted" eval '! git -C "$app" worktree list | grep -qF "$cache_app/1 "'
check "an open pull request is kept" exists "$cache_app/2"
check "the open pull request is reported as kept" output_has "kept          acme/app#2"
check "a closed pull request is kept by default" exists "$cache_app/3"
check "uncommitted files keep a merged tree" exists "$cache_app/4/notes.txt"
check "uncommitted files are named as the reason" output_has "uncommitted changes"
check "an unpushed commit keeps a merged tree" exists "$cache_app/5"
check "the unpushed commit keeps its branch" has_branch "$app" loop-review/5
check "unpushed commits are named as the reason" output_has "commits the pull request does not have"
check "a tree behind its merged pull request is removed after the head branch is deleted" missing "$cache_app/6"
check "a tree switched off its loop-review branch is kept" exists "$cache_app/7"
check "the switched branch is named as the reason" output_has "not on loop-review/7"
check "a tree whose commits are all on a remote ref is removed" missing "$cache_app/8"
check "a symlinked node_modules is removed without touching its target" exists "$sandbox/shared_node_modules/keep-me"
check "the tree with the symlinked node_modules is removed" missing "$cache_app/9"
check "a tree whose pull request cannot be read is kept" exists "$cache_app/10"
check "the unreadable pull request is reported" output_has "skipped       acme/app#10"
check "the run exits 1 when a pull request cannot be read" [ "$status" -eq 1 ]
check "a stale directory is left alone" exists "$cache_app/349.stale-0503836/kept"
check "a numbered directory that is not a worktree is left alone" exists "$cache_app/11/kept"
check "a tree of the cached clone is removed" missing "$LOOP_REVIEW_CACHE/github.com/acme/lib/12"
check "the cached clone itself is kept" exists "$lib_clone/.git"
check "the cached clone loses the loop-review branch" eval '! has_branch "$lib_clone" loop-review/12'
check "a gitlab merge request in a subgroup is removed" missing "$gitlab_tree"
check "a gitlab merge request is labelled with !" output_has "removed       microlink/tools/api!2032"
check "directories left empty are removed" missing "$LOOP_REVIEW_CACHE/gitlab.com"
check "the summary counts every tree" output_has "removed 6, kept 2, skipped 4"

"$prune" --closed >"$sandbox/output" || true
check "--closed removes a closed pull request" missing "$cache_app/3"

real_git="$(command -v git)"
mkdir -p "$sandbox/wrappedbin"
cat >"$sandbox/wrappedbin/git" <<EOF
#!/usr/bin/env bash
case " \$* " in
  *" rev-list "* | *" merge-base "*) [ -n "\${FAIL_COMMIT_CHECKS:-}" ] && exit 128 ;;
  *" worktree remove "*) [ -n "\${COMMIT_BEFORE_REMOVE:-}" ] && "$real_git" -C "\$COMMIT_BEFORE_REMOVE" commit -q --allow-empty -m "landed mid-prune" ;;
esac
exec "$real_git" "\$@"
EOF
chmod +x "$sandbox/wrappedbin/git"

edge="$sandbox/edge-cache"
export LOOP_REVIEW_CACHE="$edge"
edge_app="$edge/github.com/acme/app"

review_tree "$app" "$edge_app/20"
github_pull_request acme/app 20 merged "$(head_of "$edge_app/20")"
git -C "$app" config status.showUntrackedFiles no
touch "$edge_app/20/hidden-untracked.txt"

review_tree "$app" "$edge_app/21"
echo original >"$edge_app/21/tracked.txt"
git -C "$edge_app/21" add tracked.txt
git -C "$edge_app/21" commit -q -m "add tracked file"
git -C "$edge_app/21" push -q origin HEAD:refs/heads/feature-21
github_pull_request acme/app 21 merged "$(head_of "$edge_app/21")"
git -C "$edge_app/21" update-index --skip-worktree tracked.txt
echo edited >"$edge_app/21/tracked.txt"

numeric_repo="$sandbox/numeric"
new_clone "$numeric_repo"
review_tree "$numeric_repo" "$edge/github.com/acme/2048/5"
github_pull_request acme/2048 5 merged "$(head_of "$edge/github.com/acme/2048/5")"

review_tree "$app" "$edge_app/22"
github_pull_request acme/app 22 merged ""

gone="$sandbox/gone"
new_clone "$gone"
review_tree "$gone" "$edge/github.com/acme/gone/23"
github_pull_request acme/gone 23 merged "$(head_of "$edge/github.com/acme/gone/23")"
rm -rf "$gone"

"$prune" >"$sandbox/output" || true
git -C "$app" config --unset status.showUntrackedFiles
check "an untracked file hidden by showUntrackedFiles=no keeps the tree" exists "$edge_app/20/hidden-untracked.txt"
check "an edit to a skip-worktree file keeps the tree" exists "$edge_app/21/tracked.txt"
check "a repository named with digits is searched" missing "$edge/github.com/acme/2048/5"
check "a pull request state without a head sha is unreadable" output_has "acme/app#22                              cannot read"
check "a tree whose clone was deleted is reported" output_has "acme/gone#23"
check "a tree whose clone was deleted is left on disk" exists "$edge/github.com/acme/gone/23"

failing="$sandbox/failing-cache"
review_tree "$app" "$failing/github.com/acme/app/30"
github_pull_request acme/app 30 merged "$(git -C "$failing/github.com/acme/app/30" rev-parse HEAD~1)"
git -C "$failing/github.com/acme/app/30" commit -q --allow-empty -m "never pushed"
LOOP_REVIEW_CACHE="$failing" FAIL_COMMIT_CHECKS=1 PATH="$sandbox/wrappedbin:$PATH" "$prune" >"$sandbox/output" || true
check "a failing commit check keeps the tree" exists "$failing/github.com/acme/app/30"
check "a failing commit check keeps the branch" has_branch "$app" loop-review/30

racing="$sandbox/racing-cache"
review_tree "$app" "$racing/github.com/acme/app/31"
github_pull_request acme/app 31 merged "$(head_of "$racing/github.com/acme/app/31")"
LOOP_REVIEW_CACHE="$racing" COMMIT_BEFORE_REMOVE="$racing/github.com/acme/app/31" PATH="$sandbox/wrappedbin:$PATH" "$prune" >"$sandbox/output" || true
check "a commit landing mid-prune keeps its branch" eval '[ "$(git -C "$app" log -1 --format=%s loop-review/31)" = "landed mid-prune" ]'
check "a commit landing mid-prune is reported" output_has "or loop-review/31 failed"

linked="$sandbox/linked-cache"
review_tree "$app" "$sandbox/real-cache/github.com/acme/app/32"
github_pull_request acme/app 32 merged "$(head_of "$sandbox/real-cache/github.com/acme/app/32")"
ln -s "$sandbox/real-cache" "$linked"
LOOP_REVIEW_CACHE="$linked/" "$prune" >"$sandbox/output" || true
check "a symlinked cache directory given with a trailing slash is searched" missing "$sandbox/real-cache/github.com/acme/app/32"
check "a symlinked cache directory keeps its link" eval '[ -L "$linked" ]'

export LOOP_REVIEW_CACHE="$sandbox/missing-cache"
check "a missing cache is not an error" "$prune"

exit "$failures"
