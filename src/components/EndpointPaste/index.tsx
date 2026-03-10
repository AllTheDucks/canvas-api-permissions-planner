import { useState } from 'react'
import { Alert, Button, Code, Stack, Textarea } from '@mantine/core'
import { IconAlertCircle } from '@tabler/icons-react'
import { matchEndpoints } from '../../utils/endpointMatcher'
import type { Endpoint } from '../../types'

type EndpointPasteProps = {
  endpoints: Endpoint[]
  onAdd: (matched: Endpoint[]) => void
}

export function EndpointPaste({ endpoints, onAdd }: EndpointPasteProps) {
  const [value, setValue] = useState('')
  const [unmatched, setUnmatched] = useState<string[]>([])

  function handleAdd() {
    const lines = value
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)

    if (lines.length === 0) return

    const matched: Endpoint[] = []
    const failed: string[] = []

    for (const line of lines) {
      const results = matchEndpoints(line, endpoints)
      if (results.length > 0) {
        matched.push(...results)
      } else {
        failed.push(line)
      }
    }

    if (matched.length > 0) {
      onAdd(matched)
    }

    setUnmatched(failed)
    setValue('')
  }

  return (
    <Stack gap="xs" mt="md">
      <Textarea
        label="Or paste a list:"
        placeholder="One endpoint per line, e.g. GET /api/v1/courses/:id"
        autosize
        minRows={3}
        maxRows={6}
        value={value}
        onChange={e => setValue(e.currentTarget.value)}
      />
      <Button fullWidth onClick={handleAdd} disabled={value.trim().length === 0}>
        Add
      </Button>
      {unmatched.length > 0 && (
        <Alert
          icon={<IconAlertCircle />}
          color="red"
          title="Unrecognised endpoints:"
          role="alert"
          withCloseButton
          onClose={() => setUnmatched([])}
        >
          <Stack gap={4}>
            {unmatched.map((line, i) => (
              <Code key={i} block style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {line}
              </Code>
            ))}
          </Stack>
        </Alert>
      )}
    </Stack>
  )
}
