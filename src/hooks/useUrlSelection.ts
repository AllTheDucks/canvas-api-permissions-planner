import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { notifications } from '@mantine/notifications'
import { useAppTranslations } from '../context/AppTranslationsContext'
import { trackEvent } from '../utils/analytics'
import { encodeSelection, decodeSelection, readUrlParams } from '../utils/urlState'
import { useArchivedEndpoints } from './useArchivedEndpoints'
import type { Endpoint } from '../types'

export function useUrlSelection(endpointList: Endpoint[], dataVersion: string) {
  const { t } = useAppTranslations()
  const tRef = useRef(t)
  tRef.current = t
  const urlState = useMemo(() => readUrlParams(), [])

  const [selectedEndpoints, setSelectedEndpoints] = useState<Endpoint[]>(() => {
    if (!urlState || urlState.version !== dataVersion) return []
    const indices = decodeSelection(urlState.selectionEncoded)
    return indices.map(i => endpointList[i]).filter((e): e is Endpoint => e !== undefined)
  })

  // Fire shared_link_opened analytics event on mount
  useEffect(() => {
    if (!urlState) return
    const indices = decodeSelection(urlState.selectionEncoded)
    trackEvent('shared_link_opened', {
      endpoint_count: indices.length,
      version_match: urlState.version === dataVersion ? 'yes' : 'no',
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const versionMismatch = urlState && urlState.version !== dataVersion
  const { data: archiveResult, error: archiveError } = useArchivedEndpoints(
    versionMismatch ? urlState.version : undefined,
    versionMismatch ? urlState.selectionEncoded : undefined,
    endpointList,
  )

  useEffect(() => {
    if (!archiveResult) return
    setSelectedEndpoints(archiveResult.resolved)

    if (archiveResult.dropped.length > 0) {
      notifications.show({
        color: 'yellow',
        title: tRef.current('share.endpointsDropped'),
        message: tRef.current('share.endpointsDroppedMessage', {
          count: String(archiveResult.dropped.length),
          endpoints: archiveResult.dropped.join(', '),
        }),
        autoClose: false,
      })
    }
  }, [archiveResult])

  useEffect(() => {
    if (!archiveError) return
    notifications.show({
      color: 'red',
      title: tRef.current('share.staleLink'),
      message: tRef.current('share.staleLinkMessage'),
    })
  }, [archiveError])

  // Write URL on state change
  useEffect(() => {
    if (selectedEndpoints.length === 0) {
      window.history.replaceState(null, '', window.location.pathname)
      return
    }

    const params = new URLSearchParams()
    params.set('v', dataVersion)

    const indexMap = new Map(endpointList.map((e, i) => [`${e.method} ${e.path}`, i]))
    const selectedIndices = selectedEndpoints
      .map(e => indexMap.get(`${e.method} ${e.path}`))
      .filter((i): i is number => i !== undefined)

    params.set('s', encodeSelection(selectedIndices, endpointList.length))

    window.history.replaceState(null, '', `?${params.toString()}`)
  }, [selectedEndpoints, dataVersion, endpointList])

  const handleToggle = useCallback((endpoint: Endpoint) => {
    const id = `${endpoint.method} ${endpoint.path}`
    setSelectedEndpoints(prev =>
      prev.some(e => `${e.method} ${e.path}` === id)
        ? prev.filter(e => `${e.method} ${e.path}` !== id)
        : [...prev, endpoint]
    )
  }, [])

  const handleAddMany = useCallback((newEndpoints: Endpoint[]) => {
    setSelectedEndpoints(prev => {
      const existing = new Set(prev.map(e => `${e.method} ${e.path}`))
      const toAdd = newEndpoints.filter(e => !existing.has(`${e.method} ${e.path}`))
      return toAdd.length > 0 ? [...prev, ...toAdd] : prev
    })
  }, [])

  const handleBulkToggle = useCallback((endpoints: Endpoint[], select: boolean) => {
    const ids = new Set(endpoints.map(e => `${e.method} ${e.path}`))
    setSelectedEndpoints(prev => {
      if (select) {
        const existing = new Set(prev.map(e => `${e.method} ${e.path}`))
        const toAdd = endpoints.filter(e => !existing.has(`${e.method} ${e.path}`))
        return toAdd.length > 0 ? [...prev, ...toAdd] : prev
      }
      return prev.filter(e => !ids.has(`${e.method} ${e.path}`))
    })
  }, [])

  return { selectedEndpoints, handleToggle, handleAddMany, handleBulkToggle }
}
