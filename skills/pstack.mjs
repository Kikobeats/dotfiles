import * as os from 'os'
import { promises as fs } from 'fs'
import { dirname, join } from 'path'
import $ from 'tinyspawn'

const REPOSITORY = 'https://github.com/cursor/plugins'
const PLUGIN = 'pstack'
const AGENTS_SOURCE = 'agents'
const AGENT_EXTENSION = '.md'
const AGENT_DIRS = ['.claude/agents', '.cursor/agents']
const SKILLS_CLI_ROOT = '.agents'
const SYMLINKED_SKILLS_ROOTS = ['.claude']
const LINKED_INTO_SYMLINKED_ROOTS = [
  'README.md',
  'docs/guide',
  'automations/benny'
]
const MIRRORED_AT_SKILLS_CLI_ROOT = [
  AGENTS_SOURCE,
  ...LINKED_INTO_SYMLINKED_ROOTS
]

const sparseClone = async checkout => {
  await $('git', [
    'clone',
    '--quiet',
    '--depth=1',
    '--filter=blob:none',
    '--sparse',
    REPOSITORY,
    checkout
  ])
  await $('git', ['-C', checkout, 'sparse-checkout', 'set', PLUGIN])
}

export const withPluginCheckout = async (clone, use) => {
  const checkout = await fs.mkdtemp(join(os.tmpdir(), `${PLUGIN}-`))
  try {
    await clone(checkout)
    return await use(join(checkout, PLUGIN))
  } finally {
    await fs.rm(checkout, { recursive: true, force: true })
  }
}

const listAgents = async agentsDir => {
  const entries = await fs
    .readdir(agentsDir, { withFileTypes: true })
    .catch(() => [])
  return entries
    .filter(entry => entry.isFile() && entry.name.endsWith(AGENT_EXTENSION))
    .map(entry => entry.name)
}

const assertPluginLayout = async pluginDir => {
  await Promise.all(
    MIRRORED_AT_SKILLS_CLI_ROOT.map(path => fs.access(join(pluginDir, path)))
  )
}

const syncAgents = async ({ pluginDir, home, agents, retired }) => {
  await Promise.all(
    AGENT_DIRS.map(async agentDir => {
      const destDir = join(home, agentDir)
      await fs.mkdir(destDir, { recursive: true })
      await Promise.all([
        ...agents.map(agent =>
          fs.copyFile(
            join(pluginDir, AGENTS_SOURCE, agent),
            join(destDir, agent)
          )
        ),
        ...retired.map(agent => fs.rm(join(destDir, agent), { force: true }))
      ])
    })
  )
}

const mirror = async ({ pluginDir, home, path }) => {
  const dest = join(home, SKILLS_CLI_ROOT, path)
  await fs.rm(dest, { recursive: true, force: true })
  await fs.cp(join(pluginDir, path), dest, { recursive: true })
}

const linkToMirror = async ({ home, root, path }) => {
  const dest = join(home, root, path)
  const existing = await fs.lstat(dest).catch(() => null)
  if (existing && !existing.isSymbolicLink()) return
  await fs.mkdir(dirname(dest), { recursive: true })
  await fs.rm(dest, { force: true })
  await fs.symlink(join(home, SKILLS_CLI_ROOT, path), dest)
}

const linkSymlinkedRoots = home =>
  Promise.all(
    SYMLINKED_SKILLS_ROOTS.flatMap(root =>
      LINKED_INTO_SYMLINKED_ROOTS.map(path =>
        linkToMirror({ home, root, path })
      )
    )
  )

export const installPluginFiles = async ({ pluginDir, home }) => {
  await assertPluginLayout(pluginDir)
  const [agents, previousAgents] = await Promise.all([
    listAgents(join(pluginDir, AGENTS_SOURCE)),
    listAgents(join(home, SKILLS_CLI_ROOT, AGENTS_SOURCE))
  ])
  const retired = previousAgents.filter(agent => !agents.includes(agent))

  await syncAgents({ pluginDir, home, agents, retired })
  await Promise.all(
    MIRRORED_AT_SKILLS_CLI_ROOT.map(path => mirror({ pluginDir, home, path }))
  )
  await linkSymlinkedRoots(home)
  return { agents, retired, mirrored: MIRRORED_AT_SKILLS_CLI_ROOT }
}

export const installPstackPlugin = async ({ setOutput }) => {
  const { agents, mirrored } = await withPluginCheckout(
    sparseClone,
    pluginDir => installPluginFiles({ pluginDir, home: os.homedir() })
  )
  setOutput(`agents: ${agents.join(', ')} · mirrored: ${mirrored.join(', ')}`)
}
