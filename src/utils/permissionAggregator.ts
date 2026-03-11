import type {
  Endpoint,
  PermissionRef,
  AggregatedPermission,
  SingleAggregated,
  AnyOfAggregated,
} from '../types';

function endpointKey(e: Endpoint): string {
  return `${e.method} ${e.path}`;
}

function canonicalKey(symbols: string[]): string {
  return [...symbols].sort().join('|');
}

function isSubset(sub: string[], sup: string[]): boolean {
  const supSet = new Set(sup);
  return sub.every((s) => supSet.has(s));
}

function addUnique(arr: string[], value: string): void {
  if (!arr.includes(value)) arr.push(value);
}

type Collected = {
  requiredBy: string[];
  notes: string[];
};

type CollectedGroup = Collected & {
  options: string[];
};

function upsert(map: Map<string, Collected>, key: string, epKey: string, note?: string): void {
  const existing = map.get(key);
  if (existing) {
    addUnique(existing.requiredBy, epKey);
    if (note) addUnique(existing.notes, note);
  } else {
    map.set(key, { requiredBy: [epKey], notes: note ? [note] : [] });
  }
}

function upsertGroup(
  map: Map<string, CollectedGroup>,
  key: string,
  anyOf: string[],
  epKey: string,
  note?: string,
): void {
  const existing = map.get(key);
  if (existing) {
    addUnique(existing.requiredBy, epKey);
    if (note) addUnique(existing.notes, note);
  } else {
    map.set(key, { options: [...anyOf].sort(), requiredBy: [epKey], notes: note ? [note] : [] });
  }
}

function eliminateSubsumed(groups: Map<string, CollectedGroup>): Map<string, CollectedGroup> {
  const entries = [...groups.entries()].sort(
    (a, b) => a[1].options.length - b[1].options.length,
  );

  const kept = new Map<string, CollectedGroup>();

  for (const [key, group] of entries) {
    let subsumed = false;
    for (const [keptKey, keptGroup] of kept) {
      if (keptKey !== key && isSubset(keptGroup.options, group.options)) {
        keptGroup.requiredBy.push(...group.requiredBy);
        for (const n of group.notes) {
          if (!keptGroup.notes.includes(n)) keptGroup.notes.push(n);
        }
        subsumed = true;
        break;
      }
    }
    if (!subsumed) {
      kept.set(key, group);
    }
  }

  return kept;
}

export function aggregatePermissions(
  selectedEndpoints: Endpoint[],
  allPermissions: Record<string, PermissionRef>,
  localeLabels: Record<string, string>,
): AggregatedPermission[] {
  // First pass: identify all definitively required symbols (needed before classifying anything else)
  const requiredSymbols = new Set<string>();
  for (const ep of selectedEndpoints) {
    for (const perm of ep.permissions) {
      if ('symbol' in perm && perm.required !== false) {
        requiredSymbols.add(perm.symbol);
      }
    }
  }

  // Second pass: classify every permission entry into one of four collections
  const requiredSingleMap = new Map<string, Collected>();
  const optionalSingleMap = new Map<string, Collected>();
  const requiredGroupMap = new Map<string, CollectedGroup>();
  const optionalGroupMap = new Map<string, CollectedGroup>();

  for (const ep of selectedEndpoints) {
    const epKey = endpointKey(ep);
    for (const perm of ep.permissions) {
      if ('symbol' in perm) {
        if (perm.required !== false) {
          upsert(requiredSingleMap, perm.symbol, epKey);
        } else if (!requiredSymbols.has(perm.symbol)) {
          upsert(optionalSingleMap, perm.symbol, epKey, perm.note);
        }
      } else {
        if (perm.anyOf.some((s) => requiredSymbols.has(s))) continue;
        const key = canonicalKey(perm.anyOf);
        if (perm.required !== false) {
          upsertGroup(requiredGroupMap, key, perm.anyOf, epKey);
        } else {
          upsertGroup(optionalGroupMap, key, perm.anyOf, epKey, perm.note);
        }
      }
    }
  }

  // Drop optional OR groups that duplicate a required OR group
  for (const key of requiredGroupMap.keys()) {
    optionalGroupMap.delete(key);
  }

  // Subsumption elimination — drop superset groups (any resolution of the subset also resolves them)
  const keptRequiredGroups = eliminateSubsumed(requiredGroupMap);
  const keptOptionalGroups = eliminateSubsumed(optionalGroupMap);

  // Cross-category: drop optional groups subsumed by required groups
  for (const [optKey, optGroup] of keptOptionalGroups) {
    for (const [, reqGroup] of keptRequiredGroups) {
      if (isSubset(reqGroup.options, optGroup.options)) {
        keptOptionalGroups.delete(optKey);
        break;
      }
    }
  }

  // Result assembly
  function getLabel(symbol: string): string {
    return localeLabels[symbol] ?? allPermissions[symbol]?.label ?? symbol;
  }

  function buildSingles(map: Map<string, Collected>, kind: 'required' | 'optional'): SingleAggregated[] {
    const result: SingleAggregated[] = [];
    for (const [symbol, data] of map) {
      result.push({
        kind: 'single',
        symbol,
        label: getLabel(symbol),
        requiredBy: data.requiredBy,
        optional: kind === 'optional',
        notes: data.notes,
      });
    }
    result.sort((a, b) => a.label.localeCompare(b.label));
    return result;
  }

  function buildGroups(map: Map<string, CollectedGroup>, kind: 'required' | 'optional'): AnyOfAggregated[] {
    const result: AnyOfAggregated[] = [];
    for (const [, group] of map) {
      result.push({
        kind: 'anyOf',
        options: group.options.map((symbol) => ({
          symbol,
          label: getLabel(symbol),
        })),
        requiredBy: group.requiredBy,
        optional: kind === 'optional',
        notes: group.notes,
      });
    }
    return result;
  }

  return [
    ...buildSingles(requiredSingleMap, 'required'),
    ...buildGroups(keptRequiredGroups, 'required'),
    ...buildSingles(optionalSingleMap, 'optional'),
    ...buildGroups(keptOptionalGroups, 'optional'),
  ];
}
