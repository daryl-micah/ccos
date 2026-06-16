// Shared types mirroring the FastAPI backend (apps/api/app/schemas).

export type CampaignStatus = "draft" | "active" | "completed";

export type CampaignInfluencerStatus =
  | "planned"
  | "negotiating"
  | "confirmed"
  | "posted"
  | "completed";

export type DeliverableType =
  | "reel"
  | "story"
  | "carousel"
  | "youtube_short"
  | "youtube_video";

export type DeliverableStatus = "pending" | "posted" | "completed";

export type Platform = "instagram" | "youtube" | "other";

export type MetricSource =
  | "manual"
  | "instagram"
  | "youtube"
  | "firebase"
  | "appsflyer"
  | "branch"
  | "calculated";

interface Timestamped {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface Campaign extends Timestamped {
  name: string;
  brand: string | null;
  objective: string | null;
  budget: string | null;
  status: CampaignStatus;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
}

export interface Influencer extends Timestamped {
  name: string;
  instagram_username: string | null;
  youtube_channel: string | null;
  city: string | null;
  country: string | null;
  category: string | null;
  language: string | null;
  manager_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
}

export interface CampaignInfluencer extends Timestamped {
  campaign_id: string;
  influencer_id: string;
  cost: string | null;
  deliverables: string | null;
  status: CampaignInfluencerStatus;
  remarks: string | null;
}

export interface Deliverable extends Timestamped {
  campaign_influencer_id: string;
  type: DeliverableType;
  quantity: number;
  due_date: string | null;
  posted_date: string | null;
  status: DeliverableStatus;
  link: string | null;
}

export interface Post extends Timestamped {
  campaign_influencer_id: string;
  deliverable_id: string | null;
  url: string;
  platform: Platform;
  posted_at: string | null;
  notes: string | null;
}

export interface Metric extends Timestamped {
  campaign_influencer_id: string;
  post_id: string | null;
  metric_name: string;
  metric_value: string;
  source: MetricSource;
  captured_at: string;
}
