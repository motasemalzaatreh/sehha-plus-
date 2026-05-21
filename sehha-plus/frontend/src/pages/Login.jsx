import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const DEMOS = [
  { label: "مريض / Patient",  email: "ahmed@sehha.jo",   role: "patient" },
  { label: "طبيب / Doctor",   email: "maha@sehha.jo",    role: "doctor"  },
  { label: "مدير / Manager",  email: "manager@sehha.jo", role: "manager" },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const user = await login(email, password);
      navigate(`/${user.role}`);
    } catch {
      setError("البريد أو كلمة المرور غير صحيحة / Invalid credentials");
    } finally { setLoading(false); }
  };

  const quickLogin = async (demoEmail) => {
    setLoading(true); setError("");
    try {
      const user = await login(demoEmail, "sehha123");
      navigate(`/${user.role}`);
    } catch { setError("Demo login failed"); }
    finally { setLoading(false); }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🏥</span>
          <div>
            <div style={styles.logoTitle}>صحة بلس</div>
            <div style={styles.logoSub}>Sehha Plus</div>
          </div>
        </div>

        <p style={styles.tagline}>نظام إدارة العيادات الذكي · Smart Clinic Management</p>

        {/* Demo Buttons */}
        <div style={styles.demoBox}>
          <p style={styles.demoLabel}>🚀 دخول سريع للعرض · Quick Demo Login</p>
          <div style={styles.demoButtons}>
            {DEMOS.map((d) => (
              <button key={d.role} style={styles.demoBtn} onClick={() => quickLogin(d.email)} disabled={loading}>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.divider}><span>أو تسجيل دخول يدوي · or manual login</span></div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <input
            style={styles.input} type="email" placeholder="البريد الإلكتروني / Email"
            value={email} onChange={e => setEmail(e.target.value)} required
          />
          <input
            style={styles.input} type="password" placeholder="كلمة المرور / Password"
            value={password} onChange={e => setPassword(e.target.value)} required
          />
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? "جاري الدخول..." : "تسجيل الدخول · Login"}
          </button>
        </form>

        <p style={styles.hint}>كلمة المرور للجميع: <strong>sehha123</strong></p>
      </div>
    </div>
  );
}

const styles = {
  page:        { minHeight:"100vh", background:"linear-gradient(135deg,#0f4c81,#1a7abf)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Segoe UI, Arial, sans-serif" },
  card:        { background:"#fff", borderRadius:16, padding:36, width:"100%", maxWidth:420, boxShadow:"0 20px 60px rgba(0,0,0,0.25)" },
  logo:        { display:"flex", alignItems:"center", gap:12, marginBottom:8 },
  logoIcon:    { fontSize:40 },
  logoTitle:   { fontSize:24, fontWeight:700, color:"#0f4c81", direction:"rtl" },
  logoSub:     { fontSize:14, color:"#666" },
  tagline:     { textAlign:"center", color:"#555", fontSize:13, marginBottom:20, direction:"rtl" },
  demoBox:     { background:"#f0f7ff", borderRadius:10, padding:14, marginBottom:16 },
  demoLabel:   { textAlign:"center", fontSize:13, color:"#0f4c81", marginBottom:10, fontWeight:600 },
  demoButtons: { display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap" },
  demoBtn:     { background:"#0f4c81", color:"#fff", border:"none", borderRadius:8, padding:"8px 14px", fontSize:13, cursor:"pointer", fontFamily:"inherit" },
  divider:     { textAlign:"center", color:"#aaa", fontSize:12, margin:"12px 0", borderTop:"1px solid #eee", paddingTop:12 },
  input:       { width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid #ddd", marginBottom:12, fontSize:14, boxSizing:"border-box", fontFamily:"inherit" },
  error:       { color:"#e53935", fontSize:13, marginBottom:8, textAlign:"center" },
  submitBtn:   { width:"100%", padding:"12px", background:"#1a7abf", color:"#fff", border:"none", borderRadius:8, fontSize:15, fontWeight:600, cursor:"pointer", fontFamily:"inherit" },
  hint:        { textAlign:"center", fontSize:12, color:"#999", marginTop:12 },
};
