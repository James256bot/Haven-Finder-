import { Link } from 'react-router-dom';
import { Seo } from '../components/Seo';

export function PrivacyPage() {
  return (
    <>
      <Seo
        title="Privacy Policy"
        description="How HavenFinder collects, uses, and protects your personal data."
        url="/privacy"
      />
      <div className="container-page py-12 max-w-3xl">
        <div className="eyebrow mb-3">Legal</div>
        <h1 className="h1 text-ink-900 mb-3">Privacy Policy</h1>
        <p className="text-ink-500 text-sm mb-10">Last updated: October 7, 2026</p>

        <div className="prose prose-slate max-w-none space-y-8">
          <Section title="1. Summary">
            <p>
              We collect only what we need to run HavenFinder. We don't sell your
              personal data. We don't share your phone number with other users
              unless you choose to make it public in a listing.
            </p>
          </Section>

          <Section title="2. What we collect">
            <h3 className="font-semibold text-ink-900 mt-4 mb-2">Account information</h3>
            <ul className="list-disc pl-6 space-y-2 text-ink-700">
              <li>Email address</li>
              <li>Full name</li>
              <li>Password (hashed with Argon2id — we never see the plaintext)</li>
              <li>Optional: phone number, profile photo, country, preferred currency</li>
            </ul>

            <h3 className="font-semibold text-ink-900 mt-4 mb-2">Listing information</h3>
            <ul className="list-disc pl-6 space-y-2 text-ink-700">
              <li>Property details, photos, prices, and addresses you publish</li>
              <li>Contact details you choose to make public</li>
            </ul>

            <h3 className="font-semibold text-ink-900 mt-4 mb-2">Usage data</h3>
            <ul className="list-disc pl-6 space-y-2 text-ink-700">
              <li>Pages you visit and properties you view</li>
              <li>Search queries and filters you apply</li>
              <li>Device type, browser, and IP address (for security)</li>
              <li>Login timestamps and session activity</li>
            </ul>

            <h3 className="font-semibold text-ink-900 mt-4 mb-2">Messages and requests</h3>
            <ul className="list-disc pl-6 space-y-2 text-ink-700">
              <li>In-app messages with other users</li>
              <li>Viewing requests you submit or receive</li>
            </ul>
          </Section>

          <Section title="3. How we use your data">
            <ul className="list-disc pl-6 space-y-2 text-ink-700">
              <li><strong>To run the Platform</strong> — show listings, process searches, deliver messages</li>
              <li><strong>To authenticate you</strong> — verify login, protect your account</li>
              <li><strong>To improve the Platform</strong> — analyse which features are used</li>
              <li><strong>To prevent fraud</strong> — detect duplicate, scam, or abusive activity</li>
              <li><strong>To send service emails</strong> — password resets, verification, viewing confirmations</li>
              <li><strong>To comply with law</strong> — respond to lawful requests from Ugandan authorities</li>
            </ul>
            <p>
              We <strong>do not</strong> use your data for advertising, and we do not
              sell it to third parties.
            </p>
          </Section>

          <Section title="4. What we share, and with whom">
            <h3 className="font-semibold text-ink-900 mt-4 mb-2">With other users</h3>
            <ul className="list-disc pl-6 space-y-2 text-ink-700">
              <li>Your full name and public contact info (if you publish a listing)</li>
              <li>Messages you send through the Platform</li>
              <li>Viewing requests you submit to property owners</li>
            </ul>

            <h3 className="font-semibold text-ink-900 mt-4 mb-2">With service providers</h3>
            <ul className="list-disc pl-6 space-y-2 text-ink-700">
              <li><strong>Railway</strong> — database and API hosting (US West)</li>
              <li><strong>Netlify</strong> — frontend hosting and CDN</li>
              <li><strong>Untera</strong> — third-party property data</li>
              <li><strong>Flutterwave / DPO Pay</strong> — payment processing (if you use paid features)</li>
            </ul>
            <p>
              We do not share your password, email, or phone number with any third
              party for marketing purposes.
            </p>
          </Section>

          <Section title="5. Cookies and storage">
            <p>
              We use browser localStorage to store your authentication token so you
              stay signed in. We do not use third-party advertising cookies or
              cross-site tracking.
            </p>
            <p>
              You can clear your session at any time by signing out.
            </p>
          </Section>

          <Section title="6. How long we keep data">
            <ul className="list-disc pl-6 space-y-2 text-ink-700">
              <li><strong>Account data</strong> — until you delete your account, then 30 days for backup recovery</li>
              <li><strong>Listings</strong> — until you delete them, plus 30 days in soft-delete</li>
              <li><strong>Messages</strong> — while the conversation exists, up to 2 years of inactivity</li>
              <li><strong>Usage logs</strong> — 90 days, then anonymised</li>
              <li><strong>Audit logs</strong> — 12 months, required for security and legal compliance</li>
            </ul>
          </Section>

          <Section title="7. Your rights">
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 text-ink-700">
              <li><strong>Access</strong> — request a copy of all data we hold about you</li>
              <li><strong>Correct</strong> — fix inaccurate information in your account</li>
              <li><strong>Delete</strong> — request account deletion and removal of your data</li>
              <li><strong>Export</strong> — download your listings, favorites, and messages</li>
              <li><strong>Object</strong> — opt out of non-essential communications</li>
            </ul>
            <p>
              Email <a href="mailto:privacy@havenfinder.app" className="text-brand-600 hover:underline">privacy@havenfinder.app</a> to exercise any of these rights. We respond within 30 days.
            </p>
          </Section>

          <Section title="8. Security">
            <p>
              We protect your data with:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-ink-700">
              <li>Argon2id password hashing</li>
              <li>HTTPS/TLS on every connection</li>
              <li>JWT access tokens with short expiry</li>
              <li>Rotating refresh tokens stored as SHA-256 hashes</li>
              <li>Rate limiting on authentication endpoints</li>
              <li>Audit logging of all admin actions</li>
            </ul>
            <p>
              No system is 100% secure. If we detect a data breach affecting you, we
              will notify you within 72 hours of discovery.
            </p>
          </Section>

          <Section title="9. Children">
            <p>
              HavenFinder is not intended for anyone under 18. We do not knowingly
              collect data from children. If you believe a child has registered,
              contact us and we will delete the account.
            </p>
          </Section>

          <Section title="10. International transfers">
            <p>
              Your data may be stored and processed outside Uganda (Railway and
              Netlify operate in the United States). By using HavenFinder, you
              consent to these transfers.
            </p>
          </Section>

          <Section title="11. Changes to this policy">
            <p>
              We may update this policy. Material changes will be announced on the
              Platform at least 14 days before taking effect.
            </p>
          </Section>

          <Section title="12. Contact">
            <p>
              Privacy questions or requests:
            </p>
            <ul className="list-none pl-0 space-y-2 text-ink-700">
              <li>Email: <a href="mailto:privacy@havenfinder.app" className="text-brand-600 hover:underline">privacy@havenfinder.app</a></li>
              <li>Support: <a href="mailto:support@havenfinder.app" className="text-brand-600 hover:underline">support@havenfinder.app</a></li>
              <li>Legal: <a href="mailto:legal@havenfinder.app" className="text-brand-600 hover:underline">legal@havenfinder.app</a></li>
            </ul>
          </Section>
        </div>

        <div className="mt-12 pt-8 border-t border-ink-200 flex flex-col sm:flex-row gap-3">
          <Link to="/terms" className="btn btn-secondary btn-md">Read Terms of Service →</Link>
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
