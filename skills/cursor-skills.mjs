import * as os from 'os'
import { promises as fs } from 'fs'
import { join } from 'path'

// Skills that ship with Cursor and have no Claude Code equivalent, symlinked
// after `skills remove --all` so the wipe never takes them out.
const SKILLS = ['autopilot']

const HOME = os.homedir()
const SOURCE_DIR = join(HOME, '.cursor', 'skills-cursor')
const CLAUDE_SKILLS_DIR = join(HOME, '.claude', 'skills')

const homePath = path => path.replace(HOME, '~')

const link = async name => {
  const source = join(SOURCE_DIR, name)
  const dest = join(CLAUDE_SKILLS_DIR, name)
  if (!(await fs.stat(source).catch(() => null))) return null
  await fs.rm(dest, { recursive: true, force: true })
  await fs.symlink(source, dest)
  return dest
}

export const installCursorSkills = async ({ task: nest } = {}) => {
  const step = nest
    ? (title, fn) => nest(title, fn)
    : async (title, fn) => {
        console.log(`• ${title}`)
        await fn({ setOutput: message => console.log(`  → ${message}`) })
      }

  await fs.mkdir(CLAUDE_SKILLS_DIR, { recursive: true })

  for (const name of SKILLS) {
    await step(`Link ~/.claude/skills/${name}`, async ({ setOutput }) => {
      const dest = await link(name)
      setOutput(dest ? homePath(dest) : `skipped, no ${homePath(join(SOURCE_DIR, name))}`)
    })
  }
}
