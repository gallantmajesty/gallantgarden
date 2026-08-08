// Legal pages — Terms, Privacy & Refund. One component, three routes.
// Public URLs are required by our payment providers (Razorpay / Stripe) during
// merchant review, and by the DPDP Act (notice + grievance contact).

import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './Legal.css'

/** Your published support/grievance address (Hostinger email). */
export const SUPPORT_EMAIL = 'support@focuslily.com'

type DocId = 'terms' | 'privacy' | 'refund'

const DOCS: Record<DocId, { title: string; updated: string }> = {
  terms: { title: 'Terms & Conditions', updated: 'August 2026' },
  privacy: { title: 'Privacy Policy', updated: 'August 2026' },
  refund: { title: 'Refund Policy', updated: 'August 2026' },
}

export function Legal() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const doc: DocId = pathname.startsWith('/privacy') ? 'privacy' : pathname.startsWith('/refund') ? 'refund' : 'terms'

  const body = useMemo(() => {
    switch (doc) {
      case 'privacy': return <PrivacyDoc />
      case 'refund': return <RefundDoc />
      default: return <TermsDoc />
    }
  }, [doc])

  return (
    <div className="lg-root">
      <header className="lg-topbar">
        <button className="lg-back" onClick={() => navigate('/')}>
          ← Back
        </button>
        <div className="lg-brand">
          <img src="/android-chrome-192x192.png" alt="" className="lg-logo" />
          <span>Focus Lily</span>
        </div>
      </header>

      <main className="lg-main">
        <div className="lg-tabs">
          {(['terms', 'privacy', 'refund'] as DocId[]).map((id) => (
            <button
              key={id}
              className={`lg-tab ${doc === id ? 'active' : ''}`}
              onClick={() => navigate(`/${id === 'terms' ? 'terms' : id}`)}
            >
              {DOCS[id].title}
            </button>
          ))}
        </div>

        <article className="lg-doc">
          <h1 className="lg-title">{DOCS[doc].title}</h1>
          <p className="lg-updated">Last updated: {DOCS[doc].updated}</p>
          {body}
        </article>
      </main>

      <footer className="lg-footer">
        <p>© 2026 Focus Lily. All rights reserved.</p>
        <p>
          Questions about your data?{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>
      </footer>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="lg-section">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function TermsDoc() {
  return (
    <>
      <p className="lg-intro">
        Welcome to Focus Lily! By creating an account or using Focus Lily, you
        agree to these Terms. If you are under 18, your parent or guardian has
        agreed to these Terms on your behalf.
      </p>

      <Section title="1. Who can use Focus Lily">
        <ul>
          <li>Focus Lily is designed for explorers aged <strong>7 and above</strong>.</li>
          <li>If you are under 7, please do not use Focus Lily — it is not designed for you yet.</li>
          <li>
            If you are under 18, you confirm that a <strong>parent or guardian</strong> has
            given you permission to use Focus Lily.
          </li>
          <li>You need an account (email or Google/Microsoft/GitHub sign-in) to play.</li>
        </ul>
      </Section>

      <Section title="2. Accounts & safety">
        <ul>
          <li>Keep your password safe. You are responsible for activity on your account.</li>
          <li>
            Be kind. No bullying, harassment, hate speech, sharing private
            information, scams, or anything that makes other explorers unsafe.
          </li>
          <li>We may remove content or suspend accounts that break these rules.</li>
          <li>Only one account per person, unless we agree otherwise.</li>
        </ul>
      </Section>

      <Section title="3. Digital goods & virtual currency">
        <ul>
          <li>
            Golden leaves are virtual currency you can buy with real money
            through Razorpay or Stripe. Green leaves are earned by studying.
          </li>
          <li>
            Golden leaves can only be purchased by someone <strong>18 or older</strong>, or
            with a <strong>parent or guardian's permission</strong>.
          </li>
          <li>
            Virtual goods and leaves have no real-world value, cannot be
            transferred between players, and cannot be cashed out.
          </li>
          <li>
            We may adjust, rebalance or retire items and features. Virtual
            currency you haven't spent is covered by our Refund Policy.
          </li>
        </ul>
      </Section>

      <Section title="4. Deleting your account">
        <p>
          You can delete your account and all your data at any time from your
          Profile page (Account → Delete my account), or by emailing{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. Deletion is
          permanent and cannot be undone. Payment records are kept anonymous as
          required by law.
        </p>
      </Section>

      <Section title="5. Changes & contact">
        <p>
          We may update these Terms from time to time. Continued use after a
          change means you accept the updated Terms. For questions, contact{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </Section>
    </>
  )
}

function PrivacyDoc() {
  return (
    <>
      <p className="lg-intro">
        This Privacy Policy explains what we collect, why we collect it, and how
        you can control your data. It applies to all users of Focus Lily,
        including children under 18 who use the service with parental permission.
      </p>

      <Section title="1. What we collect">
        <ul>
          <li>
            <strong>Account info:</strong> your name and email (via email or
            Google/Microsoft/GitHub sign-in).
          </li>
          <li>
            <strong>Profile info:</strong> display name, Player ID, country, age
            (stored privately), avatar, banner, bio, rank, and progress.
          </li>
          <li>
            <strong>Content you create:</strong> chat messages, group memberships,
            realms, blueprints, notes, and study data.
          </li>
          <li>
            <strong>Payment records:</strong> when you buy golden leaves, the
            payment provider (Razorpay or Stripe) collects your payment details.
            We store only the transaction reference and amount — never card
            numbers.
          </li>
          <li>
            <strong>Technical data:</strong> device type and error reports to keep
            Focus Lily working.
          </li>
        </ul>
      </Section>

      <Section title="2. Children & parental consent">
        <ul>
          <li>Focus Lily is for explorers aged 7 and above.</li>
          <li>
            If you are under 18, you must have your <strong>parent or guardian's
            permission</strong> to use Focus Lily, and they must agree to these
            policies.
          </li>
          <li>
            We don't knowingly allow children under 7 to use Focus Lily.
          </li>
          <li>
            Parents or guardians can ask us to review, correct or delete their
            child's data at any time via{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </li>
        </ul>
      </Section>

      <Section title="3. How we use your data">
        <ul>
          <li>To run the service: accounts, profiles, chat, realms and progress.</li>
          <li>To process payments and credit your golden leaves.</li>
          <li>To keep the community safe and follow the law.</li>
          <li>We do <strong>not</strong> sell your personal data.</li>
        </ul>
      </Section>

      <Section title="4. Who we share data with">
        <ul>
          <li><strong>Service providers</strong> that help run the app (hosting, database, file storage).</li>
          <li><strong>Payment providers</strong> (Razorpay, Stripe) for purchases.</li>
          <li><strong>Sign-in providers</strong> (Google, Microsoft, GitHub) for OAuth.</li>
          <li><strong>Where required by law</strong> — for example a valid legal order.</li>
        </ul>
      </Section>

      <Section title="5. Your rights (including the DPDP Act)">
        <p>
          You have the right to access, correct and delete your personal data,
          and to withdraw your consent at any time. You can do most of this
          yourself in the app, and the rest by emailing{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> — we respond
          within 21 days.
        </p>
      </Section>

      <Section title="6. Data retention & deletion">
        <p>
          We keep your data while your account is active. When you delete your
          account, your personal data is removed. Payment records are retained
          (anonymized) as required by law. If you stop using Focus Lily, we may
          remove inactive accounts after a reasonable period.
        </p>
      </Section>

      <Section title="7. Grievance officer & contact">
        <p>
          Focus Lily is operated by the developer of Focus Lily. For any
          privacy question, complaint or data request, contact us at{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We aim to
          respond to all requests within 21 days.
        </p>
      </Section>
    </>
  )
}

function RefundDoc() {
  return (
    <>
      <p className="lg-intro">
        We want every purchase to be a happy one. This policy covers purchases of
        golden leaves (virtual currency) in Focus Lily.
      </p>

      <Section title="1. Golden leaves">
        <p>
          Golden leaves are virtual currency bought with real money through
          Razorpay (₹) or Stripe ($). Once credited, they can be spent on
          in-app items.
        </p>
      </Section>

      <Section title="2. Refunds">
        <ul>
          <li>
            <strong>Unspent golden leaves:</strong> if you bought golden leaves
            and have <strong>not spent them</strong>, email{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> within{' '}
            <strong>7 days</strong> of purchase and we will process a refund to
            the original payment method.
          </li>
          <li>
            <strong>Spent golden leaves:</strong> purchases made inside the app
            are final once the item is equipped, because virtual goods are
            delivered instantly. Exceptions are made for genuine technical
            faults (e.g. you were charged but never received your leaves).
          </li>
          <li>
            <strong>Error refunds:</strong> if you were charged but the leaves
            weren't credited, contact us and we'll fix it — and refund if we
            can't.
          </li>
        </ul>
      </Section>

      <Section title="3. How to request a refund">
        <ol>
          <li>Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</li>
          <li>
            Include your account email, Player ID, the payment reference, and
            what you'd like refunded.
          </li>
          <li>We reply within 7 days.</li>
        </ol>
        <p>
          Payments are processed by Razorpay or Stripe; if your refund is
          approved, it's sent to the same payment method you used.
        </p>
      </Section>

      <Section title="4. Chargebacks">
        <p>
          If you dispute a charge with your bank or the payment provider without
          requesting a refund from us first, your leaves may be frozen while the
          dispute is resolved, and your account may be reviewed.
        </p>
      </Section>
    </>
  )
}
