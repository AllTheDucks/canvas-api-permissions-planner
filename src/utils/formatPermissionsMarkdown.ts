import type { AggregatedPermission, Endpoint } from '../types'

type Labels = {
  title: string
  selectedHeading: string
  requiredHeading: string
  optionalHeading: string
  anyOf: string
  or: string
  credit: string
}

export function formatPermissionsMarkdown(
  selected: Endpoint[],
  permissions: AggregatedPermission[],
  labels: Labels,
  tNote: (key: string) => string,
): string {
  const lines: string[] = []

  lines.push(`# ${labels.title}`, '')
  lines.push(new Date().toLocaleDateString(), '')

  // Selected endpoints grouped by category
  lines.push(`## ${labels.selectedHeading}`, '')
  const byCategory = new Map<string, Endpoint[]>()
  for (const ep of selected) {
    const list = byCategory.get(ep.category) ?? []
    list.push(ep)
    byCategory.set(ep.category, list)
  }
  for (const [category, endpoints] of byCategory) {
    lines.push(`### ${category}`, '')
    for (const ep of endpoints) {
      lines.push(`- \`${ep.method} ${ep.path}\``)
    }
    lines.push('')
  }

  // Permissions
  const required = permissions.filter((p) => !p.optional)
  const optional = permissions.filter((p) => p.optional)

  if (required.length > 0) {
    lines.push(`## ${labels.requiredHeading}`, '')
    for (const perm of required) {
      lines.push(formatRow(perm, labels, tNote))
    }
    lines.push('')
  }

  if (optional.length > 0) {
    lines.push(`## ${labels.optionalHeading}`, '')
    for (const perm of optional) {
      lines.push(formatRow(perm, labels, tNote))
    }
    lines.push('')
  }

  // Footer credit
  lines.push('---', '', `*${labels.credit}*`, '')

  return lines.join('\n')
}

function formatRow(
  perm: AggregatedPermission,
  labels: { anyOf: string; or: string },
  tNote: (key: string) => string,
): string {
  if (perm.kind === 'single') {
    const notes = perm.notes.map((n) => tNote(n)).filter(Boolean)
    const suffix = notes.length > 0 ? ` — ${notes.join('; ')}` : ''
    return `- ${perm.label}${suffix}`
  }

  const optLabels = perm.options.map((o) => o.label).join(` *${labels.or}* `)
  const notes = perm.notes.map((n) => tNote(n)).filter(Boolean)
  const suffix = notes.length > 0 ? ` — ${notes.join('; ')}` : ''
  return `- **${labels.anyOf}** ${optLabels}${suffix}`
}
