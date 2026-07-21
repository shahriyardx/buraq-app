export type NavItem = {
  label: string;
  href: string;
  icon: string; // lucide icon key, mapped in the client shell
};

export const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: "home" },
  { label: "Students", href: "/admin/students", icon: "users" },
  { label: "Instructors", href: "/admin/instructors", icon: "clipboard" },
  { label: "Attendance", href: "/admin/attendance", icon: "calendar-check" },
  { label: "Courses", href: "/admin/courses", icon: "book-open" },
  { label: "Certificates", href: "/admin/certificates", icon: "award" },
  { label: "Invoices", href: "/admin/invoices", icon: "receipt" },
  { label: "Announcements", href: "/admin/announcements", icon: "megaphone" },
  { label: "Support", href: "/admin/support", icon: "life-buoy" },
  { label: "Settings", href: "/admin/settings", icon: "settings" },
];

export const instructorNav: NavItem[] = [
  { label: "Dashboard", href: "/instructor", icon: "home" },
  { label: "My Courses", href: "/instructor/courses", icon: "book-open" },
  { label: "Schedule", href: "/instructor/schedule", icon: "calendar-check" },
  { label: "Attendance", href: "/instructor/attendance", icon: "clipboard" },
  { label: "Students", href: "/instructor/students", icon: "users" },
  { label: "Settings", href: "/instructor/settings", icon: "settings" },
];

export const studentNav: NavItem[] = [
  { label: "Dashboard", href: "/student", icon: "home" },
  {
    label: "My Attendance",
    href: "/student/attendance",
    icon: "calendar-check",
  },
  { label: "My Courses", href: "/student/courses", icon: "book-open" },
  { label: "Certificates", href: "/student/certificates", icon: "award" },
  { label: "Invoices", href: "/student/invoices", icon: "receipt" },
  { label: "Support", href: "/student/support", icon: "life-buoy" },
  { label: "Settings", href: "/student/settings", icon: "settings" },
];
