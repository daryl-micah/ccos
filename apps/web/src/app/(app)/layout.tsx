import { auth } from "@clerk/nextjs/server";
import { Sidebar } from "@/components/layout/sidebar";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Keying on orgId remounts every page on an org switch, so client-fetched
  // state (campaigns, influencers, etc. — see dashboard/page.tsx) can't leak
  // from the previous org into the newly active one.
  const { orgId } = await auth();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main key={orgId} className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
