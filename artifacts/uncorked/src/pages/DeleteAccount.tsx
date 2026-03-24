import { useState } from "react";

export default function DeleteAccount() {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async () => {
    if (!email.trim()) {
      setErrorMsg("Please enter your email address.");
      return;
    }
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/delete-account-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), reason: reason.trim() }),
      });

      if (res.ok) {
        setStatus("success");
      } else {
        const data = await res.json();
        setErrorMsg(data.message || "Something went wrong. Please try again.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.brand}>
          <span style={styles.logo}>🍷</span>
          <h1 style={styles.appName}>Uncorked</h1>
        </div>

        <h2 style={styles.title}>Delete My Account</h2>
        <p style={styles.subtitle}>
          We're sorry to see you go. Submitting this form will permanently delete your
          Uncorked account and all associated data, including scan history and
          subscription records.
        </p>

        {status === "success" ? (
          <div style={styles.successBox}>
            <div style={styles.successIcon}>✓</div>
            <h3 style={styles.successTitle}>Request Received</h3>
            <p style={styles.successText}>
              We've received your deletion request for <strong>{email}</strong>.
              Your account and data will be permanently deleted within{" "}
              <strong>30 days</strong>. You'll receive a confirmation email once complete.
            </p>
            <p style={styles.successNote}>
              If you have an active subscription, please also cancel it through the
              App Store or Google Play to stop future charges.
            </p>
          </div>
        ) : (
          <>
            <div style={styles.warningBox}>
              <strong>⚠️ This action is permanent and cannot be undone.</strong>
              <br />
              All your data will be deleted, including:
              <ul style={styles.list}>
                <li>Account credentials and profile</li>
                <li>Wine scan history</li>
                <li>Saved wines and ratings</li>
                <li>Subscription and billing records</li>
              </ul>
            </div>

            <label style={styles.label}>Email address on your Uncorked account *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={styles.input}
              disabled={status === "loading"}
            />

            <label style={styles.label}>Reason for deletion (optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Help us improve — why are you leaving?"
              style={styles.textarea}
              rows={3}
              disabled={status === "loading"}
            />

            {errorMsg && <p style={styles.error}>{errorMsg}</p>}

            <button
              onClick={handleSubmit}
              disabled={status === "loading"}
              style={status === "loading" ? { ...styles.button, ...styles.buttonDisabled } : styles.button}
            >
              {status === "loading" ? "Submitting..." : "Request Account Deletion"}
            </button>

            <p style={styles.footer}>
              Changed your mind?{" "}
              <a href="/" style={styles.link}>Go back to Uncorked</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #1a0a0a 0%, #2d0f0f 50%, #1a0a0a 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px",
    fontFamily: "'Georgia', 'Times New Roman', serif",
  },
  card: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(180, 80, 60, 0.3)",
    borderRadius: "16px",
    padding: "48px 40px",
    maxWidth: "520px",
    width: "100%",
    backdropFilter: "blur(12px)",
    boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
  },
  brand: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px" },
  logo: { fontSize: "28px" },
  appName: { color: "#c9a96e", fontSize: "22px", fontWeight: "700", margin: 0, letterSpacing: "0.5px" },
  title: { color: "#ffffff", fontSize: "26px", fontWeight: "700", margin: "0 0 12px 0" },
  subtitle: { color: "rgba(255,255,255,0.6)", fontSize: "15px", lineHeight: "1.6", margin: "0 0 28px 0" },
  warningBox: {
    background: "rgba(180, 60, 40, 0.15)",
    border: "1px solid rgba(180, 60, 40, 0.4)",
    borderRadius: "10px",
    padding: "16px 20px",
    color: "rgba(255,200,180,0.9)",
    fontSize: "14px",
    lineHeight: "1.6",
    marginBottom: "28px",
  },
  list: { margin: "8px 0 0 0", paddingLeft: "20px", color: "rgba(255,200,180,0.8)" },
  label: { display: "block", color: "rgba(255,255,255,0.75)", fontSize: "13px", fontWeight: "600", marginBottom: "8px", letterSpacing: "0.3px", fontFamily: "system-ui, sans-serif" },
  input: { width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", padding: "12px 16px", color: "#ffffff", fontSize: "15px", marginBottom: "20px", boxSizing: "border-box", outline: "none", fontFamily: "system-ui, sans-serif" },
  textarea: { width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", padding: "12px 16px", color: "#ffffff", fontSize: "15px", marginBottom: "24px", boxSizing: "border-box", outline: "none", resize: "vertical", fontFamily: "system-ui, sans-serif" },
  button: { width: "100%", background: "linear-gradient(135deg, #8b1a1a, #c0392b)", color: "#ffffff", border: "none", borderRadius: "10px", padding: "15px", fontSize: "16px", fontWeight: "700", cursor: "pointer", letterSpacing: "0.3px", fontFamily: "system-ui, sans-serif" },
  buttonDisabled: { opacity: 0.6, cursor: "not-allowed" },
  error: { color: "#ff6b6b", fontSize: "14px", marginBottom: "16px", fontFamily: "system-ui, sans-serif" },
  footer: { textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: "13px", marginTop: "20px", fontFamily: "system-ui, sans-serif" },
  link: { color: "#c9a96e", textDecoration: "none" },
  successBox: { textAlign: "center", padding: "12px 0" },
  successIcon: { width: "60px", height: "60px", background: "rgba(40, 167, 69, 0.2)", border: "2px solid rgba(40, 167, 69, 0.5)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", color: "#5cb85c", margin: "0 auto 20px" },
  successTitle: { color: "#ffffff", fontSize: "22px", margin: "0 0 12px" },
  successText: { color: "rgba(255,255,255,0.7)", fontSize: "15px", lineHeight: "1.7", margin: "0 0 16px", fontFamily: "system-ui, sans-serif" },
  successNote: { color: "rgba(255,200,100,0.7)", fontSize: "13px", lineHeight: "1.6", background: "rgba(200,150,0,0.1)", border: "1px solid rgba(200,150,0,0.2)", borderRadius: "8px", padding: "12px 16px", fontFamily: "system-ui, sans-serif" },
};
