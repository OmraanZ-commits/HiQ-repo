/* ── Shared user registry ──────────────────────────────────────────
   Single source of truth for all portal users.
   Consumed by: user-management page, people-picker component.
──────────────────────────────────────────────────────────────────── */

export const BUSINESS_GROUPS = [
  "Homecare",
  "Personal Care",
  "Foods",
  "Beauty and Wellness",
  "Others",
] as const;

export type BusinessGroup = (typeof BUSINESS_GROUPS)[number];

export const ROLES = [
  "Admin",
  "Network Planner",
  "Paid Bible Owner",
  "Demand Planner",
  "Supply Planner",
  "Distribution Planner",
  "NCSM",
  "Approver",
  "Viewer",
] as const;

export type Role = (typeof ROLES)[number];

export type PortalUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  businessGroup: BusinessGroup | "";
  isBgLead: boolean;
  isActive: boolean;
  createdAt: string;
};

export const PORTAL_USERS: PortalUser[] = [
  { id: "1",  name: "Rajesh Sharma",   email: "rajesh.sharma@unilever.com",   role: "Admin",            businessGroup: "Homecare",            isBgLead: false, isActive: true,  createdAt: "2025-01-10" },
  { id: "2",  name: "Priya Patel",     email: "priya.patel@unilever.com",     role: "Network Planner",  businessGroup: "Personal Care",       isBgLead: true,  isActive: true,  createdAt: "2025-02-14" },
  { id: "3",  name: "Ankit Verma",     email: "ankit.verma@unilever.com",     role: "Network Planner",  businessGroup: "Homecare",            isBgLead: true,  isActive: true,  createdAt: "2025-02-20" },
  { id: "4",  name: "Sneha Gupta",     email: "sneha.gupta@unilever.com",     role: "Paid Bible Owner", businessGroup: "Foods",               isBgLead: false, isActive: true,  createdAt: "2025-03-01" },
  { id: "5",  name: "Vikram Singh",    email: "vikram.singh@unilever.com",    role: "Approver",         businessGroup: "Beauty and Wellness", isBgLead: false, isActive: true,  createdAt: "2025-03-15" },
  { id: "6",  name: "Meera Nair",      email: "meera.nair@unilever.com",      role: "Approver",         businessGroup: "Personal Care",       isBgLead: false, isActive: true,  createdAt: "2025-04-02" },
  { id: "7",  name: "Arun Mehta",      email: "arun.mehta@unilever.com",      role: "Viewer",           businessGroup: "Foods",               isBgLead: false, isActive: false, createdAt: "2025-04-10" },
  { id: "8",  name: "Deepa Krishnan",  email: "deepa.krishnan@unilever.com",  role: "Paid Bible Owner", businessGroup: "Beauty and Wellness", isBgLead: false, isActive: true,  createdAt: "2025-05-05" },
  { id: "9",  name: "Suresh Rao",      email: "suresh.rao@unilever.com",      role: "Viewer",           businessGroup: "Others",              isBgLead: false, isActive: true,  createdAt: "2025-05-20" },
  { id: "10", name: "Kavitha Reddy",   email: "kavitha.reddy@unilever.com",   role: "Network Planner",  businessGroup: "Homecare",            isBgLead: false, isActive: false, createdAt: "2025-06-01" },
  { id: "11", name: "Ravi Shankar",    email: "ravi.shankar@unilever.com",    role: "Network Planner",  businessGroup: "Foods",               isBgLead: true,  isActive: true,  createdAt: "2025-07-01" },
  { id: "12", name: "Lakshmi Iyer",    email: "lakshmi.iyer@unilever.com",    role: "Network Planner",  businessGroup: "Beauty and Wellness", isBgLead: true,  isActive: true,  createdAt: "2025-07-15" },
  { id: "13", name: "Nikhil Desai",    email: "nikhil.desai@unilever.com",    role: "Network Planner",      businessGroup: "Others",              isBgLead: true,  isActive: true,  createdAt: "2025-08-01" },
  { id: "14", name: "Arjun Kapoor",    email: "arjun.kapoor@unilever.com",    role: "Demand Planner",       businessGroup: "",                    isBgLead: false, isActive: true,  createdAt: "2025-09-01" },
  { id: "15", name: "Sunita Mehrotra", email: "sunita.mehrotra@unilever.com", role: "Supply Planner",       businessGroup: "",                    isBgLead: false, isActive: true,  createdAt: "2025-09-01" },
  { id: "16", name: "Kiran Bose",      email: "kiran.bose@unilever.com",      role: "Distribution Planner", businessGroup: "",                    isBgLead: false, isActive: true,  createdAt: "2025-09-01" },
  { id: "17", name: "Rohit Aggarwal",  email: "rohit.aggarwal@unilever.com",  role: "NCSM",                 businessGroup: "",                    isBgLead: false, isActive: true,  createdAt: "2025-09-01" },
];

/** All active Network Planners in a given BG */
export function networkPlannersForBg(bg: string): PortalUser[] {
  return PORTAL_USERS.filter(
    (u) => u.role === "Network Planner" && u.businessGroup === bg && u.isActive
  );
}
