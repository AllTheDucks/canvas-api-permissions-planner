import { memo, useCallback, useMemo, useOptimistic, useState, startTransition } from 'react'
import {
  ActionIcon,
  Checkbox,
  CloseButton,
  Combobox,
  Text,
  TextInput,
  Tooltip,
  useCombobox,
} from '@mantine/core'
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
      styles={{
        label: {
          fontFamily: 'var(--mantine-font-family-monospace)',
          fontSize: 'var(--mantine-font-size-xs)',
          whiteSpace: 'nowrap',
        },
      }}
      label={
        <>
          <strong>{endpoint.method}</strong> {endpoint.path.replace(/^\/api\/v1/, '')}
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

export function EndpointSelector({ endpoints, selected, onToggle, inputRef }: EndpointSelectorProps) {
  const [search, setSearch] = useState('')
  const { t } = useAppTranslations()

  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption()
    },
  })

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

  const displayGroups = useMemo(() => {
    const result: Array<{ category: string; items: Endpoint[] }> = []
    for (const [category, items] of grouped) {
      if (!query) {
        result.push({ category, items })
      } else {
        const filtered = items.filter(
          (ep) => endpointId(ep).toLowerCase().includes(query),
        )
        if (filtered.length > 0) {
          result.push({ category, items: filtered })
        }
      }
    }
    return result
  }, [grouped, query])

  const hasResults = displayGroups.length > 0

  const mergedInputRef = useCallback((node: HTMLInputElement | null) => {
    if (typeof inputRef === 'function') {
      inputRef(node)
    } else if (inputRef && typeof inputRef === 'object') {
      (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node
    }
  }, [inputRef])

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={() => {}}
      width="min(780px, 90vw)"
      position="bottom-start"
    >
      <Combobox.Target>
        <TextInput
          ref={mergedInputRef}
          placeholder={t('endpoints.searchPlaceholder')}
          leftSection={<IconSearch size={16} />}
          rightSection={search ? <CloseButton size="sm" onClick={() => setSearch('')} /> : null}
          value={search}
          onChange={(e) => {
            setSearch(e.currentTarget.value)
            if (!combobox.dropdownOpened) {
              combobox.openDropdown()
            }
          }}
          onFocus={() => combobox.openDropdown()}
          onClick={() => combobox.openDropdown()}
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <div
          style={{
            maxHeight: 'min(400px, 60vh)',
            overflowY: 'auto',
            padding: 'var(--mantine-spacing-xs)',
          }}
          onMouseDown={(e) => {
            e.preventDefault()
          }}
        >
          {hasResults ? (
            displayGroups.map(({ category, items }) => (
              <div key={category}>
                <Text size="xs" fw={700} c="dimmed" mt="sm" mb={4}>
                  {category}
                </Text>
                {items.map((ep) => (
                  <div key={endpointId(ep)} style={{ paddingBottom: 4 }}>
                    <EndpointRow
                      endpoint={ep}
                      checked={optimisticIds.has(endpointId(ep))}
                      onToggle={handleToggle}
                    />
                  </div>
                ))}
              </div>
            ))
          ) : (
            <Text c="dimmed" ta="center" py="xl">
              {t('endpoints.noResults')}
            </Text>
          )}
        </div>
      </Combobox.Dropdown>
    </Combobox>
  )
}
