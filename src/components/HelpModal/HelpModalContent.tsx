import { Code, List, Modal, Table, Tabs, Text, Title } from '@mantine/core'
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
          <Tabs.Tab value="commonSetups">{t('help.tab.commonSetups')}</Tabs.Tab>
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

        <Tabs.Panel value="commonSetups" pt="md">
          <Text mb="md">{t('help.commonSetups.intro')}</Text>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('help.commonSetups.col.type')}</Table.Th>
                <Table.Th>{t('help.commonSetups.col.permissions')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td>
                  <Text fw={600}>{t('help.commonSetups.readOnly.name')}</Text>
                  <Text size="xs" c="dimmed">{t('help.commonSetups.readOnly.description')}</Text>
                </Table.Td>
                <Table.Td>
                  <Code>read_roster</Code>, <Code>read_course_content</Code>, <Code>view_all_grades</Code>
                  <br />
                  <Text size="xs" c="dimmed" component="span">
                    {t('help.commonSetups.optional')}: <Code>read_sis</Code>, <Code>view_user_logins</Code>
                  </Text>
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Text fw={600}>{t('help.commonSetups.gradebook.name')}</Text>
                  <Text size="xs" c="dimmed">{t('help.commonSetups.gradebook.description')}</Text>
                </Table.Td>
                <Table.Td>
                  <Code>manage_grades</Code>, <Code>read_roster</Code>
                  <br />
                  <Text size="xs" c="dimmed" component="span">
                    {t('help.commonSetups.optional')}: <Code>read_sis</Code>, <Code>manage_sis</Code>, <Code>view_user_logins</Code>
                  </Text>
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Text fw={600}>{t('help.commonSetups.sis.name')}</Text>
                  <Text size="xs" c="dimmed">{t('help.commonSetups.sis.description')}</Text>
                </Table.Td>
                <Table.Td>
                  <Code>import_sis</Code>
                  <br />
                  <Text size="xs" c="dimmed" component="span">
                    {t('help.commonSetups.optional')}: <Code>manage_sis</Code>, <Code>read_roster</Code>
                  </Text>
                </Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Tabs.Panel>
      </Tabs>
    </Modal>
  )
}
