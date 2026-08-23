import * as os from 'os'
import { promises as fs } from 'fs'
import { join } from 'path'

// Skills that live in this repo instead of a remote registry, symlinked into
// Claude Code after `skills remove --all` so the wipe never takes them out.
const HOME = os.homedir()
const SOURCE_DIR = join(import.meta.dirname, 'local')
const CLAUDE_SKILLS_DIR = join(HOME, '.claude', 'skills')

const homePath = path => path.replace(HOME, '~')

const link = async name => {
  const source = join(SOURCE_DIR, name)
  const dest = join(CLAUDE_SKILLS_DIR, name)
  await fs.rm(dest, { recursive: true, force: true })
  await fs.symlink(source, dest)
  return dest
}

export const installLocalSkills = async ({ task: nest } = {}) => {
  const step = nest
    ? (title, fn) => nest(title, fn)
    : async (title, fn) => {
        console.log(`• ${title}`)
        await fn({ setOutput: message => console.log(`  → ${message}`) })
      }

  await fs.mkdir(CLAUDE_SKILLS_DIR, { recursive: true })
  const entries = await fs.readdir(SOURCE_DIR, { withFileTypes: true })
  const names = entries.filter(entry => entry.isDirectory()).map(entry => entry.name)

  for (const name of names) {
    await step(`Link ~/.claude/skills/${name}`, async ({ setOutput }) => {
      const dest = await link(name)
      setOutput(homePath(dest))
    })
  }
}
