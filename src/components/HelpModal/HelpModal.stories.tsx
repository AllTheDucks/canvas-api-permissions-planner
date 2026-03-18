import type { Meta, StoryObj } from '@storybook/react-vite'
import { HelpModal } from '.'

const meta: Meta<typeof HelpModal> = {
  title: 'Components/HelpModal',
  component: HelpModal,
}
export default meta

type Story = StoryObj<typeof HelpModal>

export const Default: Story = {}
