export type UserRole = "user" | "admin";

export type ComplaintStatus = "pending" | "in_review" | "resolved" | "rejected";

export type UrgencyLevel = "low" | "medium" | "high" | "critical";

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  address_street: string | null;
  address_kelurahan: string | null;
  address_kecamatan: string | null;
  address_city: string;
  address_province: string;
  address_postal_code: string | null;
  date_joined: string;
  updated_at: string;
}

export interface UserSummary {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
}

export interface NamedEntity {
  text: string;
  label: string;
  score: number;
}

export interface AdminNote {
  id: number;
  admin: UserSummary;
  note: string;
  status_change: ComplaintStatus | null;
  created_at: string;
}

export interface StatusHistoryEntry {
  id: number;
  old_status: ComplaintStatus;
  new_status: ComplaintStatus;
  changed_by: UserSummary;
  note: string | null;
  changed_at: string;
}

export interface Complaint {
  id: number;
  user: UserSummary;
  category: Category | null;
  assigned_to: UserSummary | null;
  original_text: string;
  photo_url: string | null;
  wilayah: string;
  latitude: number | null;
  longitude: number | null;
  detected_dialect: string;
  translated_text: string | null;
  summary: string | null;
  named_entities: NamedEntity[];
  keywords: string[];
  urgency_level: UrgencyLevel;
  nlp_confidence: number;
  status: ComplaintStatus;
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  admin_notes?: AdminNote[];
  status_history?: StatusHistoryEntry[];
}

export interface MapPoint {
  id: number;
  latitude: number;
  longitude: number;
  wilayah: string;
  status: ComplaintStatus;
  urgency_level: UrgencyLevel;
  category__name: string | null;
}

export interface DashboardStats {
  total: number;
  pending: number;
  in_review: number;
  resolved: number;
  critical: number;
  high: number;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthResponse extends AuthTokens {
  user: UserSummary;
}

export interface RegisterPayload {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  password_confirm: string;
  address_city: string;
  address_province: string;
  address_street?: string;
  address_kelurahan?: string;
  address_kecamatan?: string;
  address_postal_code?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
  errors?: Record<string, string[]>;
}
