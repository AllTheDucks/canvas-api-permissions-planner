import { useQuery } from '@tanstack/react-query'
import { EndpointsDataSchema } from '../schemas/endpoints'
import { decodeSelection } from '../utils/urlState'
import { endpointId, type Endpoint } from '../types'

type ResolvedArchive = {
  resolved: Endpoint[]
  dropped: string[]
}

async function fetchAndResolve(
  version: string,
  selectionEncoded: string,
  currentEndpoints: Endpoint[],
  signal: AbortSignal,
): Promise<ResolvedArchive> {
  const res = await fetch(
    `${import.meta.env.BASE_URL}data/endpoints.${version}.json`,
    { signal },
  )
  if (!res.ok) throw new Error(`Archive not found: ${res.status}`)

  const raw = await res.json()
  const archived = EndpointsDataSchema.parse(raw)
  const indices = decodeSelection(selectionEncoded)
  const oldEndpoints = indices.map(i => archived.endpoints[i]).filter(Boolean)

  const currentMap = new Map(currentEndpoints.map(e => [endpointId(e), e]))
  const resolved: Endpoint[] = []
  const dropped: string[] = []

  for (const old of oldEndpoints) {
    const id = endpointId(old)
    const current = currentMap.get(id)
    if (current) {
      resolved.push(current)
    } else {
      dropped.push(id)
    }
  }

  return { resolved, dropped }
}

export function useArchivedEndpoints(
  archivedVersion: string | undefined,
  selectionEncoded: string | undefined,
  currentEndpoints: Endpoint[],
) {
  return useQuery({
    queryKey: ['archived-endpoints', archivedVersion],
    queryFn: ({ signal }) =>
      fetchAndResolve(archivedVersion!, selectionEncoded!, currentEndpoints, signal),
    enabled: !!archivedVersion && !!selectionEncoded,
  })
}
