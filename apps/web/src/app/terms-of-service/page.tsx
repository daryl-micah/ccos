import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — CCOS",
};

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-foreground">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: July 14, 2026</p>

      <div className="mt-8 space-y-8 text-foreground [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-2 [&_p]:leading-relaxed [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your use of CCOS (&quot;Creator Campaign
          OS&quot;, &quot;we&quot;, &quot;us&quot;) at ccos.darylmicah.me (the &quot;Service&quot;). By creating an
          account or using the Service, you agree to these Terms.
        </p>

        <section>
          <h2>Using the Service</h2>
          <ul>
            <li>You must create an account to access the Service.</li>
            <li>
              You are responsible for the accuracy of the campaign and creator data you enter,
              and for keeping your account credentials secure.
            </li>
            <li>
              You agree not to use the Service for any unlawful purpose or in a way that
              disrupts the Service for others.
            </li>
          </ul>
        </section>

        <section>
          <h2>Your data</h2>
          <p>
            You retain ownership of the data you submit to the Service. We use it only to
            provide the Service to you, as described in our{" "}
            <a className="text-primary underline" href="/privacy-policy">
              Privacy Policy
            </a>
            .
          </p>
        </section>

        <section>
          <h2>Availability</h2>
          <p>
            The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis. We may
            modify, suspend, or discontinue features of the Service at any time.
          </p>
        </section>

        <section>
          <h2>Termination</h2>
          <p>
            You may stop using the Service and request account deletion at any time. We may
            suspend or terminate access to accounts that violate these Terms.
          </p>
        </section>

        <section>
          <h2>Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, we are not liable for any indirect,
            incidental, or consequential damages arising from your use of the Service.
          </p>
        </section>

        <section>
          <h2>Changes to these Terms</h2>
          <p>
            We may update these Terms from time to time. Continued use of the Service after
            changes take effect constitutes acceptance of the updated Terms.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            Questions about these Terms can be sent to{" "}
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
