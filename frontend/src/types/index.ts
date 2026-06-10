export type UserRole = "user" | "admin";

export type ComplaintStatus = "pending" | "in_review" | "in_progress" | "resolved" | "rejected";

export type UrgencyLevel = "low" | "medium" | "high" | "critical";

export type ProcessingStage =
  | "queued"
  | "detecting"
  | "translating"
  | "summarizing"
  | "extracting"
  | "done"
  | "failed";

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  is_active?: boolean;
  address_street: string | null;
  address_kelurahan: string | null;
  address_kecamatan: string | null;
  address_city: string;
  address_province: string;
  address_postal_code: string | null;
  date_joined: string;
  updated_at: string;
  complaints_total?: number;
  complaints_pending?: number;
  complaints_resolved?: number;
  last_activity?: string | null;
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
  processing_stage: ProcessingStage;
  processing_error: string | null;
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
  in_progress: number;
  resolved: number;
  critical: number;
  high: number;
  by_status: Record<string, number>;
  by_urgency: Record<string, number>;
  by_category: { name: string; count: number }[];
  by_province: { province: string; count: number }[];
  by_dialect: Record<string, number>;
  monthly_trend: { month: string; label: string; count: number }[];
  weekly_trend: { week: string; count: number }[];
}

export type AdminSettingType = "boolean" | "choice" | "csv";

export interface AdminSetting {
  key: string;
  value: string;
  source: "environment" | "database";
  label: string;
  description: string;
  type: AdminSettingType;
  choices: string[];
  updated_at: string | null;
  updated_by: string | null;
}

export interface AdminModelStatus {
  loading?: boolean;
  loaded?: boolean;
  failed?: boolean;
  load_ms?: number;
  elapsed_ms?: number;
  error?: string;
}

export interface AdminSettingsResponse {
  settings: AdminSetting[];
  model_status: Record<string, AdminModelStatus>;
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

export interface Notification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  complaint_id: number | null;
  created_at: string;
}

export interface NotificationResponse {
  results: Notification[];
  unread: number;
}
