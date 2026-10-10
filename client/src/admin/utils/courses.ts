import type { Course } from "../../api/courses";
export type CourseFilter = "ALL" | "ACTIVE" | "INACTIVE";
export type CourseSort = "ORDER" | "TITLE" | "NEWEST";
export function courseCategory(course: Pick<Course, "category">): string | null { return course.category?.trim() || null; }
export function courseCounts(courses: Course[]) {
  return { ALL: courses.length, ACTIVE: courses.filter(course => course.isActive).length, INACTIVE: courses.filter(course => !course.isActive).length, CATEGORIES: new Set(courses.map(courseCategory).filter(Boolean)).size };
}
export function filterCourses(courses: Course[], criteria: { search: string; status: CourseFilter; category: string | null | undefined; sort: CourseSort }) {
  const search = criteria.search.trim().toLowerCase();
  return courses.filter(course => {
    const text = [course.title, course.slug, course.category, course.shortDescription, course.description, ...course.skills].filter(Boolean).join(" ").toLowerCase();
    return (!search || text.includes(search)) && (criteria.status === "ALL" || course.isActive === (criteria.status === "ACTIVE")) && (criteria.category === undefined || courseCategory(course) === criteria.category);
  }).sort((a, b) => {
    if (criteria.sort === "TITLE") return a.title.localeCompare(b.title, "en", { sensitivity: "base" });
    if (criteria.sort === "NEWEST") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return a.displayOrder - b.displayOrder || a.title.localeCompare(b.title, "en", { sensitivity: "base" });
  });
}
export function paginateCourses<T>(records: T[], page: number, pageSize = 10) {
  const pageCount = Math.max(1, Math.ceil(records.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const offset = (currentPage - 1) * pageSize;
  return { records: records.slice(offset, offset + pageSize), currentPage, pageCount, start: records.length ? offset + 1 : 0, end: Math.min(offset + pageSize, records.length) };
}

export function courseDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}
