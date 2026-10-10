import type { CreateStudentInput, Student } from "./students";
import { API_URL } from "./config";
export type EnquiryStatus = "NEW" | "CONTACTED" | "CLOSED";
export type Enquiry = {
  id: string; name: string; phone: string; course: string; message: string | null;
  studentId?: string | null; student?: { id: string; admissionNumber: string } | null;
  status: EnquiryStatus; createdAt: string; updatedAt: string;
};
export type CreateEnquiryInput = {
  requestId: string; name: string; phone: string; course: string; message: string;
};
async function request(path = "", input?: object, method = "GET") {
  const response = await fetch(`${API_URL}/api/enquiries${path}`, {
    method, credentials: "include",
    ...(input && { headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.success) throw new Error(result?.message ?? "Unable to submit your enquiry. Please try again or contact us directly.");
  return result.data;
}
export async function submitEnquiry(input: CreateEnquiryInput): Promise<{ id: string }> { return request("", input, "POST"); }
export async function fetchEnquiries(): Promise<Enquiry[]> { return (await request()).enquiries; }
export async function updateEnquiryStatus(id: string, status: EnquiryStatus): Promise<Enquiry> { return (await request(`/${id}`, { status }, "PATCH")).enquiry; }

export async function admitEnquiry(id: string, input: CreateStudentInput): Promise<{ student: Student; enquiry: Enquiry }> { return request(`/${id}/admit`, input, "POST"); }
