import * as os from 'os'
import { promises as fs } from 'fs'
import { join } from 'path'

const HOME = os.homedir()
const SETTINGS = join(HOME, '.claude', 'settings.json')
export const HOOKS_DIR = join(import.meta.dirname, 'hooks')

export const HOOKS = {
  PostToolUse: [
    {
      matcher: 'Edit|Write|MultiEdit',
      hooks: [{ type: 'command', command: `node ${join(HOOKS_DIR, 'no-comments.mjs')}` }]
    }
  ],
  Stop: [
    {
      hooks: [{ type: 'command', command: `node ${join(HOOKS_DIR, 'auto-loop-review', 'stop.mjs')}`, timeout: 15 }]
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

export const mergeHooks = (existing = {}, ours = HOOKS) => {
  const merged = { ...existing }
  for (const [event, entries] of Object.entries(ours)) {
    const theirs = (existing[event] ?? []).filter(entry => !isOurs(entry))
    merged[event] = [...theirs, ...entries]
  }
  return merged
}

const hookNames = () =>
  Object.entries(HOOKS).map(([event, entries]) => {
    const names = entries.flatMap(entry =>
      entry.hooks.map(hook => hook.command.slice(hook.command.indexOf(HOOKS_DIR) + HOOKS_DIR.length + 1))
    )
    return `${event}: ${names.join(', ')}`
  })

export const installHooks = async ({ task: nest } = {}) => {
  const step = nest
    ? (title, fn) => nest(title, fn)
    : async (title, fn) => {
        console.log(`• ${title}`)
        await fn({ setOutput: message => console.log(`  → ${message}`) })
      }

  await step(`Link hooks into ${homePath(SETTINGS)}`, async ({ setOutput }) => {
    const settings = await readSettings()
    const hooks = mergeHooks(settings.hooks)
    await fs.writeFile(SETTINGS, `${JSON.stringify({ ...settings, hooks }, null, 2)}\n`)
    setOutput(hookNames().join('; '))
  })
}
