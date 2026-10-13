import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as os from 'os'
import { promises as fs } from 'fs'
import { dirname, join } from 'path'
import { installPluginFiles, withPluginCheckout } from './pstack.mjs'

const AGENT_DIRS = ['.claude/agents', '.cursor/agents']
const MIRRORED = ['README.md', 'agents', 'docs/guide', 'automations/benny']

const write = async (path, content) => {
  await fs.mkdir(dirname(path), { recursive: true })
  await fs.writeFile(path, content)
}

const read = path => fs.readFile(path, 'utf8')

const exists = path =>
  fs.lstat(path).then(
    () => true,
    () => false
  )

const sandbox = async t => {
  const root = await fs.mkdtemp(join(os.tmpdir(), 'pstack-test-'))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  const pluginDir = join(root, 'plugin')
  const home = join(root, 'home')
  await write(join(pluginDir, 'README.md'), 'readme v1')
  await write(join(pluginDir, 'agents/poteto-agent.md'), 'poteto v1')
  await write(join(pluginDir, 'agents/comment-sicko.md'), 'sicko v1')
  await write(join(pluginDir, 'docs/guide/01-setup.md'), 'setup v1')
  await write(join(pluginDir, 'docs/guide/images/router.jpg'), 'image')
  await write(join(pluginDir, 'automations/benny/FOR_AGENTS.md'), 'benny v1')
  await write(join(pluginDir, 'skills/why/SKILL.md'), 'not installed here')
  return { pluginDir, home }
}

test('copies every agent into the Claude Code and Cursor agent dirs', async t => {
  const { pluginDir, home } = await sandbox(t)

  const { agents } = await installPluginFiles({ pluginDir, home })

  assert.deepEqual(agents.sort(), ['comment-sicko.md', 'poteto-agent.md'])
  for (const agentDir of AGENT_DIRS) {
    assert.deepEqual((await fs.readdir(join(home, agentDir))).sort(), [
      'comment-sicko.md',
      'poteto-agent.md'
    ])
    assert.equal(
      await read(join(home, agentDir, 'poteto-agent.md')),
      'poteto v1'
    )
    assert.equal(
      await read(join(home, agentDir, 'comment-sicko.md')),
      'sicko v1'
    )
  }
})

test('ignores anything in agents/ that is not an agent file', async t => {
  const { pluginDir, home } = await sandbox(t)
  await write(join(pluginDir, 'agents/shared/notes.md'), 'nested')
  await write(join(pluginDir, 'agents/.DS_Store'), 'junk')

  const { agents } = await installPluginFiles({ pluginDir, home })

  assert.deepEqual(agents.sort(), ['comment-sicko.md', 'poteto-agent.md'])
  assert.equal(await exists(join(home, '.claude/agents/shared')), false)
  assert.equal(await exists(join(home, '.claude/agents/.DS_Store')), false)
})

for (const skillsRoot of ['.agents', '.claude']) {
  test(`../../ links resolve from a skill under ~/${skillsRoot}/skills`, async t => {
    const { pluginDir, home } = await sandbox(t)

    await installPluginFiles({ pluginDir, home })

    const pluginRoot = join(home, skillsRoot, 'skills/poteto-help', '../..')
    assert.equal(await read(join(pluginRoot, 'README.md')), 'readme v1')
    assert.equal(
      await read(join(pluginRoot, 'agents/comment-sicko.md')),
      'sicko v1'
    )
    assert.equal(
      await read(join(pluginRoot, 'docs/guide/01-setup.md')),
      'setup v1'
    )
    assert.equal(
      await read(join(pluginRoot, 'docs/guide/images/router.jpg')),
      'image'
    )
    assert.equal(
      await read(join(pluginRoot, 'automations/benny/FOR_AGENTS.md')),
      'benny v1'
    )
  })
}

test('never installs skills, those belong to the skills CLI', async t => {
  const { pluginDir, home } = await sandbox(t)
  await write(join(home, '.agents/skills/why/SKILL.md'), 'from skills cli')

  await installPluginFiles({ pluginDir, home })

  assert.deepEqual(await fs.readdir(join(home, '.agents/skills')), ['why'])
  assert.equal(
    await read(join(home, '.agents/skills/why/SKILL.md')),
    'from skills cli'
  )
  assert.equal(await exists(join(home, '.claude/skills')), false)
})

test('a rerun updates changed files and drops files removed upstream', async t => {
  const { pluginDir, home } = await sandbox(t)
  await write(join(pluginDir, 'automations/benny/old.md'), 'old')
  await installPluginFiles({ pluginDir, home })

  await write(join(pluginDir, 'agents/poteto-agent.md'), 'poteto v2')
  await write(join(pluginDir, 'README.md'), 'readme v2')
  await fs.rm(join(pluginDir, 'docs/guide/01-setup.md'))
  await fs.rm(join(pluginDir, 'automations/benny/old.md'))
  await write(join(pluginDir, 'docs/guide/02-poteto-mode.md'), 'mode v2')
  await installPluginFiles({ pluginDir, home })

  for (const agentDir of [...AGENT_DIRS, '.agents/agents']) {
    assert.equal(
      await read(join(home, agentDir, 'poteto-agent.md')),
      'poteto v2'
    )
  }
  assert.equal(await read(join(home, '.claude/README.md')), 'readme v2')
  assert.deepEqual(await fs.readdir(join(home, '.agents/docs/guide')), [
    '02-poteto-mode.md',
    'images'
  ])
  assert.deepEqual(await fs.readdir(join(home, '.agents/automations/benny')), [
    'FOR_AGENTS.md'
  ])
})

test('an agent renamed upstream is retired from every agent dir', async t => {
  const { pluginDir, home } = await sandbox(t)
  await installPluginFiles({ pluginDir, home })

  await fs.rename(
    join(pluginDir, 'agents/poteto-agent.md'),
    join(pluginDir, 'agents/poteto.md')
  )
  const { retired } = await installPluginFiles({ pluginDir, home })

  assert.deepEqual(retired, ['poteto-agent.md'])
  for (const agentDir of [...AGENT_DIRS, '.agents/agents']) {
    assert.deepEqual((await fs.readdir(join(home, agentDir))).sort(), [
      'comment-sicko.md',
      'poteto.md'
    ])
  }
})

test('keeps files it does not own', async t => {
  const { pluginDir, home } = await sandbox(t)
  const foreign = [
    '.claude/agents/mine.md',
    '.cursor/agents/mine.md',
    '.agents/docs/other/notes.md',
    '.agents/automations/other/run.md',
    '.claude/docs/other/notes.md',
    '.claude/settings.json'
  ]
  for (const path of foreign) await write(join(home, path), `mine ${path}`)

  await installPluginFiles({ pluginDir, home })
  await installPluginFiles({ pluginDir, home })

  for (const path of foreign) {
    assert.equal(await read(join(home, path)), `mine ${path}`)
  }
})

test('a real file where a ~/.claude link would go is left alone', async t => {
  const { pluginDir, home } = await sandbox(t)
  await write(join(home, '.claude/README.md'), 'my own readme')

  await installPluginFiles({ pluginDir, home })

  assert.equal(await read(join(home, '.claude/README.md')), 'my own readme')
})

for (const missing of MIRRORED) {
  test(`upstream losing ${missing} fails before touching the previous install`, async t => {
    const { pluginDir, home } = await sandbox(t)
    await installPluginFiles({ pluginDir, home })
    await write(join(pluginDir, 'agents/poteto-agent.md'), 'poteto v2')
    await fs.rm(join(pluginDir, missing), { recursive: true })

    await assert.rejects(installPluginFiles({ pluginDir, home }), {
      code: 'ENOENT'
    })

    assert.equal(await read(join(home, '.agents/README.md')), 'readme v1')
    assert.equal(
      await read(join(home, '.agents/docs/guide/01-setup.md')),
      'setup v1'
    )
    assert.equal(
      await read(join(home, '.agents/automations/benny/FOR_AGENTS.md')),
      'benny v1'
    )
    for (const agentDir of [...AGENT_DIRS, '.agents/agents']) {
      assert.equal(
        await read(join(home, agentDir, 'poteto-agent.md')),
        'poteto v1'
      )
    }
  })
}

test('the checkout holds the plugin subdirectory and is removed afterwards', async () => {
  let cloned
  const result = await withPluginCheckout(
    async checkout => {
      cloned = checkout
      await write(join(checkout, 'pstack/README.md'), 'readme')
    },
    pluginDir => read(join(pluginDir, 'README.md'))
  )

  assert.equal(result, 'readme')
  assert.equal(await exists(cloned), false)
})

test('the checkout is removed when the clone fails', async () => {
  let cloned
  await assert.rejects(
    withPluginCheckout(
      async checkout => {
        cloned = checkout
        throw new Error('no network')
      },
      () => assert.fail('must not install from a failed clone')
    ),
    /no network/
  )

  assert.equal(await exists(cloned), false)
})

test('the checkout is removed when the install fails', async () => {
  let cloned
  await assert.rejects(
    withPluginCheckout(
      async checkout => {
        cloned = checkout
      },
      async () => {
        throw new Error('disk full')
      }
    ),
    /disk full/
  )

  assert.equal(await exists(cloned), false)
})
