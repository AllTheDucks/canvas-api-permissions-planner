import { useCallback, useEffect, useRef } from 'react'
import { ActionIcon, CloseButton, Group, Paper, Stack, Text, Title, Tooltip } from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'
import { useAppTranslations } from '../../context/AppTranslationsContext'
import type { Endpoint } from '../../types'

type SelectedEndpointsProps = {
  selected: Endpoint[]
  onRemove: (endpoint: Endpoint) => void
  onLastRemoved?: () => void
}

function endpointId(e: Endpoint): string {
  return `${e.method} ${e.path}`
}

export function SelectedEndpoints({ selected, onRemove, onLastRemoved }: SelectedEndpointsProps) {
  const removeRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const focusTargetRef = useRef<string | null>(null)
  const { t } = useAppTranslations()

  const setRef = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) {
      removeRefs.current.set(id, el)
    } else {
      removeRefs.current.delete(id)
    }
  }, [])

  useEffect(() => {
    if (focusTargetRef.current) {
      removeRefs.current.get(focusTargetRef.current)?.focus()
      focusTargetRef.current = null
    }
  }, [selected])

  if (selected.length === 0) return null

  function handleRemove(endpoint: Endpoint, index: number) {
    const remaining = selected.length - 1

    if (remaining === 0) {
      onRemove(endpoint)
      onLastRemoved?.()
      return
    }

    const ids = selected
      .filter((_, i) => i !== index)
      .map(endpointId)

    if (index < ids.length) {
      focusTargetRef.current = ids[index]
    } else {
      focusTargetRef.current = ids[ids.length - 1]
    }

    onRemove(endpoint)
  }

  return (
    <Paper shadow="xs" radius="md" p="md" withBorder>
      <Title order={3} size="h6" mb="xs">{t('selectedEndpoints.heading')}</Title>
      <Stack gap={0}>
        {selected.map((ep, index) => {
          const id = endpointId(ep)
          const isLast = index === selected.length - 1
          return (
            <Group
              key={id}
              gap="xs"
              wrap="nowrap"
              justify="space-between"
              py={6}
              style={isLast ? undefined : { borderBottom: '1px solid var(--mantine-color-default-border)' }}
            >
              <Text size="xs" ff="monospace" style={{ wordBreak: 'break-all' }}>
                <Text span fw={700} size="xs" ff="monospace">{ep.method}</Text>{' '}
                {ep.path.replace(/^\/api\/v1/, '')}
              </Text>
              <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                {ep.notes && (
                  <Tooltip label={ep.notes} multiline maw={300} withArrow>
                    <ActionIcon
                      size="sm"
                      variant="transparent"
                      component="span"
                      tabIndex={-1}
                    >
                      <IconInfoCircle size={14} />
                    </ActionIcon>
                  </Tooltip>
                )}
                <CloseButton
                  size="sm"
                  ref={(el) => setRef(id, el)}
                  aria-label={`${t('selectedEndpoints.remove')} ${ep.method} ${ep.path}`}
                  onClick={() => handleRemove(ep, index)}
                />
              </Group>
            </Group>
          )
        })}
      </Stack>
    </Paper>
  )
}
