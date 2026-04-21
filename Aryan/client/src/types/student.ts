/** Student record as returned by `GET /admin/students`, `GET /students/:id`, etc. */
export type AdminStudentRecord = {
  id: number
  name: string | null
  email: string
  phone: string | null
  aadhaarNumber: string | null
  studentRank: number | null
  aadhaarPdfUploaded: boolean
  rankPdfUploaded: boolean
  role: 'student' | 'admin'
  isActive: boolean
}
