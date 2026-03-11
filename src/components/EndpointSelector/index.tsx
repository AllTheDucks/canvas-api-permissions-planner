import { useMemo, useState } from 'react'
import {
  ActionIcon,
  Checkbox,
  CloseButton,
  ScrollArea,
  Text,
  TextInput,
  Tooltip,
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

export function EndpointSelector({ endpoints, selected, onToggle, inputRef }: EndpointSelectorProps) {
  const [search, setSearch] = useState('')
  const { t } = useAppTranslations()

  const selectedIds = useMemo(
    () => new Set(selected.map(endpointId)),
    [selected],
  )

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
    const result: Array<{ category: string; items: Endpoint[] }> = []
    for (const [category, items] of grouped) {
      const filtered = items.filter(
        (ep) => selectedIds.has(endpointId(ep)) || !query || endpointId(ep).toLowerCase().includes(query),
      )
      if (filtered.length > 0) {
        result.push({ category, items: filtered })
      }
    }
    return result
  }, [grouped, query, selectedIds])

  const hasResults = filteredGroups.length > 0

  function handleGroupChange(values: string[]) {
    const valueSet = new Set(values)
    const processed = new Set<string>()
    for (const ep of endpoints) {
      const id = endpointId(ep)
      if (processed.has(id)) continue
      processed.add(id)
      const wasSelected = selectedIds.has(id)
      const isNowSelected = valueSet.has(id)
      if (wasSelected !== isNowSelected) {
        if (!wasSelected && isNowSelected) {
          trackEvent('endpoint_selected', { category: ep.category })
        }
        onToggle(ep)
      }
    }
  }

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
      <ScrollArea h={{ base: 240, sm: 400 }}>
        {hasResults ? (
          <Checkbox.Group
            value={Array.from(selectedIds)}
            onChange={handleGroupChange}
          >
            {filteredGroups.map(({ category, items }) => (
              <div key={category}>
                <Text size="xs" fw={700} c="dimmed" mt="sm" mb={4}>
                  {category}
                </Text>
                {items.map((ep) => {
                  const id = endpointId(ep)
                  return (
                    <Checkbox
                      key={id}
                      value={id}
                      mb={4}
                      label={
                        <>
                          {id}
                          {ep.notes && (
                            <Tooltip label={ep.notes} multiline maw={300} withArrow>
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
                })}
              </div>
            ))}
          </Checkbox.Group>
        ) : (
          <Text c="dimmed" ta="center" py="xl">
            {t('endpoints.noResults')}
          </Text>
        )}
      </ScrollArea>
    </>
  )
}
