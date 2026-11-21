import * as os from 'os'
import { promises as fs } from 'fs'
import { join } from 'path'

const HOME = os.homedir()
const CLAUDE_SKILLS_DIR = join(HOME, '.claude', 'skills')

// Symlinked after `skills remove --all` so the wipe never takes them out:
// skills that ship with Cursor and have no Claude Code equivalent, and
// skills that live in this repo.
export const SKILLS = [
  { name: 'autopilot', source: join(HOME, '.cursor', 'skills-cursor', 'autopilot') },
  { name: 'review', source: join(import.meta.dirname, 'review') }
]

const homePath = path => path.replace(HOME, '~')

const link = async ({ name, source }) => {
  const dest = join(CLAUDE_SKILLS_DIR, name)
  if (!(await fs.stat(source).catch(() => null))) return null
  const existing = await fs.lstat(dest).catch(() => null)
  // back up a real directory before replacing it; symlinks are disposable
  let backedUp = false
  if (existing && !existing.isSymbolicLink()) {
    await fs.rename(dest, `${dest}.bak`)
    backedUp = true
  } else if (existing) {
    await fs.rm(dest)
  }
  await fs.symlink(source, dest)
  return { dest, backedUp }
}

export const installLinkedSkills = async ({ task: nest } = {}) => {
  const step = nest
    ? (title, fn) => nest(title, fn)
    : async (title, fn) => {
        console.log(`• ${title}`)
        await fn({ setOutput: message => console.log(`  → ${message}`) })
      }

  await fs.mkdir(CLAUDE_SKILLS_DIR, { recursive: true })

  for (const skill of SKILLS) {
    await step(`Link ~/.claude/skills/${skill.name}`, async ({ setOutput }) => {
      const result = await link(skill)
      if (!result) {
        return setOutput(`skipped, no ${homePath(skill.source)}`)
      }
      const { dest, backedUp } = result
      setOutput(
        backedUp
          ? `backed up ${homePath(dest)}.bak → ${homePath(dest)}`
          : homePath(dest)
      )
    })
  }
}
