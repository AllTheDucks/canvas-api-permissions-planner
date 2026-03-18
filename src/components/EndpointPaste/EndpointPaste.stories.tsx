import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { EndpointPaste } from '.'
import { sampleEndpoints } from '../__storydata__/endpoints'

const meta: Meta<typeof EndpointPaste> = {
  title: 'Components/EndpointPaste',
  component: EndpointPaste,
  args: {
    endpoints: sampleEndpoints,
    onAdd: fn(),
  },
}
export default meta

type Story = StoryObj<typeof EndpointPaste>

export const Default: Story = {}
