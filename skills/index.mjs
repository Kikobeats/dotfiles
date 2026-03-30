import task from 'tasuku'
import $ from 'tinyspawn'
import * as os from 'os'

const SKILLS = [
  'https://github.com/anthropics/skills --skill frontend-design',
  'https://github.com/anthropics/skills --skill skill-creator',
  'https://github.com/brianlovin/claude-config --skill fix-sentry-issues',
  'https://github.com/brianlovin/claude-config --skill knip',
  'https://github.com/brianlovin/claude-config --skill rams',
  'https://github.com/brianlovin/claude-config --skill react-doctor',
  'https://github.com/brianlovin/claude-config --skill simplify',
  'https://github.com/coreyhaines31/marketingskills --skill ai-seo',
  'https://github.com/coreyhaines31/marketingskills --skill competitor-alternatives',
  'https://github.com/coreyhaines31/marketingskills --skill copy-editing',
  'https://github.com/coreyhaines31/marketingskills --skill copywriting',
  'https://github.com/coreyhaines31/marketingskills --skill free-tool-strategy',
  'https://github.com/coreyhaines31/marketingskills --skill marketing-ideas',
  'https://github.com/coreyhaines31/marketingskills --skill marketing-psychology',
  'https://github.com/coreyhaines31/marketingskills --skill programmatic-seo',
  'https://github.com/coreyhaines31/marketingskills --skill schema-markup',
  'https://github.com/coreyhaines31/marketingskills --skill seo-audit',
  'https://github.com/datadog-labs/agent-skills --skill dd-pup --skill dd-monitors --skill dd-logs --skill dd-apm --skill dd-docs --full-depth',
  'https://github.com/digitalsamba/claude-code-video-toolkit --skill ffmpeg',
  'https://github.com/emilkowalski/skill --skill emil-design-eng',
  'https://github.com/ibelick/ui-skills --skill fixing-accessibility',
  'https://github.com/ibelick/ui-skills --skill fixing-metadata',
  'https://github.com/mcollina/skills --skill node',
  'https://github.com/mcollina/skills --skill nodejs-core',
  'https://github.com/microlinkhq/skills --skill k8s-hpa-cost-tuning',
  'https://github.com/microlinkhq/skills --skill nodejs-performance',
  'https://github.com/microlinkhq/skills --skill optimo',
  'https://github.com/microlinkhq/skills --skill use-pnpm',
  'https://github.com/mindmorass/reflex --skill ffmpeg-patterns',
  'https://github.com/nextlevelbuilder/ui-ux-pro-max-skill --skill ui-ux-pro-max',
  'https://github.com/openai/skills --skill frontend-skill',
  'https://github.com/raphaelsalaja/userinterface-wiki --skill userinterface-wiki',
  'https://github.com/siviter-xyz/dot-agent --skill create-skill',
  'https://github.com/vercel-labs/agent-browser --skill agent-browser',
  'https://github.com/vercel-labs/agent-browser --skill dogfood',
  'https://github.com/vercel-labs/agent-skills --skill vercel-react-best-practices',
  'https://github.com/vercel-labs/agent-skills --skill web-design-guidelines',
  'https://github.com/wshobson/agents --skill wcag-audit-patterns'
]

const command = agent =>
  `npx -y skills add ${agent} --agent cursor --agent codex --agent github-copilot --global --yes`

const concurrency = Math.max(1, Math.floor(os.cpus().length / 2))

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
    setWarning(`Installed ${SKILLS.length - failed.length}/${SKILLS.length} skills`)
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
