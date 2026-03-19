import { List, Modal, Tabs, Text, Title } from '@mantine/core'
import { useAppTranslations } from '../../context/AppTranslationsContext'

type HelpModalContentProps = {
  opened: boolean
  onClose: () => void
}

export default function HelpModalContent({ opened, onClose }: HelpModalContentProps) {
  const { t } = useAppTranslations()

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t('header.help')}
      size="lg"
    >
      <Tabs defaultValue="howToUse">
        <Tabs.List>
          <Tabs.Tab value="howToUse">{t('help.tab.howToUse')}</Tabs.Tab>
          <Tabs.Tab value="permissions">{t('help.tab.permissions')}</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="howToUse" pt="md">
          <List type="ordered" spacing="sm">
            <List.Item>{t('help.howToUse.step1')}</List.Item>
            <List.Item>{t('help.howToUse.step2')}</List.Item>
            <List.Item>{t('help.howToUse.step3')}</List.Item>
            <List.Item>{t('help.howToUse.step4')}</List.Item>
          </List>
        </Tabs.Panel>

        <Tabs.Panel value="permissions" pt="md">
          <Title order={4} mb="xs">{t('help.permissions.rbac.heading')}</Title>
          <Text mb="md">{t('help.permissions.rbac.body')}</Text>

          <Title order={4} mb="xs">{t('help.permissions.orGroups.heading')}</Title>
          <Text mb="md">{t('help.permissions.orGroups.body')}</Text>

          <Title order={4} mb="xs">{t('help.permissions.optional.heading')}</Title>
          <Text mb="md">{t('help.permissions.optional.body')}</Text>

          <Title order={4} mb="xs">{t('help.permissions.featureFlags.heading')}</Title>
          <Text>{t('help.permissions.featureFlags.body')}</Text>
        </Tabs.Panel>

      </Tabs>
    </Modal>
  )
}
