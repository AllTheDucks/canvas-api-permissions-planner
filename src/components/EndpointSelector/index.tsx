import { memo, useCallback, useMemo, useOptimistic, useRef, useState, startTransition } from 'react'
import {
  ActionIcon,
  Checkbox,
  CloseButton,
  ScrollArea,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core'
import { useVirtualizer } from '@tanstack/react-virtual'
import { IconInfoCircle, IconSearch } from '@tabler/icons-react'
import { useAppTranslations } from '../../context/AppTranslationsContext'
import { trackEvent } from '../../utils/analytics'
import type { Endpoint } from '../../types'

type EndpointSelectorProps = {
  endpoints: Endpoint[]
  selected: Endpoint[]
  onToggle: (endpoint: Endpoint) => void
  inputRef?: React.Ref<HTMLInputElement>
}

function endpointId(e: Endpoint): string {
  return `${e.method} ${e.path}`
}

type EndpointRowProps = {
  endpoint: Endpoint
  checked: boolean
  onToggle: (endpoint: Endpoint) => void
}

const EndpointRow = memo(function EndpointRow({ endpoint, checked, onToggle }: EndpointRowProps) {
  const id = endpointId(endpoint)
  const handleChange = useCallback(() => {
    if (!checked) {
      trackEvent('endpoint_selected', { category: endpoint.category })
    }
    onToggle(endpoint)
  }, [endpoint, checked, onToggle])

  return (
    <Checkbox
      checked={checked}
      onChange={handleChange}
      label={
        <>
          {id}
          {endpoint.notes && (
            <Tooltip label={endpoint.notes} multiline maw={300} withArrow>
              <ActionIcon
                size="sm"
                variant="transparent"
                component="span"
                style={{ verticalAlign: 'middle', marginLeft: 4 }}
              >
                <IconInfoCircle size={14} />
              </ActionIcon>
            </Tooltip>
          )}
        </>
      }
    />
  )
})

type FlatRow =
  | { type: 'header'; category: string }
  | { type: 'endpoint'; endpoint: Endpoint }

const ROW_HEIGHT = 30
const HEADER_HEIGHT = 36

export function EndpointSelector({ endpoints, selected, onToggle, inputRef }: EndpointSelectorProps) {
  const [search, setSearch] = useState('')
  const { t } = useAppTranslations()
  const viewportRef = useRef<HTMLDivElement>(null)

  const selectedIds = useMemo(
    () => new Set(selected.map(endpointId)),
    [selected],
  )

  const [optimisticIds, applyOptimistic] = useOptimistic(
    selectedIds,
    (current, toggledId: string) => {
      const next = new Set(current)
      if (next.has(toggledId)) next.delete(toggledId)
      else next.add(toggledId)
      return next
    },
  )

  const handleToggle = useCallback((endpoint: Endpoint) => {
    startTransition(() => {
      applyOptimistic(endpointId(endpoint))
      onToggle(endpoint)
    })
  }, [onToggle, applyOptimistic])

  const grouped = useMemo(() => {
    const map = new Map<string, Endpoint[]>()
    for (const ep of endpoints) {
      let list = map.get(ep.category)
      if (!list) {
        list = []
        map.set(ep.category, list)
      }
      list.push(ep)
    }
    return map
  }, [endpoints])

  const query = search.trim().toLowerCase()

  const filteredGroups = useMemo(() => {
    if (!query) return null
    const result: Array<{ category: string; items: Endpoint[] }> = []
    for (const [category, items] of grouped) {
      const filtered = items.filter(
        (ep) => optimisticIds.has(endpointId(ep)) || endpointId(ep).toLowerCase().includes(query),
      )
      if (filtered.length > 0) {
        result.push({ category, items: filtered })
      }
    }
    return result
  }, [grouped, query, optimisticIds])

  const displayGroups = filteredGroups
    ?? Array.from(grouped, ([category, items]) => ({ category, items }))

  const flatRows = useMemo(() => {
    const rows: FlatRow[] = []
    for (const { category, items } of displayGroups) {
      rows.push({ type: 'header', category })
      for (const ep of items) {
        rows.push({ type: 'endpoint', endpoint: ep })
      }
    }
    return rows
  }, [displayGroups])

  const virtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => viewportRef.current,
    estimateSize: (index) => flatRows[index].type === 'header' ? HEADER_HEIGHT : ROW_HEIGHT,
    overscan: 10,
  })

  const hasResults = displayGroups.length > 0

  return (
    <>
      <TextInput
        ref={inputRef}
        placeholder={t('endpoints.searchPlaceholder')}
        leftSection={<IconSearch size={16} />}
        rightSection={search ? <CloseButton size="sm" onClick={() => setSearch('')} /> : null}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        mb="xs"
      />
      <ScrollArea h={{ base: 240, sm: 400 }} viewportRef={viewportRef}>
        {hasResults ? (
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = flatRows[virtualRow.index]
              return (
                <div
                  key={virtualRow.key}
                  ref={virtualizer.measureElement}
                  data-index={virtualRow.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                    paddingBottom: row.type === 'endpoint' ? 4 : undefined,
                  }}
                >
                  {row.type === 'header' ? (
                    <Text size="xs" fw={700} c="dimmed" mt="sm" mb={4}>
                      {row.category}
                    </Text>
                  ) : (
                    <EndpointRow
                      endpoint={row.endpoint}
                      checked={optimisticIds.has(endpointId(row.endpoint))}
                      onToggle={handleToggle}
                    />
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <Text c="dimmed" ta="center" py="xl">
            {t('endpoints.noResults')}
          </Text>
        )}
      </ScrollArea>
    </>
  )
}
