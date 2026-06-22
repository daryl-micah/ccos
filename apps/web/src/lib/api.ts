import type {
  Agency,
  AIInsights,
  AIStatus,
  Campaign,
  CampaignInfluencer,
  CampaignRanking,
  CreatorRanking,
  Deliverable,
  GroupRanking,
  Influencer,
  InstagramSyncResult,
  Metric,
  Post,
  PostMetricsResult,
  Trends,
} from "./types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function qs(params: Record<string, string | number | undefined | null>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  if (entries.length === 0) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of entries) sp.set(k, String(v));
  return `?${sp.toString()}`;
}

/** Build a typed CRUD resource client. */
function resource<T, C, U>(name: string) {
  return {
    list: (params: Record<string, string | number | undefined | null> = {}) =>
      request<T[]>(`/${name}${qs(params)}`),
    get: (id: string) => request<T>(`/${name}/${id}`),
    create: (data: C) =>
      request<T>(`/${name}`, { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: U) =>
      request<T>(`/${name}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    remove: (id: string) =>
      request<void>(`/${name}/${id}`, { method: "DELETE" }),
  };
}

export const api = {
  campaigns: Object.assign(
    resource<Campaign, Partial<Campaign>, Partial<Campaign>>("campaigns"),
    {
      /** Recompute derived KPIs for every creator in the campaign. */
      recomputeMetrics: (id: string) =>
        request<Metric[]>(`/campaigns/${id}/recompute-metrics`, {
          method: "POST",
        }),
      /** Import an agency's creator list (name/contact/handle) into the campaign. */
      importRoster: async (
        campaignId: string,
        file: File,
        agencyId: string | null,
      ): Promise<RosterImportResult> => {
        const body = new FormData();
        body.append("file", file);
        if (agencyId) body.append("agency_id", agencyId);
        const res = await fetch(
          `${BASE_URL}/campaigns/${campaignId}/import-roster`,
          { method: "POST", body },
        );
        if (!res.ok) {
          let detail = res.statusText;
          try {
            detail = (await res.json()).detail ?? detail;
          } catch {
            // ignore
          }
          throw new ApiError(res.status, detail);
        }
        return res.json() as Promise<RosterImportResult>;
      },
    },
  ),
  agencies: resource<Agency, Partial<Agency>, Partial<Agency>>("agencies"),
  influencers: Object.assign(
    resource<Influencer, Partial<Influencer>, Partial<Influencer>>(
      "influencers",
    ),
    {
      /** Collect Instagram profile + recent-post stats (Phase 3). */
      syncInstagram: (id: string, maxPosts = 30) =>
        request<InstagramSyncResult>(
          `/influencers/${id}/sync-instagram?max_posts=${maxPosts}`,
          { method: "POST" },
        ),
      /** Historical time series of influencer-scoped metrics (Phase 5). */
      trends: (id: string, days = 180) =>
        request<Trends>(`/influencers/${id}/trends?days=${days}`),
    },
  ),
  campaignInfluencers: Object.assign(
    resource<
      CampaignInfluencer,
      Partial<CampaignInfluencer>,
      Partial<CampaignInfluencer>
    >("campaign-influencers"),
    {
      /** Recompute derived KPIs; returns the calculated metric rows. */
      recomputeMetrics: (id: string) =>
        request<Metric[]>(`/campaign-influencers/${id}/recompute-metrics`, {
          method: "POST",
        }),
    },
  ),
  deliverables: resource<
    Deliverable,
    Partial<Deliverable>,
    Partial<Deliverable>
  >("deliverables"),
  posts: Object.assign(
    resource<Post, Partial<Post>, Partial<Post>>("posts"),
    {
      /** Fetch a live post's stats (likes, comments, views, ER%) from Instagram. */
      syncMetrics: (id: string) =>
        request<PostMetricsResult>(`/posts/${id}/sync-metrics`, {
          method: "POST",
        }),
    },
  ),
  metrics: resource<Metric, Partial<Metric>, Partial<Metric>>("metrics"),
  analytics: {
    creators: () => request<CreatorRanking[]>("/analytics/creators"),
    cities: () => request<GroupRanking[]>("/analytics/cities"),
    categories: () => request<GroupRanking[]>("/analytics/categories"),
    campaigns: () => request<CampaignRanking[]>("/analytics/campaigns"),
  },
  ai: {
    status: () => request<AIStatus>("/ai/status"),
    generateInsights: () =>
      request<AIInsights>("/ai/insights", { method: "POST" }),
  },
  reports: {
    /** Direct download URL for a campaign's full Excel workbook. */
    exportCampaignUrl: (campaignId: string) =>
      `${BASE_URL}/export/campaigns/${campaignId}`,
    /** Single 'POA - Supply' sheet (one row per live post, master-tracker layout). */
    exportCampaignPoaUrl: (campaignId: string) =>
      `${BASE_URL}/export/campaigns/${campaignId}/poa`,
    /** Campaign-wise creators Excel. */
    exportCampaignCreatorsUrl: (campaignId: string) =>
      `${BASE_URL}/export/campaigns/${campaignId}/creators`,
    /** Campaign-wise posts Excel. */
    exportCampaignPostsUrl: (campaignId: string) =>
      `${BASE_URL}/export/campaigns/${campaignId}/posts`,
    /** Overall campaigns tracker Excel (all campaigns). */
    exportTrackerUrl: () => `${BASE_URL}/export/tracker`,
    /** Upload a CSV/Excel file to bulk-create influencers. */
    importInfluencers: async (file: File): Promise<ImportResult> => {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`${BASE_URL}/import/influencers`, {
        method: "POST",
        body,
      });
      if (!res.ok) {
        let detail = res.statusText;
        try {
          detail = (await res.json()).detail ?? detail;
        } catch {
          // ignore
        }
        throw new ApiError(res.status, detail);
      }
      return res.json() as Promise<ImportResult>;
    },
  },
};

export interface ImportResult {
  created: number;
  created_influencers: Influencer[];
}

export interface RosterImportResult {
  linked: number;
  skipped: number;
  created: number;
  created_influencers: Influencer[];
}

export { ApiError };
