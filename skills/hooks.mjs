import * as os from 'os'
import { promises as fs } from 'fs'
import { join } from 'path'

const HOME = os.homedir()
const SETTINGS = join(HOME, '.claude', 'settings.json')
const HOOKS_DIR = join(import.meta.dirname, 'hooks')

const HOOKS = {
  PostToolUse: [
    {
      matcher: 'Edit|Write|MultiEdit',
      hooks: [{ type: 'command', command: `node ${join(HOOKS_DIR, 'no-comments.mjs')}` }]
    }
  ]
}

const homePath = path => path.replace(HOME, '~')

const readSettings = async () => {
  try {
    return JSON.parse(await fs.readFile(SETTINGS, 'utf8'))
  } catch {
    return {}
  }
}

const isOurs = entry =>
  entry.hooks?.some(hook => hook.command?.includes(HOOKS_DIR))

export const installHooks = async ({ task: nest } = {}) => {
  const step = nest
    ? (title, fn) => nest(title, fn)
    : async (title, fn) => {
        console.log(`• ${title}`)
        await fn({ setOutput: message => console.log(`  → ${message}`) })
      }

  await step(`Link hooks into ${homePath(SETTINGS)}`, async ({ setOutput }) => {
    const settings = await readSettings()
    const existing = settings.hooks ?? {}

    for (const [event, entries] of Object.entries(HOOKS)) {
      const theirs = (existing[event] ?? []).filter(entry => !isOurs(entry))
      existing[event] = [...theirs, ...entries]
    }

    await fs.writeFile(SETTINGS, `${JSON.stringify({ ...settings, hooks: existing }, null, 2)}\n`)
    setOutput(Object.keys(HOOKS).map(event => `${event}: no-comments`).join(', '))
  })
}
