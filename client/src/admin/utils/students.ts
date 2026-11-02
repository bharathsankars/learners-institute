import type { Student, StudentStatus } from "../../api/students";
// RECENT = admitted in the last RECENT_ADMISSION_DAYS days, any status.
export type StudentFilter = StudentStatus | "ALL" | "RECENT";
export const RECENT_ADMISSION_DAYS = 30;
export function isRecentlyAdmitted(student: Pick<Student, "createdAt">, now = new Date()) {
  return now.getTime() - new Date(student.createdAt).getTime() < RECENT_ADMISSION_DAYS * 86_400_000;
}
export type StudentSort = "NEWEST" | "OLDEST" | "NAME" | "ADMISSION";
export const studentStatusLabels: Record<StudentStatus, string> = { ACTIVE: "Active", INACTIVE: "Inactive", COMPLETED: "Completed" };
export function studentName(student: Pick<Student, "firstName" | "lastName">) {
  return [student.firstName, student.lastName].filter(Boolean).join(" ");
}
export function studentDate(value: string, dateOnly = false) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: dateOnly ? "UTC" : "Europe/Berlin", day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}
export function studentCounts(records: Pick<Student, "status" | "createdAt">[], now = new Date()) {
  return records.reduce((counts, record) => { counts.ALL++; counts[record.status]++; if (isRecentlyAdmitted(record, now)) counts.RECENT++; return counts; }, { ALL: 0, RECENT: 0, ACTIVE: 0, INACTIVE: 0, COMPLETED: 0 });
}
export function filterStudents(records: Student[], criteria: { search: string; status: StudentFilter; sort: StudentSort }, now = new Date()) {
  const search = criteria.search.trim().toLowerCase();
  const phoneSearch = /^[+\d\s().-]+$/.test(search) ? search.replace(/\D/g, "") : "";
  return records.filter(student => (criteria.status === "ALL" || (criteria.status === "RECENT" ? isRecentlyAdmitted(student, now) : student.status === criteria.status)) && (!search || `${studentName(student)} ${student.admissionNumber} ${student.phone} ${student.email ?? ""}`.toLowerCase().includes(search) || (phoneSearch.length >= 4 && student.phone.replace(/\D/g, "").includes(phoneSearch)))).sort((a, b) => {
    if (criteria.sort === "NAME") return studentName(a).localeCompare(studentName(b), "en", { sensitivity: "base" });
    if (criteria.sort === "ADMISSION") return a.admissionNumber.localeCompare(b.admissionNumber, "en", { numeric: true });
    const difference = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return criteria.sort === "OLDEST" ? -difference : difference;
  });
}
export function paginateStudents<T>(records: T[], page: number, pageSize = 10) {
  const pageCount = Math.max(1, Math.ceil(records.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const offset = (currentPage - 1) * pageSize;
  return { records: records.slice(offset, offset + pageSize), currentPage, pageCount, start: records.length ? offset + 1 : 0, end: Math.min(offset + pageSize, records.length) };
}
