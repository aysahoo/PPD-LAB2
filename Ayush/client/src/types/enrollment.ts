import type { Course } from '@/types/course'

export type EnrollmentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export type StudentSummary = {
  id: number
  name: string | null
  email: string
  phone: string | null
  role: 'student' | 'admin'
  isActive: boolean
}

export type CourseSummary = Pick<Course, 'id' | 'code' | 'title'>

export type Enrollment = {
  id: number
  userId: number
  courseId: number
  status: EnrollmentStatus
  createdAt: string
  updatedAt: string
  course: CourseSummary
  student: StudentSummary
}
