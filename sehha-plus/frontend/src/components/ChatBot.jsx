import { useState, useRef, useEffect } from "react";
import api from "../api";

const SUGGESTIONS = {
  manager: ["مواعيد اليوم", "إحصائيات", "حالات الغياب", "قائمة الأطباء", "أداء العيادات"],
  doctor:  ["جدول اليوم", "مواعيد قادمة", "حالات الغياب", "إحصائياتي"],
  patient: ["مواعيدي", "موعدي القادم", "الأطباء المتاحون", "ملفي الطبي"],
};

function formatReply(text) {
  return text
    .split("\n")
    .map((line, i) => {
      if (line.startsWith("**") && line.endsWith("**"))
        return <div key={i} style={f.bold}>{line.slice(2,-2)}</div>;
      if (line.startsWith("• "))
        return <div key={i} style={f.bullet}>{line}</div>;
      if (line === "") return <div key={i} style={{height:6}}/>;
      return <div key={i} style={f.line}>{line}</div>;
    });
}

export default function ChatBot({ role }) {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState([
    { from:"bot", text:"🤖 مرحباً! أنا مساعد صحة بلس.\nاكتب **مساعدة** لترى ما يمكنني فعله." }
  ]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef             = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages, open]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput("");
    setMessages(m => [...m, { from:"user", text:msg }]);
    setLoading(true);
    try {
      const res = await api.post("/api/chat/", { message: msg });
      setMessages(m => [...m, { from:"bot", text:res.data.reply }]);
    } catch {
      setMessages(m => [...m, { from:"bot", text:"❌ حدث خطأ. يرجى المحاولة مجدداً." }]);
    }
    setLoading(false);
  };

  const suggestions = SUGGESTIONS[role] || SUGGESTIONS.patient;

  return (
    <>
      {/* Floating Button */}
      <button style={s.fab} onClick={() => setOpen(o => !o)} title="مساعد ذكي">
        {open ? "✕" : "🤖"}
      </button>

      {/* Chat Window */}
      {open && (
        <div style={s.window}>
          {/* Header */}
          <div style={s.header}>
            <div style={s.headerInfo}>
              <span style={s.botAvatar}>🤖</span>
              <div>
                <div style={s.headerTitle}>مساعد صحة بلس</div>
                <div style={s.headerSub}>● متصل الآن</div>
              </div>
            </div>
            <button style={s.closeBtn} onClick={() => setOpen(false)}>✕</button>
          </div>

          {/* Suggestions */}
          <div style={s.suggestions}>
            {suggestions.map(q => (
              <button key={q} style={s.chip} onClick={() => send(q)}>{q}</button>
            ))}
          </div>

          {/* Messages */}
          <div style={s.messages}>
            {messages.map((m, i) => (
              <div key={i} style={m.from === "user" ? s.userRow : s.botRow}>
                {m.from === "bot" && <div style={s.botIcon}>🤖</div>}
                <div style={m.from === "user" ? s.userBubble : s.botBubble}>
                  {formatReply(m.text)}
                </div>
              </div>
            ))}
            {loading && (
              <div style={s.botRow}>
                <div style={s.botIcon}>🤖</div>
                <div style={s.botBubble}>
                  <div style={s.typing}><span/><span/><span/></div>
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div style={s.inputRow}>
            <input
              style={s.input}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="اكتب سؤالك هنا..."
              disabled={loading}
            />
            <button style={{...s.sendBtn, opacity: input.trim() ? 1 : 0.5}} onClick={() => send()} disabled={loading || !input.trim()}>
              ➤
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </>
  );
}

const s = {
  fab:       { position:"fixed", bottom:28, left:28, width:56, height:56, borderRadius:"50%", background:"linear-gradient(135deg,#7c3aed,#4c1d95)", color:"#fff", border:"none", fontSize:24, cursor:"pointer", boxShadow:"0 4px 16px rgba(124,58,237,0.4)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", transition:"transform 0.2s" },
  window:    { position:"fixed", bottom:96, left:28, width:360, height:520, background:"#fff", borderRadius:20, boxShadow:"0 8px 40px rgba(0,0,0,0.18)", display:"flex", flexDirection:"column", zIndex:998, overflow:"hidden", animation:"slideUp 0.25s ease", direction:"rtl" },
  header:    { background:"linear-gradient(135deg,#4c1d95,#7c3aed)", padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" },
  headerInfo:{ display:"flex", alignItems:"center", gap:10 },
  botAvatar: { fontSize:24 },
  headerTitle:{ color:"#fff", fontWeight:700, fontSize:15 },
  headerSub: { color:"rgba(255,255,255,0.7)", fontSize:11 },
  closeBtn:  { background:"rgba(255,255,255,0.2)", border:"none", color:"#fff", borderRadius:6, padding:"4px 10px", cursor:"pointer", fontSize:14 },
  suggestions:{ display:"flex", gap:6, padding:"10px 12px", overflowX:"auto", borderBottom:"1px solid #f3f4f6", flexShrink:0 },
  chip:      { background:"#ede9fe", color:"#6d28d9", border:"none", borderRadius:20, padding:"5px 12px", cursor:"pointer", fontSize:12, whiteSpace:"nowrap", fontFamily:"inherit" },
  messages:  { flex:1, overflowY:"auto", padding:"12px", display:"flex", flexDirection:"column", gap:10 },
  botRow:    { display:"flex", gap:8, alignItems:"flex-start" },
  userRow:   { display:"flex", justifyContent:"flex-start", flexDirection:"row-reverse" },
  botIcon:   { fontSize:20, flexShrink:0, marginTop:2 },
  botBubble: { background:"#f3f4f6", borderRadius:"4px 16px 16px 16px", padding:"10px 14px", fontSize:13, lineHeight:1.6, maxWidth:"85%", color:"#1f2937" },
  userBubble:{ background:"linear-gradient(135deg,#4c1d95,#7c3aed)", borderRadius:"16px 4px 16px 16px", padding:"10px 14px", fontSize:13, lineHeight:1.6, maxWidth:"85%", color:"#fff" },
  typing:    { display:"flex", gap:4, alignItems:"center", height:20, "& span":{ width:6, height:6, background:"#9ca3af", borderRadius:"50%", animation:"bounce 1.2s infinite" } },
  inputRow:  { display:"flex", gap:8, padding:"10px 12px", borderTop:"1px solid #f3f4f6", flexShrink:0 },
  input:     { flex:1, padding:"9px 14px", borderRadius:20, border:"1px solid #e5e7eb", fontSize:13, fontFamily:"inherit", direction:"rtl", outline:"none" },
  sendBtn:   { width:38, height:38, borderRadius:"50%", background:"linear-gradient(135deg,#4c1d95,#7c3aed)", color:"#fff", border:"none", cursor:"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
};

const f = {
  bold:  { fontWeight:700, fontSize:14, color:"#1f2937", marginBottom:4 },
  bullet:{ paddingRight:4, color:"#374151" },
  line:  { color:"#374151" },
};
