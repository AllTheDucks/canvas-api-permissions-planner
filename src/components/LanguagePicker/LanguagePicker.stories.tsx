import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { LanguagePicker } from '.'

const meta: Meta<typeof LanguagePicker> = {
  title: 'Components/LanguagePicker',
  component: LanguagePicker,
}
export default meta

type Story = StoryObj<typeof LanguagePicker>

function LanguagePickerWithState({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial)
  return <LanguagePicker value={value} onChange={setValue} />
}

export const Default: Story = {
  render: () => <LanguagePickerWithState initial="en" />,
}

export const LocaleSelected: Story = {
  name: 'Non-English locale selected',
  render: () => <LanguagePickerWithState initial="ja" />,
}
