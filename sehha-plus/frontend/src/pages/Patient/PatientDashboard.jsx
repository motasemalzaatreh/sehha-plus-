import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api";
import ChatBot from "../../components/ChatBot";

const STATUS_AR  = { pending:"بانتظار التأكيد", confirmed:"مؤكد", attended:"تمّ الحضور", no_show:"لم يحضر", cancelled:"ملغي" };
const STATUS_BG  = { pending:"#fef3c7", confirmed:"#dbeafe", attended:"#d1fae5", no_show:"#fee2e2", cancelled:"#f3f4f6" };
const STATUS_CLR = { pending:"#92400e", confirmed:"#1d4ed8", attended:"#065f46", no_show:"#dc2626", cancelled:"#6b7280" };
const STEP_ICON  = { completed:"✅", in_progress:"🔄", locked:"🔒" };

export default function PatientDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab]           = useState("appointments");
  const [appointments, setApts] = useState([]);
  const [plans, setPlans]       = useState([]);
  const [profile, setProfile]   = useState({});
  const [doctors, setDoctors]   = useState([]);
  const [booking, setBooking]   = useState({ doctor_id:"", app_date:"", app_time:"", notes:"" });
  const [msg, setMsg]           = useState({ text:"", ok:true });

  useEffect(() => {
    api.get("/api/appointments/patient").then(r => setApts(r.data)).catch(console.error);
    api.get("/api/treatment/patient").then(r => setPlans(r.data)).catch(console.error);
    api.get("/api/patients/profile").then(r => setProfile(r.data)).catch(console.error);
    api.get("/api/doctors/").then(r => setDoctors(r.data)).catch(console.error);
  }, []);

  const today    = new Date().toISOString().split("T")[0];
  const upcoming = appointments.filter(a => a.AppDate >= today && a.Status !== "cancelled");
  const past     = appointments.filter(a => a.AppDate <  today || a.Status === "attended");

  const cancelApp = async (id) => {
    await api.delete(`/api/appointments/${id}`);
    setApts(a => a.map(x => x.AppointmentID === id ? { ...x, Status:"cancelled" } : x));
  };

  const bookApp = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/api/appointments/book", { ...booking, doctor_id: parseInt(booking.doctor_id) });
      setMsg({ text:`✅ تم الحجز بنجاح! كود الحجز: ${res.data.booking_code}`, ok:true });
      setBooking({ doctor_id:"", app_date:"", app_time:"", notes:"" });
      const r = await api.get("/api/appointments/patient");
      setApts(r.data);
    } catch (err) {
      setMsg({ text:"❌ " + (err.response?.data?.detail || "حدث خطأ، يرجى المحاولة مجدداً"), ok:false });
    }
  };

  const nav = [
    { key:"appointments", icon:"📅", label:"مواعيدي" },
    { key:"book",         icon:"➕", label:"حجز جديد" },
    { key:"plans",        icon:"🗂️", label:"خطة علاجي" },
    { key:"profile",      icon:"👤", label:"ملفي الطبي" },
  ];

  return (
    <div style={s.shell}>
      {/* Sidebar */}
      <aside style={s.sidebar}>
        <div style={s.sideTop}>
          <div style={s.logo}>🏥</div>
          <div style={s.logoText}>صحة بلس</div>
          <div style={s.logoSub}>بوابة المريض</div>
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
            <div style={s.userAvatar}>م</div>
            <div>
              <div style={s.userName}>{user?.name}</div>
              <div style={s.userRole}>مريض</div>
            </div>
          </div>
          <button style={s.logoutBtn} onClick={logout}>تسجيل الخروج</button>
        </div>
      </aside>

      {/* Main */}
      <main style={s.main}>
        <header style={s.topbar}>
          <div>
            <h1 style={s.pageTitle}>{nav.find(n=>n.key===tab)?.icon} {nav.find(n=>n.key===tab)?.label}</h1>
            <p style={s.pageDate}>{new Date().toLocaleDateString("ar-JO",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</p>
          </div>
          <div style={s.kpiRow}>
            <div style={s.kpiChip}><span style={s.kpiNum}>{upcoming.length}</span><span style={s.kpiLbl}>قادمة</span></div>
            <div style={{...s.kpiChip, background:"#d1fae5"}}><span style={{...s.kpiNum,color:"#065f46"}}>{past.filter(a=>a.Status==="attended").length}</span><span style={s.kpiLbl}>مكتملة</span></div>
          </div>
        </header>

        <div style={s.content}>

          {/* ── MY APPOINTMENTS ── */}
          {tab === "appointments" && (
            <div>
              {appointments.length === 0 && (
                <div style={s.emptyState}><div style={s.emptyIcon}>📭</div><p>لا توجد مواعيد بعد</p>
                  <button style={s.emptyBtn} onClick={()=>setTab("book")}>➕ احجز موعدك الأول</button>
                </div>
              )}

              {upcoming.length > 0 && (
                <div>
                  <h3 style={s.groupTitle}>⏰ المواعيد القادمة</h3>
                  {upcoming.map(a => (
                    <div key={a.AppointmentID} style={{...s.card, borderRight:"4px solid #3b82f6"}}>
                      <div style={s.cardHeader}>
                        <div>
                          <div style={s.doctorName}>{a.DoctorName}</div>
                          <div style={s.specialty}>{a.SpecialtyAR} · {a.ClinicNameAR}</div>
                        </div>
                        <span style={{...s.badge, background:STATUS_BG[a.Status], color:STATUS_CLR[a.Status]}}>{STATUS_AR[a.Status]}</span>
                      </div>
                      <div style={s.cardMeta}>
                        <span>📅 {a.AppDate}</span>
                        <span>🕐 {a.AppTime?.slice(0,5)}</span>
                        <span style={s.code}>{a.BookingCode}</span>
                      </div>
                      {a.Notes && <div style={s.noteBox}>📝 {a.Notes}</div>}
                      {(a.Status==="pending"||a.Status==="confirmed") && (
                        <button style={s.cancelBtn} onClick={()=>cancelApp(a.AppointmentID)}>🚫 إلغاء الموعد</button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {past.length > 0 && (
                <div style={{marginTop:24}}>
                  <h3 style={s.groupTitle}>📜 السجل السابق</h3>
                  {past.map(a => (
                    <div key={a.AppointmentID} style={{...s.card, opacity:0.8}}>
                      <div style={s.cardHeader}>
                        <div>
                          <div style={s.doctorName}>{a.DoctorName}</div>
                          <div style={s.specialty}>{a.SpecialtyAR} · {a.ClinicNameAR}</div>
                        </div>
                        <span style={{...s.badge, background:STATUS_BG[a.Status], color:STATUS_CLR[a.Status]}}>{STATUS_AR[a.Status]}</span>
                      </div>
                      <div style={s.cardMeta}>
                        <span>📅 {a.AppDate}</span>
                        <span>🕐 {a.AppTime?.slice(0,5)}</span>
                        <span style={s.code}>{a.BookingCode}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── BOOK APPOINTMENT ── */}
          {tab === "book" && (
            <div style={s.formWrap}>
              <div style={s.formCard}>
                <h2 style={s.formTitle}>➕ حجز موعد جديد</h2>
                {msg.text && (
                  <div style={{...s.msgBox, background: msg.ok?"#f0fdf4":"#fef2f2", border:`1px solid ${msg.ok?"#bbf7d0":"#fecaca"}`, color: msg.ok?"#065f46":"#dc2626"}}>
                    {msg.text}
                  </div>
                )}
                <form onSubmit={bookApp}>
                  <div style={s.fieldGroup}>
                    <label style={s.label}>اختر الطبيب</label>
                    <select style={s.select} value={booking.doctor_id} onChange={e=>setBooking({...booking,doctor_id:e.target.value})} required>
                      <option value="">-- اختر طبيب --</option>
                      {doctors.map(d => (
                        <option key={d.DoctorID} value={d.DoctorID}>
                          {d.FullName} · {d.SpecialtyAR} · {d.ClinicNameAR}
                        </option>
                      ))}
                    </select>
                  </div>

                  {booking.doctor_id && (
                    <div style={s.doctorPreview}>
                      {(() => { const d = doctors.find(x=>x.DoctorID===parseInt(booking.doctor_id)); return d ? (
                        <div style={s.previewGrid}>
                          <span>🏥 {d.ClinicNameAR}</span>
                          <span>🕐 {d.WorkStart?.slice(0,5)} — {d.WorkEnd?.slice(0,5)}</span>
                          <span>💰 {d.ConsultFee} دينار</span>
                        </div>
                      ) : null; })()}
                    </div>
                  )}

                  <div style={s.row2}>
                    <div style={s.fieldGroup}>
                      <label style={s.label}>التاريخ</label>
                      <input style={s.input} type="date" min={today} value={booking.app_date} onChange={e=>setBooking({...booking,app_date:e.target.value})} required/>
                    </div>
                    <div style={s.fieldGroup}>
                      <label style={s.label}>الوقت</label>
                      <input style={s.input} type="time" value={booking.app_time} onChange={e=>setBooking({...booking,app_time:e.target.value})} required/>
                    </div>
                  </div>

                  <div style={s.fieldGroup}>
                    <label style={s.label}>ملاحظات (اختياري)</label>
                    <textarea style={{...s.input, height:80, resize:"vertical"}} value={booking.notes} onChange={e=>setBooking({...booking,notes:e.target.value})} placeholder="سبب الزيارة أو أي ملاحظات..."/>
                  </div>

                  <button style={s.submitBtn} type="submit">✅ تأكيد الحجز</button>
                </form>
              </div>
            </div>
          )}

          {/* ── TREATMENT PLAN ── */}
          {tab === "plans" && (
            <div>
              {plans.length === 0
                ? <div style={s.emptyState}><div style={s.emptyIcon}>📋</div><p>لا توجد خطط علاج حالياً</p></div>
                : plans.map(plan => (
                  <div key={plan.PlanID} style={s.planCard}>
                    <div style={s.planHeader}>
                      <div>
                        <div style={s.planTitle}>{plan.TitleAR}</div>
                        <div style={s.planSub}>👨‍⚕️ {plan.DoctorName} · {plan.SpecialtyAR} · 📅 {plan.StartDate}</div>
                      </div>
                      <span style={s.planStatusBadge}>{plan.Status === "active" ? "🟢 نشطة" : "مكتملة"}</span>
                    </div>

                    {/* Progress bar */}
                    {(() => {
                      const done = plan.steps?.filter(st=>st.Status==="completed").length || 0;
                      const total = plan.steps?.length || 1;
                      const pct = Math.round((done/total)*100);
                      return (
                        <div style={s.planProgress}>
                          <div style={s.planProgressBar}><div style={{...s.planProgressFill, width:`${pct}%`}}/></div>
                          <span style={s.planProgressTxt}>{done}/{total} مراحل مكتملة ({pct}%)</span>
                        </div>
                      );
                    })()}

                    <div style={s.stepsTimeline}>
                      {plan.steps?.map((step, i) => (
                        <div key={step.StepID} style={s.timelineRow}>
                          <div style={s.timelineLeft}>
                            <div style={{...s.timelineDot, background: step.Status==="completed"?"#10b981": step.Status==="in_progress"?"#f59e0b":"#d1d5db"}}/>
                            {i < plan.steps.length-1 && <div style={s.timelineLine}/>}
                          </div>
                          <div style={{...s.timelineCard, opacity: step.Status==="locked"?0.6:1}}>
                            <div style={s.timelineTitle}>{STEP_ICON[step.Status]} {step.TitleAR}</div>
                            {step.DescriptionAR && <div style={s.timelineDesc}>{step.DescriptionAR}</div>}
                            {step.CompletedDate && <div style={s.timelineDone}>✔ اكتمل في {step.CompletedDate}</div>}
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
              <div style={s.profileHero}>
                <div style={s.profileAvatar}>م</div>
                <div style={s.profileName}>{profile.FullName}</div>
                <div style={s.profileEmail}>{profile.Email}</div>
                <div style={{...s.bloodBadge}}>{profile.BloodType} 🩸</div>
              </div>
              <div style={s.profileGrid}>
                {[
                  { icon:"📞", label:"الهاتف",          value: profile.Phone },
                  { icon:"🎂", label:"تاريخ الميلاد",   value: profile.DateOfBirth },
                  { icon:"👤", label:"الجنس",           value: profile.Gender },
                  { icon:"⚠️", label:"الحساسيات",       value: profile.Allergies || "لا يوجد" },
                  { icon:"🏥", label:"الأمراض المزمنة", value: profile.ChronicDiseases || "لا يوجد" },
                ].map(({ icon, label, value }) => (
                  <div key={label} style={s.profileDetailCard}>
                    <div style={s.profileDetailIcon}>{icon}</div>
                    <div style={s.profileDetailLabel}>{label}</div>
                    <div style={s.profileDetailValue}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <ChatBot role="patient"/>
    </div>
  );
}

const s = {
  shell:              { display:"flex", minHeight:"100vh", background:"#eff6ff", fontFamily:"Segoe UI, Arial, sans-serif", direction:"rtl" },
  sidebar:            { width:240, background:"linear-gradient(180deg,#1e3a5f 0%,#0f4c81 100%)", display:"flex", flexDirection:"column", position:"fixed", top:0, right:0, height:"100vh", zIndex:100 },
  sideTop:            { padding:"28px 20px 20px", textAlign:"center", borderBottom:"1px solid rgba(255,255,255,0.1)" },
  logo:               { fontSize:36, marginBottom:4 },
  logoText:           { color:"#fff", fontWeight:800, fontSize:20 },
  logoSub:            { color:"rgba(255,255,255,0.6)", fontSize:12 },
  nav:                { flex:1, padding:"16px 12px", display:"flex", flexDirection:"column", gap:4 },
  navBtn:             { display:"flex", alignItems:"center", gap:10, padding:"11px 14px", borderRadius:10, border:"none", background:"transparent", color:"rgba(255,255,255,0.75)", cursor:"pointer", fontSize:14, fontFamily:"inherit", textAlign:"right", width:"100%" },
  navBtnActive:       { background:"rgba(255,255,255,0.2)", color:"#fff", fontWeight:600 },
  navIcon:            { fontSize:18, flexShrink:0 },
  sideBottom:         { padding:"16px 12px", borderTop:"1px solid rgba(255,255,255,0.1)" },
  userChip:           { display:"flex", alignItems:"center", gap:10, marginBottom:12 },
  userAvatar:         { width:36, height:36, borderRadius:"50%", background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:16, flexShrink:0 },
  userName:           { color:"#fff", fontSize:13, fontWeight:600 },
  userRole:           { color:"rgba(255,255,255,0.6)", fontSize:11 },
  logoutBtn:          { width:"100%", padding:"8px 0", background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", color:"#fff", borderRadius:8, cursor:"pointer", fontSize:13, fontFamily:"inherit" },

  main:               { flex:1, marginRight:240, display:"flex", flexDirection:"column" },
  topbar:             { background:"#fff", padding:"20px 28px", borderBottom:"1px solid #e5e7eb", display:"flex", justifyContent:"space-between", alignItems:"center" },
  pageTitle:          { fontSize:22, fontWeight:700, color:"#1e3a5f", margin:0 },
  pageDate:           { fontSize:13, color:"#9ca3af", margin:"4px 0 0" },
  kpiRow:             { display:"flex", gap:12 },
  kpiChip:            { background:"#eff6ff", borderRadius:10, padding:"8px 16px", textAlign:"center", minWidth:80 },
  kpiNum:             { display:"block", fontSize:22, fontWeight:800, color:"#1d4ed8" },
  kpiLbl:             { fontSize:11, color:"#6b7280" },

  content:            { padding:24, maxWidth:860, margin:"0 auto", width:"100%" },
  groupTitle:         { fontSize:15, fontWeight:700, color:"#374151", marginBottom:12, paddingBottom:8, borderBottom:"2px solid #e5e7eb" },

  card:               { background:"#fff", borderRadius:14, padding:18, marginBottom:12, boxShadow:"0 1px 6px rgba(0,0,0,0.06)" },
  cardHeader:         { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 },
  doctorName:         { fontWeight:700, fontSize:16, color:"#1f2937" },
  specialty:          { fontSize:13, color:"#6b7280", marginTop:2 },
  badge:              { borderRadius:20, padding:"4px 14px", fontSize:12, fontWeight:600, whiteSpace:"nowrap" },
  cardMeta:           { display:"flex", gap:16, fontSize:13, color:"#6b7280", marginBottom:8 },
  code:               { background:"#f3f4f6", borderRadius:6, padding:"2px 8px", fontFamily:"monospace", fontSize:12 },
  noteBox:            { background:"#f8fafc", borderRadius:8, padding:"8px 12px", fontSize:13, color:"#555", marginBottom:8 },
  cancelBtn:          { background:"#fee2e2", color:"#dc2626", border:"none", borderRadius:8, padding:"6px 16px", cursor:"pointer", fontSize:13, fontWeight:600 },
  emptyState:         { textAlign:"center", padding:"60px 20px", color:"#9ca3af" },
  emptyIcon:          { fontSize:52, marginBottom:12 },
  emptyBtn:           { background:"#0f4c81", color:"#fff", border:"none", borderRadius:10, padding:"10px 24px", cursor:"pointer", fontSize:14, fontWeight:600, marginTop:8 },

  formWrap:           { maxWidth:600, margin:"0 auto" },
  formCard:           { background:"#fff", borderRadius:16, padding:28, boxShadow:"0 1px 6px rgba(0,0,0,0.07)" },
  formTitle:          { fontSize:20, fontWeight:700, color:"#1e3a5f", marginBottom:20 },
  msgBox:             { borderRadius:10, padding:14, marginBottom:16, fontSize:14 },
  fieldGroup:         { marginBottom:16 },
  label:              { display:"block", fontWeight:600, fontSize:13, color:"#374151", marginBottom:6 },
  input:              { width:"100%", padding:"10px 14px", borderRadius:10, border:"1px solid #d1d5db", fontSize:14, fontFamily:"inherit", boxSizing:"border-box", direction:"rtl" },
  select:             { width:"100%", padding:"10px 14px", borderRadius:10, border:"1px solid #d1d5db", fontSize:14, fontFamily:"inherit", boxSizing:"border-box", direction:"rtl", background:"#fff" },
  doctorPreview:      { background:"#eff6ff", borderRadius:10, padding:"10px 14px", marginBottom:16 },
  previewGrid:        { display:"flex", gap:16, fontSize:13, color:"#1d4ed8", flexWrap:"wrap" },
  row2:               { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 },
  submitBtn:          { width:"100%", padding:"12px 0", background:"linear-gradient(90deg,#1e3a5f,#0f4c81)", color:"#fff", border:"none", borderRadius:10, fontSize:15, fontWeight:700, cursor:"pointer" },

  planCard:           { background:"#fff", borderRadius:14, padding:22, marginBottom:18, boxShadow:"0 1px 6px rgba(0,0,0,0.07)" },
  planHeader:         { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 },
  planTitle:          { fontWeight:700, fontSize:17, color:"#1f2937", marginBottom:4 },
  planSub:            { fontSize:13, color:"#6b7280" },
  planStatusBadge:    { background:"#d1fae5", color:"#065f46", borderRadius:20, padding:"4px 14px", fontSize:13, fontWeight:600, whiteSpace:"nowrap" },
  planProgress:       { display:"flex", alignItems:"center", gap:12, marginBottom:16 },
  planProgressBar:    { flex:1, background:"#f3f4f6", borderRadius:999, height:8, overflow:"hidden" },
  planProgressFill:   { height:"100%", background:"linear-gradient(90deg,#10b981,#34d399)", borderRadius:999, transition:"width 0.5s" },
  planProgressTxt:    { fontSize:12, color:"#6b7280", whiteSpace:"nowrap" },
  stepsTimeline:      { display:"flex", flexDirection:"column" },
  timelineRow:        { display:"flex", gap:14 },
  timelineLeft:       { display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0 },
  timelineDot:        { width:14, height:14, borderRadius:"50%", flexShrink:0, marginTop:4 },
  timelineLine:       { width:2, flex:1, background:"#e5e7eb", margin:"4px 0" },
  timelineCard:       { flex:1, background:"#f9fafb", borderRadius:10, padding:"10px 14px", marginBottom:8 },
  timelineTitle:      { fontWeight:600, fontSize:14, color:"#1f2937", marginBottom:3 },
  timelineDesc:       { fontSize:13, color:"#6b7280" },
  timelineDone:       { fontSize:12, color:"#10b981", fontWeight:600, marginTop:4 },

  profileWrap:        { display:"flex", flexDirection:"column", gap:20 },
  profileHero:        { background:"linear-gradient(135deg,#1e3a5f,#0f4c81)", borderRadius:16, padding:32, textAlign:"center", color:"#fff" },
  profileAvatar:      { width:80, height:80, borderRadius:"50%", background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:36, fontWeight:700, margin:"0 auto 12px" },
  profileName:        { fontSize:22, fontWeight:800, marginBottom:4 },
  profileEmail:       { fontSize:14, opacity:0.8, marginBottom:12 },
  bloodBadge:         { display:"inline-block", background:"rgba(255,255,255,0.2)", borderRadius:20, padding:"4px 16px", fontSize:14, fontWeight:700 },
  profileGrid:        { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:14 },
  profileDetailCard:  { background:"#fff", borderRadius:12, padding:18, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", textAlign:"center" },
  profileDetailIcon:  { fontSize:28, marginBottom:6 },
  profileDetailLabel: { fontSize:12, color:"#9ca3af", marginBottom:4 },
  profileDetailValue: { fontSize:14, fontWeight:600, color:"#1f2937" },
};
