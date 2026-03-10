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
  colors: { atdOrange },
  primaryShade: 5,
  fontFamily: 'Poppins, sans-serif',
  headings: {
    fontFamily: '"Source Sans 3", sans-serif',
    fontWeight: '600',
  },
});
