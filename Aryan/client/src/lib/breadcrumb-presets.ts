import type { BreadcrumbItem } from '@/components/Breadcrumbs'

/** Reuse the same trails so labels stay consistent app-wide */
export const breadcrumbPresets = {
  courses: [{ label: 'Home', to: '/' }, { label: 'Courses' }] satisfies BreadcrumbItem[],
  enrollments: [{ label: 'Home', to: '/' }, { label: 'My enrollments' }] satisfies BreadcrumbItem[],
  account: [{ label: 'Home', to: '/' }, { label: 'Account' }] satisfies BreadcrumbItem[],
}
