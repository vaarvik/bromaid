import type { Metadata } from 'next';

import { Breadcrumbs } from '../_components/breadcrumbs';
import { JsonLd } from '../_components/json-ld';
import { TryCta } from '../_components/try-cta';
import { breadcrumbLd, webPageLd } from '../_lib/structured-data';
import { ConsentControls } from './consent-controls';

const privacyTitle = 'Privacy policy';
const privacyDescription =
  'How bromaids.com handles cookies, analytics (PostHog), consent, server logs, and personal data. Read what is collected, why, and how to opt out.';

export const metadata: Metadata = {
  title: privacyTitle,
  description: privacyDescription,
  alternates: { canonical: '/privacy' },
  openGraph: {
    title: `${privacyTitle} — bromaid`,
    description: privacyDescription,
    url: '/privacy',
    type: 'article',
  },
  twitter: {
    title: `${privacyTitle} — bromaid`,
    description: privacyDescription,
  },
  robots: { index: true, follow: true },
};

export const dynamic = 'force-static';

const pageStyle = {
  maxWidth: 760,
  margin: '0 auto',
  padding: '40px 20px 80px',
  lineHeight: 1.6,
  fontSize: 15,
} as const;

const h1Style = {
  fontSize: 28,
  margin: '0 0 8px',
  letterSpacing: 0.2,
} as const;

const h2Style = {
  fontSize: 19,
  margin: '32px 0 8px',
  letterSpacing: 0.1,
} as const;

const subtleStyle = {
  opacity: 0.7,
  fontSize: 13,
} as const;

const linkStyle = {
  color: '#9ec5ff',
  textDecoration: 'underline',
  textUnderlineOffset: 2,
} as const;

const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'Privacy', path: '/privacy' },
];

export default function PrivacyPage() {
  return (
    <main style={pageStyle}>
      <JsonLd
        id="ld-page-privacy"
        data={webPageLd({ name: privacyTitle, description: privacyDescription, path: '/privacy' })}
      />
      <JsonLd id="ld-breadcrumb-privacy" data={breadcrumbLd(crumbs)} />
      <Breadcrumbs crumbs={crumbs} />
      <TryCta label="Ready to render a diagram? Open the playground." />

      <h1 style={h1Style}>Privacy policy</h1>
      <div style={subtleStyle}>Last updated: May 3, 2026</div>

      <h2 style={h2Style}>What this site is</h2>
      <p>
        bromaids.com is a public playground for the open-source <code>bromaid</code> diagram DSL.
        You can paste DSL source into the editor and the page renders it to SVG. The playground is
        a static Next.js site with a single API route that performs the render.
      </p>

      <h2 style={h2Style}>What we collect</h2>
      <p>
        <strong>Diagram source you type into the editor</strong> is sent to our render endpoint
        (<code>/api/render</code>) over HTTPS and processed in memory. We do not persist diagram
        source on disk and we do not associate it with you.
      </p>
      <p>
        <strong>Analytics</strong>: if — and only if — you click <em>Accept analytics</em> in the
        consent banner, we load{' '}
        <a href="https://posthog.com/" style={linkStyle} rel="noreferrer noopener" target="_blank">
          PostHog
        </a>{' '}
        and capture anonymous product-usage events: page views, render success / failure (counts
        and durations only — never the diagram source), and your selected mode/background. PostHog
        sets its own cookies (<code>ph_*</code>) so it can recognise the same anonymous browser
        across visits.
      </p>
      <p>
        <strong>Server logs</strong>: our hosting provider may log the IP address and user-agent
        of requests for the purpose of operating and securing the service. These logs are not
        used for analytics.
      </p>

      <h2 style={h2Style}>Cookies we set</h2>
      <ul>
        <li>
          <code>bromaid_consent</code> — first-party, stores your consent choice
          (<code>granted</code> / <code>denied</code>) and a timestamp. Lasts ~13 months.
        </li>
        <li>
          <code>ph_*</code> — PostHog&apos;s anonymous identifier cookies. Only set after you
          accept analytics. Removed when you decline or reset your choice.
        </li>
      </ul>

      <h2 style={h2Style}>Your choices</h2>
      <p>
        You can change your mind at any time using the controls below. Declining or resetting your
        choice immediately stops new analytics events and clears the PostHog identifier from this
        browser.
      </p>

      <ConsentControls />

      <h2 style={h2Style}>Legal basis (GDPR)</h2>
      <p>
        We rely on your <strong>consent</strong> (Art. 6(1)(a) GDPR) for analytics cookies and
        events. Operating the render endpoint and securing the service relies on our{' '}
        <strong>legitimate interests</strong> (Art. 6(1)(f) GDPR) in providing and protecting the
        playground.
      </p>

      <h2 style={h2Style}>Data retention</h2>
      <ul>
        <li>Diagram source: not persisted; processed in memory and discarded after the response.</li>
        <li>Server logs: retained by our hosting provider for up to 30 days, then rotated.</li>
        <li>
          Analytics events (PostHog): retained for up to 12 months, then aggregated or deleted.
        </li>
        <li>
          Consent cookie (<code>bromaid_consent</code>): up to ~13 months, or until you reset it.
        </li>
      </ul>

      <h2 style={h2Style}>Processors</h2>
      <p>We share limited data with the following third parties so the site can function:</p>
      <ul>
        <li>
          <strong>Vercel Inc.</strong> — hosting and edge delivery (request logs, IP, user-agent).
        </li>
        <li>
          <strong>PostHog Inc.</strong> — product analytics (only after you accept analytics).
        </li>
      </ul>

      <h2 style={h2Style}>International transfers</h2>
      <p>
        Our processors may handle data outside the EEA / UK (primarily the United States).
        Transfers rely on the EU Standard Contractual Clauses and equivalent safeguards published
        by each provider.
      </p>

      <h2 style={h2Style}>Your rights</h2>
      <p>
        Under GDPR / UK GDPR you have the right to access, rectify, erase, restrict, or port your
        personal data, and to object to processing. Under CCPA / CPRA you have the right to know,
        delete, correct, and opt out of the sale or sharing of personal information — we do not
        sell or share personal information. To exercise any right, email{' '}
        <a href="mailto:contact@bromaids.com" style={linkStyle}>
          contact@bromaids.com
        </a>
        . You also have the right to lodge a complaint with your local data protection authority.
      </p>

      <h2 style={h2Style}>Children</h2>
      <p>
        bromaids.com is not directed to children under 16. We do not knowingly collect personal
        data from children. If you believe a child has provided us data, contact us and we will
        delete it.
      </p>

      <h2 style={h2Style}>Changes to this policy</h2>
      <p>
        We may update this policy as the playground evolves. Material changes will be reflected in
        the &ldquo;Last updated&rdquo; date at the top of this page; significant changes will be
        announced in the repository.
      </p>

      <h2 style={h2Style}>Contact</h2>
      <p>
        Data controller: <strong>bromaid</strong>. For privacy questions, email{' '}
        <a href="mailto:contact@bromaids.com" style={linkStyle}>
          contact@bromaids.com
        </a>.
      </p>
    </main>
  );
}
