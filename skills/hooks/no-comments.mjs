#!/usr/bin/env node
import { execFileSync } from 'child_process'
import { dirname, extname } from 'path'

const SOURCE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx'])
const COMMENT_LINE = /^\+\s*(\/\/|\/\*|\*[^/])/

const readHookInput = async () => {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  try {
    return JSON.parse(Buffer.concat(chunks).toString() || '{}')
  } catch {
    return {}
  }
}

const git = (cwd, args) => {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch (error) {
    return error.stdout ?? ''
  }
}

const addedCommentLines = filePath => {
  const cwd = dirname(filePath)
  const isTracked = git(cwd, ['ls-files', '--error-unmatch', filePath]).trim() !== ''
  const plainDiff = ['--no-pager', 'diff', '--no-ext-diff', '--no-color', '-U0']
  const diff = isTracked
    ? git(cwd, [...plainDiff, '--', filePath])
    : git(cwd, [...plainDiff, '--no-index', '/dev/null', filePath])

  return diff
    .split('\n')
    .filter(line => COMMENT_LINE.test(line))
    .map(line => line.slice(1).trim())
}

const { tool_input: toolInput = {} } = await readHookInput()
const filePath = toolInput.file_path

if (!filePath || !SOURCE_EXTENSIONS.has(extname(filePath))) process.exit(0)

const comments = addedCommentLines(filePath)
if (comments.length === 0) process.exit(0)

process.stderr.write(
  [
    `${comments.length} comment line(s) added to ${filePath}:`,
    ...comments.map(line => `  ${line}`),
    '',
    'clean-code.md: do not add comments. Try the rename or the extracted function',
    'first, and keep one only for a fact that cannot live in the code.'
  ].join('\n')
)
process.exit(2)
