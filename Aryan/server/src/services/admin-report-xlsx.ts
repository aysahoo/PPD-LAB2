import ExcelJS from "exceljs";

import { getCourseById, listCourses } from "./courses.js";
import { listAllForAdmin } from "./enrollments.js";
import { listStudentUsers } from "./students.js";

function styleHeaderRow(sheet: ExcelJS.Worksheet, rowNumber: number) {
  const row = sheet.getRow(rowNumber);
  row.font = { bold: true };
  row.alignment = { vertical: "middle" };
}

export async function buildAdminFullReportBuffer(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Admin report";
  workbook.created = new Date();

  const courseSummaries = await listCourses();
  const coursesDetailed = await Promise.all(courseSummaries.map((c) => getCourseById(c.id)));

  const coursesSheet = workbook.addWorksheet("Courses", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  coursesSheet.columns = [
    { header: "Code", key: "code", width: 14 },
    { header: "Title", key: "title", width: 36 },
    { header: "Description", key: "description", width: 48 },
    { header: "Credits", key: "credits", width: 10 },
    { header: "Capacity", key: "capacity", width: 10 },
    { header: "Prerequisites (codes)", key: "prerequisites", width: 28 },
    { header: "Created (UTC)", key: "createdAt", width: 22 },
  ];
  styleHeaderRow(coursesSheet, 1);
  for (const c of coursesDetailed) {
    if (!c) continue;
    coursesSheet.addRow({
      code: c.code,
      title: c.title,
      description: c.description,
      credits: c.credits,
      capacity: c.capacity,
      prerequisites: c.prerequisites.map((p) => p.code).join(", "),
      createdAt: c.createdAt,
    });
  }

  const students = await listStudentUsers();
  const studentsSheet = workbook.addWorksheet("Students", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  studentsSheet.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "Name", key: "name", width: 24 },
    { header: "Email", key: "email", width: 32 },
    { header: "Phone", key: "phone", width: 16 },
    { header: "Active", key: "isActive", width: 10 },
    { header: "Rank", key: "studentRank", width: 10 },
    { header: "Aadhaar number", key: "aadhaarNumber", width: 16 },
    { header: "Aadhaar PDF uploaded", key: "aadhaarPdf", width: 18 },
    { header: "Rank PDF uploaded", key: "rankPdf", width: 16 },
  ];
  styleHeaderRow(studentsSheet, 1);
  for (const s of students) {
    studentsSheet.addRow({
      id: s.id,
      name: s.name ?? "",
      email: s.email,
      phone: s.phone ?? "",
      isActive: s.isActive ? "Yes" : "No",
      studentRank: s.studentRank ?? "",
      aadhaarNumber: s.aadhaarNumber ?? "",
      aadhaarPdf: s.aadhaarPdfUploaded ? "Yes" : "No",
      rankPdf: s.rankPdfUploaded ? "Yes" : "No",
    });
  }

  const enrollments = await listAllForAdmin();
  const enrollSheet = workbook.addWorksheet("Enrollments", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  enrollSheet.columns = [
    { header: "Enrollment ID", key: "id", width: 14 },
    { header: "Student email", key: "studentEmail", width: 32 },
    { header: "Student name", key: "studentName", width: 24 },
    { header: "Course code", key: "courseCode", width: 14 },
    { header: "Course title", key: "courseTitle", width: 36 },
    { header: "Status", key: "status", width: 12 },
    { header: "Created (UTC)", key: "createdAt", width: 22 },
    { header: "Updated (UTC)", key: "updatedAt", width: 22 },
  ];
  styleHeaderRow(enrollSheet, 1);
  for (const e of enrollments) {
    enrollSheet.addRow({
      id: e.id,
      studentEmail: e.student.email,
      studentName: e.student.name ?? "",
      courseCode: e.course.code,
      courseTitle: e.course.title,
      status: e.status,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    });
  }

  const raw = await workbook.xlsx.writeBuffer();
  return Buffer.from(raw);
}
