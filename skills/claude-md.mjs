import * as os from 'os'
import { promises as fs } from 'fs'
import { join, dirname } from 'path'

// Pull jbarbier/CLAUDE.md fresh on every run, swap the author name for mine,
// then symlink rendered files into every agent's expected path.
//
// Claude: base CLAUDE.md + modular ~/.claude/rules/* (no paste → no double-load).
// Cursor/Codex: AGENTS.md = base + all rules inlined (Cursor only loads AGENTS now).
const UPSTREAM =
  'https://raw.githubusercontent.com/jbarbier/CLAUDE.md/main/CLAUDE.md'

const HOME = os.homedir()
const SOURCE_DIR = join(HOME, '.config', 'claude-md')
const SOURCE_BASE = join(SOURCE_DIR, 'CLAUDE.md')
const SOURCE_AGENTS = join(SOURCE_DIR, 'AGENTS.md')
const RULES_DIR = join(SOURCE_DIR, 'rules')
const LOCAL_RULES_DIR = join(import.meta.dirname, 'rules')

/** Local rule files in this package → ~/.claude/rules/<name> (+ inlined into AGENTS.md) */
const RULES = ['clean-code.md', 'performance.md', 'pr-review.md']

const LINKS = [
  ['.claude/CLAUDE.md', SOURCE_BASE],
  ['.codex/AGENTS.md', SOURCE_AGENTS],
  ['.cursor/AGENTS.md', SOURCE_AGENTS],
  ...RULES.map(name => [`.claude/rules/${name}`, join(RULES_DIR, name)])
]

const homePath = path => path.replace(HOME, '~')
const kB = bytes => `${(bytes / 1024).toFixed(1)} kB`

const link = async ([target, source]) => {
  const dest = join(HOME, target)
  await fs.mkdir(dirname(dest), { recursive: true })
  const existing = await fs.lstat(dest).catch(() => null)
  // back up a real file before replacing it; symlinks are disposable
  let backedUp = false
  if (existing && !existing.isSymbolicLink()) {
    await fs.rename(dest, `${dest}.bak`)
    backedUp = true
  } else if (existing) {
    await fs.rm(dest)
  }
  await fs.symlink(source, dest)
  return { dest, source, backedUp }
}

export const installClaudeMd = async ({ task: nest } = {}) => {
  const step = nest
    ? (title, fn) => nest(title, fn)
    : async (title, fn) => {
        const api = {
          setOutput: message => console.log(`  → ${message}`)
        }
        console.log(`• ${title}`)
        await fn(api)
      }

  await fs.mkdir(RULES_DIR, { recursive: true })

  let upstream
  let rules
  await step('Fetch upstream + rules', async ({ setOutput }) => {
    ;[upstream, ...rules] = await Promise.all([
      fetch(UPSTREAM).then(async response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch ${UPSTREAM}: ${response.status}`)
        }
        return response.text()
      }),
      ...RULES.map(name => fs.readFile(join(LOCAL_RULES_DIR, name), 'utf8'))
    ])
    setOutput(
      [
        `${kB(upstream.length)} jbarbier/CLAUDE.md`,
        ...RULES.map((name, i) => `${kB(rules[i].length)} ${name}`)
      ].join(', ')
    )
  })

  const base = upstream.replaceAll('Julien', 'Kiko')
  const agents = [base, ...rules].join('\n')

  await step(`Write ${homePath(SOURCE_DIR)}`, async ({ setOutput }) => {
    await Promise.all([
      fs.writeFile(SOURCE_BASE, base),
      fs.writeFile(SOURCE_AGENTS, agents),
      ...RULES.map((name, i) => fs.writeFile(join(RULES_DIR, name), rules[i]))
    ])
    setOutput(
      `CLAUDE.md ${kB(base.length)} (Claude + rules/); AGENTS.md ${kB(agents.length)} (Cursor/Codex, rules inlined)`
    )
  })

  for (const [target, source] of LINKS) {
    await step(`Link ~/${target}`, async ({ setOutput }) => {
      const { dest, backedUp } = await link([target, source])
      setOutput(
        backedUp
          ? `backed up ${homePath(dest)}.bak → ${homePath(source)}`
          : homePath(source)
      )
    })
  }
}
