import { createSpinner } from 'nanospinner'
import $ from 'tinyspawn'
import pMap from 'p-map'
import * as os from 'os'

const SKILLS = [
  'https://github.com/anthropics/skills --skill frontend-design',
  'https://github.com/anthropics/skills --skill skill-creator',
  'https://github.com/coreyhaines31/marketingskills --skill competitor-alternatives',
  'https://github.com/coreyhaines31/marketingskills --skill copy-editing',
  'https://github.com/coreyhaines31/marketingskills --skill copywriting',
  'https://github.com/coreyhaines31/marketingskills --skill free-tool-strategy',
  'https://github.com/coreyhaines31/marketingskills --skill marketing-ideas',
  'https://github.com/coreyhaines31/marketingskills --skill marketing-psychology',
  'https://github.com/coreyhaines31/marketingskills --skill programmatic-seo',
  'https://github.com/coreyhaines31/marketingskills --skill schema-markup',
  'https://github.com/coreyhaines31/marketingskills --skill seo-audit',
  'https://github.com/vercel-labs/agent-browser --skill agent-browser',
  'https://github.com/vercel-labs/agent-skills --skill vercel-react-best-practices',
  'https://github.com/vercel-labs/agent-skills --skill web-design-guidelines',
  'https://github.com/siviter-xyz/dot-agent --skill create-skill',
  'https://github.com/Kikobeats/skills --skill k8s-hpa-cost-tuning'
]

const command = agent =>
  `npx -y skills add ${agent} --agent cursor --agent codex --agent github-copilot --global --yes`

// Remove all existing skills first
const removeSpinner = createSpinner('Removing all existing skills...').start()
await $('npx -y skills remove --all --global --yes')
removeSpinner.success({ text: 'All existing skills removed' })

const spinner = createSpinner(`Installed 0/${SKILLS.length} skills`).start()

let installed = 0

await pMap(
  SKILLS,
  async skill => {
    const cmd = command(skill)
    await $(cmd)
    spinner.update({ text: `Installed ${++installed}/${SKILLS.length} skills` })
  },
  { concurrency: os.cpus().length }
)

spinner.success()
