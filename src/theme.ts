import { createTheme, type MantineColorsTuple } from '@mantine/core';

const atdOrange: MantineColorsTuple = [
  '#fef6e7',
  '#fdebc9',
  '#fcdc9c',
  '#fdcb68',
  '#feba34',
  '#ffaf11',
  '#f09f00',
  '#c28205',
  '#9b6a08',
  '#7b550a',
];

export const theme = createTheme({
  primaryColor: 'atdOrange',
  colors: {
    atdOrange,
    dark: [
      '#c1c2c5', // 0
      '#a6a7ab', // 1
      '#909296', // 2 — dimmed text (bumped from default #828282 for WCAG AA 4.5:1 on dark bg)
      '#5c5f66', // 3
      '#373A40', // 4
      '#2C2E33', // 5
      '#25262b', // 6 — default card bg
      '#1A1B1E', // 7 — default body bg
      '#141517', // 8
      '#101113', // 9
    ],
  },
  primaryShade: 5,
  fontFamily: 'Poppins, sans-serif',
  headings: {
    fontFamily: '"Source Sans 3", sans-serif',
    fontWeight: '600',
  },
});
