import type { Appointment, Doctor, Role, Slot, User } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
const DEMO_TOKEN = "local-demo-token";

type LoginResponse = { user: User; token: string };
type AppointmentsResponse = { appointments: Appointment[] };
type DoctorsResponse = { doctors: Doctor[] };
type DoctorResponse = { doctor: Doctor };
type SlotsResponse = { slots: Slot[] };
type HoldResponse = { hold: { id: string; expiresAt: string } };

function token() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("authToken");
}

function saveDemoUser(user: User) {
  localStorage.setItem("demoUser", JSON.stringify(user));
}

function demoUser(): User {
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem("demoUser");
    if (raw) return JSON.parse(raw) as User;
  }
  return {
    id: "user-patient",
    email: "patient@demo.local",
    name: "Arshan Patient",
    role: "PATIENT",
    calendarConnected: false,
  };
}

const demoDoctors: Doctor[] = [
  {
    id: "doctor-1",
    specialization: "Internal Medicine",
    slotDuration: 30,
    workingHours: {},
    user: { id: "user-doctor-1", email: "doctor@demo.local", name: "Dr. Mira Shah" },
  },
  {
    id: "doctor-2",
    specialization: "Cardiology",
    slotDuration: 20,
    workingHours: {},
    user: { id: "user-doctor-2", email: "cardio@demo.local", name: "Dr. Neil Rao" },
  },
  {
    id: "doctor-3",
    specialization: "Dermatology",
    slotDuration: 20,
    workingHours: {},
    user: { id: "user-doctor-3", email: "skin@demo.local", name: "Dr. Sana Iyer" },
  },
];

function tomorrowAt(hour: number, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function later(start: string, minutes: number) {
  return new Date(new Date(start).getTime() + minutes * 60_000).toISOString();
}

function demoAppointments(): Appointment[] {
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem("demoAppointments");
    if (raw) return JSON.parse(raw) as Appointment[];
  }
  const slotStart = tomorrowAt(10, 30);
  return [
    {
      id: "appointment-1",
      slotStart,
      slotEnd: later(slotStart, 30),
      status: "CONFIRMED",
      patient: { id: "user-patient", email: "patient@demo.local", name: "Arshan Patient" },
      doctor: {
        id: demoDoctors[0].id,
        specialization: demoDoctors[0].specialization,
        user: demoDoctors[0].user,
      },
      symptomForm: { symptoms: "Mild fever and throat pain for two days." },
      preVisit: {
        status: "READY",
        urgency: "Low",
        chiefComplaint: "Sore throat with mild fever",
        suggestedQuestions: ["Any cough?", "Any recent travel?", "Any known allergies?"],
      },
      postVisit: {
        status: "PENDING",
        summary: null,
        medicationSchedule: [],
        followUpSteps: [],
      },
    },
  ];
}

function saveDemoAppointments(appointments: Appointment[]) {
  localStorage.setItem("demoAppointments", JSON.stringify(appointments));
}

function roleFromEmail(email: string): Role {
  if (email.toLowerCase().includes("admin")) return "ADMIN";
  if (email.toLowerCase().includes("doctor")) return "DOCTOR";
  return "PATIENT";
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  const t = token();
  if (t) headers.set("Authorization", `Bearer ${t}`);

  try {
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (response.status === 204) return undefined as T;
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new ApiError(response.status, body.error?.code || "ERROR", body.error?.message || "Request failed");
    }
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    return demoRequest<T>(path, options);
  }
}

async function demoRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, 180));
  const method = options.method || "GET";
  const body = options.body ? JSON.parse(String(options.body)) : {};

  if (path === "/auth/me") return { user: demoUser() } as T;
  if (path === "/auth/login" && method === "POST") {
    const role = roleFromEmail(body.email || "");
    const user: User = {
      id: `user-${role.toLowerCase()}`,
      email: body.email || "patient@demo.local",
      name: role === "ADMIN" ? "Clinic Admin" : role === "DOCTOR" ? "Demo Doctor" : "Arshan Patient",
      role,
      doctorProfileId: role === "DOCTOR" ? "doctor-1" : null,
      calendarConnected: false,
    };
    saveDemoUser(user);
    return { user, token: DEMO_TOKEN } as T;
  }
  if (path === "/auth/register" && method === "POST") {
    const user: User = {
      id: "user-patient",
      email: body.email,
      name: body.name || "Patient",
      role: "PATIENT",
      calendarConnected: false,
    };
    saveDemoUser(user);
    return { user, token: DEMO_TOKEN } as T;
  }
  if (path.startsWith("/doctors/") && !path.includes("available")) {
    return { doctor: demoDoctors.find((doctor) => path.endsWith(doctor.id)) || demoDoctors[0] } as T;
  }
  if (path.startsWith("/doctors")) return { doctors: demoDoctors } as T;
  if (path.startsWith("/appointments/available-slots")) {
    const start = tomorrowAt(9, 0);
    const slots = [0, 30, 60, 120, 180].map((offset) => {
      const slotStart = new Date(new Date(start).getTime() + offset * 60_000).toISOString();
      return { start: slotStart, end: later(slotStart, 30) };
    });
    return { slots } as T;
  }
  if (path === "/appointments/holds" && method === "POST") {
    return { hold: { id: `hold-${Date.now()}`, expiresAt: later(body.slotStart, 10) } } as T;
  }
  if (path === "/appointments/book" && method === "POST") {
    const appointments = demoAppointments();
    const doctor = demoDoctors[0];
    const slotStart = tomorrowAt(11, 30);
    appointments.unshift({
      id: `appointment-${Date.now()}`,
      slotStart,
      slotEnd: later(slotStart, doctor.slotDuration),
      status: "CONFIRMED",
      patient: demoUser(),
      doctor: { id: doctor.id, specialization: doctor.specialization, user: doctor.user },
      symptomForm: { symptoms: body.symptoms || "Symptoms shared during booking." },
      preVisit: { status: "READY", urgency: "Low", chiefComplaint: "New booking", suggestedQuestions: [] },
      postVisit: { status: "PENDING", medicationSchedule: [], followUpSteps: [] },
    });
    saveDemoAppointments(appointments);
    return { appointment: appointments[0] } as T;
  }
  if (path === "/appointments") return { appointments: demoAppointments() } as T;
  if (path.startsWith("/appointments/") && method === "GET") {
    const id = path.split("/")[2];
    return { appointment: demoAppointments().find((apt) => apt.id === id) || demoAppointments()[0] } as T;
  }
  if (path.includes("/cancel") || path.includes("/reschedule")) {
    return { appointment: demoAppointments()[0] } as T;
  }
  if (path.includes("/post-visit-notes") || path.includes("/regenerate")) {
    return { appointment: demoAppointments()[0] } as T;
  }
  if (path === "/calendar/connect") return { url: "/settings/calendar?connected=0" } as T;
  if (path === "/admin/statistics") {
    return { statistics: { patients: 42, doctors: demoDoctors.length, confirmedVisits: 18, needsReschedule: 2 } } as T;
  }
  if (path === "/admin/users") {
    return {
      users: [
        demoUser(),
        ...demoDoctors.map((doctor) => ({ ...doctor.user, role: "DOCTOR" as Role })),
        { id: "admin-1", email: "admin@demo.local", name: "Clinic Admin", role: "ADMIN" as Role },
      ],
    } as T;
  }
  if (path === "/admin/appointments") return { appointments: demoAppointments() } as T;
  if (path === "/admin/doctors") return { doctors: demoDoctors } as T;
  if (path.startsWith("/admin/doctors")) return { doctor: demoDoctors[0] } as T;

  throw new ApiError(404, "DEMO_NOT_FOUND", "Demo data is not available for this action yet.");
}

export const api = {
  setToken(value: string) {
    localStorage.setItem("authToken", value);
  },
  clearToken() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("demoUser");
  },
  register: (data: { email: string; password: string; name: string }) =>
    request<LoginResponse>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (email: string, password: string) =>
    request<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => request<{ user: User }>("/auth/me"),
  doctors: (specialization?: string) =>
    request<DoctorsResponse>(`/doctors${specialization ? `?specialization=${encodeURIComponent(specialization)}` : ""}`),
  doctor: (id: string) => request<DoctorResponse>(`/doctors/${id}`),
  slots: (doctorId: string, date: string) =>
    request<SlotsResponse>(`/appointments/available-slots?doctorId=${doctorId}&date=${date}`),
  hold: (doctorId: string, slotStart: string) =>
    request<HoldResponse>("/appointments/holds", { method: "POST", body: JSON.stringify({ doctorId, slotStart }) }),
  book: (data: { holdId: string; symptoms: string }) =>
    request<{ appointment: Appointment }>("/appointments/book", { method: "POST", body: JSON.stringify(data) }),
  appointments: () => request<AppointmentsResponse>("/appointments"),
  appointment: (id: string) => request<{ appointment: Appointment }>(`/appointments/${id}`),
  cancel: (id: string) => request<{ appointment: Appointment }>(`/appointments/${id}/cancel`, { method: "POST" }),
  reschedule: (id: string, slotStart: string) =>
    request<{ appointment: Appointment }>(`/appointments/${id}/reschedule`, { method: "POST", body: JSON.stringify({ slotStart }) }),
  notes: (id: string, body: object) =>
    request<{ appointment: Appointment }>(`/appointments/${id}/post-visit-notes`, { method: "POST", body: JSON.stringify(body) }),
  regeneratePre: (id: string) => request<{ appointment: Appointment }>(`/appointments/${id}/pre-visit/regenerate`, { method: "POST" }),
  regeneratePost: (id: string) => request<{ appointment: Appointment }>(`/appointments/${id}/post-visit/regenerate`, { method: "POST" }),
  calendarConnect: () => request<{ url: string }>("/calendar/connect"),
  adminStats: () => request<{ statistics: Record<string, number> }>("/admin/statistics"),
  adminUsers: () => request<{ users: User[] }>("/admin/users"),
  adminAppointments: () => request<AppointmentsResponse>("/admin/appointments"),
  adminDoctors: () => request<DoctorsResponse>("/admin/doctors"),
  createDoctor: (body: object) => request<DoctorResponse>("/admin/doctors", { method: "POST", body: JSON.stringify(body) }),
  updateDoctor: (id: string, body: object) =>
    request<DoctorResponse>(`/admin/doctors/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteDoctor: (id: string) => request<void>(`/admin/doctors/${id}`, { method: "DELETE" }),
  addLeave: (doctorId: string, date: string, reason?: string) =>
    request<{ leaveDay: unknown }>(`/admin/doctors/${doctorId}/leave`, { method: "POST", body: JSON.stringify({ date, reason }) }),
};

export default api;
