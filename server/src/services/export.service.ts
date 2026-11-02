import ExcelJS from "exceljs";

import { prisma } from "../config/database.js";

export const EXPORT_DATASETS = ["students", "enquiries", "batches", "fees", "payments"] as const;
export type ExportDataset = (typeof EXPORT_DATASETS)[number];

const TIME_ZONE = "Asia/Kolkata";
const WEEKDAY_LABELS: Record<string, string> = { MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu", FRI: "Fri", SAT: "Sat", SUN: "Sun" };
const SOURCE_LABELS: Record<string, string> = { WALK_IN: "Walk-in", ENQUIRY: "Website enquiry", IMPORT: "Excel import" };

function date(value: Date | null | undefined, withTime = false) {
  if (!value) return "";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: withTime ? TIME_ZONE : "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime && { hour: "2-digit", minute: "2-digit" }),
  }).format(value);
}

function time(minutes: number) {
  const hours = Math.floor(minutes / 60);

  return `${hours % 12 || 12}:${String(minutes % 60).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`;
}

function name(person: { firstName: string; lastName: string | null } | null | undefined) {
  return person ? [person.firstName, person.lastName].filter(Boolean).join(" ") : "";
}

const rupees = (paise: number) => paise / 100;

type Column = { header: string; key: string; width: number; rupees?: boolean };

async function rows(dataset: ExportDataset): Promise<{ title: string; columns: Column[]; data: Record<string, unknown>[] }> {
  if (dataset === "students") {
    const students = await prisma.student.findMany({
      include: {
        batch: { select: { name: true } },
        admittedBy: { select: { firstName: true, lastName: true } },
        enrollments: { where: { status: "ACTIVE" }, select: { course: { select: { title: true } } } },
      },
      orderBy: { createdAt: "asc" },
    });

    return {
      title: "Students",
      columns: [
        { header: "Admission no.", key: "admissionNumber", width: 16 },
        { header: "First name", key: "firstName", width: 18 },
        { header: "Last name", key: "lastName", width: 18 },
        { header: "Phone", key: "phone", width: 18 },
        { header: "Email", key: "email", width: 26 },
        { header: "Date of birth", key: "dateOfBirth", width: 14 },
        { header: "Gender", key: "gender", width: 10 },
        { header: "Address", key: "address", width: 34 },
        { header: "Status", key: "status", width: 12 },
        { header: "Active courses", key: "courses", width: 36 },
        { header: "Batch", key: "batch", width: 16 },
        { header: "Admitted through", key: "source", width: 18 },
        { header: "Admitted by", key: "admittedBy", width: 18 },
        { header: "Admitted on", key: "createdAt", width: 20 },
      ],
      data: students.map((student) => ({
        admissionNumber: student.admissionNumber,
        firstName: student.firstName,
        lastName: student.lastName ?? "",
        phone: student.phone,
        email: student.email ?? "",
        dateOfBirth: date(student.dateOfBirth),
        gender: student.gender ?? "",
        address: student.address ?? "",
        status: student.status,
        courses: student.enrollments.map((enrollment) => enrollment.course.title).join(", "),
        batch: student.batch?.name ?? "",
        source: student.admissionSource ? SOURCE_LABELS[student.admissionSource] : "",
        admittedBy: name(student.admittedBy),
        createdAt: date(student.createdAt, true),
      })),
    };
  }

  if (dataset === "enquiries") {
    const enquiries = await prisma.enquiry.findMany({
      include: { student: { select: { admissionNumber: true } } },
      orderBy: { createdAt: "asc" },
    });

    return {
      title: "Enquiries",
      columns: [
        { header: "Received", key: "createdAt", width: 20 },
        { header: "Name", key: "name", width: 22 },
        { header: "Phone", key: "phone", width: 18 },
        { header: "Email", key: "email", width: 26 },
        { header: "Course", key: "course", width: 32 },
        { header: "Message", key: "message", width: 50 },
        { header: "Status", key: "status", width: 12 },
        { header: "Admitted as", key: "admittedAs", width: 16 },
      ],
      data: enquiries.map((enquiry) => ({
        createdAt: date(enquiry.createdAt, true),
        name: enquiry.name,
        phone: enquiry.phone,
        email: enquiry.email ?? "",
        course: enquiry.course,
        message: enquiry.message ?? "",
        status: enquiry.status,
        admittedAs: enquiry.student?.admissionNumber ?? "",
      })),
    };
  }

  if (dataset === "batches") {
    const batches = await prisma.batch.findMany({
      include: { instructor: { select: { firstName: true, lastName: true } }, _count: { select: { students: true } } },
      orderBy: [{ startMinutes: "asc" }, { name: "asc" }],
    });

    return {
      title: "Batches",
      columns: [
        { header: "Batch", key: "name", width: 22 },
        { header: "Days", key: "days", width: 30 },
        { header: "Starts", key: "start", width: 10 },
        { header: "Ends", key: "end", width: 10 },
        { header: "Students", key: "students", width: 10 },
        { header: "Capacity", key: "capacity", width: 10 },
        { header: "Instructor", key: "instructor", width: 20 },
        { header: "Status", key: "status", width: 10 },
      ],
      data: batches.map((batch) => ({
        name: batch.name,
        days: batch.days.map((day) => WEEKDAY_LABELS[day]).join(", "),
        start: time(batch.startMinutes),
        end: time(batch.endMinutes),
        students: batch._count.students,
        capacity: batch.capacity,
        instructor: name(batch.instructor),
        status: batch.isActive ? "Active" : "Archived",
      })),
    };
  }

  if (dataset === "fees") {
    const plans = await prisma.feePlan.findMany({
      include: { payments: true, enrollment: { include: { student: true, course: true } } },
      orderBy: { createdAt: "asc" },
    });

    return {
      title: "Fee plans",
      columns: [
        { header: "Admission no.", key: "admissionNumber", width: 16 },
        { header: "Student", key: "student", width: 22 },
        { header: "Course", key: "course", width: 32 },
        { header: "Total fee (₹)", key: "total", width: 14, rupees: true },
        { header: "Discount (₹)", key: "discount", width: 14, rupees: true },
        { header: "Paid (₹)", key: "paid", width: 14, rupees: true },
        { header: "Balance (₹)", key: "balance", width: 14, rupees: true },
        { header: "Due date", key: "dueDate", width: 14 },
        { header: "Status", key: "status", width: 12 },
      ],
      data: plans.map((plan) => {
        const paid = plan.payments.reduce((sum, payment) => sum + payment.amountPaise, 0);

        return {
          admissionNumber: plan.enrollment.student.admissionNumber,
          student: name(plan.enrollment.student),
          course: plan.enrollment.course.title,
          total: rupees(plan.totalFeePaise),
          discount: rupees(plan.discountPaise),
          paid: rupees(paid),
          balance: rupees(Math.max(0, plan.totalFeePaise - plan.discountPaise - paid)),
          dueDate: date(plan.dueDate),
          status: plan.status,
        };
      }),
    };
  }

  const payments = await prisma.payment.findMany({
    include: { feePlan: { include: { enrollment: { include: { student: true, course: true } } } } },
    orderBy: { receiptNumber: "asc" },
  });

  return {
    title: "Payments",
    columns: [
      { header: "Receipt", key: "receipt", width: 14 },
      { header: "Paid on", key: "paidAt", width: 14 },
      { header: "Admission no.", key: "admissionNumber", width: 16 },
      { header: "Student", key: "student", width: 22 },
      { header: "Course", key: "course", width: 32 },
      { header: "Amount (₹)", key: "amount", width: 14, rupees: true },
      { header: "Method", key: "method", width: 14 },
      { header: "Reference", key: "reference", width: 20 },
      { header: "Notes", key: "notes", width: 30 },
    ],
    data: payments.map((payment) => ({
      receipt: `LCI-${String(payment.receiptNumber).padStart(6, "0")}`,
      paidAt: date(payment.paidAt),
      admissionNumber: payment.feePlan.enrollment.student.admissionNumber,
      student: name(payment.feePlan.enrollment.student),
      course: payment.feePlan.enrollment.course.title,
      amount: rupees(payment.amountPaise),
      method: payment.method.replace("_", " "),
      reference: payment.reference ?? "",
      notes: payment.notes ?? "",
    })),
  };
}

// One sheet with a bold, frozen header row and sensible column widths.
export async function buildExport(dataset: ExportDataset) {
  const { title, columns, data } = await rows(dataset);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Learners Admin";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(title, { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = columns.map(({ header, key, width }) => ({ header, key, width }));
  sheet.addRows(data);
  sheet.getRow(1).font = { bold: true };
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

  columns.forEach((column, index) => {
    if (column.rupees) {
      sheet.getColumn(index + 1).numFmt = "#,##0.00";
    }
  });

  const stamp = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());

  return {
    filename: `learners-${dataset}-${stamp}.xlsx`,
    rowCount: data.length,
    buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
  };
}
