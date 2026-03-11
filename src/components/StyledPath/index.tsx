import { Text } from '@mantine/core'

const API_PREFIX = '/api/v1'
const PARAM_RE = /:[a-z_]+/g

type StyledPathProps = {
  path: string
}

export function StyledPath({ path }: StyledPathProps) {
  const hasPrefix = path.startsWith(API_PREFIX)
  const prefix = hasPrefix ? API_PREFIX : null
  const rest = hasPrefix ? path.slice(API_PREFIX.length) : path

  const parts: Array<{ text: string; isParam: boolean }> = []
  let lastIndex = 0
  for (const match of rest.matchAll(PARAM_RE)) {
    if (match.index > lastIndex) {
      parts.push({ text: rest.slice(lastIndex, match.index), isParam: false })
    }
    parts.push({ text: match[0], isParam: true })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < rest.length) {
    parts.push({ text: rest.slice(lastIndex), isParam: false })
  }

  return (
    <>
      {prefix && (
        <Text span c="dimmed" inherit>
          {prefix}
        </Text>
      )}
      {parts.map((part, i) =>
        part.isParam ? (
          <Text span c="dimmed" fs="italic" inherit key={i}>
            {part.text}
          </Text>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  )
}
