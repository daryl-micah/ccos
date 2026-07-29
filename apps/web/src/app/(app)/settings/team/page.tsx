"use client";

import { OrganizationProfile } from "@clerk/nextjs";
import { PageHeader } from "@/components/layout/page-header";

export default function TeamSettingsPage() {
  return (
    <>
      <PageHeader
        title="Team"
        description="Invite teammates, manage roles, and remove members."
      />
      <div className="flex justify-center px-8 py-6">
        <OrganizationProfile routing="hash" />
      </div>
    </>
  );
}
