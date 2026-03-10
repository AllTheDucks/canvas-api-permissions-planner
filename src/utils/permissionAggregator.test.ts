import { describe, it, expect } from 'vitest';
import { aggregatePermissions } from './permissionAggregator';
import type { Endpoint, PermissionRef, AggregatedPermission, SingleAggregated, AnyOfAggregated } from '../types';

const perms: Record<string, PermissionRef> = {
  manage_grades: { label: 'Grades - edit', scope: new Set(['Course']) },
  read_course_content: { label: 'Course Content - view', scope: new Set(['Course']) },
  manage_sis: { label: 'SIS Data - manage', scope: new Set(['Account']) },
  read_sis: { label: 'SIS Data - read', scope: new Set(['Account']) },
  manage_assignments_add: { label: 'Assignments - add', scope: new Set(['Course']) },
  manage_assignments_edit: { label: 'Assignments - edit', scope: new Set(['Course']) },
  manage_assignments_delete: { label: 'Assignments - delete', scope: new Set(['Course']) },
  view_all_grades: { label: 'Grades - view all', scope: new Set(['Course']) },
  manage_wiki_update: { label: 'Pages - update', scope: new Set(['Course']) },
  read_email_addresses: { label: 'Email addresses - view', scope: new Set(['Account']) },
  view_user_logins: { label: 'Users - view login IDs', scope: new Set(['Account']) },
  manage_course_content_add: { label: 'Course Content - add', scope: new Set(['Course']) },
  manage_course_content_edit: { label: 'Course Content - edit', scope: new Set(['Course']) },
  manage_course_content_delete: { label: 'Course Content - delete', scope: new Set(['Course']) },
  manage_students: { label: 'Students - manage', scope: new Set(['Course', 'Account']) },
};

function makeEndpoint(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  permissions: Endpoint['permissions'],
): Endpoint {
  return { method, path, category: 'Test', permissions };
}

function singles(result: AggregatedPermission[]): SingleAggregated[] {
  return result.filter((r): r is SingleAggregated => r.kind === 'single');
}

function anyOfs(result: AggregatedPermission[]): AnyOfAggregated[] {
  return result.filter((r): r is AnyOfAggregated => r.kind === 'anyOf');
}

describe('aggregatePermissions', () => {
  it('returns empty array when no endpoints selected', () => {
    expect(aggregatePermissions([], perms, {})).toEqual([]);
  });

  describe('required singles', () => {
    it('collects a single required permission', () => {
      const eps = [makeEndpoint('GET', '/api/v1/courses/:id/grades', [
        { symbol: 'manage_grades' },
      ])];
      const result = aggregatePermissions(eps, perms, {});
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        kind: 'single',
        symbol: 'manage_grades',
        label: 'Grades - edit',
        optional: false,
        notes: [],
      });
      expect(result[0].scope).toEqual(new Set(['Course']));
    });

    it('deduplicates the same symbol from multiple endpoints', () => {
      const eps = [
        makeEndpoint('GET', '/api/v1/courses/:id/grades', [{ symbol: 'manage_grades' }]),
        makeEndpoint('POST', '/api/v1/courses/:id/grades', [{ symbol: 'manage_grades' }]),
      ];
      const result = aggregatePermissions(eps, perms, {});
      const mgSingles = singles(result).filter((s) => s.symbol === 'manage_grades');
      expect(mgSingles).toHaveLength(1);
      expect(mgSingles[0].requiredBy).toContain('GET /api/v1/courses/:id/grades');
      expect(mgSingles[0].requiredBy).toContain('POST /api/v1/courses/:id/grades');
    });

    it('collects multiple different permissions', () => {
      const eps = [makeEndpoint('GET', '/api/v1/courses/:id/content', [
        { symbol: 'manage_grades' },
        { symbol: 'read_course_content' },
      ])];
      const result = aggregatePermissions(eps, perms, {});
      const symbols = singles(result).map((s) => s.symbol);
      expect(symbols).toContain('manage_grades');
      expect(symbols).toContain('read_course_content');
    });

    it('sorts by scope: Course-only first, then Account-only, then both', () => {
      const eps = [makeEndpoint('GET', '/api/v1/test', [
        { symbol: 'manage_students' },
        { symbol: 'manage_sis' },
        { symbol: 'manage_grades' },
      ])];
      const result = aggregatePermissions(eps, perms, {});
      const sorted = singles(result);
      expect(sorted[0].symbol).toBe('manage_grades'); // Course
      expect(sorted[1].symbol).toBe('manage_sis'); // Account
      expect(sorted[2].symbol).toBe('manage_students'); // Course + Account
    });

    it('sorts alphabetically within same scope', () => {
      const eps = [makeEndpoint('GET', '/api/v1/test', [
        { symbol: 'read_course_content' },
        { symbol: 'manage_grades' },
      ])];
      const result = aggregatePermissions(eps, perms, {});
      const sorted = singles(result).filter((s) => !s.optional);
      expect(sorted[0].label).toBe('Course Content - view');
      expect(sorted[1].label).toBe('Grades - edit');
    });
  });

  describe('optional singles', () => {
    it('collects optional permissions with notes', () => {
      const eps = [makeEndpoint('GET', '/api/v1/users/:id', [
        { symbol: 'manage_grades' },
        { symbol: 'read_email_addresses', required: false, note: 'Required to receive email addresses in response' },
      ])];
      const result = aggregatePermissions(eps, perms, {});
      const opt = singles(result).filter((s) => s.optional);
      expect(opt).toHaveLength(1);
      expect(opt[0].symbol).toBe('read_email_addresses');
      expect(opt[0].optional).toBe(true);
      expect(opt[0].notes).toEqual(['Required to receive email addresses in response']);
    });

    it('suppresses optional when already required', () => {
      const eps = [
        makeEndpoint('GET', '/api/v1/test', [{ symbol: 'manage_sis' }]),
        makeEndpoint('GET', '/api/v1/users/:id', [
          { symbol: 'manage_grades' },
          { symbol: 'manage_sis', required: false, note: 'Required to write SIS ID fields' },
        ]),
      ];
      const result = aggregatePermissions(eps, perms, {});
      const optSym = singles(result).filter((s) => s.optional).map((s) => s.symbol);
      expect(optSym).not.toContain('manage_sis');
      const reqSym = singles(result).filter((s) => !s.optional).map((s) => s.symbol);
      expect(reqSym).toContain('manage_sis');
    });

    it('collects and deduplicates notes from multiple endpoints', () => {
      const eps = [
        makeEndpoint('GET', '/api/v1/courses/:id/users', [
          { symbol: 'read_course_content' },
          { symbol: 'view_user_logins', required: false, note: 'Required to receive login_id' },
        ]),
        makeEndpoint('GET', '/api/v1/sections/:id/users', [
          { symbol: 'read_course_content' },
          { symbol: 'view_user_logins', required: false, note: 'Required to receive login_id' },
        ]),
      ];
      const result = aggregatePermissions(eps, perms, {});
      const opt = singles(result).filter((s) => s.optional && s.symbol === 'view_user_logins');
      expect(opt).toHaveLength(1);
      expect(opt[0].notes).toEqual(['Required to receive login_id']);
      expect(opt[0].requiredBy).toHaveLength(2);
    });
  });

  describe('required OR groups', () => {
    it('collects a required anyOf group', () => {
      const eps = [makeEndpoint('GET', '/api/v1/courses/:id/assignments', [
        { anyOf: ['manage_assignments_add', 'manage_assignments_edit', 'manage_assignments_delete'] },
      ])];
      const result = aggregatePermissions(eps, perms, {});
      const groups = anyOfs(result).filter((g) => !g.optional);
      expect(groups).toHaveLength(1);
      expect(groups[0].options.map((o) => o.symbol)).toEqual([
        'manage_assignments_add',
        'manage_assignments_delete',
        'manage_assignments_edit',
      ]);
    });

    it('skips anyOf group if any member is already a required single', () => {
      const eps = [makeEndpoint('GET', '/api/v1/test', [
        { symbol: 'manage_assignments_add' },
        { anyOf: ['manage_assignments_add', 'manage_assignments_edit'] },
      ])];
      const result = aggregatePermissions(eps, perms, {});
      expect(anyOfs(result)).toHaveLength(0);
      expect(singles(result).filter((s) => !s.optional)).toHaveLength(1);
    });

    it('deduplicates identical OR groups from multiple endpoints', () => {
      const eps = [
        makeEndpoint('GET', '/api/v1/courses/:id/assignments', [
          { anyOf: ['manage_assignments_add', 'manage_assignments_edit'] },
        ]),
        makeEndpoint('POST', '/api/v1/courses/:id/assignments', [
          { anyOf: ['manage_assignments_edit', 'manage_assignments_add'] },
        ]),
      ];
      const result = aggregatePermissions(eps, perms, {});
      const groups = anyOfs(result).filter((g) => !g.optional);
      expect(groups).toHaveLength(1);
      expect(groups[0].requiredBy).toHaveLength(2);
    });
  });

  describe('optional OR groups', () => {
    it('collects optional OR groups with notes', () => {
      const eps = [makeEndpoint('GET', '/api/v1/courses/:id/enrollments', [
        { symbol: 'read_course_content' },
        { anyOf: ['read_sis', 'manage_sis'], required: false, note: 'Required to receive SIS ID fields in response' },
      ])];
      const result = aggregatePermissions(eps, perms, {});
      const groups = anyOfs(result).filter((g) => g.optional);
      expect(groups).toHaveLength(1);
      expect(groups[0].notes).toEqual(['Required to receive SIS ID fields in response']);
    });

    it('suppresses optional OR group when any member is a required single', () => {
      const eps = [
        makeEndpoint('GET', '/api/v1/test', [{ symbol: 'read_sis' }]),
        makeEndpoint('GET', '/api/v1/courses/:id/enrollments', [
          { symbol: 'read_course_content' },
          { anyOf: ['read_sis', 'manage_sis'], required: false, note: 'SIS fields' },
        ]),
      ];
      const result = aggregatePermissions(eps, perms, {});
      expect(anyOfs(result).filter((g) => g.optional)).toHaveLength(0);
    });

    it('suppresses optional OR group that matches a required OR group', () => {
      const eps = [
        makeEndpoint('GET', '/api/v1/test', [
          { anyOf: ['read_sis', 'manage_sis'] },
        ]),
        makeEndpoint('GET', '/api/v1/courses/:id/enrollments', [
          { symbol: 'read_course_content' },
          { anyOf: ['read_sis', 'manage_sis'], required: false, note: 'SIS fields' },
        ]),
      ];
      const result = aggregatePermissions(eps, perms, {});
      const optGroups = anyOfs(result).filter((g) => g.optional);
      expect(optGroups).toHaveLength(0);
      const reqGroups = anyOfs(result).filter((g) => !g.optional);
      expect(reqGroups).toHaveLength(1);
    });
  });

  describe('subsumption elimination', () => {
    it('drops a superset OR group when a subset exists (required)', () => {
      const eps = [
        makeEndpoint('GET', '/api/v1/a', [
          { anyOf: ['manage_assignments_add', 'manage_assignments_edit'] },
        ]),
        makeEndpoint('GET', '/api/v1/b', [
          { anyOf: ['manage_assignments_add', 'manage_assignments_edit', 'manage_assignments_delete'] },
        ]),
      ];
      const result = aggregatePermissions(eps, perms, {});
      const groups = anyOfs(result).filter((g) => !g.optional);
      expect(groups).toHaveLength(1);
      expect(groups[0].options).toHaveLength(2);
      expect(groups[0].requiredBy).toContain('GET /api/v1/a');
      expect(groups[0].requiredBy).toContain('GET /api/v1/b');
    });

    it('drops a superset OR group when a subset exists (optional)', () => {
      const eps = [
        makeEndpoint('GET', '/api/v1/a', [
          { symbol: 'read_course_content' },
          { anyOf: ['read_sis', 'manage_sis'], required: false, note: 'SIS note 1' },
        ]),
        makeEndpoint('GET', '/api/v1/b', [
          { symbol: 'read_course_content' },
          { anyOf: ['read_sis', 'manage_sis', 'manage_students'], required: false, note: 'SIS note 2' },
        ]),
      ];
      const result = aggregatePermissions(eps, perms, {});
      const optGroups = anyOfs(result).filter((g) => g.optional);
      expect(optGroups).toHaveLength(1);
      expect(optGroups[0].options).toHaveLength(2);
      expect(optGroups[0].notes).toContain('SIS note 1');
      expect(optGroups[0].notes).toContain('SIS note 2');
    });

    it('keeps partially overlapping groups (no subsumption)', () => {
      const eps = [
        makeEndpoint('GET', '/api/v1/a', [
          { anyOf: ['manage_assignments_add', 'manage_assignments_edit'] },
        ]),
        makeEndpoint('GET', '/api/v1/b', [
          { anyOf: ['manage_assignments_edit', 'manage_assignments_delete'] },
        ]),
      ];
      const result = aggregatePermissions(eps, perms, {});
      const groups = anyOfs(result).filter((g) => !g.optional);
      expect(groups).toHaveLength(2);
    });

    it('cross-category: drops optional OR group subsumed by required OR group', () => {
      const eps = [
        makeEndpoint('GET', '/api/v1/a', [
          { anyOf: ['manage_assignments_add', 'manage_assignments_edit'] },
        ]),
        makeEndpoint('GET', '/api/v1/b', [
          { symbol: 'read_course_content' },
          { anyOf: ['manage_assignments_add', 'manage_assignments_edit', 'manage_assignments_delete'], required: false, note: 'unpublished' },
        ]),
      ];
      const result = aggregatePermissions(eps, perms, {});
      const reqGroups = anyOfs(result).filter((g) => !g.optional);
      expect(reqGroups).toHaveLength(1);
      const optGroups = anyOfs(result).filter((g) => g.optional);
      expect(optGroups).toHaveLength(0);
    });
  });

  describe('order independence', () => {
    it('produces the same result regardless of endpoint order', () => {
      const ep1 = makeEndpoint('GET', '/api/v1/courses/:id/grades', [
        { symbol: 'manage_grades' },
        { anyOf: ['read_sis', 'manage_sis'], required: false, note: 'SIS fields' },
      ]);
      const ep2 = makeEndpoint('GET', '/api/v1/courses/:id/content', [
        { symbol: 'read_course_content' },
        { anyOf: ['manage_assignments_add', 'manage_assignments_edit'] },
      ]);
      const ep3 = makeEndpoint('POST', '/api/v1/courses/:id/assignments', [
        { symbol: 'manage_assignments_add' },
      ]);

      const resultA = aggregatePermissions([ep1, ep2, ep3], perms, {});
      const resultB = aggregatePermissions([ep3, ep1, ep2], perms, {});
      const resultC = aggregatePermissions([ep2, ep3, ep1], perms, {});

      const normalize = (r: AggregatedPermission[]) =>
        JSON.stringify(r, (_, v) => (v instanceof Set ? [...v].sort() : v));

      expect(normalize(resultA)).toBe(normalize(resultB));
      expect(normalize(resultA)).toBe(normalize(resultC));
    });
  });

  describe('locale labels', () => {
    it('uses locale labels when available', () => {
      const eps = [makeEndpoint('GET', '/api/v1/test', [
        { symbol: 'manage_grades' },
      ])];
      const labels = { manage_grades: 'Notas - editar' };
      const result = aggregatePermissions(eps, perms, labels);
      expect(singles(result)[0].label).toBe('Notas - editar');
    });

    it('falls back to allPermissions label when locale label missing', () => {
      const eps = [makeEndpoint('GET', '/api/v1/test', [
        { symbol: 'manage_grades' },
      ])];
      const result = aggregatePermissions(eps, perms, {});
      expect(singles(result)[0].label).toBe('Grades - edit');
    });

    it('falls back to symbol when permission not in allPermissions', () => {
      const eps = [makeEndpoint('GET', '/api/v1/test', [
        { symbol: 'unknown_perm' },
      ])];
      const result = aggregatePermissions(eps, perms, {});
      expect(singles(result)[0].label).toBe('unknown_perm');
    });
  });

  describe('result structure', () => {
    it('outputs required singles, then required OR groups, then optional singles, then optional OR groups', () => {
      const eps = [makeEndpoint('GET', '/api/v1/test', [
        { symbol: 'manage_grades' },
        { anyOf: ['manage_assignments_add', 'manage_assignments_edit'] },
        { symbol: 'read_email_addresses', required: false, note: 'emails' },
        { anyOf: ['read_sis', 'manage_sis'], required: false, note: 'SIS fields' },
      ])];
      const result = aggregatePermissions(eps, perms, {});

      expect(result).toHaveLength(4);
      expect(result[0]).toMatchObject({ kind: 'single', optional: false });
      expect(result[1]).toMatchObject({ kind: 'anyOf', optional: false });
      expect(result[2]).toMatchObject({ kind: 'single', optional: true });
      expect(result[3]).toMatchObject({ kind: 'anyOf', optional: true });
    });

    it('omits empty categories from result', () => {
      const eps = [makeEndpoint('GET', '/api/v1/test', [
        { symbol: 'manage_grades' },
      ])];
      const result = aggregatePermissions(eps, perms, {});
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ kind: 'single', optional: false });
    });
  });
});
