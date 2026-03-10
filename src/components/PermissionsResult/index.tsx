import {
  ActionIcon,
  Badge,
  Box,
  Divider,
  Group,
  Loader,
  Overlay,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'
import type { AggregatedPermission, AnyOfAggregated, Scope, SingleAggregated } from '../../types'

type PermissionsResultProps = {
  permissions: AggregatedPermission[]
  isLoadingLocale?: boolean
}

const SCOPE_TOOLTIP = {
  Course:
    'Must be enabled on a course-level role (e.g. Teacher, Custom Course Role) for the relevant course.',
  Account:
    'Must be enabled on an account-level role (e.g. Account Admin, Custom Account Role). Account-level grants cover all courses under that account.',
} as const

function ScopeBadge({ scope }: { scope: Scope }) {
  return (
    <Tooltip label={SCOPE_TOOLTIP[scope]} multiline maw={300} withArrow>
      <Badge size="sm" variant="light" style={{ cursor: 'help' }}>
        {scope}
      </Badge>
    </Tooltip>
  )
}

function ScopeBadges({ scope }: { scope: Set<Scope> }) {
  return (
    <>
      {scope.has('Course') && <ScopeBadge scope="Course" />}
      {scope.has('Account') && <ScopeBadge scope="Account" />}
    </>
  )
}

function RequiredByTooltip({ requiredBy, children }: { requiredBy: string[]; children: React.ReactNode }) {
  if (requiredBy.length === 0) return <>{children}</>
  return (
    <Tooltip
      label={requiredBy.join('\n')}
      multiline
      maw={400}
      withArrow
      style={{ whiteSpace: 'pre-line' }}
    >
      <span>{children}</span>
    </Tooltip>
  )
}

function SingleRow({ perm }: { perm: SingleAggregated }) {
  return (
    <Box mb="xs">
      <Group gap="xs" wrap="nowrap">
        <RequiredByTooltip requiredBy={perm.requiredBy}>
          <Text size="sm">{perm.label}</Text>
        </RequiredByTooltip>
        <ScopeBadges scope={perm.scope} />
      </Group>
      {perm.notes.length > 0 && (
        <Stack gap={0} ml="xs" mt={2}>
          {perm.notes.map((note) => (
            <Text key={note} size="xs" c="dimmed">{note}</Text>
          ))}
        </Stack>
      )}
    </Box>
  )
}

function AnyOfRow({ perm }: { perm: AnyOfAggregated }) {
  return (
    <Box mb="xs">
      <Group gap="xs" wrap="nowrap" align="flex-start">
        <Tooltip
          label="Your API user needs at least one of these permissions. Any single one is sufficient to satisfy this requirement."
          multiline
          maw={300}
          withArrow
        >
          <ActionIcon size="sm" variant="transparent" component="span" style={{ cursor: 'help' }}>
            <IconInfoCircle size={14} />
          </ActionIcon>
        </Tooltip>
        <Group gap={4} wrap="wrap">
          <Text size="sm" fw={600}>Any one of:</Text>
          {perm.options.map((opt, i) => (
            <Group key={opt.symbol} gap={4} wrap="nowrap">
              {i > 0 && <Text size="sm" c="dimmed">&middot;</Text>}
              <RequiredByTooltip requiredBy={perm.requiredBy}>
                <Text size="sm">{opt.label}</Text>
              </RequiredByTooltip>
              <ScopeBadges scope={opt.scope} />
            </Group>
          ))}
        </Group>
      </Group>
      {perm.notes.length > 0 && (
        <Stack gap={0} ml="xs" mt={2}>
          {perm.notes.map((note) => (
            <Text key={note} size="xs" c="dimmed">{note}</Text>
          ))}
        </Stack>
      )}
    </Box>
  )
}

function scopeCategory(scope: Set<Scope>): 'course' | 'account' | 'both' {
  const hasCourse = scope.has('Course')
  const hasAccount = scope.has('Account')
  if (hasCourse && !hasAccount) return 'course'
  if (!hasCourse && hasAccount) return 'account'
  return 'both'
}

const SCOPE_HEADINGS = {
  course: 'Course',
  account: 'Account',
  both: 'Course or Account',
} as const

export function PermissionsResult({ permissions, isLoadingLocale = false }: PermissionsResultProps) {
  const required = permissions.filter((p) => !p.optional)
  const optional = permissions.filter((p) => p.optional)

  const requiredSingles = required.filter((p): p is SingleAggregated => p.kind === 'single')
  const requiredGroups = required.filter((p): p is AnyOfAggregated => p.kind === 'anyOf')

  const singlesByScope = new Map<string, SingleAggregated[]>()
  for (const s of requiredSingles) {
    const cat = scopeCategory(s.scope)
    let list = singlesByScope.get(cat)
    if (!list) {
      list = []
      singlesByScope.set(cat, list)
    }
    list.push(s)
  }

  const hasRequired = required.length > 0
  const hasOptional = optional.length > 0
  const isEmpty = permissions.length === 0

  return (
    <Box
      pos="relative"
      aria-live="polite"
      aria-atomic={false}
      aria-busy={isLoadingLocale}
    >
      {isLoadingLocale && (
        <Overlay backgroundOpacity={0.4} blur={1} center zIndex={10}>
          <Loader />
        </Overlay>
      )}

      {isEmpty && (
        <Text c="dimmed" ta="center" py="xl">
          Select endpoints to see required permissions
        </Text>
      )}

      {hasRequired && (
        <section>
          <Title order={3} size="h5" mb="sm">Required Permissions</Title>

          {(['course', 'account', 'both'] as const).map((cat) => {
            const singles = singlesByScope.get(cat)
            if (!singles || singles.length === 0) return null
            return (
              <Box key={cat} mb="sm">
                <Text size="xs" fw={700} c="dimmed" mb={4}>
                  {SCOPE_HEADINGS[cat]}
                </Text>
                {singles.map((perm) => (
                  <SingleRow key={perm.symbol} perm={perm} />
                ))}
              </Box>
            )
          })}

          {requiredSingles.length > 0 && requiredGroups.length > 0 && <Divider my="sm" />}

          {requiredGroups.map((perm, i) => (
            <AnyOfRow key={i} perm={perm} />
          ))}
        </section>
      )}

      {hasRequired && hasOptional && <Divider my="md" />}

      {hasOptional && (
        <section>
          <Title order={3} size="h5" mb="xs">Optional Permissions</Title>
          <Text size="xs" c="dimmed" mb="sm">
            These permissions unlock additional data fields. Review the notes to decide if your integration needs them.
          </Text>
          {optional.map((perm, i) =>
            perm.kind === 'single' ? (
              <SingleRow key={perm.symbol} perm={perm} />
            ) : (
              <AnyOfRow key={i} perm={perm} />
            ),
          )}
        </section>
      )}
    </Box>
  )
}
