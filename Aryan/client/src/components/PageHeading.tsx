import { Stack, Text, Title } from '@mantine/core'

type PageHeadingProps = {
  title: string
  description?: string
}

/** Standard page title + optional lead (matches admin + public list pages) */
export function PageHeading({ title, description }: PageHeadingProps) {
  return (
    <Stack gap={4}>
      <Title order={1} size="h3" fw={600} style={{ letterSpacing: '-0.02em' }}>
        {title}
      </Title>
      {description ? (
        <Text size="sm" c="dimmed">
          {description}
        </Text>
      ) : null}
    </Stack>
  )
}
