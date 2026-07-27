import $ from 'tinyspawn'
import * as os from 'os'
import { promises as fs } from 'fs'
import { join, dirname } from 'path'

// Pull jbarbier/CLAUDE.md fresh on every run, swap the author name for mine,
// then symlink that single rendered file into every agent's expected filename.
// One source, many targets => max compatibility with zero content drift.
const REPO = 'https://github.com/jbarbier/CLAUDE.md'

const REPLACE = [['Julien', 'Kiko']]

// Upstream says nothing about code comments, and agents default to narrating
// every line. Appended, not patched, so an upstream rewrite cannot drop it.
const APPEND = `
## Comments

A comment earns its place by carrying what the code cannot: a measurement, a
constraint, an ordering a future edit would silently break, a decision that was
already tried and reversed. Everything else is noise.

- Never restate the line below it. If the comment paraphrases the code, delete it.
- One fact, one place. A fact asserted in three comments is believed in none.
- Shorter than the code it guards. Two lines is normal, five is a smell, a paragraph belongs in the commit message.
- No archaeology. Why the old code was wrong goes in the commit, not above the new code.
- Rename before explaining. A comment excusing a bad name is two problems.
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
