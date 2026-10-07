import { Link } from 'react-router-dom';
import { Seo } from '../components/Seo';

export function TermsPage() {
  return (
    <>
      <Seo
        title="Terms of Service"
        description="HavenFinder's terms of service — the rules for using our property marketplace."
        url="/terms"
      />
      <div className="container-page py-12 max-w-3xl">
        <div className="eyebrow mb-3">Legal</div>
        <h1 className="h1 text-ink-900 mb-3">Terms of Service</h1>
        <p className="text-ink-500 text-sm mb-10">Last updated: October 7, 2026</p>

        <div className="prose prose-slate max-w-none space-y-8">
          <Section title="1. About HavenFinder">
            <p>
              HavenFinder ("we", "us", "the Platform") is a property discovery and
              listing marketplace operated in Kampala, Uganda. We connect people
              looking for homes, land, and commercial spaces with property owners,
              agents, and verified listings from third-party data providers.
            </p>
            <p>
              By accessing or using HavenFinder, you agree to these Terms of Service.
              If you do not agree, do not use the Platform.
            </p>
          </Section>

          <Section title="2. Eligibility">
            <p>
              You must be at least 18 years old to create an account. By registering,
              you confirm that you have the legal capacity to enter into binding
              agreements. If you use the Platform on behalf of a business, you
              represent that you have authority to bind that business to these terms.
            </p>
          </Section>

          <Section title="3. Your account">
            <p>
              You are responsible for keeping your password confidential and for all
              activity that happens under your account. Notify us immediately at
              <a href="mailto:support@havenfinder.app" className="text-brand-600 hover:underline"> support@havenfinder.app</a>
              if you suspect unauthorised use.
            </p>
            <p>
              We may suspend or terminate accounts that violate these terms, publish
              false or misleading listings, or harass other users.
            </p>
          </Section>

          <Section title="4. Listings and content">
            <p>
              <strong>Owners and agents</strong> who publish listings are solely
              responsible for the accuracy of everything they upload: prices,
              photographs, addresses, descriptions, and availability. You must have
              the legal right to advertise the property you list.
            </p>
            <p>
              <strong>Do not</strong> post listings that:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-ink-700">
              <li>You do not have the legal right to list</li>
              <li>Contain false or misleading information</li>
              <li>Advertise properties that do not exist</li>
              <li>Use photographs you do not own or have permission to use</li>
              <li>Contain discriminatory language or requirements</li>
              <li>Advertise illegal activities or services</li>
              <li>Impersonate another person, agency, or business</li>
            </ul>
            <p>
              We may remove any listing that violates these rules without notice.
              Repeat offenders will have their accounts terminated.
            </p>
          </Section>

          <Section title="5. Third-party data">
            <p>
              Some listings on the Platform come from third-party data providers
              including Untera and publicly available classifieds. These listings
              are marked with a source badge (e.g. "Broker", "Classifieds"). We do
              not independently verify their accuracy and are not responsible for
              errors in third-party data.
            </p>
          </Section>

          <Section title="6. Verification">
            <p>
              A "Verified" badge on a listing means a HavenFinder administrator has
              reviewed the listing's documentation and confirmed it against our
              internal criteria at a point in time. It is <strong>not</strong> a
              legal guarantee of title, ownership, or the absence of encumbrances.
              Always inspect a property in person and seek independent legal advice
              before signing any agreement or transferring money.
            </p>
          </Section>

          <Section title="7. Payments">
            <p>
              HavenFinder offers paid promotion and verification services. Payments
              are processed through third-party providers (Flutterwave, DPO Pay).
              We do not store card details.
            </p>
            <p>
              Promotion fees are non-refundable once the promotion has been
              activated. If a promotion cannot be delivered due to our error, we
              will refund the full amount.
            </p>
          </Section>

          <Section title="8. Your safety">
            <p>
              <strong>Never send money before viewing a property in person.</strong>
              We strongly recommend:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-ink-700">
              <li>Meeting owners or agents in person</li>
              <li>Verifying property ownership at the relevant land office</li>
              <li>Bringing a trusted friend or relative to viewings</li>
              <li>Using a lawyer for any deposit or rental agreement</li>
              <li>Reporting suspicious listings immediately</li>
            </ul>
            <p>
              HavenFinder is not a party to any transaction between users. We do not
              collect rent, hold deposits, or act as an escrow agent.
            </p>
          </Section>

          <Section title="9. Reporting">
            <p>
              Every listing page has a "Report this listing" option. Reports go
              directly to our moderation team. Reasons include scam, wrong price,
              fake property, incorrect location, duplicate listing, and offensive
              content. We review all reports within 48 hours.
            </p>
          </Section>

          <Section title="10. Our intellectual property">
            <p>
              HavenFinder owns the Platform, its branding, design, and software.
              You retain ownership of the content you upload but grant us a
              worldwide, non-exclusive, royalty-free license to display, distribute,
              and promote your listings on the Platform and in marketing.
            </p>
          </Section>

          <Section title="11. Limitation of liability">
            <p>
              To the maximum extent permitted by Ugandan law, HavenFinder is not
              liable for any indirect, incidental, or consequential damages arising
              from your use of the Platform, including but not limited to losses
              from fraudulent listings, third-party data errors, or transactions
              between users.
            </p>
          </Section>

          <Section title="12. Changes to these terms">
            <p>
              We may update these terms from time to time. Material changes will be
              announced on the Platform at least 14 days before taking effect. Your
              continued use after the effective date constitutes acceptance.
            </p>
          </Section>

          <Section title="13. Governing law">
            <p>
              These terms are governed by the laws of the Republic of Uganda. Any
              disputes will be resolved in the courts of Kampala.
            </p>
          </Section>

          <Section title="14. Contact">
            <p>
              Questions? Email us at
              <a href="mailto:legal@havenfinder.app" className="text-brand-600 hover:underline"> legal@havenfinder.app</a>.
            </p>
          </Section>
        </div>

        <div className="mt-12 pt-8 border-t border-ink-200 flex flex-col sm:flex-row gap-3">
          <Link to="/privacy" className="btn btn-secondary btn-md">Read Privacy Policy →</Link>
          <Link to="/" className="btn btn-ghost btn-md">← Back to home</Link>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="h3 text-ink-900 mb-3">{title}</h2>
      <div className="space-y-3 text-ink-700 leading-relaxed">{children}</div>
    </section>
  );
}
