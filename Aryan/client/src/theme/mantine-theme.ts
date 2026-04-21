import { createTheme } from '@mantine/core'

/** Teal primary, Geist, slightly rounded. */
export const clientBTheme = createTheme({
  primaryColor: 'teal',
  defaultRadius: 'md',
  fontFamily:
    'Geist Variable, Geist, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  headings: {
    fontWeight: '600',
    sizes: {
      h1: { fontSize: '1.75rem', lineHeight: '1.25' },
    },
  },
  components: {
    Button: { defaultProps: { fw: 500 } },
    Card: { defaultProps: { withBorder: true, shadow: 'sm', radius: 'md' } },
  },
})
