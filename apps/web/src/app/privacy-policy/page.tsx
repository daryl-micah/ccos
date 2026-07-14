import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — CCOS",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-foreground">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: July 14, 2026</p>

      <div className="mt-8 space-y-8 text-foreground [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-2 [&_p]:leading-relaxed [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1">
        <p>
          CCOS (&quot;Creator Campaign OS&quot;, &quot;we&quot;, &quot;us&quot;) provides a campaign-centric
          influencer CRM at ccos.darylmicah.me (the &quot;Service&quot;). This policy explains what
          information we collect, how we use it, and the choices you have.
        </p>

        <section>
          <h2>Information we collect</h2>
          <ul>
            <li>
              <strong>Account information</strong> — name, email address, and profile details
              provided when you sign in via our authentication provider (Clerk), including
              information from third-party sign-in options such as Google.
            </li>
            <li>
              <strong>Campaign and creator data</strong> — information you enter into the Service,
              such as campaigns, creator/influencer profiles, and associated analytics you choose
              to import or connect.
            </li>
            <li>
              <strong>Usage data</strong> — basic technical logs (e.g. request metadata, timestamps)
              generated as part of operating the Service.
            </li>
          </ul>
        </section>

        <section>
          <h2>How we use information</h2>
          <ul>
            <li>To provide, maintain, and secure the Service.</li>
            <li>To authenticate your account and keep it accessible only to you.</li>
            <li>To operate features you use, such as campaign tracking and analytics.</li>
          </ul>
          <p>We do not sell your personal information.</p>
        </section>

        <section>
          <h2>Third-party services</h2>
          <p>
            We use trusted third-party providers to operate the Service, including Clerk for
            authentication (which may involve Google Sign-In) and infrastructure providers for
            hosting. These providers process data on our behalf and are bound by their own
            privacy and security practices.
          </p>
        </section>

        <section>
          <h2>Data retention</h2>
          <p>
            We retain account and campaign data for as long as your account is active, or as
            needed to provide the Service. You may request deletion of your account and
            associated data at any time by contacting us.
          </p>
        </section>

        <section>
          <h2>Your choices</h2>
          <p>
            You can access and update your account information at any time while signed in.
            To request deletion of your account or data, contact us using the details below.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            Questions about this policy can be sent to{" "}
            <a className="text-primary underline" href="mailto:darylmicah12@gmail.com">
              darylmicah12@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
