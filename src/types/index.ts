export type UserRole = 'Yönetici' | 'Satış' | 'Operasyon' | 'Görüntüleme';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  phone?: string;
}

export type LeadPriority = 'Yüksek' | 'Orta' | 'Düşük';

export type LeadStatus =
  | 'Yeni'
  | 'İlk Temas'
  | 'Takipte'
  | 'Görüşme Planlandı'
  | 'Teklif Gönderildi'
  | 'Kazanıldı'
  | 'Kaybedildi';

export interface Lead {
  id: string;
  company_name: string;
  sector: string;
  city_district: string;
  website?: string;
  instagram?: string;
  phone: string;
  email?: string;
  decision_maker: string;
  source_url?: string;
  priority: LeadPriority;
  status: LeadStatus;
  assigned_to: string; // TeamMember ID
  assigned_name: string;
  last_contact_date?: string;
  next_step_date?: string;
  contact_reason?: string;
  recommended_package?: string;
  first_contact_text?: string;
  mini_audit_notes?: string;
  contact_verification_status?: 'Araştırılacak' | 'Kısmi Doğrulandı' | 'Doğrulandı' | 'Ulaşılamadı';
  website_score?: number;
  social_score?: number;
  booking_score?: number;
  brand_score?: number;
  estimated_deal_value: number;
  win_probability: number; // Percentage 0-100
  expected_revenue: number; // estimated_deal_value * (win_probability / 100)
  monthly_fee?: number;
  delivery_cost?: number;
  recurring_months?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  user_id: string;
  user_name: string;
  type: 'Arama' | 'Toplantı' | 'Not' | 'E-posta' | 'Teklif Gönderildi' | 'Durum Değişikliği';
  description: string;
  created_at: string;
}

export type ProposalStatus = 'Taslak' | 'Gönderildi' | 'Revizyon' | 'Kabul' | 'Reddedildi';

export interface Proposal {
  id: string;
  lead_id?: string;
  lead_name: string;
  title: string;
  service_package: string;
  amount: number;
  date_sent: string;
  valid_until: string;
  status: ProposalStatus;
  estimated_close_date?: string;
  notes?: string;
  follow_up_reminder_date?: string;
  created_by?: string;
  created_at: string;
}

export type ProjectStatus =
  | 'Başlamadı'
  | 'Devam Ediyor'
  | 'Müşteri Bekleniyor'
  | 'Revizyon'
  | 'Tamamlandı';

export type PaymentStatus = 'Ödeme Bekliyor' | 'Kısmi Ödendi' | 'Tamamlandı';

export interface Project {
  id: string;
  lead_id?: string;
  proposal_id?: string;
  project_name: string;
  client_name: string;
  service_type: string;
  assigned_to: string;
  assigned_name: string;
  start_date: string;
  deadline: string;
  status: ProjectStatus;
  total_fee: number;
  payment_status: PaymentStatus;
  files_or_links?: string;
  client_notes?: string;
  deliverables?: string;
  delivered_at?: string;
  client_approval_date?: string;
  delivery_notes?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  project_id: string;
  title: string;
  amount: number;
  due_date?: string;
  paid_at?: string;
  status: PaymentStatus;
  notes?: string;
  created_at: string;
}

export interface BusinessExpense {
  id: string;
  project_id?: string;
  vendor: string;
  category: 'Yazılım' | 'Reklam' | 'Çekim & Edit' | 'Freelancer' | 'Vergi & Muhasebe' | 'Operasyon' | 'Diğer';
  description?: string;
  amount: number;
  expense_date: string;
  status: 'Planlandı' | 'Ödendi';
  created_at: string;
}

export interface ProjectChecklistItem {
  id: string;
  project_id: string;
  title: string;
  is_complete: boolean;
  completed_at?: string;
  assigned_to?: string;
  assigned_name?: string;
  due_date?: string;
}

export interface ClientBrand {
  id: string;
  lead_id?: string;
  project_id?: string;
  company_name: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  sector?: string;
  website?: string;
  instagram?: string;
  brand_colors?: string;
  logo_url?: string;
  domain_provider?: string;
  hosting_provider?: string;
  renewal_date?: string;
  notes?: string;
}

export type TaskStatus = 'Yapılacak' | 'Devam Ediyor' | 'Tamamlandı';

export interface Task {
  id: string;
  title: string;
  lead_id?: string;
  project_id?: string;
  assigned_to: string;
  assigned_name: string;
  due_date: string;
  priority: LeadPriority;
  status: TaskStatus;
  created_at: string;
}

export interface MessageTemplate {
  id: string;
  category: string;
  title: string;
  description: string;
  content: string;
  placeholders: string[];
}
