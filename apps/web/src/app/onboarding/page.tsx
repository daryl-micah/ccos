import { OrganizationList } from "@clerk/nextjs";

export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <OrganizationList
        hidePersonal
        afterCreateOrganizationUrl="/"
        afterSelectOrganizationUrl="/"
      />
    </div>
  );
}
