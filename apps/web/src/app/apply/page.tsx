"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const ROLES = [
  ["founder", "Founder"],
  ["marketing", "Marketing"],
  ["influencer_marketing", "Influencer Marketing"],
  ["agency", "Agency"],
  ["other", "Other"],
];

const TEAM_SIZES = [
  ["1", "1"],
  ["2-10", "2\u201310"],
  ["10+", "10+"],
];

const WORKFLOWS = [
  ["google_sheets", "Google Sheets"],
  ["airtable", "Airtable"],
  ["notion", "Notion"],
  ["internal_tool", "Internal Tool"],
  ["other", "Other"],
];

const CREATORS_MANAGED = [
  ["<10", "<10"],
  ["10-50", "10\u201350"],
  ["50-200", "50\u2013200"],
  ["200+", "200+"],
];

/** One labelled dropdown. Every question on this form is the same shape. */
function Choice({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[][];
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="Select one\u2026" />
        </SelectTrigger>
        <SelectContent>
          {options.map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function ApplyPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = React.useState("");
  const [role, setRole] = React.useState("");
  const [teamSize, setTeamSize] = React.useState("");
  const [currentWorkflow, setCurrentWorkflow] = React.useState("");
  const [creatorsManaged, setCreatorsManaged] = React.useState("");
  const [goal, setGoal] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.applications.submit({
        company_name: companyName,
        role: role || undefined,
        team_size: teamSize || undefined,
        current_workflow: currentWorkflow || undefined,
        creators_managed: creatorsManaged || undefined,
        goal: goal || undefined,
        referrer: document.referrer || undefined,
      });
      router.push("/pending");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't submit your application.",
      );
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/40 px-6 py-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal">
            Private beta
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-navy">
            Join the Private Beta
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A couple of quick questions so we can get your workspace set up.
          </p>
        </div>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company name</Label>
              <Input
                id="company-name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>

            <Choice
              id="role"
              label="Role"
              value={role}
              onChange={setRole}
              options={ROLES}
            />

            <Choice
              id="team-size"
              label="Team size"
              value={teamSize}
              onChange={setTeamSize}
              options={TEAM_SIZES}
            />

            <Choice
              id="current-workflow"
              label="Current workflow"
              value={currentWorkflow}
              onChange={setCurrentWorkflow}
              options={WORKFLOWS}
            />

            <Choice
              id="creators-managed"
              label="Instagram creators managed"
              value={creatorsManaged}
              onChange={setCreatorsManaged}
              options={CREATORS_MANAGED}
            />

            <div className="space-y-2">
              <Label htmlFor="goal">What are you hoping this fixes?</Label>
              <Textarea
                id="goal"
                rows={3}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button
              type="submit"
              className="w-full"
              disabled={busy || !companyName.trim()}
            >
              {busy ? "Submitting…" : "Submit application"}
              {busy ? null : <ArrowRight />}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        We onboard beta teams by hand, so we read every one of these.
      </p>
    </AuthShell>
  );
}
