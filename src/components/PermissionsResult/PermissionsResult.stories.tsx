import type { Meta, StoryObj } from '@storybook/react-vite'
import { PermissionsResult } from '.'
import {
  samplePermissionsRequired,
  samplePermissionsWithAnyOf,
  samplePermissionsMixed,
} from '../__storydata__/endpoints'

const meta: Meta<typeof PermissionsResult> = {
  title: 'Components/PermissionsResult',
  component: PermissionsResult,
}
export default meta

type Story = StoryObj<typeof PermissionsResult>

export const Empty: Story = {
  args: {
    permissions: [],
    selectedCount: 0,
  },
}

export const SinglesOnly: Story = {
  args: {
    permissions: samplePermissionsRequired,
    selectedCount: 3,
  },
}

export const WithAnyOfGroup: Story = {
  name: 'With any-of group',
  args: {
    permissions: samplePermissionsWithAnyOf,
    selectedCount: 4,
  },
}

export const Mixed: Story = {
  name: 'Required + optional permissions',
  args: {
    permissions: samplePermissionsMixed,
    selectedCount: 5,
  },
}

export const WithOptionalPermissions: Story = {
  name: 'Optional permissions only',
  args: {
    permissions: samplePermissionsMixed.filter((p) => p.optional),
    selectedCount: 1,
  },
}

export const Loading: Story = {
  name: 'Loading locale',
  args: {
    permissions: samplePermissionsMixed,
    selectedCount: 5,
    isLoadingLocale: true,
  },
}
