import { memo, useCallback, useMemo, useOptimistic, useRef, useState, startTransition } from 'react'
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
import { useMergedRef } from '@mantine/hooks'
import { IconInfoCircle, IconSearch } from '@tabler/icons-react'
import { useAppTranslations } from '../../context/AppTranslationsContext'
import { trackEvent } from '../../utils/analytics'
import type { Endpoint } from '../../types'
import { StyledPath } from '../StyledPath'
import classes from './EndpointSelector.module.css'

type EndpointSelectorProps = {
  endpoints: Endpoint[]
  selected: Endpoint[]
  onToggle: (endpoint: Endpoint) => void
  onBulkToggle: (endpoints: Endpoint[], select: boolean) => void
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
  const { t } = useAppTranslations()
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
          <strong>{endpoint.method}</strong>{' '}<StyledPath path={endpoint.path} />
          {endpoint.notes && (
            <Tooltip label={t(endpoint.notes)} multiline maw={300} withArrow>
              <ActionIcon
                size="sm"
                variant="transparent"
                component="span"
                className={classes.infoIcon}
                role="img"
                aria-label={t('common.moreInfo')}
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

type CategoryHeaderProps = {
  category: string
  items: Endpoint[]
  selectedIds: Set<string>
  onBulkToggle: (endpoints: Endpoint[], select: boolean) => void
}

const CategoryHeader = memo(function CategoryHeader({ category, items, selectedIds, onBulkToggle }: CategoryHeaderProps) {
  const checkedCount = items.filter(ep => selectedIds.has(endpointId(ep))).length
  const allChecked = checkedCount === items.length
  const indeterminate = checkedCount > 0 && !allChecked

  const handleChange = useCallback(() => {
    onBulkToggle(items, !allChecked)
  }, [items, allChecked, onBulkToggle])

  return (
    <Checkbox
      checked={allChecked}
      indeterminate={indeterminate}
      onChange={handleChange}
      mt="sm"
      mb={4}
      styles={{
        label: {
          fontSize: 'var(--mantine-font-size-xs)',
          fontWeight: 700,
          color: 'var(--mantine-color-dimmed)',
        },
      }}
      label={category}
    />
  )
})

export function EndpointSelector({ endpoints, selected, onToggle, onBulkToggle, inputRef }: EndpointSelectorProps) {
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

  const internalInputRef = useRef<HTMLInputElement>(null)
  const mergedInputRef = useMergedRef(inputRef ?? null, internalInputRef)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const getCheckboxes = useCallback((): HTMLInputElement[] => {
    if (!dropdownRef.current) return []
    return Array.from(dropdownRef.current.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'))
  }, [])

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!combobox.dropdownOpened) {
        combobox.openDropdown()
        requestAnimationFrame(() => {
          const boxes = getCheckboxes()
          if (boxes.length > 0) boxes[0].focus()
        })
      } else {
        const boxes = getCheckboxes()
        if (boxes.length > 0) boxes[0].focus()
      }
    } else if (e.key === 'ArrowUp' && combobox.dropdownOpened) {
      e.preventDefault()
      const boxes = getCheckboxes()
      if (boxes.length > 0) boxes[boxes.length - 1].focus()
    }
  }, [combobox, getCheckboxes])

  const handleDropdownKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const target = e.target as HTMLInputElement
    if (target.type !== 'checkbox') return

    e.preventDefault()
    const boxes = getCheckboxes()
    const idx = boxes.indexOf(target)
    if (idx === -1) return

    if (e.key === 'ArrowDown') {
      if (idx < boxes.length - 1) {
        boxes[idx + 1].focus()
      } else {
        internalInputRef.current?.focus()
      }
    } else {
      if (idx > 0) {
        boxes[idx - 1].focus()
      } else {
        internalInputRef.current?.focus()
      }
    }
  }, [getCheckboxes])

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={() => {}}
      width="min(780px, 90vw)"
      position="bottom-start"
      withinPortal={false}
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
          onKeyDown={handleInputKeyDown}
          onFocus={() => combobox.openDropdown()}
          onClick={() => combobox.openDropdown()}
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <div
          ref={dropdownRef}
          className={classes.dropdownScroll}
          onKeyDown={handleDropdownKeyDown}
          onMouseDown={(e) => {
            e.preventDefault()
          }}
        >
          {hasResults ? (
            displayGroups.map(({ category, items }) => (
              <div key={category}>
                <CategoryHeader
                  category={category}
                  items={items}
                  selectedIds={optimisticIds}
                  onBulkToggle={onBulkToggle}
                />
                <div className={classes.categoryContent}>
                  {items.map((ep) => (
                    <div
                      key={endpointId(ep)}
                      className={classes.endpointRow}
                    >
                      <EndpointRow
                        endpoint={ep}
                        checked={optimisticIds.has(endpointId(ep))}
                        onToggle={handleToggle}
                      />
                    </div>
                  ))}
                </div>
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
