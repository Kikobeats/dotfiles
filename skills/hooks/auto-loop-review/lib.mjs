const CREATE_COMMAND = /\b(glab\s+mr\s+create|gh\s+pr\s+create)\b/
const PR_URL = /https:\/\/(?:gitlab\.com\/[\w.-]+(?:\/[\w.-]+)+\/-\/merge_requests\/\d+|github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+)/g

const contentBlocks = entry => {
  const content = entry?.message?.content
  return Array.isArray(content) ? content : []
}

const isPrompt = entry =>
  entry.type === 'user' &&
  (typeof entry.message?.content === 'string' ||
    contentBlocks(entry).some(block => block.type === 'text'))

const resultText = block =>
  typeof block.content === 'string'
    ? block.content
    : (Array.isArray(block.content) ? block.content : [])
        .map(part => part.text ?? '')
        .join('\n')

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

export const createdPullRequests = entries => {
  const createCalls = new Set(
    entries.flatMap(entry =>
      contentBlocks(entry)
        .filter(block => block.type === 'tool_use' && CREATE_COMMAND.test(block.input?.command ?? ''))
        .map(block => block.id)
    )
  )
  const urls = entries.flatMap(entry =>
    contentBlocks(entry)
      .filter(block => block.type === 'tool_result' && createCalls.has(block.tool_use_id) && !block.is_error)
      .flatMap(block => resultText(block).match(PR_URL) ?? [])
  )
  return [...new Set(urls)]
}

export const stateKey = url => url.replace(/^https:\/\//, '').replace(/[^\w.-]+/g, '_')

export const isQuiet = ({ lastWriteMs, nowMs, quietMs }) => nowMs - lastWriteMs >= quietMs

export const startedByHand = ({ chats, url, sinceMs }) =>
  chats.some(({ createdAtMs, prompts }) => createdAtMs >= sinceMs && prompts.some(prompt => prompt.includes(url)))

export const reviewPrompt = url => `/loop-review ${url}`
