import type { Endpoint, AggregatedPermission } from '../../types'

export const sampleEndpoints: Endpoint[] = [
  {
    method: 'GET',
    path: '/api/v1/courses',
    category: 'Courses',
    permissions: [{ symbol: 'read_course_list' }],
  },
  {
    method: 'GET',
    path: '/api/v1/courses/:id',
    category: 'Courses',
    permissions: [{ symbol: 'read_course_content' }],
  },
  {
    method: 'PUT',
    path: '/api/v1/courses/:id',
    category: 'Courses',
    permissions: [{ symbol: 'manage_courses_admin' }],
  },
  {
    method: 'DELETE',
    path: '/api/v1/courses/:id',
    category: 'Courses',
    permissions: [{ symbol: 'manage_courses_admin' }],
    notes: 'Permanently deletes the course; cannot be undone.',
  },
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
    permissions: [
      { symbol: 'manage_assignments' },
      { symbol: 'manage_assignments_edit', required: false, note: 'Only required when editing existing assignments' },
    ],
  },
  {
    method: 'GET',
    path: '/api/v1/users/:user_id/enrollments',
    category: 'Enrollments',
    permissions: [
      { anyOf: ['read_roster', 'manage_students'], required: true },
    ],
  },
  {
    method: 'POST',
    path: '/api/v1/courses/:course_id/enrollments',
    category: 'Enrollments',
    permissions: [{ symbol: 'manage_students' }],
  },
  {
    method: 'GET',
    path: '/api/v1/accounts/:account_id/users',
    category: 'Users',
    permissions: [{ symbol: 'read_roster' }],
  },
  {
    method: 'PUT',
    path: '/api/v1/courses/:course_id/grades',
    category: 'Grades',
    permissions: [{ symbol: 'manage_grades' }],
  },
]

export const sampleSelected: Endpoint[] = [
  sampleEndpoints[0],
  sampleEndpoints[1],
  sampleEndpoints[4],
  sampleEndpoints[6],
]

export const sampleSelectedWithNotes: Endpoint[] = [
  sampleEndpoints[0],
  sampleEndpoints[3],
  sampleEndpoints[5],
]

export const samplePermissionsRequired: AggregatedPermission[] = [
  {
    kind: 'single',
    symbol: 'manage_courses_admin',
    label: 'Courses - manage',
    requiredBy: ['PUT /api/v1/courses/:id'],
    optional: false,
    notes: [],
  },
  {
    kind: 'single',
    symbol: 'read_course_content',
    label: 'Course Content - view',
    requiredBy: ['GET /api/v1/courses/:id', 'GET /api/v1/courses/:course_id/assignments'],
    optional: false,
    notes: [],
  },
  {
    kind: 'single',
    symbol: 'read_course_list',
    label: 'Courses - view list',
    requiredBy: ['GET /api/v1/courses'],
    optional: false,
    notes: [],
  },
]

export const samplePermissionsWithAnyOf: AggregatedPermission[] = [
  ...samplePermissionsRequired,
  {
    kind: 'anyOf',
    options: [
      { symbol: 'read_roster', label: 'Users - view list' },
      { symbol: 'manage_students', label: 'Users - manage students' },
    ],
    requiredBy: ['GET /api/v1/users/:user_id/enrollments'],
    optional: false,
    notes: [],
  },
]

export const samplePermissionsMixed: AggregatedPermission[] = [
  ...samplePermissionsWithAnyOf,
  {
    kind: 'single',
    symbol: 'manage_assignments_edit',
    label: 'Assignments - edit',
    requiredBy: ['POST /api/v1/courses/:course_id/assignments'],
    optional: true,
    notes: ['Only required when editing existing assignments'],
  },
]
