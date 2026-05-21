import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import ChatBot from "../../components/ChatBot";

import api from "../../api";

const COLORS = ["#10b981","#ef4444","#3b82f6","#f59e0b","#9ca3af"];
const STATUS_LABEL = { attended:"✅ حضر", no_show:"❌ غياب", confirmed:"🔵 مؤكد", pending:"⏳ انتظار", cancelled:"🚫 ملغي" };
const STATUS_BG    = { attended:"#d1fae5", no_show:"#fee2e2", confirmed:"#dbeafe", pending:"#fef3c7", cancelled:"#f3f4f6" };
const STATUS_CLR   = { attended:"#065f46", no_show:"#dc2626", confirmed:"#1d4ed8", pending:"#92400e", cancelled:"#6b7280" };

export default function ManagerDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab]     = useState("overview");
  const [stats, setStats] = useState(null);
  const [allApts, setAllApts] = useState([]);
  const [search, setSearch]   = useState("");

  useEffect(() => {
    api.get("/api/manager/stats").then(r => setStats(r.data)).catch(console.error);
    api.get("/api/appointments/manager").then(r => setAllApts(r.data)).catch(console.error);
  }, []);

  const nav = [
    { key:"overview",      icon:"📊", label:"نظرة عامة" },
    { key:"clinics",       icon:"🏥", label:"العيادات" },
    { key:"doctors",       icon:"👨‍⚕️", label:"الأطباء" },
    { key:"appointments",  icon:"📋", label:"جميع المواعيد" },
    { key:"noshows",       icon:"⚠️", label:"حالات الغياب" },
  ];

  const ov = stats?.overview || {};
  const noShowRate = ov.total > 0 ? ((ov.no_shows / ov.total) * 100).toFixed(1) : 0;

  const pieData = [
    { name:"حضر",      value: ov.attended  || 0 },
    { name:"غياب",     value: ov.no_shows  || 0 },
    { name:"مؤكد",     value: ov.confirmed || 0 },
    { name:"انتظار",   value: ov.pending   || 0 },
  ].filter(d => d.value > 0);

  const filteredApts = allApts.filter(a =>
    !search ||
    a.PatientName?.includes(search) ||
    a.DoctorName?.includes(search) ||
    a.BookingCode?.includes(search)
  );

  if (!stats) return (
    <div style={s.loadingPage}>
      <div style={s.loadingCard}>
        <div style={s.spinner}/>
        <p style={s.loadingText}>جاري تحميل البيانات...</p>
      </div>
    </div>
  );

  return (
    <div style={s.shell}>
      {/* Sidebar */}
      <aside style={s.sidebar}>
        <div style={s.sideTop}>
          <div style={s.logo}>🏥</div>
          <div style={s.logoText}>صحة بلس</div>
          <div style={s.logoSub}>Sehha Plus</div>
        </div>
        <nav style={s.nav}>
          {nav.map(n => (
            <button key={n.key} style={{...s.navBtn, ...(tab===n.key ? s.navBtnActive : {})}} onClick={()=>setTab(n.key)}>
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
              <div style={s.userRole}>مدير النظام</div>
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
            <p style={s.pageDate}>{new Date().toLocaleDateString("ar-JO", {weekday:"long", year:"numeric", month:"long", day:"numeric"})}</p>
          </div>
          <div style={s.kpiMini}>
            <span style={s.kpiMiniItem}>إجمالي المواعيد: <b>{ov.total}</b></span>
            <span style={{...s.kpiMiniItem, color:"#ef4444"}}>نسبة الغياب: <b>{noShowRate}%</b></span>
          </div>
        </header>

        <div style={s.content}>

          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <div>
              {/* KPI Cards */}
              <div style={s.kpiGrid}>
                {[
                  { label:"إجمالي المواعيد", value: ov.total,       color:"#3b82f6", bg:"#eff6ff", icon:"📅" },
                  { label:"حضر",             value: ov.attended,    color:"#10b981", bg:"#f0fdf4", icon:"✅" },
                  { label:"لم يحضر",         value: ov.no_shows,    color:"#ef4444", bg:"#fef2f2", icon:"❌" },
                  { label:"نسبة الغياب",     value:`${noShowRate}%`,color:"#f59e0b", bg:"#fffbeb", icon:"📊" },
                  { label:"بانتظار",         value: ov.pending,     color:"#8b5cf6", bg:"#f5f3ff", icon:"⏳" },
                  { label:"ملغية",           value: ov.cancelled,   color:"#9ca3af", bg:"#f9fafb", icon:"🚫" },
                ].map(k => (
                  <div key={k.label} style={{...s.kpiCard, background: k.bg, borderTop:`4px solid ${k.color}`}}>
                    <div style={s.kpiIcon}>{k.icon}</div>
                    <div style={{...s.kpiValue, color: k.color}}>{k.value}</div>
                    <div style={s.kpiLabel}>{k.label}</div>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div style={s.chartsRow}>
                <div style={s.chartCard}>
                  <h3 style={s.chartTitle}>توزيع حالات المواعيد</h3>
                  <PieChart width={280} height={220}>
                    <Pie data={pieData} cx={130} cy={100} outerRadius={90} dataKey="value"
                      label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                      {pieData.map((_,i) => <Cell key={i} fill={COLORS[i]}/>)}
                    </Pie>
                    <Tooltip/>
                  </PieChart>
                </div>
                <div style={{...s.chartCard, flex:2}}>
                  <h3 style={s.chartTitle}>الغياب حسب العيادة</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats.by_clinic.map(c=>({ name: c.ClinicName, إجمالي: c.TotalAppointments||0, غياب: c.NoShows||0 }))}
                      margin={{top:5,right:20,left:0,bottom:5}}>
                      <XAxis dataKey="name" tick={{fontSize:11}}/>
                      <YAxis tick={{fontSize:11}}/>
                      <Tooltip/>
                      <Bar dataKey="إجمالي" fill="#93c5fd" radius={[4,4,0,0]}/>
                      <Bar dataKey="غياب"   fill="#f87171" radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Alert */}
              {noShowRate > 15 && (
                <div style={s.alertBox}>
                  <span style={{fontSize:28}}>⚠️</span>
                  <div>
                    <div style={s.alertTitle}>تنبيه: نسبة الغياب مرتفعة</div>
                    <div style={s.alertText}>نسبة الغياب الحالية <strong>{noShowRate}%</strong> — الهدف أقل من 15%. يُنصح بتفعيل قائمة الانتظار الذكية.</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── CLINICS ── */}
          {tab === "clinics" && (
            <div>
              <div style={s.clinicGrid}>
                {stats.by_clinic.map((c,i) => (
                  <div key={i} style={s.clinicCard}>
                    <div style={s.clinicHeader}>
                      <span style={s.clinicName}>{c.ClinicName}</span>
                      <span style={{...s.ratePill, background: c.NoShowRate>25?"#fee2e2": c.NoShowRate>15?"#fef3c7":"#d1fae5",
                        color: c.NoShowRate>25?"#dc2626": c.NoShowRate>15?"#92400e":"#065f46"}}>
                        {c.NoShowRate}%
                      </span>
                    </div>
                    <div style={s.clinicStats}>
                      <div style={s.clinicStat}><div style={s.clinicStatNum}>{c.TotalAppointments}</div><div style={s.clinicStatLabel}>إجمالي</div></div>
                      <div style={s.clinicStat}><div style={{...s.clinicStatNum, color:"#10b981"}}>{c.TotalAppointments - c.NoShows}</div><div style={s.clinicStatLabel}>حضر</div></div>
                      <div style={s.clinicStat}><div style={{...s.clinicStatNum, color:"#ef4444"}}>{c.NoShows}</div><div style={s.clinicStatLabel}>غياب</div></div>
                    </div>
                    <div style={s.progressTrack}>
                      <div style={{...s.progressFill, width:`${Math.min(c.NoShowRate,100)}%`, background: c.NoShowRate>25?"#ef4444":"#f59e0b"}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── DOCTORS ── */}
          {tab === "doctors" && (
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr style={s.thead}>
                    {["الطبيب","التخصص","العيادة","إجمالي المواعيد","حضر","غياب","نسبة الغياب"].map(h=>(
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.by_doctor.map((d,i) => {
                    const rate = d.TotalApps > 0 ? ((d.NoShows/d.TotalApps)*100).toFixed(0) : 0;
                    return (
                      <tr key={i} style={i%2===0?s.trEven:{}}>
                        <td style={{...s.td, fontWeight:600}}>{d.DoctorName}</td>
                        <td style={s.td}>{d.SpecialtyAR}</td>
                        <td style={s.td}>{d.ClinicName}</td>
                        <td style={{...s.td, textAlign:"center"}}>{d.TotalApps}</td>
                        <td style={{...s.td, textAlign:"center", color:"#10b981", fontWeight:600}}>{d.Attended}</td>
                        <td style={{...s.td, textAlign:"center", color:"#ef4444", fontWeight:600}}>{d.NoShows}</td>
                        <td style={{...s.td, textAlign:"center"}}>
                          <span style={{...s.ratePill, background: rate>25?"#fee2e2": rate>15?"#fef3c7":"#d1fae5",
                            color: rate>25?"#dc2626": rate>15?"#92400e":"#065f46"}}>{rate}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── ALL APPOINTMENTS ── */}
          {tab === "appointments" && (
            <div>
              <div style={s.searchBar}>
                <input style={s.searchInput} placeholder="🔍 ابحث باسم المريض أو الطبيب أو كود الحجز..."
                  value={search} onChange={e=>setSearch(e.target.value)}/>
                <span style={s.searchCount}>{filteredApts.length} موعد</span>
              </div>
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr style={s.thead}>
                      {["كود الحجز","المريض","الطبيب","العيادة","التاريخ","الوقت","الحالة"].map(h=>(
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApts.map((a,i) => (
                      <tr key={i} style={i%2===0?s.trEven:{}}>
                        <td style={{...s.td, fontFamily:"monospace", color:"#6b7280"}}>{a.BookingCode}</td>
                        <td style={{...s.td, fontWeight:600}}>{a.PatientName}</td>
                        <td style={s.td}>{a.DoctorName}</td>
                        <td style={s.td}>{a.ClinicName}</td>
                        <td style={s.td}>{a.AppDate}</td>
                        <td style={s.td}>{a.AppTime?.slice(0,5)}</td>
                        <td style={s.td}>
                          <span style={{background:STATUS_BG[a.Status], color:STATUS_CLR[a.Status], borderRadius:20, padding:"3px 12px", fontSize:12, fontWeight:600, whiteSpace:"nowrap"}}>
                            {STATUS_LABEL[a.Status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── NO SHOWS ── */}
          {tab === "noshows" && (
            <div>
              <div style={s.infoBox}>💡 هؤلاء المرضى لم يحضروا ولم يلغوا مواعيدهم. يمكن إرسال رسالة متابعة لإعادة الحجز.</div>
              <div style={s.noShowGrid}>
                {stats.recent_noshows.map((n,i) => (
                  <div key={i} style={s.noShowCard}>
                    <div style={s.noShowHeader}>
                      <span style={s.noShowPatient}>👤 {n.PatientName}</span>
                      <span style={s.noShowBadge}>❌ لم يحضر</span>
                    </div>
                    <div style={s.noShowDetails}>
                      <span>👨‍⚕️ {n.DoctorName}</span>
                      <span>🏥 {n.ClinicName}</span>
                      <span>📅 {n.AppDate}</span>
                      <span>🕐 {n.AppTime?.slice(0,5)}</span>
                    </div>
                    <div style={s.noShowFooter}>
                      <span style={s.bookingCode}>{n.BookingCode}</span>
                      <button style={s.smsBtn}>📱 إرسال رسالة متابعة</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <ChatBot role="manager"/>
    </div>
  );
}

const s = {
  shell:          { display:"flex", minHeight:"100vh", background:"#f1f5f9", fontFamily:"Segoe UI, Arial, sans-serif", direction:"rtl" },
  loadingPage:    { display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"#f1f5f9" },
  loadingCard:    { background:"#fff", borderRadius:16, padding:40, textAlign:"center", boxShadow:"0 4px 24px rgba(0,0,0,0.1)" },
  spinner:        { width:40, height:40, border:"4px solid #e5e7eb", borderTop:"4px solid #7c3aed", borderRadius:"50%", animation:"spin 1s linear infinite", margin:"0 auto 16px" },
  loadingText:    { color:"#6b7280", fontSize:16 },

  sidebar:        { width:240, background:"linear-gradient(180deg,#4c1d95 0%,#7c3aed 100%)", display:"flex", flexDirection:"column", position:"fixed", top:0, right:0, height:"100vh", zIndex:100 },
  sideTop:        { padding:"28px 20px 20px", textAlign:"center", borderBottom:"1px solid rgba(255,255,255,0.1)" },
  logo:           { fontSize:36, marginBottom:4 },
  logoText:       { color:"#fff", fontWeight:800, fontSize:20 },
  logoSub:        { color:"rgba(255,255,255,0.6)", fontSize:12 },
  nav:            { flex:1, padding:"16px 12px", display:"flex", flexDirection:"column", gap:4 },
  navBtn:         { display:"flex", alignItems:"center", gap:10, padding:"11px 14px", borderRadius:10, border:"none", background:"transparent", color:"rgba(255,255,255,0.75)", cursor:"pointer", fontSize:14, fontFamily:"inherit", textAlign:"right", width:"100%", transition:"all 0.15s" },
  navBtnActive:   { background:"rgba(255,255,255,0.2)", color:"#fff", fontWeight:600 },
  navIcon:        { fontSize:18, flexShrink:0 },
  sideBottom:     { padding:"16px 12px", borderTop:"1px solid rgba(255,255,255,0.1)" },
  userChip:       { display:"flex", alignItems:"center", gap:10, marginBottom:12 },
  userAvatar:     { width:36, height:36, borderRadius:"50%", background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:16, flexShrink:0 },
  userName:       { color:"#fff", fontSize:13, fontWeight:600 },
  userRole:       { color:"rgba(255,255,255,0.6)", fontSize:11 },
  logoutBtn:      { width:"100%", padding:"8px 0", background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", color:"#fff", borderRadius:8, cursor:"pointer", fontSize:13, fontFamily:"inherit" },

  main:           { flex:1, marginRight:240, display:"flex", flexDirection:"column", minHeight:"100vh" },
  topbar:         { background:"#fff", padding:"20px 28px", borderBottom:"1px solid #e5e7eb", display:"flex", justifyContent:"space-between", alignItems:"flex-end" },
  pageTitle:      { fontSize:22, fontWeight:700, color:"#1e1b4b", margin:0 },
  pageDate:       { fontSize:13, color:"#9ca3af", margin:"4px 0 0" },
  kpiMini:        { display:"flex", gap:20 },
  kpiMiniItem:    { fontSize:13, color:"#6b7280" },
  content:        { padding:24, flex:1 },

  kpiGrid:        { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", gap:16, marginBottom:24 },
  kpiCard:        { borderRadius:12, padding:"18px 16px", textAlign:"center" },
  kpiIcon:        { fontSize:24, marginBottom:6 },
  kpiValue:       { fontSize:30, fontWeight:800, lineHeight:1 },
  kpiLabel:       { fontSize:12, color:"#6b7280", marginTop:6 },

  chartsRow:      { display:"flex", gap:16, marginBottom:24, flexWrap:"wrap" },
  chartCard:      { flex:1, minWidth:260, background:"#fff", borderRadius:12, padding:20, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" },
  chartTitle:     { fontSize:14, fontWeight:700, color:"#374151", marginBottom:12, textAlign:"center" },

  alertBox:       { display:"flex", gap:16, background:"#fffbeb", border:"1px solid #fcd34d", borderRadius:12, padding:20 },
  alertTitle:     { fontWeight:700, color:"#92400e", marginBottom:4, fontSize:15 },
  alertText:      { color:"#78350f", fontSize:13, lineHeight:1.6 },

  clinicGrid:     { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:16 },
  clinicCard:     { background:"#fff", borderRadius:12, padding:20, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" },
  clinicHeader:   { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 },
  clinicName:     { fontWeight:700, fontSize:16, color:"#1f2937" },
  ratePill:       { borderRadius:20, padding:"4px 12px", fontSize:13, fontWeight:700 },
  clinicStats:    { display:"flex", gap:0, marginBottom:16 },
  clinicStat:     { flex:1, textAlign:"center" },
  clinicStatNum:  { fontSize:24, fontWeight:800, color:"#1f2937" },
  clinicStatLabel:{ fontSize:12, color:"#9ca3af" },
  progressTrack:  { background:"#f3f4f6", borderRadius:999, height:8, overflow:"hidden" },
  progressFill:   { height:"100%", borderRadius:999 },

  searchBar:      { display:"flex", alignItems:"center", gap:12, marginBottom:16 },
  searchInput:    { flex:1, padding:"10px 16px", borderRadius:8, border:"1px solid #d1d5db", fontSize:14, fontFamily:"inherit", direction:"rtl" },
  searchCount:    { color:"#6b7280", fontSize:13, whiteSpace:"nowrap" },

  tableWrap:      { background:"#fff", borderRadius:12, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", overflow:"hidden" },
  table:          { width:"100%", borderCollapse:"collapse" },
  thead:          { background:"#4c1d95" },
  th:             { padding:"12px 16px", color:"#fff", fontSize:13, fontWeight:600, textAlign:"right", whiteSpace:"nowrap" },
  td:             { padding:"11px 16px", fontSize:13, color:"#374151", borderBottom:"1px solid #f3f4f6" },
  trEven:         { background:"#fafafa" },

  infoBox:        { background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:10, padding:14, marginBottom:20, fontSize:14, color:"#1e40af" },
  noShowGrid:     { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))", gap:16 },
  noShowCard:     { background:"#fff", borderRadius:12, padding:18, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", borderRight:"4px solid #ef4444" },
  noShowHeader:   { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 },
  noShowPatient:  { fontWeight:700, fontSize:15, color:"#1f2937" },
  noShowBadge:    { background:"#fee2e2", color:"#dc2626", borderRadius:20, padding:"3px 10px", fontSize:12, fontWeight:600 },
  noShowDetails:  { display:"flex", flexWrap:"wrap", gap:10, fontSize:13, color:"#6b7280", marginBottom:12 },
  noShowFooter:   { display:"flex", justifyContent:"space-between", alignItems:"center" },
  bookingCode:    { background:"#f3f4f6", borderRadius:6, padding:"2px 8px", fontSize:12, color:"#6b7280" },
  smsBtn:         { background:"#ede9fe", color:"#7c3aed", border:"none", borderRadius:8, padding:"6px 14px", cursor:"pointer", fontSize:13 },
};
