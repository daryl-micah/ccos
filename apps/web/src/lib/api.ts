import type {
  AIInsights,
  AIStatus,
  Campaign,
  CampaignInfluencer,
  CampaignRanking,
  CreatorRanking,
  Deliverable,
  GroupRanking,
  Influencer,
  InstagramStatus,
  InstagramSyncResult,
  Metric,
  Post,
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
  campaigns: resource<Campaign, Partial<Campaign>, Partial<Campaign>>(
    "campaigns",
  ),
  influencers: Object.assign(
    resource<Influencer, Partial<Influencer>, Partial<Influencer>>(
      "influencers",
    ),
    {
      /** Collect Instagram profile + recent-post stats (Phase 3). */
      syncInstagram: (id: string, maxPosts = 12) =>
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
  posts: resource<Post, Partial<Post>, Partial<Post>>("posts"),
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
  instagram: {
    status: () => request<InstagramStatus>("/instagram/status"),
    loginWithSession: (sessionid: string) =>
      request<InstagramStatus>("/instagram/login", {
        method: "POST",
        body: JSON.stringify({ sessionid }),
      }),
    login: (username: string, password: string) =>
      request<InstagramStatus>("/instagram/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      }),
    logout: () => request<void>("/instagram/logout", { method: "POST" }),
  },
  reports: {
    /** Direct download URL for a campaign's Excel report. */
    exportCampaignUrl: (campaignId: string) =>
      `${BASE_URL}/export/campaigns/${campaignId}`,
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

export { ApiError };
