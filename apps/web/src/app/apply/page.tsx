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
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="">Select one…</option>
                <option value="founder">Founder</option>
                <option value="marketing">Marketing</option>
                <option value="influencer_marketing">Influencer Marketing</option>
                <option value="agency">Agency</option>
                <option value="other">Other</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="team-size">Team size</Label>
              <Select
                id="team-size"
                value={teamSize}
                onChange={(e) => setTeamSize(e.target.value)}
              >
                <option value="">Select one…</option>
                <option value="1">1</option>
                <option value="2-10">2–10</option>
                <option value="10+">10+</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="current-workflow">Current workflow</Label>
              <Select
                id="current-workflow"
                value={currentWorkflow}
                onChange={(e) => setCurrentWorkflow(e.target.value)}
              >
                <option value="">Select one…</option>
                <option value="google_sheets">Google Sheets</option>
                <option value="airtable">Airtable</option>
                <option value="notion">Notion</option>
                <option value="internal_tool">Internal Tool</option>
                <option value="other">Other</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="creators-managed">
                Instagram creators managed
              </Label>
              <Select
                id="creators-managed"
                value={creatorsManaged}
                onChange={(e) => setCreatorsManaged(e.target.value)}
              >
                <option value="">Select one…</option>
                <option value="<10">&lt;10</option>
                <option value="10-50">10–50</option>
                <option value="50-200">50–200</option>
                <option value="200+">200+</option>
              </Select>
            </div>

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
