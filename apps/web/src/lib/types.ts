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
  youtube_channel_id: string | null;
  city: string | null;
  country: string | null;
  category: string | null;
  language: string | null;
  manager_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
}

export interface Agency extends Timestamped {
  name: string;
  notes: string | null;
}

export interface CampaignInfluencer extends Timestamped {
  campaign_id: string;
  influencer_id: string;
  agency_id: string | null; // null = in-house ("closed by")
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
  campaign_influencer_id: string | null;
  influencer_id: string | null;
  post_id: string | null;
  metric_name: string;
  metric_value: string;
  source: MetricSource;
  captured_at: string;
}

export interface PostMetricsResult {
  likes: number | null;
  comments: number | null;
  views: number | null;
  engagement_rate: number | null;
  engagement_rate_reach: number | null;
  followers: number | null;
  subscribers: number | null;
  posted_at: string | null;
  shares_available: boolean;
  metrics: Metric[];
}

// --- Trends / historical tracking (Phase 5) ---

export interface TrendPoint {
  captured_at: string;
  value: number;
}

export type Trends = Record<string, TrendPoint[]>;

// --- Instagram (Phase 3) ---

export interface InstagramPost {
  shortcode: string;
  likes: number;
  comments: number;
  timestamp: string;
  caption: string;
  url: string;
}

export interface InstagramSyncResult {
  username: string;
  is_private: boolean;
  followers: number;
  following: number;
  post_count: number;
  avg_likes: number;
  avg_comments: number;
  engagement_rate: number;
  engagement_rate_reach: number | null;
  posting_frequency: number;
  top_posts: InstagramPost[];
  metrics: Metric[];
}

// --- YouTube (Phase 4) ---

export interface YouTubeStatus {
  configured: boolean;
}

export interface YouTubeVideo {
  video_id: string;
  title: string;
  url: string;
  published_at: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
}

export interface YouTubeSyncResult {
  channel_id: string;
  title: string;
  handle: string | null;
  subscribers: number | null;
  total_views: number | null;
  video_count: number | null;
  avg_views: number;
  avg_likes: number | null;
  avg_comments: number | null;
  engagement_rate: number | null;
  engagement_rate_reach: number | null;
  upload_frequency: number;
  top_videos: YouTubeVideo[];
  metrics: Metric[];
}

// --- Analytics (Phase 6) ---

export interface CreatorRanking {
  influencer_id: string;
  name: string;
  city: string | null;
  category: string | null;
  campaigns: number;
  spend: number;
  revenue: number;
  roas: number | null;
  cpv: number | null;
  avg_engagement_rate: number | null;
  repeat_candidate: boolean;
}

export interface GroupRanking {
  creators: number;
  spend: number;
  revenue: number;
  roas: number | null;
  cpv: number | null;
  avg_engagement_rate: number | null;
  city?: string;
  category?: string;
}

// --- AI insights (Phase 8) ---

export interface AIStatus {
  configured: boolean;
  provider: string;
  model: string;
}

export interface AIRecommendation {
  question: string;
  answer: string;
}

export interface AIInsights {
  summary: string;
  insights: string[];
  recommendations: AIRecommendation[];
  model: string;
}

export interface CampaignRanking {
  campaign_id: string;
  name: string;
  status: string | null;
  creators: number;
  spend: number;
  revenue: number;
  roas: number | null;
  avg_engagement_rate: number | null;
}
