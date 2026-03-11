import { useQuery } from '@tanstack/react-query';
import { EndpointsDataSchema } from '../schemas/endpoints';
import type { PermissionRef, Endpoint } from '../types';

export type EndpointsResult =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'ready'; version: string; allPermissions: Record<string, PermissionRef>; endpoints: Endpoint[] };

type EndpointsData = {
  version: string;
  allPermissions: Record<string, PermissionRef>;
  endpoints: Endpoint[];
};

async function fetchEndpoints(): Promise<EndpointsData> {
  const res = await fetch('/data/endpoints.json');
  if (!res.ok) throw new Error(`Failed to fetch endpoints.json: ${res.status}`);
  const raw = await res.json();
  const result = EndpointsDataSchema.parse(raw);
  return {
    version: result.version,
    allPermissions: result.permissions,
    endpoints: result.endpoints,
  };
}

export function useEndpoints(): EndpointsResult {
  const { data, isPending, error } = useQuery({
    queryKey: ['endpoints'],
    queryFn: fetchEndpoints,
  });

  if (isPending) return { status: 'loading' };
  if (error) return { status: 'error', error: error instanceof Error ? error : new Error(String(error)) };
  return { status: 'ready', ...data };
}
