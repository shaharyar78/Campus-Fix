export interface ChatMessage {
  id: string;
  college_id: string;
  report_id: string | null;
  sender_id: string;
  body: string;
  created_at: string;
  sender?: {
    id: string;
    full_name: string | null;
    email: string | null;
    role: string;
  } | null;
}
