import { useCallback, useEffect, useMemo, useRef } from 'react'
import { ActionIcon, CloseButton, Group, Paper, Stack, Text, Title, Tooltip } from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'
import { useAppTranslations } from '../../context/AppTranslationsContext'
import type { Endpoint } from '../../types'
import { StyledPath } from '../StyledPath'
import classes from './SelectedEndpoints.module.css'

type SelectedEndpointsProps = {
  selected: Endpoint[]
  onRemove: (endpoint: Endpoint) => void
  onRemoveCategory: (endpoints: Endpoint[]) => void
  onLastRemoved?: () => void
}

function endpointId(e: Endpoint): string {
  return `${e.method} ${e.path}`
}

export function SelectedEndpoints({ selected, onRemove, onRemoveCategory, onLastRemoved }: SelectedEndpointsProps) {
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

  const grouped = useMemo(() => {
    const map = new Map<string, Array<{ endpoint: Endpoint; originalIndex: number }>>()
    for (let i = 0; i < selected.length; i++) {
      const ep = selected[i]
      let list = map.get(ep.category)
      if (!list) {
        list = []
        map.set(ep.category, list)
      }
      list.push({ endpoint: ep, originalIndex: i })
    }
    return map
  }, [selected])

  if (selected.length === 0) return null

  function handleRemove(endpoint: Endpoint, flatIndex: number) {
    const remaining = selected.length - 1

    if (remaining === 0) {
      onRemove(endpoint)
      onLastRemoved?.()
      return
    }

    const ids = selected
      .filter((_, i) => i !== flatIndex)
      .map(endpointId)

    if (flatIndex < ids.length) {
      focusTargetRef.current = ids[flatIndex]
    } else {
      focusTargetRef.current = ids[ids.length - 1]
    }

    onRemove(endpoint)
  }

  return (
    <Paper shadow="xs" radius="md" p="md" withBorder>
      <Title order={2} size="h4" mb="sm">{t('selectedEndpoints.heading')}</Title>
      <Stack gap={0}>
        {Array.from(grouped, ([category, items]) => (
          <div key={category}>
            <Group gap={6} mt="sm" mb={4} wrap="nowrap">
              <Text size="xs" fw={700} c="dimmed">
                {category} ({items.length})
              </Text>
              <CloseButton
                size="xs"
                variant="subtle"
                c="dimmed"
                aria-label={`${t('selectedEndpoints.remove')} ${category}`}
                onClick={() => {
                  if (items.length === selected.length) {
                    onLastRemoved?.()
                  }
                  onRemoveCategory(items.map(({ endpoint }) => endpoint))
                }}
              />
            </Group>
            {items.map(({ endpoint: ep, originalIndex }, i) => {
              const id = endpointId(ep)
              const isLastInGroup = i === items.length - 1
              return (
                <Group
                  key={id}
                  gap="xs"
                  wrap="nowrap"
                  justify="space-between"
                  py={6}
                  style={isLastInGroup ? undefined : { borderBottom: '1px solid var(--mantine-color-default-border)' }}
                >
                  <Text size="xs" ff="monospace" className={classes.endpointPath}>
                    <Text span fw={700} size="xs" ff="monospace" style={{ flexShrink: 0 }}>{ep.method}&nbsp;</Text>
                    <span className={classes.pathText}>
                      <bdo dir="ltr"><StyledPath path={ep.path} /></bdo>
                    </span>
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
                      onClick={() => handleRemove(ep, originalIndex)}
                    />
                  </Group>
                </Group>
              )
            })}
          </div>
        ))}
      </Stack>
    </Paper>
  )
}
