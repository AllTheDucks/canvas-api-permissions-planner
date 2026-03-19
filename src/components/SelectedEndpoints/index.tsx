import { useMemo } from 'react'
import { ActionIcon, CloseButton, Group, Paper, Stack, Text, Title, Tooltip } from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'
import { useAppTranslations } from '../../context/AppTranslationsContext'
import { useListRemovalFocus } from '../../hooks/useListRemovalFocus'
import type { Endpoint } from '../../types'
import { MethodBadge } from '../MethodBadge'
import { StyledPath } from '../StyledPath'
import classes from './SelectedEndpoints.module.css'

type SelectedEndpointsProps = {
  selected: Endpoint[]
  onRemove: (endpoint: Endpoint) => void
  onRemoveCategory: (endpoints: Endpoint[]) => void
}

function endpointId(e: Endpoint): string {
  return `${e.method} ${e.path}`
}

export function SelectedEndpoints({ selected, onRemove, onRemoveCategory }: SelectedEndpointsProps) {
  const { t } = useAppTranslations()
  const { setRef, scheduleRemovalFocus } = useListRemovalFocus(selected, endpointId)

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
    scheduleRemovalFocus(flatIndex)
    onRemove(endpoint)
  }

  return (
    <Paper shadow="xs" radius="md" p="md" withBorder className={classes.accentPanel}>
      <Title order={2} size="h4" mb="sm">{t('selectedEndpoints.heading')}</Title>
      <Stack gap={0}>
        {Array.from(grouped, ([category, items]) => (
          <div key={category}>
            <Group gap={6} mt="sm" mb={4} wrap="nowrap">
              <Text size="xs" fw={700} c="dimmed">
                {category} ({items.length})
              </Text>
              <CloseButton
                size="sm"
                variant="subtle"
                c="dimmed"
                aria-label={`${t('selectedEndpoints.remove')} ${category}`}
                onClick={() => onRemoveCategory(items.map(({ endpoint }) => endpoint))}
              />
            </Group>
            {items.map(({ endpoint: ep, originalIndex }) => {
              const id = endpointId(ep)
              return (
                <Group
                  key={id}
                  gap="xs"
                  wrap="nowrap"
                  justify="space-between"
                  py={6}
                  className={classes.separatedRow}
                >
                  <Text size="xs" ff="monospace" className={classes.endpointPath}>
                    <span className={classes.noShrink}><Text span size="xs" ff="monospace"><MethodBadge method={ep.method} /></Text>&nbsp;</span>
                    <span className={classes.pathText}>
                      <bdo dir="ltr"><StyledPath path={ep.path} /></bdo>
                    </span>
                  </Text>
                  <Group gap={4} wrap="nowrap" className={classes.noShrink}>
                    {ep.notes && (
                      <Tooltip label={t(ep.notes)} multiline maw={300} withArrow>
                        <ActionIcon
                          size="sm"
                          variant="transparent"
                          component="span"
                          tabIndex={-1}
                          aria-hidden="true"
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
