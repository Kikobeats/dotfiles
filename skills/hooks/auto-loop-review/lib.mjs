import { homedir } from 'node:os'
import path from 'node:path'

const CREATE_COMMAND = /\b(?:glab\s+mr|gh\s+pr)\s+create\b/
const CD_COMMAND = /(?:^|[;&|(\n])\s*cd\s+("[^"]+"|'[^']+'|[^\s;&|)]+)/g
const CLOCK_SKEW_MS = 60 * 1000
const PR_URL =
  /https:\/\/(?:gitlab\.com\/[\w.-]+(?:\/[\w.-]+)+\/-\/merge_requests\/\d+|github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+)/g

const contentBlocks = entry => {
  const content = entry?.message?.content
  return Array.isArray(content) ? content : []
}

const isPrompt = entry =>
  entry.type === 'user' &&
  (typeof entry.message?.content === 'string' || contentBlocks(entry).some(block => block.type === 'text'))

const resultText = block =>
  typeof block.content === 'string'
    ? block.content
    : (Array.isArray(block.content) ? block.content : []).map(part => part.text ?? '').join('\n')

export const parseTranscript = text =>
  text
    .split('\n')
    .filter(Boolean)
    .flatMap(line => {
      try {
        return [JSON.parse(line)]
      } catch {
        return []
      }
    })

export const lastTurn = entries => {
  const start = entries.findLastIndex(isPrompt)
  return start === -1 ? entries : entries.slice(start + 1)
}

const cdTarget = arg => arg.replace(/^(["'])(.*)\1$/, '$2').replace(/^~(?=\/|$)/, homedir())

export const createCommandDir = (command, cwd) => {
  const create = command.search(CREATE_COMMAND)
  if (create === -1) return null
  const cds = [...command.slice(0, create).matchAll(CD_COMMAND)].map(match => cdTarget(match[1]))
  return path.resolve(cwd, ...cds)
}

export const createdPullRequests = (entries, cwd = '/') => {
  const createCalls = new Map(
    entries
      .filter(entry => entry.type === 'assistant')
      .flatMap(entry =>
        contentBlocks(entry)
          .filter(block => block.type === 'tool_use')
          .flatMap(block => {
            const dir = createCommandDir(block.input?.command ?? '', cwd)
            return dir === null ? [] : [[block.id, { dir, calledAtMs: Date.parse(entry.timestamp) || 0 }]]
          })
      )
  )
  const found = new Map()
  for (const block of entries.filter(entry => entry.type === 'user').flatMap(contentBlocks)) {
    if (block.type !== 'tool_result' || block.is_error || !createCalls.has(block.tool_use_id)) continue
    for (const url of resultText(block).match(PR_URL) ?? []) {
      if (!found.has(url)) found.set(url, { url, ...createCalls.get(block.tool_use_id) })
    }
  }
  return [...found.values()]
}

export const pullRequestRepo = url =>
  url.match(/^https:\/\/([^/]+\/.+?)\/(?:-\/merge_requests|pull)\/\d+$/)?.[1].toLowerCase() ?? null

export const remoteRepo = remote => {
  const match = remote.trim().match(/^(?:[\w+]+:\/\/)?(?:[^@/]+@)?([^/:]+)[:/](.+?)(?:\.git)?\/?$/)
  return match ? `${match[1]}/${match[2]}`.toLowerCase() : null
}

export const stateKey = url => url.replace(/^https:\/\//, '').replace(/[^\w.-]+/g, '_')

export const createdByCall = ({ createdAtMs, calledAtMs }) => createdAtMs >= calledAtMs - CLOCK_SKEW_MS

export const isQuiet = ({ lastWriteMs, nowMs, quietMs }) => nowMs - lastWriteMs >= quietMs

export const startedByHand = ({ chats, url, sinceMs }) =>
  chats.some(({ createdAtMs, prompts }) => createdAtMs >= sinceMs && prompts.some(prompt => prompt.includes(url)))

export const reviewPrompt = url => `/loop-review ${url}`
