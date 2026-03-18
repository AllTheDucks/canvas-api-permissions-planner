import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { SelectedEndpoints } from '.'
import { sampleSelected, sampleSelectedWithNotes } from '../__storydata__/endpoints'
import type { Endpoint } from '../../types'

const meta: Meta<typeof SelectedEndpoints> = {
  title: 'Components/SelectedEndpoints',
  component: SelectedEndpoints,
}
export default meta

type Story = StoryObj<typeof SelectedEndpoints>

function SelectedEndpointsWithState({ initial }: { initial: Endpoint[] }) {
  const [selected, setSelected] = useState(initial)
  return (
    <SelectedEndpoints
      selected={selected}
      onRemove={(ep) => setSelected((prev) => prev.filter((s) => !(s.method === ep.method && s.path === ep.path)))}
      onRemoveCategory={(eps) => {
        const ids = new Set(eps.map((e) => `${e.method} ${e.path}`))
        setSelected((prev) => prev.filter((s) => !ids.has(`${s.method} ${s.path}`)))
      }}
    />
  )
}

export const Empty: Story = {
  render: () => <SelectedEndpointsWithState initial={[]} />,
}

export const WithItems: Story = {
  render: () => <SelectedEndpointsWithState initial={sampleSelected} />,
}

export const WithNotes: Story = {
  name: 'With endpoint notes',
  render: () => <SelectedEndpointsWithState initial={sampleSelectedWithNotes} />,
}
