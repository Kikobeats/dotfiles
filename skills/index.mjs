import task from 'tasuku'
import $ from 'tinyspawn'
import * as os from 'os'
import { installClaudeMd } from './claude-md.mjs'

const SKILLS = [
  'https://github.com/alirezarezvani/claude-skills --skill karpathy-coder',
  'https://github.com/anthropics/skills --skill frontend-design --skill internal-comms',
  'https://github.com/brianlovin/claude-config --skill fix-sentry-issues',
  'https://github.com/coreyhaines31/marketingskills --skill ai-seo --skill copywriting --skill schema --skill seo-audit',
  'https://github.com/datadog-labs/agent-skills --skill dd-pup --skill dd-monitors --skill dd-logs --full-depth',
  'https://github.com/emilkowalski/skill --skill emil-design-eng',
  'https://github.com/ibelick/ui-skills --skill fixing-metadata',
  'https://github.com/jakubantalik/transitions.dev --skill transitions-dev',
  'https://github.com/juliusbrussee/caveman --skill caveman-commit --skill caveman-stats --skill caveman',
  'https://github.com/mcollina/skills --skill node',
  'https://github.com/microlinkhq/skills --skill create-local-skill --skill nodejs-performance --skill use-pnpm',
  'https://github.com/nextlevelbuilder/ui-ux-pro-max-skill --skill ui-ux-pro-max',
  'https://github.com/remotion-dev/skills --skill remotion-best-practices',
  'https://github.com/steipete/agent-scripts --skill skill-cleaner',
  'https://github.com/vercel-labs/agent-browser --skill agent-browser',
  'https://github.com/vercel-labs/agent-skills --skill vercel-react-best-practices',
  'https://github.com/wshobson/agents --skill wcag-audit-patterns',
  'https://github.com/dietrichgebert/ponytail --skill ponytail --skill ponytail-review'
]

const command = agent =>
  `command npx -y skills add ${agent} --agent claude-code --agent cursor --agent codex --agent github-copilot --global --yes`

const concurrency = Math.max(1, Math.floor(os.cpus().length / 2))

await task('Installing global CLAUDE.md', installClaudeMd)

await task('Removing all existing skills', async () => {
  await $('npx -y skills remove --all --global --yes')
})

const results = await task.group(
  task =>
    SKILLS.map(skill =>
      task(`Installing ${skill}`, async ({ setWarning }) => {
        try {
          await $(command(skill))
          return { skill, failed: false }
        } catch (error) {
          setWarning(error)
          return { skill, failed: true }
        }
      })
    ),
  { concurrency }
)

const failed = results
  .map(result => result.result)
  .filter(result => result.failed)
  .map(result => result.skill)

if (failed.length > 0) {
  await task('Installation summary', async ({ setWarning, setOutput }) => {
    setWarning(
      `Installed ${SKILLS.length - failed.length}/${SKILLS.length} skills`
    )
    setOutput(`Failures: ${failed.length}`)
  })

  for (const skill of failed) {
    console.log(`  - ${skill}`)
  }
} else {
  await task('Installation summary', async ({ setOutput }) => {
    setOutput(`Installed ${SKILLS.length}/${SKILLS.length} skills`)
  })
}
