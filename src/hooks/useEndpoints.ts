import { useState, useEffect } from 'react';
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

let cached: EndpointsData | null = null;

export function useEndpoints(): EndpointsResult {
  const [state, setState] = useState<EndpointsResult>(
    cached ? { status: 'ready', ...cached } : { status: 'loading' },
  );

  useEffect(() => {
    if (cached) return;

    fetch('/data/endpoints.json')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch endpoints.json: ${res.status}`);
        return res.json();
      })
      .then((raw) => {
        const result = EndpointsDataSchema.parse(raw);
        cached = {
          version: result.version,
          allPermissions: result.permissions,
          endpoints: result.endpoints,
        };
        setState({ status: 'ready', ...cached });
      })
      .catch((err) => setState({ status: 'error', error: err }));
  }, []);

  return state;
}
