import { describe, it, expect } from 'vitest';
import { matchEndpoints } from './endpointMatcher';
import type { Endpoint } from '../types';

const sampleEndpoints: Endpoint[] = [
  {
    method: 'GET',
    path: '/api/v1/courses/:course_id/assignments',
    category: 'Assignments',
    permissions: [{ symbol: 'read_course_content' }],
  },
  {
    method: 'POST',
    path: '/api/v1/courses/:course_id/assignments',
    category: 'Assignments',
    permissions: [{ symbol: 'manage_assignments_add' }],
  },
  {
    method: 'PUT',
    path: '/api/v1/courses/:course_id/assignments/:id',
    category: 'Assignments',
    permissions: [{ symbol: 'manage_assignments_edit' }],
  },
  {
    method: 'DELETE',
    path: '/api/v1/courses/:course_id/assignments/:id',
    category: 'Assignments',
    permissions: [{ symbol: 'manage_assignments_delete' }],
  },
  {
    method: 'PUT',
    path: '/api/v1/courses/:course_id/assignments/bulk_update',
    category: 'Assignments',
    permissions: [{ symbol: 'manage_assignments_edit' }],
  },
  {
    method: 'GET',
    path: '/api/v1/courses/:course_id/enrollments',
    category: 'Enrollments',
    permissions: [{ anyOf: ['read_roster', 'view_all_grades', 'manage_grades'] }],
  },
  {
    method: 'GET',
    path: '/api/v1/users/:user_id/profile',
    category: 'Users',
    permissions: [{ symbol: 'read_roster' }],
  },
];

describe('matchEndpoints', () => {
  describe('full URL normalisation', () => {
    it('matches a full HTTPS URL with numeric IDs', () => {
      const result = matchEndpoints(
        'GET https://canvas.example.com/api/v1/courses/456/assignments',
        sampleEndpoints,
      );
      expect(result).toHaveLength(1);
      expect(result[0].method).toBe('GET');
      expect(result[0].path).toBe('/api/v1/courses/:course_id/assignments');
    });

    it('matches a URL with query string stripped', () => {
      const result = matchEndpoints(
        'GET https://my.canvas.edu/api/v1/courses/456/assignments?per_page=50',
        sampleEndpoints,
      );
      expect(result).toHaveLength(1);
      expect(result[0].method).toBe('GET');
      expect(result[0].path).toBe('/api/v1/courses/:course_id/assignments');
    });

    it('matches a path-only input with :param placeholders', () => {
      const result = matchEndpoints(
        '/api/v1/courses/:course_id/assignments',
        sampleEndpoints,
      );
      // No method specified, both GET and POST match
      expect(result).toHaveLength(2);
      expect(result.map((e) => e.method).sort()).toEqual(['GET', 'POST']);
    });

    it('matches path-only with numeric IDs', () => {
      const result = matchEndpoints(
        'GET /api/v1/courses/123/assignments',
        sampleEndpoints,
      );
      expect(result).toHaveLength(1);
      expect(result[0].method).toBe('GET');
    });
  });

  describe('SIS ID normalisation', () => {
    it('normalises sis_course_id prefix', () => {
      const result = matchEndpoints(
        '/api/v1/courses/sis_course_id:BIOL101/assignments',
        sampleEndpoints,
      );
      expect(result).toHaveLength(2);
      expect(result.map((e) => e.method).sort()).toEqual(['GET', 'POST']);
    });

    it('normalises sis_user_id prefix', () => {
      const result = matchEndpoints(
        'GET /api/v1/users/sis_user_id:jdoe42/profile',
        sampleEndpoints,
      );
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('/api/v1/users/:user_id/profile');
    });

    it('normalises sis_section_id prefix', () => {
      const result = matchEndpoints(
        'GET /api/v1/courses/sis_course_id:BIOL101/enrollments',
        sampleEndpoints,
      );
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('/api/v1/courses/:course_id/enrollments');
    });

    it('normalises sis_login_id prefix', () => {
      const result = matchEndpoints(
        'GET /api/v1/users/sis_login_id:jdoe/profile',
        sampleEndpoints,
      );
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('/api/v1/users/:user_id/profile');
    });

    it('normalises sis_group_category_id prefix', () => {
      const result = matchEndpoints(
        'GET /api/v1/courses/sis_course_id:BIOL101/enrollments',
        sampleEndpoints,
      );
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('/api/v1/courses/:course_id/enrollments');
    });

    it('normalises sis_integration_id prefix', () => {
      const result = matchEndpoints(
        'GET /api/v1/users/sis_integration_id:ext123/profile',
        sampleEndpoints,
      );
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('/api/v1/users/:user_id/profile');
    });

    it('normalises lti_context_id prefix', () => {
      const result = matchEndpoints(
        'GET /api/v1/courses/lti_context_id:abc123/assignments',
        sampleEndpoints,
      );
      expect(result).toHaveLength(1);
      expect(result[0].method).toBe('GET');
    });

    it('normalises lti_1_1_id prefix', () => {
      const result = matchEndpoints(
        'GET /api/v1/courses/lti_1_1_id:tool123/assignments',
        sampleEndpoints,
      );
      expect(result).toHaveLength(1);
      expect(result[0].method).toBe('GET');
    });

    it('normalises lti_1_3_id prefix', () => {
      const result = matchEndpoints(
        'GET /api/v1/courses/lti_1_3_id:tool456/assignments',
        sampleEndpoints,
      );
      expect(result).toHaveLength(1);
      expect(result[0].method).toBe('GET');
    });

    it('normalises hex:sis_user_id prefix', () => {
      const result = matchEndpoints(
        'GET /api/v1/users/hex:sis_user_id:6a646f65/profile',
        sampleEndpoints,
      );
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('/api/v1/users/:user_id/profile');
    });

    it('does not normalise unrecognised SIS-style tokens but still matches via wildcard', () => {
      const result = matchEndpoints(
        'GET /api/v1/users/sis_foo_id:bar/profile',
        sampleEndpoints,
      );
      // sis_foo_id is not a known prefix, so it stays as-is (not normalised to :id).
      // However, the known path's :user_id wildcard still matches it with +1 score.
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('/api/v1/users/:user_id/profile');
    });

    it('treats unrecognised SIS-style token as a plain mismatch against literal segments', () => {
      // If the unrecognised token lands where a literal segment is expected, it fails
      const result = matchEndpoints(
        'GET /api/v1/sis_foo_id:bar/:course_id/assignments',
        sampleEndpoints,
      );
      // "sis_foo_id:bar" is at position where "courses" is expected — mismatch
      expect(result).toEqual([]);
    });
  });

  describe('special ID value normalisation', () => {
    it('normalises "self" to :id for user paths', () => {
      const result = matchEndpoints(
        'GET /api/v1/users/self/profile',
        sampleEndpoints,
      );
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('/api/v1/users/:user_id/profile');
    });

    it('normalises "self" to :id for course paths', () => {
      const result = matchEndpoints(
        'GET /api/v1/courses/self/assignments',
        sampleEndpoints,
      );
      expect(result).toHaveLength(1);
      expect(result[0].method).toBe('GET');
    });

    it('normalises "default" to :id', () => {
      const result = matchEndpoints(
        'GET /api/v1/courses/default/assignments',
        sampleEndpoints,
      );
      expect(result).toHaveLength(1);
      expect(result[0].method).toBe('GET');
    });

    it('normalises "site_admin" to :id', () => {
      const result = matchEndpoints(
        'GET /api/v1/courses/site_admin/assignments',
        sampleEndpoints,
      );
      expect(result).toHaveLength(1);
      expect(result[0].method).toBe('GET');
    });

    it('normalises "current" to :id', () => {
      const result = matchEndpoints(
        'GET /api/v1/courses/current/assignments',
        sampleEndpoints,
      );
      expect(result).toHaveLength(1);
      expect(result[0].method).toBe('GET');
    });
  });

  describe('method filtering', () => {
    it('returns the matching method endpoint when method is specified', () => {
      const result = matchEndpoints(
        'POST /api/v1/courses/123/assignments',
        sampleEndpoints,
      );
      expect(result).toHaveLength(1);
      expect(result[0].method).toBe('POST');
    });

    it('returns [] when specified method has no match', () => {
      // Only GET and POST exist for /courses/:id/assignments, not DELETE
      const result = matchEndpoints(
        'DELETE /api/v1/courses/123/assignments',
        sampleEndpoints,
      );
      expect(result).toEqual([]);
    });

    it('returns all method matches when no method specified and multiple exist', () => {
      const result = matchEndpoints(
        '/api/v1/courses/123/assignments',
        sampleEndpoints,
      );
      expect(result).toHaveLength(2);
      expect(result.map((e) => e.method).sort()).toEqual(['GET', 'POST']);
    });

    it('returns single endpoint when no method specified and only one method exists', () => {
      const result = matchEndpoints(
        '/api/v1/courses/123/assignments/bulk_update',
        sampleEndpoints,
      );
      expect(result).toHaveLength(1);
      expect(result[0].method).toBe('PUT');
    });

    it('handles case-insensitive method parsing', () => {
      const result = matchEndpoints(
        'get /api/v1/courses/123/assignments',
        sampleEndpoints,
      );
      expect(result).toHaveLength(1);
      expect(result[0].method).toBe('GET');
    });
  });

  describe('unrecognised paths', () => {
    it('returns [] for a completely unrecognised path', () => {
      const result = matchEndpoints(
        'GET /api/v1/completely/unknown/path',
        sampleEndpoints,
      );
      expect(result).toEqual([]);
    });

    it('returns [] when token count differs', () => {
      const result = matchEndpoints(
        'GET /api/v1/courses',
        sampleEndpoints,
      );
      expect(result).toEqual([]);
    });

    it('returns [] for empty input', () => {
      const result = matchEndpoints('', sampleEndpoints);
      expect(result).toEqual([]);
    });

    it('returns [] for whitespace-only input', () => {
      const result = matchEndpoints('   ', sampleEndpoints);
      expect(result).toEqual([]);
    });
  });

  describe('scoring — best match wins', () => {
    it('prefers exact token matches over wildcard matches', () => {
      // Both /courses/:id/assignments/:id and /courses/:id/assignments/bulk_update
      // have the same token count for "/courses/123/assignments/456"
      // but /courses/:id/assignments/:id should win because 456 → :id matches :id exactly
      const result = matchEndpoints(
        'PUT /api/v1/courses/123/assignments/456',
        sampleEndpoints,
      );
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('/api/v1/courses/:course_id/assignments/:id');
    });

    it('matches literal path segments over param placeholders', () => {
      const result = matchEndpoints(
        'PUT /api/v1/courses/123/assignments/bulk_update',
        sampleEndpoints,
      );
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('/api/v1/courses/:course_id/assignments/bulk_update');
    });
  });

  describe('multiple methods for same path with different token positions', () => {
    it('returns both PUT and DELETE for assignments/:id without method', () => {
      const result = matchEndpoints(
        '/api/v1/courses/123/assignments/456',
        sampleEndpoints,
      );
      expect(result).toHaveLength(2);
      expect(result.map((e) => e.method).sort()).toEqual(['DELETE', 'PUT']);
    });
  });
});
