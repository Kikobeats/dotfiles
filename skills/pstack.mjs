import $ from 'tinyspawn'

const MARKETPLACE_SOURCE = 'michael-denyer/pstack-claude'
const MARKETPLACE = 'pstack-claude'
const PLUGIN = `pstack@${MARKETPLACE}`
const CURSOR_MANUAL_STEP = 'Cursor: run /add-plugin pstack'
const BINARY_NOT_FOUND = 'ENOENT'

export const HARNESSES = [
  {
    name: 'Claude Code',
    binary: 'claude',
    refreshMarketplace: ['plugin', 'marketplace', 'update', MARKETPLACE],
    addMarketplace: ['plugin', 'marketplace', 'add', MARKETPLACE_SOURCE],
    installPlugin: [
      ['plugin', 'install', PLUGIN],
      ['plugin', 'update', PLUGIN]
    ]
  },
  {
    name: 'Codex',
    binary: 'codex',
    refreshMarketplace: ['plugin', 'marketplace', 'upgrade', MARKETPLACE],
    addMarketplace: ['plugin', 'marketplace', 'add', MARKETPLACE_SOURCE],
    installPlugin: [['plugin', 'add', PLUGIN]]
  },
  {
    name: 'Copilot',
    binary: 'copilot',
    refreshMarketplace: ['plugin', 'marketplace', 'update', MARKETPLACE],
    addMarketplace: ['plugin', 'marketplace', 'add', MARKETPLACE_SOURCE],
    installPlugin: [
      ['plugin', 'install', PLUGIN],
      ['plugin', 'update', PLUGIN]
    ]
  }
]

const isMissingBinary = error => error.code === BINARY_NOT_FOUND

const ensureMarketplace = async ({ harness, run }) => {
  try {
    await run(harness.binary, harness.refreshMarketplace)
  } catch (error) {
    if (isMissingBinary(error)) throw error
    await run(harness.binary, harness.addMarketplace)
  }
}

export const installOn = async ({ harness, run }) => {
  try {
    await ensureMarketplace({ harness, run })
    for (const args of harness.installPlugin) await run(harness.binary, args)
    return { name: harness.name, status: 'installed' }
  } catch (error) {
    if (isMissingBinary(error)) {
      return { name: harness.name, status: 'skipped, not on PATH' }
    }
    return { name: harness.name, status: 'failed', error }
  }
}

export const installPstackPlugin = async ({ setOutput, setWarning }) => {
  const results = await Promise.all(
    HARNESSES.map(harness => installOn({ harness, run: $ }))
  )
  const failed = results.filter(result => result.error)
  if (failed.length > 0) {
    setWarning(
      failed.map(({ name, error }) => `${name}: ${error.message}`).join('\n')
    )
  }
  setOutput(
    [
      ...results.map(({ name, status }) => `${name}: ${status}`),
      CURSOR_MANUAL_STEP
    ].join(' · ')
  )
}
