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
file="$FAKE_PULL_REQUESTS/github.com/${pull_request/\/pull\///}"
expr=""
prev=""
for arg in "$@"; do
  if [ "$prev" = "--jq" ]; then
    expr=$arg
  fi
  prev=$arg
done
if [ -z "$expr" ]; then
  echo "expected --jq" >&2
  exit 1
fi
jq -r "$expr" "$file"
EOF
cat >"$sandbox/fakebin/glab" <<'EOF'
#!/usr/bin/env bash
[ "$2 $3" = "--hostname gitlab.com" ] || exit 1
path="${4#projects/}"
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
  # gh returns uppercase states; the script lowercases them with --jq.
  printf '{"state":"%s","headRefOid":"%s"}\n' "$(printf '%s' "$state" | tr '[:lower:]' '[:upper:]')" "$sha" \
    >"$FAKE_PULL_REQUESTS/github.com/$slug/$number"
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
check "a dry run summary names what it would remove" output_has "would remove 6, kept 2, skipped 4"

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

review_tree "$app" "$edge/github.com/acme/.github/24"
github_pull_request acme/.github 24 merged "$(head_of "$edge/github.com/acme/.github/24")"

large="$edge_app/25"
review_tree "$app" "$large"
mkdir "$large/many"
for i in $(seq 1 3000); do : >"$large/many/file-$i-with-a-name-long-enough-to-fill-the-pipe.txt"; done
echo original >"$large/0-first.txt"
git -C "$large" add .
git -C "$large" commit -q -m "add enough files to overflow a pipe"
git -C "$large" push -q origin HEAD:refs/heads/feature-25
github_pull_request acme/app 25 merged "$(head_of "$large")"
git -C "$large" update-index --skip-worktree 0-first.txt
echo edited >"$large/0-first.txt"

"$prune" >"$sandbox/output" || true
git -C "$app" config --unset status.showUntrackedFiles
check "an untracked file hidden by showUntrackedFiles=no keeps the tree" exists "$edge_app/20/hidden-untracked.txt"
check "an edit to a skip-worktree file keeps the tree" exists "$edge_app/21/tracked.txt"
check "a repository whose name starts with a dot is searched" missing "$edge/github.com/acme/.github/24"
check "a skip-worktree edit keeps the tree when ls-files output overflows a pipe" exists "$large/0-first.txt"
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

help_status=0
"$prune" --help >"$sandbox/help" 2>"$sandbox/help.err" || help_status=$?
check "--help exits 0" [ "$help_status" -eq 0 ]
check "--help shows how to run a dry run" grep -q -- '--dry-run' "$sandbox/help"

bad_status=0
"$prune" --nope >"$sandbox/bad.out" 2>"$sandbox/bad.err" || bad_status=$?
check "an unknown option exits 2" [ "$bad_status" -eq 2 ]

locked="$sandbox/locked-cache"
export LOOP_REVIEW_CACHE="$locked"
review_tree "$app" "$locked/github.com/acme/app/80"
github_pull_request acme/app 80 locked "$(head_of "$locked/github.com/acme/app/80")"
status=0
"$prune" >"$sandbox/output" || status=$?
check "a locked pull request is kept" exists "$locked/github.com/acme/app/80"
check "a locked pull request is reported kept" grep -Eq 'kept[[:space:]]+acme/app#80' "$sandbox/output"
check "a locked pull request is not an error" [ "$status" -eq 0 ]

gl_open="$sandbox/gl-open"
export LOOP_REVIEW_CACHE="$gl_open"
gl_tree="$gl_open/gitlab.com/microlink/tools/api/2040"
review_tree "$api" "$gl_tree"
gitlab_merge_request microlink/tools/api 2040 opened "$(head_of "$gl_tree")"
status=0
"$prune" >"$sandbox/output" || status=$?
check "an opened gitlab merge request is kept" exists "$gl_tree"
check "an opened gitlab merge request is reported kept" grep -Eq 'kept[[:space:]]+microlink/tools/api!2040' "$sandbox/output"
check "an opened gitlab merge request is not an error" [ "$status" -eq 0 ]

foreign="$sandbox/foreign-cache"
export LOOP_REVIEW_CACHE="$foreign"
review_tree "$app" "$foreign/bitbucket.org/acme/app/73"
status=0
"$prune" >"$sandbox/output" || status=$?
check "an unknown host is kept" exists "$foreign/bitbucket.org/acme/app/73"
check "an unknown host is unreadable" output_has "cannot read the pull request state"
check "an unknown host fails the run" [ "$status" -eq 1 ]

assume="$sandbox/assume-cache"
export LOOP_REVIEW_CACHE="$assume"
review_tree "$app" "$assume/github.com/acme/app/75"
echo original >"$assume/github.com/acme/app/75/f.txt"
git -C "$assume/github.com/acme/app/75" add f.txt
git -C "$assume/github.com/acme/app/75" commit -q -m "add tracked file"
git -C "$assume/github.com/acme/app/75" push -q origin HEAD:refs/heads/feature-75
git -C "$assume/github.com/acme/app/75" update-index --assume-unchanged f.txt
echo edited >"$assume/github.com/acme/app/75/f.txt"
github_pull_request acme/app 75 merged "$(head_of "$assume/github.com/acme/app/75")"
"$prune" >"$sandbox/output" || true
check "an assume-unchanged edit keeps the tree" [ "$(cat "$assume/github.com/acme/app/75/f.txt")" = edited ]
check "an assume-unchanged edit is named as the reason" output_has "uncommitted changes"

delref="$sandbox/delref-cache"
export LOOP_REVIEW_CACHE="$delref"
review_tree "$app" "$delref/github.com/acme/app/74"
github_pull_request acme/app 74 merged "$(head_of "$delref/github.com/acme/app/74")"
git -C "$delref/github.com/acme/app/74" update-ref -d refs/heads/loop-review/74
"$prune" >"$sandbox/output" || true
check "a deleted branch ref keeps the tree" exists "$delref/github.com/acme/app/74"
check "a deleted branch ref is named as the reason" output_has "not on loop-review/74"

mkdir -p "$sandbox/linkfarm" "$sandbox/symlink-cache/github.com/acme/app"
review_tree "$app" "$sandbox/linkfarm/70"
ln -s "$sandbox/linkfarm/70" "$sandbox/symlink-cache/github.com/acme/app/70"
github_pull_request acme/app 70 merged "$(head_of "$sandbox/linkfarm/70")"
LOOP_REVIEW_CACHE="$sandbox/symlink-cache" "$prune" >"$sandbox/output" || true
check "a symlinked numbered directory is not followed" exists "$sandbox/linkfarm/70"
check "a symlinked numbered directory is left in place" eval '[ -L "$sandbox/symlink-cache/github.com/acme/app/70" ]'

nm="$sandbox/nm-cache"
review_tree "$app" "$nm/github.com/acme/node_modules/71"
github_pull_request acme/node_modules 71 merged "$(head_of "$nm/github.com/acme/node_modules/71")"
LOOP_REVIEW_CACHE="$nm" "$prune" >"$sandbox/output" || true
check "a worktree under node_modules is not pruned" exists "$nm/github.com/acme/node_modules/71"

clone_skip="$sandbox/clone-skip"
mkdir -p "$clone_skip/github.com/acme/lib/_clone"
review_tree "$app" "$clone_skip/github.com/acme/lib/_clone/72"
github_pull_request acme/lib/_clone 72 merged "$(head_of "$clone_skip/github.com/acme/lib/_clone/72")"
LOOP_REVIEW_CACHE="$clone_skip" "$prune" >"$sandbox/output" || true
check "a worktree under a clone directory is not pruned" exists "$clone_skip/github.com/acme/lib/_clone/72"

only="$sandbox/only-cache"
touch "$sandbox/only-sibling"
review_tree "$app" "$only/github.com/acme/app/78"
github_pull_request acme/app 78 merged "$(head_of "$only/github.com/acme/app/78")"
LOOP_REVIEW_CACHE="$only" "$prune" >"$sandbox/output" || true
check "the cache root stays when its last tree is removed" exists "$only"
check "a path next to the cache stays" exists "$sandbox/only-sibling"
check "empty parents inside the cache are removed" missing "$only/github.com"

broken_clone="$sandbox/broken-clone"
broken="$sandbox/broken-only"
new_clone "$broken_clone"
review_tree "$broken_clone" "$broken/github.com/acme/gone/79"
github_pull_request acme/gone 79 merged "$(head_of "$broken/github.com/acme/gone/79")"
rm -rf "$broken_clone"
status=0
LOOP_REVIEW_CACHE="$broken" "$prune" >"$sandbox/output" || status=$?
check "a cache of only a broken worktree keeps it" exists "$broken/github.com/acme/gone/79"
check "a cache of only a broken worktree explains why" output_has "not a working git worktree"
check "a cache of only a broken worktree counts one skip" output_has "removed 0, kept 0, skipped 1"
check "a cache of only a broken worktree exits 0" [ "$status" -eq 0 ]

mkdir -p "$sandbox/wrap-status" "$sandbox/wrap-ls"
cat >"$sandbox/wrap-status/git" <<EOF
#!/usr/bin/env bash
case " \$* " in
  *" status "*) exit 128 ;;
esac
exec "$real_git" "\$@"
EOF
cat >"$sandbox/wrap-ls/git" <<EOF
#!/usr/bin/env bash
case " \$* " in
  *" ls-files "*) exit 128 ;;
esac
exec "$real_git" "\$@"
EOF
chmod +x "$sandbox/wrap-status/git" "$sandbox/wrap-ls/git"

status_cache="$sandbox/status-cache"
review_tree "$app" "$status_cache/github.com/acme/app/76"
github_pull_request acme/app 76 merged "$(head_of "$status_cache/github.com/acme/app/76")"
PATH="$sandbox/wrap-status:$PATH" LOOP_REVIEW_CACHE="$status_cache" "$prune" >"$sandbox/output" || true
check "a failing status keeps the tree" exists "$status_cache/github.com/acme/app/76"
check "a failing status is named as uncommitted changes" output_has "uncommitted changes"

ls_cache="$sandbox/ls-cache"
review_tree "$app" "$ls_cache/github.com/acme/app/77"
github_pull_request acme/app 77 merged "$(head_of "$ls_cache/github.com/acme/app/77")"
PATH="$sandbox/wrap-ls:$PATH" LOOP_REVIEW_CACHE="$ls_cache" "$prune" >"$sandbox/output" || true
check "a failing ls-files keeps the tree" exists "$ls_cache/github.com/acme/app/77"
check "a failing ls-files is named as uncommitted changes" output_has "uncommitted changes"

exit "$failures"
