import type { Appointment, Doctor, Slot, User } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

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

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(response.status, body.error?.code || "ERROR", body.error?.message || "Request failed");
  }
  return body as T;
}

export const api = {
  setToken(value: string) {
    localStorage.setItem("authToken", value);
  },
  clearToken() {
    localStorage.removeItem("authToken");
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
  updateUserRole: (userId: string, role: string) =>
    request<{ user: User }>(`/admin/users/${userId}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
};

export default api;
