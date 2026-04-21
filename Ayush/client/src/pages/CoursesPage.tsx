import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Search } from 'lucide-react'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PageHeading } from '@/components/PageHeading'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { breadcrumbPresets } from '@/lib/breadcrumb-presets'
import { maxWField, pageIntroStack, pageShell } from '@/lib/layout'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import type { Course } from '@/types/course'

function CourseListSkeleton() {
  return (
    <ul className="flex flex-col gap-3" aria-hidden>
      {['a', 'b', 'c'].map((k) => (
        <li key={k}>
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-3/4 max-w-md" />
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="pt-0">
              <Skeleton className="h-4 w-28" />
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
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
    <div className={pageShell}>
      <div className={pageIntroStack}>
        <Breadcrumbs items={breadcrumbPresets.courses} />
        <PageHeading
          title="Course catalog"
          description="Browse open courses. Sign in to request enrollment — no account needed to browse."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="course-search" className="text-sm font-medium text-foreground">
          Search courses
        </Label>
        <div className={cn('relative', maxWField)}>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="course-search"
            type="search"
            name="search"
            placeholder="Search by code or title…"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {courses && courses.length > 0 ? (
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {filtered.length === courses.length
              ? `${courses.length} course${courses.length === 1 ? '' : 's'}`
              : `${filtered.length} of ${courses.length} courses match`}
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : courses === null ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Loading catalog…</p>
          <CourseListSkeleton />
        </div>
      ) : courses.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center">
          <BookOpen className="size-10 text-muted-foreground" aria-hidden />
          <div className="space-y-1">
            <p className="font-medium text-foreground">No courses yet</p>
            <p className="text-sm text-muted-foreground">
              Check back later — administrators will publish courses here.
            </p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No courses match “{query.trim()}”. Try another search.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((c) => (
            <li key={c.id}>
              <Link to={`/courses/${c.id}`}>
                <Card className="transition-colors hover:bg-muted/40">
                  <CardHeader className="pb-2">
                    <CardTitle>
                      {c.code} — {c.title}
                    </CardTitle>
                    <CardDescription>
                      {c.credits} credits · capacity {c.capacity}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <span className="text-sm text-primary">View details →</span>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
