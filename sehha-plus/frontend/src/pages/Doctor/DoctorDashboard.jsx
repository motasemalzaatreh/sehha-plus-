import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api";
import ChatBot from "../../components/ChatBot";

const STATUS_AR    = { pending:"بانتظار", confirmed:"مؤكد", attended:"حضر", no_show:"لم يحضر", cancelled:"ملغي" };
const STATUS_BG    = { pending:"#fef3c7", confirmed:"#dbeafe", attended:"#d1fae5", no_show:"#fee2e2", cancelled:"#f3f4f6" };
const STATUS_CLR   = { pending:"#92400e", confirmed:"#1d4ed8", attended:"#065f46", no_show:"#dc2626", cancelled:"#6b7280" };
const STEP_ICON    = { completed:"✅", in_progress:"🔄", locked:"🔒" };
const STEP_BG      = { completed:"#d1fae5", in_progress:"#fef3c7", locked:"#f3f4f6" };

export default function DoctorDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab]         = useState("schedule");
  const [appointments, setApts] = useState([]);
  const [plans, setPlans]     = useState([]);
  const [profile, setProfile] = useState({});
  const [msg, setMsg]         = useState("");

  useEffect(() => {
    api.get("/api/appointments/doctor").then(r => setApts(r.data)).catch(console.error);
    api.get("/api/treatment/doctor").then(r => setPlans(r.data)).catch(console.error);
    api.get("/api/doctors/profile").then(r => setProfile(r.data)).catch(console.error);
  }, []);

  const today    = new Date().toISOString().split("T")[0];
  const todayApts  = appointments.filter(a => a.AppDate === today);
  const upcoming   = appointments.filter(a => a.AppDate >  today);
  const attended   = appointments.filter(a => a.Status === "attended");
  const noShows    = appointments.filter(a => a.Status === "no_show");

  const notify = (msg) => { setMsg(msg); setTimeout(() => setMsg(""), 3000); };

  const updateStatus = async (id, status, notes) => {
    await api.patch(`/api/appointments/${id}/status`, { status, notes });
    setApts(prev => prev.map(a => a.AppointmentID === id ? { ...a, Status: status } : a));
    notify(`✅ تم تحديث الحالة: ${STATUS_AR[status]}`);
  };

  const updateStep = async (stepId, status) => {
    const date = status === "completed" ? today : null;
    await api.patch(`/api/treatment/step/${stepId}`, { status, completed_date: date });
    const r = await api.get("/api/treatment/doctor");
    setPlans(r.data);
    notify("✅ تم تحديث مرحلة العلاج");
  };

  const nav = [
    { key:"schedule", icon:"📅", label:"جدول اليوم" },
    { key:"all",      icon:"📋", label:"جميع مواعيدي" },
    { key:"plans",    icon:"🗂️", label:"خطط المرضى" },
    { key:"profile",  icon:"👨‍⚕️", label:"ملفي" },
  ];

  const AppCard = ({ a }) => (
    <div style={s.card}>
      <div style={s.cardHeader}>
        <div>
          <div style={s.patientName}>👤 {a.PatientName}</div>
          <div style={s.patientPhone}>📞 {a.PatientPhone}</div>
        </div>
        <span style={{...s.statusBadge, background:STATUS_BG[a.Status], color:STATUS_CLR[a.Status]}}>
          {STATUS_AR[a.Status]}
        </span>
      </div>

      <div style={s.cardMeta}>
        <span>📅 {a.AppDate}</span>
        <span>🕐 {a.AppTime?.slice(0,5)}</span>
        <span style={s.code}>{a.BookingCode}</span>
      </div>

      {(a.BloodType || a.Allergies || a.ChronicDiseases) && (
        <div style={s.medBar}>
          {a.BloodType && <span style={s.medChip}>🩸 {a.BloodType}</span>}
          {a.Allergies && a.Allergies !== "None" && a.Allergies !== "لا يوجد" &&
            <span style={{...s.medChip, background:"#fef3c7", color:"#92400e"}}>⚠️ {a.Allergies}</span>}
          {a.ChronicDiseases && a.ChronicDiseases !== "None" && a.ChronicDiseases !== "لا يوجد" &&
            <span style={{...s.medChip, background:"#ede9fe", color:"#6d28d9"}}>🏥 {a.ChronicDiseases}</span>}
        </div>
      )}

      {a.Notes && <div style={s.noteBox}>📝 {a.Notes}</div>}

      {(a.Status === "pending" || a.Status === "confirmed") && (
        <div style={s.actionRow}>
          <button style={s.btnGreen}  onClick={()=>updateStatus(a.AppointmentID,"attended",a.Notes)}>✅ سجّل حضور</button>
          <button style={s.btnBlue}   onClick={()=>updateStatus(a.AppointmentID,"confirmed",a.Notes)}>🔵 تأكيد</button>
          <button style={s.btnRed}    onClick={()=>updateStatus(a.AppointmentID,"no_show",a.Notes)}>❌ لم يحضر</button>
        </div>
      )}
    </div>
  );

  return (
    <div style={s.shell}>
      {/* Sidebar */}
      <aside style={s.sidebar}>
        <div style={s.sideTop}>
          <div style={s.logo}>🏥</div>
          <div style={s.logoText}>صحة بلس</div>
          <div style={s.logoSub}>لوحة الطبيب</div>
        </div>
        <nav style={s.nav}>
          {nav.map(n => (
            <button key={n.key} style={{...s.navBtn, ...(tab===n.key?s.navBtnActive:{})}} onClick={()=>setTab(n.key)}>
              <span style={s.navIcon}>{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div style={s.sideBottom}>
          <div style={s.userChip}>
            <div style={s.userAvatar}>د</div>
            <div>
              <div style={s.userName}>{user?.name}</div>
              <div style={s.userRole}>{profile.SpecialtyAR || "طبيب"}</div>
            </div>
          </div>
          <button style={s.logoutBtn} onClick={logout}>تسجيل الخروج</button>
        </div>
      </aside>

      {/* Main */}
      <main style={s.main}>
        {msg && <div style={s.msgBanner}>{msg}</div>}

        <header style={s.topbar}>
          <div>
            <h1 style={s.pageTitle}>{nav.find(n=>n.key===tab)?.icon} {nav.find(n=>n.key===tab)?.label}</h1>
            <p style={s.pageDate}>{new Date().toLocaleDateString("ar-JO",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</p>
          </div>
          <div style={s.clinicTag}>🏥 {profile.ClinicNameAR}</div>
        </header>

        {/* KPI Strip */}
        <div style={s.kpiStrip}>
          {[
            { label:"مواعيد اليوم", value:todayApts.length, color:"#3b82f6" },
            { label:"حضر",          value:attended.length,  color:"#10b981" },
            { label:"لم يحضر",      value:noShows.length,   color:"#ef4444" },
            { label:"قادمة",        value:upcoming.length,  color:"#f59e0b" },
          ].map(k=>(
            <div key={k.label} style={{...s.kpiCard, borderTop:`4px solid ${k.color}`}}>
              <div style={{...s.kpiValue, color:k.color}}>{k.value}</div>
              <div style={s.kpiLabel}>{k.label}</div>
            </div>
          ))}
        </div>

        <div style={s.content}>

          {/* ── TODAY'S SCHEDULE ── */}
          {tab === "schedule" && (
            <div>
              {todayApts.length === 0
                ? <div style={s.emptyState}><div style={s.emptyIcon}>📭</div><p>لا توجد مواعيد اليوم</p></div>
                : todayApts.map(a => <AppCard key={a.AppointmentID} a={a}/>)
              }
            </div>
          )}

          {/* ── ALL APPOINTMENTS ── */}
          {tab === "all" && (
            <div>
              {appointments.length === 0
                ? <div style={s.emptyState}><div style={s.emptyIcon}>📭</div><p>لا توجد مواعيد</p></div>
                : appointments.map(a => <AppCard key={a.AppointmentID} a={a}/>)
              }
            </div>
          )}

          {/* ── TREATMENT PLANS ── */}
          {tab === "plans" && (
            <div>
              {plans.length === 0
                ? <div style={s.emptyState}><div style={s.emptyIcon}>📭</div><p>لا توجد خطط علاج</p></div>
                : plans.map(plan => (
                  <div key={plan.PlanID} style={s.planCard}>
                    <div style={s.planHeader}>
                      <div>
                        <div style={s.planTitle}>{plan.TitleAR}</div>
                        <div style={s.planSub}>📅 {plan.StartDate}</div>
                      </div>
                      <div style={s.planPatient}>👤 {plan.PatientName}</div>
                    </div>
                    <div style={s.stepsTable}>
                      {plan.steps?.map(step => (
                        <div key={step.StepID} style={s.stepRow}>
                          <div style={{...s.stepBadge, background:STEP_BG[step.Status]}}>{STEP_ICON[step.Status]}</div>
                          <div style={s.stepName}>{step.TitleAR}</div>
                          <div style={s.stepActions}>
                            {step.Status === "locked" && (
                              <button style={s.btnSmBlue} onClick={()=>updateStep(step.StepID,"in_progress")}>▶ ابدأ</button>
                            )}
                            {step.Status === "in_progress" && (
                              <button style={s.btnSmGreen} onClick={()=>updateStep(step.StepID,"completed")}>✅ أكمل</button>
                            )}
                            {step.Status === "completed" && (
                              <span style={s.completedDate}>✔ {step.CompletedDate}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          {/* ── PROFILE ── */}
          {tab === "profile" && (
            <div style={s.profileWrap}>
              <div style={s.profileCard}>
                <div style={s.profileAvatar}>د</div>
                <div style={s.profileName}>{profile.FullName}</div>
                <div style={s.profileSpec}>{profile.SpecialtyAR}</div>
                <div style={s.profileClinic}>🏥 {profile.ClinicNameAR} — {profile.Area}</div>
              </div>
              <div style={s.profileDetails}>
                {[
                  ["البريد الإلكتروني", profile.Email],
                  ["الهاتف",            profile.Phone],
                  ["العنوان",           profile.Address],
                  ["ساعات العمل",       `${profile.WorkStart?.slice(0,5)} — ${profile.WorkEnd?.slice(0,5)}`],
                  ["رسوم الكشف",        `${profile.ConsultFee} دينار أردني`],
                ].map(([k,v]) => (
                  <div key={k} style={s.detailRow}>
                    <span style={s.detailLabel}>{k}</span>
                    <span style={s.detailValue}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <ChatBot role="doctor"/>
    </div>
  );
}

const s = {
  shell:         { display:"flex", minHeight:"100vh", background:"#f0fdf4", fontFamily:"Segoe UI, Arial, sans-serif", direction:"rtl" },
  sidebar:       { width:240, background:"linear-gradient(180deg,#064e3b 0%,#065f46 100%)", display:"flex", flexDirection:"column", position:"fixed", top:0, right:0, height:"100vh", zIndex:100 },
  sideTop:       { padding:"28px 20px 20px", textAlign:"center", borderBottom:"1px solid rgba(255,255,255,0.1)" },
  logo:          { fontSize:36, marginBottom:4 },
  logoText:      { color:"#fff", fontWeight:800, fontSize:20 },
  logoSub:       { color:"rgba(255,255,255,0.6)", fontSize:12 },
  nav:           { flex:1, padding:"16px 12px", display:"flex", flexDirection:"column", gap:4 },
  navBtn:        { display:"flex", alignItems:"center", gap:10, padding:"11px 14px", borderRadius:10, border:"none", background:"transparent", color:"rgba(255,255,255,0.75)", cursor:"pointer", fontSize:14, fontFamily:"inherit", textAlign:"right", width:"100%" },
  navBtnActive:  { background:"rgba(255,255,255,0.2)", color:"#fff", fontWeight:600 },
  navIcon:       { fontSize:18, flexShrink:0 },
  sideBottom:    { padding:"16px 12px", borderTop:"1px solid rgba(255,255,255,0.1)" },
  userChip:      { display:"flex", alignItems:"center", gap:10, marginBottom:12 },
  userAvatar:    { width:36, height:36, borderRadius:"50%", background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:16, flexShrink:0 },
  userName:      { color:"#fff", fontSize:13, fontWeight:600 },
  userRole:      { color:"rgba(255,255,255,0.6)", fontSize:11 },
  logoutBtn:     { width:"100%", padding:"8px 0", background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", color:"#fff", borderRadius:8, cursor:"pointer", fontSize:13, fontFamily:"inherit" },

  main:          { flex:1, marginRight:240, display:"flex", flexDirection:"column" },
  msgBanner:     { background:"#d1fae5", color:"#065f46", padding:"12px 24px", textAlign:"center", fontWeight:600, fontSize:14 },
  topbar:        { background:"#fff", padding:"20px 28px", borderBottom:"1px solid #e5e7eb", display:"flex", justifyContent:"space-between", alignItems:"flex-end" },
  pageTitle:     { fontSize:22, fontWeight:700, color:"#064e3b", margin:0 },
  pageDate:      { fontSize:13, color:"#9ca3af", margin:"4px 0 0" },
  clinicTag:     { background:"#d1fae5", color:"#065f46", borderRadius:20, padding:"6px 16px", fontSize:13, fontWeight:600 },

  kpiStrip:      { display:"flex", gap:16, padding:"16px 24px", background:"#fff", borderBottom:"1px solid #e5e7eb" },
  kpiCard:       { flex:1, background:"#f9fafb", borderRadius:10, padding:"12px 16px", textAlign:"center" },
  kpiValue:      { fontSize:28, fontWeight:800 },
  kpiLabel:      { fontSize:12, color:"#6b7280", marginTop:2 },

  content:       { padding:24, maxWidth:860, margin:"0 auto", width:"100%" },

  card:          { background:"#fff", borderRadius:14, padding:18, marginBottom:14, boxShadow:"0 1px 6px rgba(0,0,0,0.07)", borderRight:"4px solid #10b981" },
  cardHeader:    { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 },
  patientName:   { fontWeight:700, fontSize:16, color:"#1f2937" },
  patientPhone:  { fontSize:13, color:"#6b7280", marginTop:2 },
  statusBadge:   { borderRadius:20, padding:"4px 14px", fontSize:12, fontWeight:600, whiteSpace:"nowrap" },
  cardMeta:      { display:"flex", gap:16, fontSize:13, color:"#6b7280", marginBottom:10 },
  code:          { background:"#f3f4f6", borderRadius:6, padding:"2px 8px", fontFamily:"monospace", fontSize:12 },
  medBar:        { display:"flex", flexWrap:"wrap", gap:8, marginBottom:10 },
  medChip:       { background:"#f0fdf4", color:"#065f46", borderRadius:20, padding:"3px 10px", fontSize:12, fontWeight:500 },
  noteBox:       { background:"#f8fafc", borderRadius:8, padding:"8px 12px", fontSize:13, color:"#555", marginBottom:10 },
  actionRow:     { display:"flex", gap:8, flexWrap:"wrap" },
  btnGreen:      { background:"#d1fae5", color:"#065f46", border:"none", borderRadius:8, padding:"7px 16px", cursor:"pointer", fontSize:13, fontWeight:600 },
  btnBlue:       { background:"#dbeafe", color:"#1d4ed8", border:"none", borderRadius:8, padding:"7px 16px", cursor:"pointer", fontSize:13, fontWeight:600 },
  btnRed:        { background:"#fee2e2", color:"#dc2626", border:"none", borderRadius:8, padding:"7px 16px", cursor:"pointer", fontSize:13, fontWeight:600 },

  emptyState:    { textAlign:"center", padding:"60px 0", color:"#9ca3af" },
  emptyIcon:     { fontSize:48, marginBottom:12 },

  planCard:      { background:"#fff", borderRadius:14, padding:20, marginBottom:16, boxShadow:"0 1px 6px rgba(0,0,0,0.07)" },
  planHeader:    { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 },
  planTitle:     { fontWeight:700, fontSize:16, color:"#1f2937" },
  planSub:       { fontSize:13, color:"#9ca3af", marginTop:2 },
  planPatient:   { background:"#d1fae5", color:"#065f46", borderRadius:20, padding:"4px 14px", fontSize:13, fontWeight:600 },
  stepsTable:    { display:"flex", flexDirection:"column", gap:2 },
  stepRow:       { display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:8, background:"#f9fafb" },
  stepBadge:     { width:32, height:32, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 },
  stepName:      { flex:1, fontSize:14, fontWeight:500, color:"#374151" },
  stepActions:   { display:"flex", gap:6 },
  btnSmGreen:    { background:"#d1fae5", color:"#065f46", border:"none", borderRadius:6, padding:"4px 12px", cursor:"pointer", fontSize:12, fontWeight:600 },
  btnSmBlue:     { background:"#dbeafe", color:"#1d4ed8", border:"none", borderRadius:6, padding:"4px 12px", cursor:"pointer", fontSize:12, fontWeight:600 },
  completedDate: { fontSize:12, color:"#10b981", fontWeight:600 },

  profileWrap:   { display:"grid", gridTemplateColumns:"280px 1fr", gap:20 },
  profileCard:   { background:"linear-gradient(135deg,#064e3b,#065f46)", borderRadius:16, padding:28, textAlign:"center", color:"#fff" },
  profileAvatar: { width:72, height:72, borderRadius:"50%", background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, fontWeight:700, margin:"0 auto 12px" },
  profileName:   { fontSize:18, fontWeight:700, marginBottom:4 },
  profileSpec:   { fontSize:14, opacity:0.8, marginBottom:8 },
  profileClinic: { fontSize:13, opacity:0.7 },
  profileDetails:{ background:"#fff", borderRadius:16, padding:20, boxShadow:"0 1px 6px rgba(0,0,0,0.07)" },
  detailRow:     { display:"flex", justifyContent:"space-between", padding:"12px 0", borderBottom:"1px solid #f3f4f6" },
  detailLabel:   { fontWeight:600, color:"#6b7280", fontSize:13 },
  detailValue:   { fontSize:13, color:"#1f2937" },
};
