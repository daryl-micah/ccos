/**
 * Static, CSS-only product mocks for the landing page. These are illustrations,
 * not live components — they never touch the API, so the marketing page stays
 * fully static for signed-out visitors.
 */

function Window({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-navy/20 ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-orange/60" />
        <span className="size-2.5 rounded-full bg-amber/60" />
        <span className="size-2.5 rounded-full bg-teal/40" />
        <span className="ml-2 text-xs font-medium text-muted-foreground">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-navy">{value}</p>
      <p className="text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
}

/** Hero: the campaign dashboard — KPI row, spend chart, creator roster. */
export function DashboardMock() {
  const bars = [78, 62, 91, 44, 70, 35, 55];
  const rows = [
    { name: "Aditi Rao", city: "Bangalore", cost: "₹45,000", cpv: "₹0.42", er: "4.1%", status: "Posted" },
    { name: "Karan Mehta", city: "Mumbai", cost: "₹80,000", cpv: "₹0.61", er: "2.8%", status: "Confirmed" },
    { name: "Sneha Iyer", city: "Chennai", cost: "₹32,000", cpv: "₹0.29", er: "5.6%", status: "Posted" },
    { name: "Rahul Nair", city: "Kochi", cost: "₹18,000", cpv: "—", er: "—", status: "Negotiating" },
  ];

  return (
    <Window title="ccos — Bangalore Launch">
      <div className="flex">
        <div className="hidden w-40 shrink-0 flex-col gap-1.5 border-r border-border bg-muted p-3 sm:flex">
          {["Dashboard", "Campaigns", "Influencers", "Analytics"].map((item, i) => (
            <div
              key={item}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                i === 1 ? "bg-secondary text-navy" : "text-muted-foreground"
              }`}
            >
              {item}
            </div>
          ))}
        </div>

        <div className="min-w-0 flex-1 space-y-3 p-4">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Kpi label="Creators" value="42" hint="12 posted" />
            <Kpi label="Spend" value="₹8.4L" hint="Budget ₹10L" />
            <Kpi label="ROAS" value="3.2×" hint="Revenue ₹27L" />
            <Kpi label="Avg CPV" value="₹0.38" hint="Across 18 posts" />
          </div>

          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Spend by campaign
            </p>
            <div className="mt-3 flex h-20 items-end gap-2">
              {bars.map((h, i) => (
                <div
                  key={i}
                  style={{ height: `${h}%` }}
                  className={`flex-1 rounded-t-sm ${i === 2 ? "bg-teal" : "bg-sky"}`}
                />
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-background">
            <div className="grid grid-cols-6 gap-2 border-b border-border px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              <span className="col-span-2">Creator</span>
              <span>Cost</span>
              <span>CPV</span>
              <span>ER</span>
              <span>Status</span>
            </div>
            {rows.map((r) => (
              <div
                key={r.name}
                className="grid grid-cols-6 items-center gap-2 border-b border-border px-3 py-2 text-[11px] last:border-0"
              >
                <span className="col-span-2 min-w-0 truncate font-medium text-navy">
                  {r.name}
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    {r.city}
                  </span>
                </span>
                <span className="text-muted-foreground">{r.cost}</span>
                <span className="text-muted-foreground">{r.cpv}</span>
                <span className="text-muted-foreground">{r.er}</span>
                <span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      r.status === "Posted"
                        ? "bg-teal/15 text-teal"
                        : r.status === "Confirmed"
                          ? "bg-sky/40 text-navy"
                          : "bg-amber/20 text-orange"
                    }`}
                  >
                    {r.status}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Window>
  );
}

/** Step 1: the campaigns list — every initiative, its budget and its status. */
export function CampaignsListMock() {
  const campaigns = [
    { name: "Bangalore Launch", brand: "Pronto", budget: "₹10,00,000", status: "Active" },
    { name: "House Help Expansion", brand: "Pronto", budget: "₹6,50,000", status: "Active" },
    { name: "Monsoon Bookings", brand: "Pronto", budget: "₹4,20,000", status: "Completed" },
    { name: "Diwali Teaser", brand: "Pronto", budget: "₹2,00,000", status: "Draft" },
  ];

  return (
    <Window title="Campaigns">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-navy">4 campaigns</p>
          <span className="rounded-md bg-navy px-2.5 py-1 text-[10px] font-medium text-primary-foreground">
            + New campaign
          </span>
        </div>

        <div className="mt-3 overflow-hidden rounded-lg border border-border bg-background">
          <div className="grid grid-cols-5 gap-2 border-b border-border px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <span className="col-span-2">Campaign</span>
            <span>Brand</span>
            <span>Budget</span>
            <span>Status</span>
          </div>
          {campaigns.map((c) => (
            <div
              key={c.name}
              className="grid grid-cols-5 items-center gap-2 border-b border-border px-3 py-2.5 text-[11px] last:border-0"
            >
              <span className="col-span-2 min-w-0 truncate font-medium text-navy">
                {c.name}
              </span>
              <span className="text-muted-foreground">{c.brand}</span>
              <span className="text-muted-foreground">{c.budget}</span>
              <span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    c.status === "Active"
                      ? "bg-teal/15 text-teal"
                      : c.status === "Completed"
                        ? "bg-sky/40 text-navy"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {c.status}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </Window>
  );
}

/** Step 2: creators inside a campaign — cost, who closed them, what they owe. */
export function RosterMock() {
  const creators = [
    { name: "Aditi Rao", agency: "Barcode", cost: "₹45,000", owes: "1 Reel", state: "posted" },
    { name: "Karan Mehta", agency: "In-house", cost: "₹80,000", owes: "3 Stories", state: "overdue" },
    { name: "Sneha Iyer", agency: "Flynt", cost: "₹32,000", owes: "1 Short", state: "pending" },
    { name: "Rahul Nair", agency: "Barcode", cost: "₹18,000", owes: "1 Carousel", state: "pending" },
  ];

  return (
    <Window title="Bangalore Launch — Creators">
      <div className="space-y-2 p-4">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-navy px-2.5 py-1 text-[10px] font-medium text-primary-foreground">
            + Add creator
          </span>
          <span className="rounded-md border border-border px-2.5 py-1 text-[10px] font-medium text-navy">
            Import agency roster
          </span>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-amber/10 px-3 py-2">
          <span className="text-xs font-medium text-navy">Needs attention</span>
          <span className="text-xs text-muted-foreground">
            1 overdue · over budget by ₹40,000
          </span>
        </div>

        {creators.map((c) => (
          <div
            key={c.name}
            className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-navy">{c.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {c.agency} · {c.cost}
              </p>
            </div>
            <span className="shrink-0 text-[11px] text-muted-foreground">{c.owes}</span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                c.state === "posted"
                  ? "bg-teal/15 text-teal"
                  : c.state === "overdue"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {c.state === "posted"
                ? "Posted"
                : c.state === "overdue"
                  ? "Overdue"
                  : "Pending"}
            </span>
          </div>
        ))}
      </div>
    </Window>
  );
}

/** The payoff: one creator, every campaign they've ever run. */
export function CreatorMock() {
  const history = [
    { campaign: "Bangalore Launch", result: "ROAS 4.1× · CPV ₹0.29", when: "Jul 2026" },
    { campaign: "Monsoon Bookings", result: "ROAS 2.7× · CPV ₹0.44", when: "Jun 2026" },
    { campaign: "House Help Expansion", result: "ROAS 3.9× · CPV ₹0.31", when: "Mar 2026" },
  ];

  return (
    <Window title="Sneha Iyer">
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sky text-sm font-semibold text-navy">
            SI
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-navy">Sneha Iyer</p>
            <p className="truncate text-[11px] text-muted-foreground">
              @snehaiyer · Chennai · Lifestyle · 412K followers
            </p>
          </div>
          <span className="ml-auto shrink-0 rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-medium text-teal">
            Repeat candidate
          </span>
        </div>

        <div className="mt-4 space-y-2">
          {history.map((h) => (
            <div
              key={h.campaign}
              className="rounded-lg border border-border bg-background px-3 py-2"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-xs font-medium text-navy">{h.campaign}</p>
                <p className="shrink-0 text-[10px] text-muted-foreground">{h.when}</p>
              </div>
              <p className="text-[11px] text-muted-foreground">{h.result}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-lg bg-muted px-3 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Team notes
          </p>
          <p className="mt-1 text-[11px] text-navy">
            &ldquo;Strong South-India audience. Fast approvals, never missed a due
            date. Collaborate again.&rdquo;
          </p>
        </div>
      </div>
    </Window>
  );
}

/** Step 3: paste a link, get the numbers — with source attribution. */
export function PostInsightsMock() {
  const metrics = [
    { label: "Views", value: "184,203", src: "instagram" },
    { label: "Likes", value: "12,480", src: "instagram" },
    { label: "Comments", value: "641", src: "instagram" },
    { label: "Shares", value: "308", src: "manual" },
    { label: "ER (reach)", value: "7.3%", src: "calculated" },
    { label: "Actual CPV", value: "₹0.17", src: "calculated" },
  ];

  return (
    <Window title="Live post insights">
      <div className="p-4">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
          <span className="truncate font-mono text-[11px] text-muted-foreground">
            instagram.com/reel/C8xK…
          </span>
          <span className="ml-auto shrink-0 rounded-md bg-navy px-2 py-1 text-[10px] font-medium text-primary-foreground">
            Synced
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="rounded-lg border border-border bg-background p-2.5"
            >
              <p className="text-[10px] text-muted-foreground">{m.label}</p>
              <p className="text-sm font-semibold text-navy">{m.value}</p>
              <p
                className={`mt-1 inline-block rounded px-1 py-0.5 text-[9px] font-medium ${
                  m.src === "instagram"
                    ? "bg-orange/15 text-orange"
                    : m.src === "manual"
                      ? "bg-muted text-muted-foreground"
                      : "bg-teal/15 text-teal"
                }`}
              >
                {m.src}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Window>
  );
}

/** Step 4: cross-campaign analytics + the AI read on them. */
export function AnalyticsMock() {
  const cities = [
    { name: "Bangalore", roas: "4.1×", width: "100%" },
    { name: "Chennai", roas: "3.4×", width: "82%" },
    { name: "Mumbai", roas: "2.6×", width: "63%" },
    { name: "Delhi", roas: "1.9×", width: "46%" },
  ];

  return (
    <Window title="Analytics">
      <div className="p-4">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          ROAS by city · all campaigns
        </p>
        <div className="mt-3 space-y-2.5">
          {cities.map((c, i) => (
            <div key={c.name}>
              <div className="flex items-baseline justify-between text-[11px]">
                <span className="font-medium text-navy">{c.name}</span>
                <span className="text-muted-foreground">{c.roas}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  style={{ width: c.width }}
                  className={`h-full rounded-full ${i === 0 ? "bg-teal" : "bg-sky"}`}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-border bg-muted p-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            AI summary
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-navy">
            Bangalore returns 4.1× versus a 2.8× portfolio average, driven by
            lifestyle creators posting reels. Shift budget from Delhi; retain
            Sneha Iyer and Aditi Rao for the next cycle.
          </p>
        </div>
      </div>
    </Window>
  );
}
