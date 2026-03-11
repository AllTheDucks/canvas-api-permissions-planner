import { useCallback, useEffect, useRef } from 'react'
import { ActionIcon, CloseButton, Group, Tooltip } from '@mantine/core'
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
  const badgeRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const focusTargetRef = useRef<string | null>(null)
  const { t } = useAppTranslations()

  const setRef = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) {
      badgeRefs.current.set(id, el)
    } else {
      badgeRefs.current.delete(id)
    }
  }, [])

  useEffect(() => {
    if (focusTargetRef.current) {
      badgeRefs.current.get(focusTargetRef.current)?.focus()
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
    <Group gap="xs" mt="xs">
      {selected.map((ep, index) => {
        const id = endpointId(ep)
        return (
          <Group
            key={id}
            gap={4}
            wrap="nowrap"
            style={{
              border: '1px solid var(--mantine-color-default-border)',
              borderRadius: 'var(--mantine-radius-sm)',
              padding: '2px 4px 2px 8px',
              lineHeight: 1.4,
            }}
          >
            <Tooltip label={id} openDelay={400}>
              <span
                style={{
                  maxWidth: 280,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontSize: 'var(--mantine-font-size-sm)',
                }}
              >
                {id}
              </span>
            </Tooltip>
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
        )
      })}
    </Group>
  )
}
