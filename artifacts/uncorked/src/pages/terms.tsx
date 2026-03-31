export default function TermsOfService() {
  return (
    <div style={{
      maxWidth: "430px",
      margin: "0 auto",
      minHeight: "100svh",
      backgroundColor: "#faf7f2",
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: "#7b1c34",
        padding: "48px 24px 32px",
        textAlign: "center",
      }}>
        <div style={{
          width: "48px",
          height: "1px",
          backgroundColor: "#c9a84c",
          margin: "0 auto 16px",
        }} />
        <h1 style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "2rem",
          fontWeight: 600,
          color: "#faf7f2",
          letterSpacing: "0.04em",
          margin: 0,
        }}>
          Terms of Service
        </h1>
        <p style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "1rem",
          fontStyle: "italic",
          color: "rgba(250,247,242,0.65)",
          marginTop: "8px",
          marginBottom: 0,
        }}>
          Uncorked Wine Scanner
        </p>
        <div style={{
          width: "48px",
          height: "1px",
          backgroundColor: "#c9a84c",
          margin: "16px auto 0",
        }} />
      </div>

      {/* Content */}
      <div style={{ padding: "32px 24px 48px" }}>

        <p style={metaStyle}>
          Last updated: March 2025 &nbsp;·&nbsp; Developer: Alejandro Arenas &nbsp;·&nbsp;{" "}
          <a href="mailto:wine.uncorked.app@gmail.com" style={{ color: "#7b1c34", textDecoration: "none" }}>
            wine.uncorked.app@gmail.com
          </a>
        </p>

        <p style={bodyStyle}>
          Please read these Terms of Service carefully before using Uncorked. By downloading,
          installing, or using the app you agree to be bound by these terms.
        </p>

        <Section title="1. Acceptance of Terms">
          <p style={bodyStyle}>
            By accessing or using Uncorked ("the App"), you agree to these Terms of Service
            and our Privacy Policy. If you do not agree, please do not use the App. These
            terms apply to all versions of the App, including iOS, Android, and web.
          </p>
        </Section>

        <Section title="2. Eligibility">
          <p style={bodyStyle}>
            The App is intended for users aged <strong>21 years or older</strong>. By using
            Uncorked you confirm that you meet this age requirement. The App is designed to
            assist with wine discovery and is not intended to promote underage drinking.
          </p>
        </Section>

        <Section title="3. Subscriptions and Payments">
          <ul style={listStyle}>
            <li style={liStyle}>
              <strong>Free trial</strong> — new users receive a 7-day free trial with full
              access to all scanning and rating features.
            </li>
            <li style={liStyle}>
              <strong>Subscription plans</strong> — after the trial, a paid subscription is
              required to continue scanning. Pricing is displayed in the app before purchase.
            </li>
            <li style={liStyle}>
              <strong>iOS</strong> — payments are processed through Apple In-App Purchase.
              Subscriptions auto-renew unless cancelled at least 24 hours before the end of
              the current period via your Apple ID settings.
            </li>
            <li style={liStyle}>
              <strong>Web</strong> — payments are processed through Stripe. You may manage or
              cancel your subscription at any time via the Customer Portal accessible from the
              app settings.
            </li>
            <li style={liStyle}>
              <strong>Refunds</strong> — refund requests for iOS purchases must be submitted
              to Apple. Web subscription refunds are handled at our discretion; contact us
              within 7 days of a charge if you believe you were billed in error.
            </li>
            <li style={liStyle}>
              <strong>Promo codes</strong> — promotional codes may be issued at our discretion
              and are non-transferable, single-use unless otherwise stated.
            </li>
          </ul>
        </Section>

        <Section title="4. Permitted Use">
          <p style={bodyStyle}>You may use the App for personal, non-commercial purposes. You agree not to:</p>
          <ul style={listStyle}>
            <li style={liStyle}>Reverse-engineer, decompile, or disassemble any part of the App</li>
            <li style={liStyle}>Use the App to scrape, harvest, or mass-collect wine data</li>
            <li style={liStyle}>Circumvent or attempt to circumvent any subscription gate or paywall</li>
            <li style={liStyle}>Submit malicious, manipulated, or misleading images to the scan feature</li>
            <li style={liStyle}>Use the App in any way that violates applicable local, national, or international law</li>
          </ul>
        </Section>

        <Section title="5. AI-Generated Content">
          <p style={bodyStyle}>
            Uncorked uses AI (OpenAI GPT-4o Vision) to extract wine names from photos and
            generate tasting notes and quality scores. This content is <strong>informational
            only</strong> and may not always be accurate. We make no warranties regarding
            the correctness or completeness of AI-generated ratings, descriptions, or price
            estimates. Do not rely solely on this information for purchasing decisions.
          </p>
        </Section>

        <Section title="6. Third-Party Data">
          <p style={bodyStyle}>
            Ratings displayed in the App (Vivino, CellarTracker, critic scores) are sourced
            from third-party APIs. Uncorked does not own, control, or guarantee the accuracy
            of this data. Third-party data is subject to its own terms and may change at any
            time without notice.
          </p>
        </Section>

        <Section title="7. Intellectual Property">
          <p style={bodyStyle}>
            All original content, branding, and code in the App are the property of
            Alejandro Arenas. You may not reproduce, distribute, or create derivative works
            from any part of the App without express written permission.
          </p>
        </Section>

        <Section title="8. Disclaimer of Warranties">
          <p style={bodyStyle}>
            The App is provided "as is" without warranties of any kind, express or implied,
            including but not limited to merchantability, fitness for a particular purpose,
            or non-infringement. We do not guarantee uninterrupted, error-free, or
            completely accurate service.
          </p>
        </Section>

        <Section title="9. Limitation of Liability">
          <p style={bodyStyle}>
            To the maximum extent permitted by law, Alejandro Arenas shall not be liable for
            any indirect, incidental, special, consequential, or punitive damages arising
            from your use of or inability to use the App, even if advised of the possibility
            of such damages. Our total liability for any claim shall not exceed the amount
            you paid for the App in the 12 months preceding the claim.
          </p>
        </Section>

        <Section title="10. Changes to These Terms">
          <p style={bodyStyle}>
            We reserve the right to update these Terms at any time. Changes will be posted
            with a new "Last updated" date. Continued use of the App after changes are posted
            constitutes your acceptance of the updated terms.
          </p>
        </Section>

        <Section title="11. Governing Law">
          <p style={bodyStyle}>
            These Terms are governed by the laws of the United States. Any disputes shall be
            resolved in the courts of competent jurisdiction in the United States.
          </p>
        </Section>

        <Section title="12. Contact">
          <p style={bodyStyle}>Questions about these Terms:</p>
          <div style={{
            backgroundColor: "#fff",
            border: "1px solid rgba(123,28,52,0.12)",
            borderRadius: "12px",
            padding: "16px 20px",
            marginTop: "8px",
          }}>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#3c0f19", lineHeight: 1.6 }}>
              <strong>Alejandro Arenas</strong><br />
              <a href="mailto:wine.uncorked.app@gmail.com" style={{ color: "#7b1c34", textDecoration: "none" }}>
                wine.uncorked.app@gmail.com
              </a>
            </p>
          </div>
        </Section>

        {/* Back link */}
        <div style={{ marginTop: "40px", textAlign: "center" }}>
          <a
            href="/"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "1rem",
              color: "#7b1c34",
              textDecoration: "none",
              letterSpacing: "0.02em",
              opacity: 0.75,
            }}
          >
            ← Back to Uncorked
          </a>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: "32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        <div style={{ width: "3px", height: "20px", backgroundColor: "#c9a84c", borderRadius: "2px", flexShrink: 0 }} />
        <h2 style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "1.2rem",
          fontWeight: 600,
          color: "#7b1c34",
          margin: 0,
          letterSpacing: "0.02em",
        }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

const metaStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "rgba(60,15,25,0.45)",
  marginBottom: "24px",
  lineHeight: 1.6,
};

const bodyStyle: React.CSSProperties = {
  fontSize: "0.88rem",
  color: "#3c0f19",
  lineHeight: 1.75,
  margin: "0 0 12px",
};

const listStyle: React.CSSProperties = {
  margin: "0 0 12px",
  paddingLeft: "20px",
};

const liStyle: React.CSSProperties = {
  fontSize: "0.88rem",
  color: "#3c0f19",
  lineHeight: 1.75,
  marginBottom: "8px",
};
