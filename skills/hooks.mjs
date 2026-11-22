import * as os from 'os'
import { promises as fs } from 'fs'
import { join } from 'path'

const HOME = os.homedir()
const SETTINGS = join(HOME, '.claude', 'settings.json')
export const HOOKS_DIR = join(import.meta.dirname, 'hooks')

const nodeCommand = file => `node ${JSON.stringify(join(HOOKS_DIR, file))}`

export const HOOKS = {
  PostToolUse: [
    {
      matcher: 'Edit|Write|MultiEdit',
      hooks: [{ type: 'command', command: nodeCommand('no-comments.mjs') }]
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

const isOurs = hook => hook.command?.includes(HOOKS_DIR)

const withoutOurs = entries =>
  entries.flatMap(entry => {
    if (!entry.hooks?.some(isOurs)) return [entry]
    const hooks = entry.hooks.filter(hook => !isOurs(hook))
    return hooks.length ? [{ ...entry, hooks }] : []
  })

export const mergeHooks = (existing = {}, ours = HOOKS) => {
  const merged = {}
  for (const event of new Set([...Object.keys(existing), ...Object.keys(ours)])) {
    const entries = [...withoutOurs(existing[event] ?? []), ...(ours[event] ?? [])]
    if (entries.length) merged[event] = entries
  }
  return merged
}

const scriptOf = command => command.replace(/^node\s+/, '').replace(/^"(.*)"$/, '$1')

export const hookNames = () =>
  Object.entries(HOOKS).map(([event, entries]) => {
    const names = entries.flatMap(entry => entry.hooks.map(hook => scriptOf(hook.command).slice(HOOKS_DIR.length + 1)))
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
