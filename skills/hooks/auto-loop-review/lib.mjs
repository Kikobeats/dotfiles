import { homedir } from 'node:os'
import path from 'node:path'

const CREATE_COMMAND = /\b(?:glab\s+mr|gh\s+pr)\s+create\b/g
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

const oddSlashes = (script, index) => {
  let slashes = 0
  for (let i = index - 1; i >= 0 && script[i] === '\\'; i--) slashes++
  return slashes % 2 === 1
}

const heredocRanges = script => {
  const ranges = []
  for (const match of script.matchAll(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n/g)) {
    const bodyStart = match.index + match[0].length
    const closer = script.slice(bodyStart).search(new RegExp(`\\n\\s*${match[2]}(?=\\n|$)`))
    if (closer !== -1) ranges.push([bodyStart, bodyStart + closer])
  }
  return ranges
}

const rangeAt = (ranges, index) => ranges.find(([start, end]) => index >= start && index < end)

const quoteMask = script => {
  const ranges = heredocRanges(script)
  const inside = Array(script.length).fill(false)
  let quote = null
  let subst = 0
  let substOpen = false
  let tick = false
  for (let i = 0; i < script.length; i++) {
    if (!quote && rangeAt(ranges, i)) continue
    const char = script[i]
    if (quote === "'") {
      inside[i] = true
      if (char === "'") quote = null
      continue
    }
    if (quote === '"') {
      if (tick) {
        if (char === '`') tick = false
        continue
      }
      if (subst > 0) {
        if (substOpen) substOpen = false
        else if (char === '(') subst++
        else if (char === ')') subst--
        continue
      }
      if (char === '`') {
        tick = true
        continue
      }
      if (char === '$' && script[i + 1] === '(') {
        subst = 1
        substOpen = true
        continue
      }
      inside[i] = true
      if (char === '"' && !oddSlashes(script, i)) quote = null
      continue
    }
    if (char === "'" || (char === '"' && !oddSlashes(script, i))) {
      quote = char
      inside[i] = true
    }
  }
  return { inside, ranges }
}

const cdStart = match => match.index + match[0].search(/\bcd\b/)

export const createCommandDirs = (command, cwd) => {
  if (typeof command !== 'string') return []
  const { inside, ranges } = quoteMask(command)
  const creates = []
  for (const match of command.matchAll(CREATE_COMMAND)) {
    if (!inside[match.index]) creates.push(match.index)
  }
  if (creates.length === 0) return []
  const cds = [...command.matchAll(CD_COMMAND)]
    .map(match => ({ at: cdStart(match), arg: match[1] }))
    .filter(cd => !inside[cd.at])
  const dirs = [cwd]
  const found = []
  let cdIndex = 0
  let createIndex = 0
  for (let i = 0; i < command.length && createIndex < creates.length; i++) {
    if (ranges.some(([, end]) => end === i) && dirs.length > 1) dirs.pop()
    if (ranges.some(([start]) => start === i)) dirs.push(dirs.at(-1))
    while (cdIndex < cds.length && cds[cdIndex].at === i) {
      dirs[dirs.length - 1] = path.resolve(dirs.at(-1), cdTarget(cds[cdIndex].arg))
      cdIndex++
    }
    if (creates[createIndex] === i) {
      found.push(dirs.at(-1))
      createIndex++
    }
    if (inside[i] || rangeAt(ranges, i)) continue
    if (command[i] === '(') dirs.push(dirs.at(-1))
    else if (command[i] === ')' && dirs.length > 1) dirs.pop()
  }
  return found
}

export const createCommandDir = (command, cwd) => createCommandDirs(command, cwd)[0] ?? null

export const createdPullRequests = (entries, cwd = '/') => {
  const createCalls = new Map(
    entries
      .filter(entry => entry.type === 'assistant')
      .flatMap(entry =>
        contentBlocks(entry)
          .filter(block => block.type === 'tool_use')
          .flatMap(block => {
            const dirs = createCommandDirs(block.input?.command, cwd)
            return dirs.length === 0 ? [] : [[block.id, { dirs, calledAtMs: Date.parse(entry.timestamp) || 0 }]]
          })
      )
  )
  const found = new Map()
  for (const block of entries.filter(entry => entry.type === 'user').flatMap(contentBlocks)) {
    if (block.type !== 'tool_result' || block.is_error || !createCalls.has(block.tool_use_id)) continue
    const call = createCalls.get(block.tool_use_id)
    let nth = 0
    for (const url of resultText(block).match(PR_URL) ?? []) {
      if (!found.has(url)) found.set(url, { url, dir: call.dirs[Math.min(nth, call.dirs.length - 1)], calledAtMs: call.calledAtMs })
      nth++
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

export const reviewDisabled = ({ env, config }) => env === 'off' || config === 'false'

export const reviewPrompt = url => `/loop-review ${url}`
