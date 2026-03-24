export default function PrivacyPolicy() {
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
          Privacy Policy
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
          Your privacy matters. Uncorked is designed to keep your data local on your device
          whenever possible. This policy explains exactly what we collect, how we use it,
          and your choices.
        </p>

        <Section title="1. Information We Collect">
          <p style={bodyStyle}>We collect only what's needed to deliver the app's features:</p>
          <ul style={listStyle}>
            <li style={liStyle}>
              <strong>Camera &amp; photos</strong> — when you scan a wine list, the image is
              sent to our server solely to extract wine names. It is not stored after processing.
            </li>
            <li style={liStyle}>
              <strong>Search queries</strong> — wine names or producer names you type into the
              search bar are sent to our server to fetch ratings. These are not linked to your identity.
            </li>
            <li style={liStyle}>
              <strong>Scan history &amp; saved wines</strong> — stored locally on your device
              using the browser's localStorage. We do not upload this to any server.
            </li>
            <li style={liStyle}>
              <strong>A random user ID</strong> — generated on first launch and stored locally.
              Used only to manage your subscription status with Stripe.
            </li>
            <li style={liStyle}>
              <strong>Email address</strong> — only if you choose to subscribe via Stripe.
              Never required to use the app.
            </li>
          </ul>
        </Section>

        <Section title="2. How We Use Your Data">
          <ul style={listStyle}>
            <li style={liStyle}>To analyse wine list photos and return wine names (via OpenAI)</li>
            <li style={liStyle}>To look up Vivino ratings and AI tasting notes for wines you scan or search</li>
            <li style={liStyle}>To process subscription payments securely (via Stripe)</li>
            <li style={liStyle}>To keep your trial period and subscription status accurate</li>
          </ul>
          <p style={bodyStyle}>
            We do not sell, rent, or share your personal information with advertisers or
            data brokers. We do not build profiles or use your data for targeted advertising.
          </p>
        </Section>

        <Section title="3. Third-Party Services">
          <p style={bodyStyle}>Uncorked uses the following third-party services:</p>
          <ul style={listStyle}>
            <li style={liStyle}>
              <strong>OpenAI</strong> — processes wine list photos to extract wine names.
              Images are sent over an encrypted connection and not retained by us after the
              response is returned. See{" "}
              <a href="https://openai.com/policies/privacy-policy" style={linkStyle} target="_blank" rel="noopener noreferrer">
                OpenAI's Privacy Policy
              </a>.
            </li>
            <li style={liStyle}>
              <strong>Vivino / RapidAPI</strong> — used to retrieve wine ratings and
              community data. Only wine names are transmitted — no personal data.
            </li>
            <li style={liStyle}>
              <strong>CellarTracker</strong> — used to retrieve community tasting notes and
              ratings. Only wine names are transmitted — no personal data.
            </li>
            <li style={liStyle}>
              <strong>RevenueCat</strong> — manages in-app subscriptions and entitlements
              on iOS. RevenueCat receives an anonymous app user ID and purchase receipts
              to verify subscription status. See{" "}
              <a href="https://www.revenuecat.com/privacy" style={linkStyle} target="_blank" rel="noopener noreferrer">
                RevenueCat's Privacy Policy
              </a>.
            </li>
            <li style={liStyle}>
              <strong>Stripe</strong> — handles all payment processing on web. We never see
              or store your full card number. See{" "}
              <a href="https://stripe.com/privacy" style={linkStyle} target="_blank" rel="noopener noreferrer">
                Stripe's Privacy Policy
              </a>.
            </li>
          </ul>
        </Section>

        <Section title="4. Data Storage">
          <ul style={listStyle}>
            <li style={liStyle}>
              <strong>On your device</strong> — scan history, saved wines, your trial start
              date, and your local user ID are all stored in your browser's localStorage.
              Clearing your browser data removes them entirely.
            </li>
            <li style={liStyle}>
              <strong>On our server</strong> — only your anonymous user ID, subscription
              status, and (if you subscribed) your email address are stored in our database.
              No wine history or photos are retained server-side.
            </li>
          </ul>
        </Section>

        <Section title="5. Camera Permission">
          <p style={bodyStyle}>
            The app requests camera access only when you tap "Scan Wine List." Photos are
            used exclusively to extract wine names and are not stored, shared, or used
            for any other purpose. You can revoke camera permission at any time in your
            device settings.
          </p>
        </Section>

        <Section title="6. Children's Privacy">
          <p style={bodyStyle}>
            Uncorked is intended for users aged 21 and older. We do not knowingly collect
            personal information from anyone under 21. If you believe a minor has used the
            app, please contact us and we will remove any associated data.
          </p>
        </Section>

        <Section title="7. Changes to This Policy">
          <p style={bodyStyle}>
            We may update this policy as the app evolves. Material changes will be noted
            with a new "Last updated" date at the top of this page. Continued use of the
            app after changes are posted constitutes acceptance of the updated policy.
          </p>
        </Section>

        <Section title="8. Contact Us">
          <p style={bodyStyle}>
            Questions, requests to delete your data, or any other privacy concerns:
          </p>
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

const linkStyle: React.CSSProperties = {
  color: "#7b1c34",
  textDecoration: "underline",
  textDecorationStyle: "dotted",
};
