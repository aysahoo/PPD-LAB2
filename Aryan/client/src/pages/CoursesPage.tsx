import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Search } from 'lucide-react'
import { Anchor, Card, Skeleton, Stack, Text, TextInput } from '@mantine/core'
import { Link } from 'react-router-dom'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PageHeading } from '@/components/PageHeading'
import { breadcrumbPresets } from '@/lib/breadcrumb-presets'
import { seatFillPercent, shouldWarnSeatCapacity } from '@/lib/course-seat-warning'
import { maxWField, PageShell } from '@/lib/layout'
import { api } from '@/lib/api'
import type { Course } from '@/types/course'

function CourseListSkeleton() {
  return (
    <Stack component="ul" gap="md" style={{ listStyle: 'none', margin: 0, padding: 0 }} aria-hidden>
      {['a', 'b', 'c'].map((k) => (
        <Card key={k} component="li" withBorder padding="md">
          <Stack gap="xs">
            <Skeleton height={20} width="75%" />
            <Skeleton height={16} width={96} />
            <Skeleton height={16} width={112} />
          </Stack>
        </Card>
      ))}
    </Stack>
  )
}

export function CoursesPage() {
  const [courses, setCourses] = useState<Course[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const list = await api.getPublic<Course[]>('/courses')
        if (!cancelled) setCourses(list)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load courses')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (!courses) return []
    const q = query.trim().toLowerCase()
    if (!q) return courses
    return courses.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q),
    )
  }, [courses, query])

  return (
    <PageShell>
      <Stack gap="md">
        <Breadcrumbs items={breadcrumbPresets.courses} />
        <PageHeading
          title="Course catalog"
          description="Browse open courses. Sign in to request enrollment — no account needed to browse."
        />
      </Stack>

      <Stack gap="xs">
        <Text component="label" htmlFor="course-search" size="sm" fw={500}>
          Search courses
        </Text>
        <TextInput
          id="course-search"
          type="search"
          name="search"
          placeholder="Search by code or title…"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leftSection={<Search size={16} aria-hidden />}
          maw={maxWField}
        />
        {courses && courses.length > 0 ? (
          <Text size="xs" c="dimmed" aria-live="polite">
            {filtered.length === courses.length
              ? `${courses.length} course${courses.length === 1 ? '' : 's'}`
              : `${filtered.length} of ${courses.length} courses match`}
          </Text>
        ) : null}
      </Stack>

      {error ? (
        <Text size="sm" c="red" role="alert">
          {error}
        </Text>
      ) : courses === null ? (
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Loading catalog…
          </Text>
          <CourseListSkeleton />
        </Stack>
      ) : courses.length === 0 ? (
        <Card withBorder padding="xl" style={{ borderStyle: 'dashed' }}>
          <Stack align="center" gap="md">
            <BookOpen size={40} aria-hidden style={{ opacity: 0.5 }} />
            <Stack gap={4} ta="center">
              <Text fw={600}>No courses yet</Text>
              <Text size="sm" c="dimmed">
                Check back later — administrators will publish courses here.
              </Text>
            </Stack>
          </Stack>
        </Card>
      ) : filtered.length === 0 ? (
        <Text size="sm" c="dimmed">
          No courses match &ldquo;{query.trim()}&rdquo;. Try another search.
        </Text>
      ) : (
        <Stack component="ul" gap="md" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {filtered.map((c) => (
            <li key={c.id}>
              <Anchor component={Link} to={`/courses/${c.id}`} underline="never">
                <Card withBorder padding="md" style={{ transition: 'background 0.15s' }}>
                  <Stack gap={4}>
                    <Text fw={600}>
                      {c.code} — {c.title}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {c.credits} credits · {c.enrolledCount} of {c.capacity} seats filled
                    </Text>
                    {shouldWarnSeatCapacity(c.enrolledCount, c.capacity) ? (
                      <Text size="sm" c="orange" fw={500} role="status">
                        Warning: {seatFillPercent(c.enrolledCount, c.capacity)}% full — limited seats remaining.
                      </Text>
                    ) : null}
                    <Text size="sm" c="teal">
                      View details →
                    </Text>
                  </Stack>
                </Card>
              </Anchor>
            </li>
          ))}
        </Stack>
      )}
    </PageShell>
  )
}
