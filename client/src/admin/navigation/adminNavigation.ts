import type { LucideIcon } from "lucide-react";

import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  ReceiptText,
  Settings,
  Users,
  WalletCards,
} from "lucide-react";

export type AdminRole = "SUPER_ADMIN" | "ADMIN" | "STAFF";

type AdminNavigationItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  roles: AdminRole[];
};

export const adminNavigation: AdminNavigationItem[] = [
  {
    label: "Dashboard",
    path: "/admin/dashboard",
    icon: LayoutDashboard,
    roles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
  },
  {
    label: "Enquiries",
    path: "/admin/enquiries",
    icon: FileText,
    roles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
  },
  {
    label: "Students",
    path: "/admin/students",
    icon: GraduationCap,
    roles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
  },
  {
    label: "Courses",
    path: "/admin/courses",
    icon: BookOpen,
    roles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
  },
  {
    label: "Batches",
    path: "/admin/batches",
    icon: CalendarDays,
    roles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
  },
  {
    label: "Attendance",
    path: "/admin/attendance",
    icon: ClipboardCheck,
    roles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
  },
  {
    label: "Fees",
    path: "/admin/fees",
    icon: WalletCards,
    roles: ["SUPER_ADMIN"],
  },
  {
    label: "Payments",
    path: "/admin/payments",
    icon: CreditCard,
    roles: ["SUPER_ADMIN"],
  },
  {
    label: "Expenses",
    path: "/admin/expenses",
    icon: ReceiptText,
    roles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
  },
  {
    label: "Staff",
    path: "/admin/staff",
    icon: Users,
    roles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
  },
  {
    label: "Reports",
    path: "/admin/reports",
    icon: BarChart3,
    roles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
  },
  {
    label: "Settings",
    path: "/admin/settings",
    icon: Settings,
    roles: ["SUPER_ADMIN"],
  },
];
