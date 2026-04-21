import type { ReactNode } from 'react'
import { Center, Container, Loader, Stack, Text } from '@mantine/core'

/** ~ max-w-5xl (64rem) */
export const SHELL_MAX = 1024

/** ~ max-w-lg */
export const NARROW_MAX = 512

/** Search fields and compact in-page forms (~ max-w-md) */
export const maxWField = 448

/** Inner width for header and main content */
export function ShellRow({ children }: { children: ReactNode }) {
  return (
    <Container maw={SHELL_MAX} mx="auto" px={{ base: 'md', sm: 'lg' }} w="100%">
      {children}
    </Container>
  )
}

/** Default stack for list/detail/settings pages */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <Container maw={SHELL_MAX} mx="auto" px={{ base: 'md', sm: 'lg' }} py="xl" w="100%">
      <Stack gap="xl">{children}</Stack>
    </Container>
  )
}

/** Narrow forms (account) */
export function PageShellNarrow({ children }: { children: ReactNode }) {
  return (
    <Container maw={NARROW_MAX} mx="auto" px={{ base: 'md', sm: 'lg' }} py="xl" w="100%">
      <Stack gap="xl">{children}</Stack>
    </Container>
  )
}

/** Centered auth / landing cards */
export function PageShellCentered({ children }: { children: ReactNode }) {
  return (
    <Container maw={SHELL_MAX} mx="auto" px={{ base: 'md', sm: 'lg' }} py="xl" w="100%">
      <Center mih="60vh">
        <Stack w="100%" maw={448} align="stretch">
          {children}
        </Stack>
      </Center>
    </Container>
  )
}

/** Inline loading / empty states */
export function PageLoadingCenter({ children }: { children?: ReactNode }) {
  return (
    <Container maw={SHELL_MAX} mx="auto" px={{ base: 'md', sm: 'lg' }} py="xl" w="100%">
      <Center mih={200}>
        {children ?? (
          <Text size="sm" c="dimmed">
            Loading…
          </Text>
        )}
      </Center>
    </Container>
  )
}

export function FullScreenLoading({ children }: { children?: ReactNode }) {
  return (
    <Center mih="100vh" px={{ base: 'md', sm: 'lg' }}>
      {children ?? <Loader />}
    </Center>
  )
}
