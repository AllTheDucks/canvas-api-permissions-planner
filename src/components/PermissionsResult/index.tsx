import {
  ActionIcon,
  Box,
  Divider,
  Group,
  Skeleton,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'
import { useAppTranslations } from '../../context/AppTranslationsContext'
import type { AggregatedPermission, AnyOfAggregated, SingleAggregated } from '../../types'
import { MethodBadge } from '../MethodBadge'
import { StyledPath } from '../StyledPath'
import classes from './PermissionsResult.module.css'

type PermissionsResultProps = {
  permissions: AggregatedPermission[]
  selectedCount: number
  isLoadingLocale?: boolean
}

function RequiredByTooltip({ requiredBy, children }: { requiredBy: string[]; children: React.ReactNode }) {
  if (requiredBy.length === 0) return <>{children}</>
  return (
    <Tooltip
      label={
        <Stack gap={2}>
          {requiredBy.map((ep) => {
            const spaceIdx = ep.indexOf(' ')
            const method = ep.slice(0, spaceIdx)
            const path = ep.slice(spaceIdx + 1)
            return (
              <Text key={ep} size="xs" ff="monospace" className={classes.tooltipRow}>
                <span className={classes.methodBadge}><Text span size="xs" ff="monospace"><MethodBadge method={method} /></Text>&nbsp;</span>
                <span className={classes.rtlPath}>
                  <bdo dir="ltr"><StyledPath path={path} /></bdo>
                </span>
              </Text>
            )
          })}
        </Stack>
      }
      multiline
      maw="min(90vw, 600px)"
      withArrow
    >
      <span>{children}</span>
    </Tooltip>
  )
}

function SingleRow({ perm, isLoadingLocale }: { perm: SingleAggregated; isLoadingLocale: boolean }) {
  const { t } = useAppTranslations()

  return (
    <li data-print-no-break>
      <Group gap="xs" wrap="nowrap">
        <Skeleton visible={isLoadingLocale} w="fit-content">
          <RequiredByTooltip requiredBy={perm.requiredBy}>
            <Text size="sm">{perm.label}</Text>
          </RequiredByTooltip>
        </Skeleton>
      </Group>
      {perm.notes.length > 0 && (
        <Stack gap={0} ml="xs" mt={2}>
          {perm.notes.map((note) => (
            <Text key={note} size="xs" c="dimmed">{t(note)}</Text>
          ))}
        </Stack>
      )}
    </li>
  )
}

function AnyOfRow({ perm, isLoadingLocale }: { perm: AnyOfAggregated; isLoadingLocale: boolean }) {
  const { t } = useAppTranslations()

  return (
    <li data-print-no-break>
      <Group gap="xs" wrap="nowrap" align="flex-start">
        <Tooltip
          label={t('permissions.anyOfTooltip')}
          multiline
          maw={300}
          withArrow
        >
          <ActionIcon size="sm" variant="transparent" component="span" className={classes.helpCursor} aria-hidden="true">
            <IconInfoCircle size={14} />
          </ActionIcon>
        </Tooltip>
        <Group gap={4} wrap="wrap">
          <Text size="sm" fw={600}>{t('permissions.anyOf')}</Text>
          {perm.options.map((opt, i) => (
            <Group key={opt.symbol} gap={4} wrap="nowrap">
              {i > 0 && <Text size="sm" c="dimmed" fs="italic">{t('permissions.or')}</Text>}
              <Skeleton visible={isLoadingLocale} w="fit-content">
                <RequiredByTooltip requiredBy={perm.requiredBy}>
                  <Text size="sm">{opt.label}</Text>
                </RequiredByTooltip>
              </Skeleton>
            </Group>
          ))}
        </Group>
      </Group>
      {perm.notes.length > 0 && (
        <Stack gap={0} ml="xs" mt={2}>
          {perm.notes.map((note) => (
            <Text key={note} size="xs" c="dimmed">{t(note)}</Text>
          ))}
        </Stack>
      )}
    </li>
  )
}

export function PermissionsResult({ permissions, selectedCount, isLoadingLocale = false }: PermissionsResultProps) {
  const { t } = useAppTranslations()

  const required = permissions.filter((p) => !p.optional)
  const optional = permissions.filter((p) => p.optional)

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
      {isEmpty && selectedCount === 0 && (
        <Text c="dimmed" ta="center" py="xl">
          {t('permissions.empty')}
        </Text>
      )}

      {isEmpty && selectedCount > 0 && (
        <Text c="dimmed" ta="center" py="xl">
          {t('permissions.noAdditional')}
        </Text>
      )}

      {hasRequired && (
        <section aria-label={t('permissions.heading')}>
          <ul className={classes.permissionList}>
            {required.map((perm) =>
              perm.kind === 'single' ? (
                <SingleRow key={perm.symbol} perm={perm} isLoadingLocale={isLoadingLocale} />
              ) : (
                <AnyOfRow key={perm.options.map(o => o.symbol).join('|')} perm={perm} isLoadingLocale={isLoadingLocale} />
              ),
            )}
          </ul>
        </section>
      )}

      {hasRequired && hasOptional && <Divider my="md" />}

      {hasOptional && (
        <section aria-label={t('permissions.optionalHeading')}>
          <Title order={3} size="h5" mb="xs">{t('permissions.optionalHeading')}</Title>
          <Text size="xs" c="dimmed" mb="sm">
            {t('permissions.optionalNote')}
          </Text>
          <ul className={classes.permissionList}>
            {optional.map((perm) =>
              perm.kind === 'single' ? (
                <SingleRow key={perm.symbol} perm={perm} isLoadingLocale={isLoadingLocale} />
              ) : (
                <AnyOfRow key={perm.options.map(o => o.symbol).join('|')} perm={perm} isLoadingLocale={isLoadingLocale} />
              ),
            )}
          </ul>
        </section>
      )}
    </Box>
  )
}
