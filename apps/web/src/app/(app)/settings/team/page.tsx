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
      <div className="animate-in fade-in slide-in-from-bottom-2 px-8 py-6 duration-300">
        <OrganizationProfile
          routing="hash"
          appearance={{
            elements: {
              rootBox: "w-full",
              cardBox: "w-full max-w-4xl shadow-sm",
            },
          }}
        />
      </div>
    </>
  );
}
