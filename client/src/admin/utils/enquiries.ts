import type { EnquiryStatus } from "../../api/enquiries";
export type EnquiryFilter = EnquiryStatus | "ALL";
export type EnquirySort = "NEWEST" | "OLDEST" | "NEW_FIRST";
type EnquiryRecord = { name: string; phone: string; course: string; message: string | null; status: EnquiryStatus; createdAt: string };
export function enquiryCounts(records: EnquiryRecord[]) {
  return records.reduce((counts, record) => { counts.ALL++; counts[record.status]++; return counts; }, { ALL: 0, NEW: 0, CONTACTED: 0, CLOSED: 0 });
}
export function enquiryCourseNames(value: string): string[] {
  return value.split(",").map(name => name.trim()).filter(Boolean);
}

export function filterEnquiries<T extends EnquiryRecord>(records: T[], criteria: { search: string; status: EnquiryFilter; course: string; sort: EnquirySort }): T[] {
  const search = criteria.search.trim().toLowerCase();
  const phoneSearch = /^[+\d\s().-]+$/.test(search) ? search.replace(/\D/g, "") : "";
  return records.filter(record => {
    const text = `${record.name} ${record.phone} ${record.course} ${record.message ?? ""}`.toLowerCase();
    return (criteria.status === "ALL" || record.status === criteria.status)
      && (!criteria.course || enquiryCourseNames(record.course).includes(criteria.course))
      && (!search || text.includes(search) || (phoneSearch.length >= 4 && record.phone.replace(/\D/g, "").includes(phoneSearch)));
  }).sort((a, b) => {
    if (criteria.sort === "NEW_FIRST" && a.status !== b.status) {
      const priority = { NEW: 0, CONTACTED: 1, CLOSED: 2 };
      return priority[a.status] - priority[b.status];
    }
    const difference = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return criteria.sort === "OLDEST" ? -difference : difference;
  });
}
export function paginateEnquiries<T>(records: T[], page: number, pageSize = 10) {
  const pageCount = Math.max(1, Math.ceil(records.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const start = (currentPage - 1) * pageSize;
  return { records: records.slice(start, start + pageSize), currentPage, pageCount, start: records.length ? start + 1 : 0, end: Math.min(start + pageSize, records.length) };
}

export const enquiryStatusLabels: Record<EnquiryStatus, string> = { NEW: "New", CONTACTED: "Contacted", CLOSED: "Closed" };
export function formatEnquiryDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
