import $ from 'tinyspawn'
import * as os from 'os'
import { promises as fs } from 'fs'
import { join, dirname } from 'path'

// Pull jbarbier/CLAUDE.md fresh on every run, swap the author name for mine,
// then symlink that single rendered file into every agent's expected filename.
// One source, many targets => max compatibility with zero content drift.
const REPO = 'https://github.com/jbarbier/CLAUDE.md'

const REPLACE = [['Julien', 'Kiko']]

// Upstream is silent on these; agents otherwise narrate every line, treat
// perf as optional, push straight to the default branch, and open PRs then
// walk away. Appended, not patched, so
// an upstream rewrite cannot drop it.
const APPEND = `
## Performance

Performance is always P0. Prefer the faster path when correctness is equal.
Do not ship a slower design because it is easier to write, more abstract, or
more "flexible". Measure when unsure; optimize the hot path first.

## Comments

Do not add comments. The code must be self-explanatory through naming,
decomposition, and structure. A comment is a last resort for a decision that
genuinely cannot live in the code — an external behavior, a measurement, an
approach already tried and reversed. Reaching for one usually means the code
is not clear enough yet.

- Try the rename or the extracted function first. Most comments are a naming failure.
- Never restate the line below it. If the comment paraphrases the code, delete it.
- Encode ordering and coupling in structure — nesting, types, a single call site — not in a warning comment.
- One fact, one place. A fact asserted in three comments is believed in none.
- No archaeology. Why the old code was wrong goes in the commit, not above the new code.

## Pull requests

Ship work as a pull request, never as a push to the default branch. Branch
first, commit there, open the PR — including for a one-line fix, including
when the change is obviously correct and the tests are green. A direct push
skips CI, bot review, and any chance to read the diff in isolation. "It was
small" is exactly when this gets skipped and exactly when it should not be.

Opening a PR is not the finish line. Stay on it until every review comment is
addressed — resolved, fixed, or replied with a clear reason — then re-check
CI and bot reviews. Iterate in the same PR rather than leaving follow-ups for
later.
`

const HOME = os.homedir()
const SOURCE_DIR = join(HOME, '.config', 'claude-md')
const REPO_DIR = join(SOURCE_DIR, 'repo')
const SOURCE_FILE = join(SOURCE_DIR, 'CLAUDE.md')

// agent => global instruction file it reads
const TARGETS = [
  '.claude/CLAUDE.md', // Claude Code
  '.codex/AGENTS.md', // Codex
  '.cursor/AGENTS.md' // Cursor
]

const link = async target => {
  const dest = join(HOME, target)
  await fs.mkdir(dirname(dest), { recursive: true })
  const existing = await fs.lstat(dest).catch(() => null)
  // back up a real file before replacing it; symlinks are disposable
  if (existing && !existing.isSymbolicLink()) await fs.rename(dest, `${dest}.bak`)
  else if (existing) await fs.rm(dest)
  await fs.symlink(SOURCE_FILE, dest)
}

export const installClaudeMd = async ({ setOutput } = {}) => {
  await fs.mkdir(SOURCE_DIR, { recursive: true })

  // fresh clone each run keeps us pinned to upstream HEAD
  await fs.rm(REPO_DIR, { recursive: true, force: true })
  await $(`git clone --depth 1 ${REPO} ${REPO_DIR}`)

  let content = await fs.readFile(join(REPO_DIR, 'CLAUDE.md'), 'utf8')
  for (const [from, to] of REPLACE) content = content.replaceAll(from, to)
  await fs.writeFile(SOURCE_FILE, content + APPEND)

  await Promise.all(TARGETS.map(link))
  setOutput?.(`Linked ${SOURCE_FILE} → ${TARGETS.join(', ')}`)
}
