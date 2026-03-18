import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { EndpointSelector } from '.'
import { sampleEndpoints } from '../__storydata__/endpoints'
import type { Endpoint } from '../../types'

const meta: Meta<typeof EndpointSelector> = {
  title: 'Components/EndpointSelector',
  component: EndpointSelector,
}
export default meta

type Story = StoryObj<typeof EndpointSelector>

function EndpointSelectorWithState({ initialSelected = [] }: { initialSelected?: Endpoint[] }) {
  const [selected, setSelected] = useState<Endpoint[]>(initialSelected)
  return (
    <EndpointSelector
      endpoints={sampleEndpoints}
      selected={selected}
      onToggle={(ep) =>
        setSelected((prev) =>
          prev.some((s) => s.method === ep.method && s.path === ep.path)
            ? prev.filter((s) => !(s.method === ep.method && s.path === ep.path))
            : [...prev, ep]
        )
      }
      onBulkToggle={(eps, select) =>
        setSelected((prev) => {
          if (select) {
            const existing = new Set(prev.map((e) => `${e.method} ${e.path}`))
            return [...prev, ...eps.filter((e) => !existing.has(`${e.method} ${e.path}`))]
          }
          const removing = new Set(eps.map((e) => `${e.method} ${e.path}`))
          return prev.filter((e) => !removing.has(`${e.method} ${e.path}`))
        })
      }
    />
  )
}

export const Default: Story = {
  render: () => <EndpointSelectorWithState />,
}

export const WithSelections: Story = {
  name: 'With pre-selected endpoints',
  render: () => (
    <EndpointSelectorWithState
      initialSelected={[sampleEndpoints[0], sampleEndpoints[4], sampleEndpoints[6]]}
    />
  ),
}
