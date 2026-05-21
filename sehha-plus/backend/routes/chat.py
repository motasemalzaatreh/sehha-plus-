from fastapi import APIRouter, Depends
from pydantic import BaseModel
from database import query
from auth import get_current_user
import re
import unicodedata

router = APIRouter(prefix="/api/chat", tags=["Chat"])

class ChatMessage(BaseModel):
    message: str

# ── Arabic text normalizer ────────────────────────────────────────────────────
def normalize_ar(text: str) -> str:
    """Normalize Arabic text: lowercase, strip diacritics, unify hamza/alef forms."""
    text = text.lower().strip()
    # Unicode NFKC normalization
    text = unicodedata.normalize("NFKC", text)
    # Unify alef forms: أ إ آ ء → ا
    text = re.sub(r"[أإآء]", "ا", text)
    # Unify teh marbuta: ة → ه
    text = re.sub(r"ة", "ه", text)
    # Remove Arabic diacritics (tashkeel)
    text = re.sub(r"[ً-ٰٟ]", "", text)
    # Remove extra spaces
    text = re.sub(r"\s+", " ", text).strip()
    return text

def has(text: str, *keywords) -> bool:
    """Flexible match: checks normalized text against normalized keywords."""
    t = normalize_ar(text)
    return any(normalize_ar(k) in t for k in keywords)

def extract_name(text: str) -> str | None:
    """Extract a search term after common search prefixes."""
    patterns = [
        r"(?:ابحث عن|بحث عن|ابحث|بحث|search for|search|find|اريد|أريد)\s+(.+)",
        r"(?:مواعيد|appointments of|appointments for)\s+(?:الدكتور|الطبيب|دكتور|طبيب|dr\.?)?\s*(.+)",
        r"(?:معلومات عن|معلومات)\s+(.+)",
    ]
    t = text.strip()
    for p in patterns:
        m = re.search(p, t, re.IGNORECASE)
        if m:
            return m.group(1).strip()
    return None

def fmt_time(t): return str(t)[:5] if t else "—"
def fmt_date(d): return str(d) if d else "—"

STATUS_AR = {
    "pending":   "⏳ بانتظار",
    "confirmed": "🔵 مؤكد",
    "attended":  "✅ حضر",
    "no_show":   "❌ لم يحضر",
    "cancelled": "🚫 ملغي",
}

def apt_line(a):
    s = STATUS_AR.get(a.get("Status", ""), "")
    d = fmt_date(a.get("AppDate", ""))
    t = fmt_time(a.get("AppTime", ""))
    code = a.get("BookingCode", "")
    doctor  = a.get("DoctorName", "")
    patient = a.get("PatientName", "")
    clinic  = a.get("ClinicName", "") or a.get("ClinicNameAR", "")
    who = f"👨‍⚕️ {doctor}" if doctor else f"👤 {patient}"
    loc = f" · 🏥 {clinic}" if clinic else ""
    return f"• {who}{loc} · 📅 {d} 🕐 {t} · {s} · 🏷️ {code}"

# ── Main chat handler ─────────────────────────────────────────────────────────

@router.post("/")
def chat(body: ChatMessage, user=Depends(get_current_user)):
    msg  = body.message.strip()
    role = user["role"]
    uid  = int(user["sub"])

    today_row = query("SELECT CAST(GETDATE() AS DATE) AS d")
    today_str = fmt_date(today_row[0]["d"])

    # ── HELP ─────────────────────────────────────────────────────────────────
    if has(msg, "مساعده", "مساعدة", "help", "ماذا يمكنك", "ايش تقدر", "أوامر", "commands", "ماذا", "وش تعرف"):
        if role == "manager":
            return {"reply": (
                "🤖 **مرحباً! إليك ما يمكنني فعله:**\n\n"
                "📊 **إحصائيات** — نظرة عامة على كل المواعيد\n"
                "📅 **مواعيد اليوم** — كل مواعيد الشبكة اليوم\n"
                "❌ **الغياب** — آخر حالات الغياب\n"
                "👨‍⚕️ **الأطباء** — قائمة كل الأطباء وأدائهم\n"
                "🏥 **العيادات** — أداء كل عيادة\n"
                "🔍 **ابحث عن [اسم]** — بحث عن مريض أو طبيب\n"
                "📋 **مواعيد [اسم الطبيب]** — مواعيد طبيب معين"
            )}
        elif role == "doctor":
            return {"reply": (
                "🤖 **مرحباً دكتور! إليك ما يمكنني فعله:**\n\n"
                "📅 **مواعيد اليوم** — جدولك لهذا اليوم\n"
                "⏰ **مواعيد قادمة** — مواعيدك المستقبلية\n"
                "❌ **الغياب** — مرضى لم يحضروا\n"
                "📊 **إحصائياتي** — ملخص أدائك\n"
                "🔍 **ابحث عن [اسم المريض]** — بيانات مريض معين\n"
                "📋 **كل مواعيدي** — قائمة جميع مواعيدك"
            )}
        else:
            return {"reply": (
                "🤖 **مرحباً! إليك ما يمكنني فعله:**\n\n"
                "📅 **مواعيدي** — كل مواعيدك\n"
                "⏰ **موعدي القادم** — أقرب موعد قادم\n"
                "👨‍⚕️ **الأطباء** — قائمة الأطباء المتاحين\n"
                "📋 **ملفي** — بياناتك الطبية\n"
                "🔍 **ابحث عن دكتور [اسم]** — بحث عن طبيب\n"
                "🗂️ **خطتي العلاجية** — مراحل خطة علاجك"
            )}

    # ════════════════════════════════════════════════════════════════════════
    # MANAGER
    # ════════════════════════════════════════════════════════════════════════
    if role == "manager":

        # Stats
        if has(msg, "احصائيات", "إحصائيات", "stats", "ملخص", "summary", "نظره عامه", "نظرة عامة", "overview", "ارقام", "أرقام", "كم عدد"):
            r = query("""
                SELECT COUNT(*) AS total,
                    SUM(CASE WHEN Status='no_show'   THEN 1 ELSE 0 END) AS no_shows,
                    SUM(CASE WHEN Status='attended'  THEN 1 ELSE 0 END) AS attended,
                    SUM(CASE WHEN Status='pending'   THEN 1 ELSE 0 END) AS pending,
                    SUM(CASE WHEN Status='confirmed' THEN 1 ELSE 0 END) AS confirmed,
                    SUM(CASE WHEN Status='cancelled' THEN 1 ELSE 0 END) AS cancelled
                FROM Appointments
            """)[0]
            rate = round(r["no_shows"] / r["total"] * 100, 1) if r["total"] else 0
            alert = "⚠️ نسبة الغياب مرتفعة! يُنصح بتفعيل قائمة الانتظار." if rate > 15 else "✅ نسبة الغياب ضمن المعدل الطبيعي."
            return {"reply": (
                f"📊 **إحصائيات الشبكة**\n\n"
                f"📅 الإجمالي: **{r['total']}** موعد\n"
                f"✅ حضر: **{r['attended']}**\n"
                f"❌ لم يحضر: **{r['no_shows']}**\n"
                f"🔵 مؤكد: **{r['confirmed']}**\n"
                f"⏳ بانتظار: **{r['pending']}**\n"
                f"🚫 ملغي: **{r['cancelled']}**\n"
                f"📈 نسبة الغياب: **{rate}%**\n\n{alert}"
            )}

        # Today
        if has(msg, "اليوم", "today", "الان", "الآن", "هذا اليوم", "جدول اليوم"):
            rows = query("""
                SELECT a.BookingCode, a.AppDate, a.AppTime, a.Status,
                       pu.FullName AS PatientName, du.FullName AS DoctorName,
                       c.NameAR AS ClinicName
                FROM Appointments a
                JOIN Patients pt ON a.PatientID=pt.PatientID
                JOIN Users pu ON pt.UserID=pu.UserID
                JOIN Doctors d ON a.DoctorID=d.DoctorID
                JOIN Users du ON d.UserID=du.UserID
                JOIN Clinics c ON d.ClinicID=c.ClinicID
                WHERE a.AppDate=? ORDER BY a.AppTime
            """, (today_str,))
            if not rows:
                return {"reply": f"📭 لا توجد مواعيد اليوم ({today_str})"}
            lines = "\n".join(apt_line(r) for r in rows)
            return {"reply": f"📅 **مواعيد اليوم ({today_str})** — {len(rows)} موعد\n\n{lines}"}

        # No-shows
        if has(msg, "غياب", "no show", "no-show", "لم يحضر", "غائبين", "غائب", "تغيب", "غائبون"):
            rows = query("""
                SELECT TOP 10 a.BookingCode, a.AppDate, a.AppTime,
                       pu.FullName AS PatientName, du.FullName AS DoctorName, c.NameAR AS ClinicName
                FROM Appointments a
                JOIN Patients pt ON a.PatientID=pt.PatientID
                JOIN Users pu ON pt.UserID=pu.UserID
                JOIN Doctors d ON a.DoctorID=d.DoctorID
                JOIN Users du ON d.UserID=du.UserID
                JOIN Clinics c ON d.ClinicID=c.ClinicID
                WHERE a.Status='no_show' ORDER BY a.AppDate DESC
            """)
            if not rows:
                return {"reply": "✅ لا توجد حالات غياب مسجلة"}
            lines = "\n".join(apt_line(r) for r in rows)
            return {"reply": f"❌ **آخر {len(rows)} حالات غياب**\n\n{lines}"}

        # Doctors list
        if has(msg, "الاطباء", "الأطباء", "اطباء", "أطباء", "doctors", "قائمه الاطباء", "قائمة الأطباء", "كم طبيب", "عدد الاطباء") and not has(msg, "مواعيد"):
            rows = query("""
                SELECT u.FullName, d.SpecialtyAR, c.NameAR AS ClinicName,
                       COUNT(a.AppointmentID) AS Total
                FROM Doctors d
                JOIN Users u ON d.UserID=u.UserID
                JOIN Clinics c ON d.ClinicID=c.ClinicID
                LEFT JOIN Appointments a ON a.DoctorID=d.DoctorID
                GROUP BY d.DoctorID, u.FullName, d.SpecialtyAR, c.NameAR
                ORDER BY Total DESC
            """)
            lines = "\n".join(f"• 👨‍⚕️ {r['FullName']} | {r['SpecialtyAR']} | 🏥 {r['ClinicName']} | 📅 {r['Total']} موعد" for r in rows)
            return {"reply": f"👨‍⚕️ **الأطباء في الشبكة** ({len(rows)})\n\n{lines}"}

        # Clinics
        if has(msg, "عياده", "عيادة", "عيادات", "clinic", "clinics", "الفروع", "الفرع"):
            rows = query("SELECT * FROM vw_NoShowByClinic")
            lines = "\n".join(
                f"• 🏥 {r['ClinicName']} | إجمالي: **{r['TotalAppointments']}** | غياب: {r['NoShows']} | نسبة: {r['NoShowRate']}%"
                for r in rows
            )
            return {"reply": f"🏥 **أداء العيادات**\n\n{lines}"}

        # Patients list
        if has(msg, "المرضى", "المرضي", "مرضى", "مريض", "patients", "patients list", "قائمه المرضى", "اسماء المرضى"):
            rows = query("SELECT u.FullName, u.Phone, u.Email FROM Users u WHERE u.Role='patient' ORDER BY u.FullName")
            if not rows:
                return {"reply": "📭 لا يوجد مرضى مسجلون"}
            lines = "\n".join(f"• 👤 {r['FullName']} | 📞 {r['Phone']}" for r in rows)
            return {"reply": f"👥 **المرضى المسجلون** ({len(rows)})\n\n{lines}"}

        # Search by name
        name = extract_name(msg)
        if name or has(msg, "ابحث", "بحث", "search", "find", "اجد", "أجد"):
            term = name or re.sub(r"^(ابحث|بحث|search|find)\s*", "", msg, flags=re.IGNORECASE).strip()
            if not term or len(term) < 2:
                return {"reply": "🔍 يرجى كتابة الاسم الذي تبحث عنه.\nمثال: **ابحث عن أحمد**"}
            patients = query("SELECT u.FullName, u.Phone FROM Users u WHERE Role='patient' AND u.FullName LIKE ?", (f"%{term}%",))
            doctors  = query("SELECT u.FullName, d.SpecialtyAR, c.NameAR AS ClinicName FROM Users u JOIN Doctors d ON d.UserID=u.UserID JOIN Clinics c ON d.ClinicID=c.ClinicID WHERE u.FullName LIKE ?", (f"%{term}%",))
            reply = f"🔍 **نتائج البحث عن: \"{term}\"**\n\n"
            if patients:
                reply += "**مرضى:**\n" + "\n".join(f"• 👤 {r['FullName']} | 📞 {r['Phone']}" for r in patients) + "\n\n"
            if doctors:
                reply += "**أطباء:**\n" + "\n".join(f"• 👨‍⚕️ {r['FullName']} | {r['SpecialtyAR']} | 🏥 {r['ClinicName']}" for r in doctors)
            if not patients and not doctors:
                reply += "لم يتم العثور على نتائج."
            return {"reply": reply}

        # Appointments for specific doctor name
        m = re.search(r"مواعيد\s+(?:الدكتور|الطبيب|دكتور|طبيب|dr\.?)?\s*(.+)", normalize_ar(msg))
        if m:
            name = m.group(1).strip()
            rows = query("""
                SELECT a.BookingCode, a.AppDate, a.AppTime, a.Status,
                       pu.FullName AS PatientName, du.FullName AS DoctorName
                FROM Appointments a
                JOIN Patients pt ON a.PatientID=pt.PatientID
                JOIN Users pu ON pt.UserID=pu.UserID
                JOIN Doctors d ON a.DoctorID=d.DoctorID
                JOIN Users du ON d.UserID=du.UserID
                WHERE du.FullName LIKE ? ORDER BY a.AppDate DESC
            """, (f"%{name}%",))
            if not rows:
                return {"reply": f"🔍 لم يتم العثور على مواعيد للطبيب \"{name}\""}
            lines = "\n".join(apt_line(r) for r in rows[:10])
            return {"reply": f"📋 **مواعيد {rows[0]['DoctorName']}** ({len(rows)})\n\n{lines}"}

    # ════════════════════════════════════════════════════════════════════════
    # DOCTOR
    # ════════════════════════════════════════════════════════════════════════
    if role == "doctor":
        doc = query("SELECT DoctorID FROM Doctors WHERE UserID=?", (uid,))
        if not doc:
            return {"reply": "⚠️ لم يتم العثور على ملف الطبيب"}
        did = doc[0]["DoctorID"]

        # Today
        if has(msg, "اليوم", "today", "الان", "جدول", "schedule", "جدولي"):
            rows = query("""
                SELECT a.BookingCode, a.AppDate, a.AppTime, a.Status, pu.FullName AS PatientName
                FROM Appointments a
                JOIN Patients pt ON a.PatientID=pt.PatientID
                JOIN Users pu ON pt.UserID=pu.UserID
                WHERE a.DoctorID=? AND a.AppDate=? ORDER BY a.AppTime
            """, (did, today_str))
            if not rows:
                return {"reply": f"📭 لا توجد مواعيد لك اليوم ({today_str})"}
            lines = "\n".join(apt_line(r) for r in rows)
            return {"reply": f"📅 **جدولك اليوم ({today_str})** — {len(rows)} موعد\n\n{lines}"}

        # Upcoming
        if has(msg, "قادم", "قادمه", "upcoming", "المستقبل", "القادمه", "القادمة", "بكره", "بكرا", "غدا", "غداً"):
            rows = query("""
                SELECT a.BookingCode, a.AppDate, a.AppTime, a.Status, pu.FullName AS PatientName
                FROM Appointments a
                JOIN Patients pt ON a.PatientID=pt.PatientID
                JOIN Users pu ON pt.UserID=pu.UserID
                WHERE a.DoctorID=? AND a.AppDate > ? AND a.Status NOT IN ('cancelled')
                ORDER BY a.AppDate, a.AppTime
            """, (did, today_str))
            if not rows:
                return {"reply": "📭 لا توجد مواعيد قادمة"}
            lines = "\n".join(apt_line(r) for r in rows[:10])
            return {"reply": f"⏰ **مواعيدك القادمة** — {len(rows)} موعد\n\n{lines}"}

        # No-shows
        if has(msg, "غياب", "no show", "no-show", "لم يحضر", "غائبين", "تغيب", "غائب"):
            rows = query("""
                SELECT a.BookingCode, a.AppDate, a.AppTime,
                       pu.FullName AS PatientName, pu.Phone AS PatientPhone
                FROM Appointments a
                JOIN Patients pt ON a.PatientID=pt.PatientID
                JOIN Users pu ON pt.UserID=pu.UserID
                WHERE a.DoctorID=? AND a.Status='no_show' ORDER BY a.AppDate DESC
            """, (did,))
            if not rows:
                return {"reply": "✅ لا توجد حالات غياب في مواعيدك"}
            lines = "\n".join(f"• 👤 {r['PatientName']} | 📞 {r['PatientPhone']} | 📅 {fmt_date(r['AppDate'])}" for r in rows)
            return {"reply": f"❌ **مرضى لم يحضروا** ({len(rows)})\n\n{lines}"}

        # Stats
        if has(msg, "احصائيات", "إحصائيات", "stats", "ملخص", "كم", "عدد", "نسبه", "نسبة"):
            r = query("""
                SELECT COUNT(*) AS total,
                    SUM(CASE WHEN Status='attended'  THEN 1 ELSE 0 END) AS attended,
                    SUM(CASE WHEN Status='no_show'   THEN 1 ELSE 0 END) AS no_shows,
                    SUM(CASE WHEN Status='pending'   THEN 1 ELSE 0 END) AS pending,
                    SUM(CASE WHEN Status='confirmed' THEN 1 ELSE 0 END) AS confirmed
                FROM Appointments WHERE DoctorID=?
            """, (did,))[0]
            rate = round(r["no_shows"] / r["total"] * 100, 1) if r["total"] else 0
            return {"reply": (
                f"📊 **إحصائياتك**\n\n"
                f"📅 إجمالي مواعيدك: **{r['total']}**\n"
                f"✅ حضر: **{r['attended']}**\n"
                f"❌ لم يحضر: **{r['no_shows']}**\n"
                f"🔵 مؤكد: **{r['confirmed']}**\n"
                f"⏳ بانتظار: **{r['pending']}**\n"
                f"📈 نسبة غيابك: **{rate}%**"
            )}

        # All appointments
        if has(msg, "كل", "all", "جميع", "كلها", "الكل", "مواعيدي", "مواعيد"):
            rows = query("""
                SELECT a.BookingCode, a.AppDate, a.AppTime, a.Status, pu.FullName AS PatientName
                FROM Appointments a
                JOIN Patients pt ON a.PatientID=pt.PatientID
                JOIN Users pu ON pt.UserID=pu.UserID
                WHERE a.DoctorID=? ORDER BY a.AppDate DESC
            """, (did,))
            if not rows:
                return {"reply": "📭 لا توجد مواعيد"}
            lines = "\n".join(apt_line(r) for r in rows[:15])
            suffix = f"\n\n_يُعرض أول 15 من {len(rows)}_" if len(rows) > 15 else ""
            return {"reply": f"📋 **جميع مواعيدي** ({len(rows)})\n\n{lines}{suffix}"}

        # Search patient
        name = extract_name(msg)
        if name or has(msg, "ابحث", "بحث", "search", "find", "مريض"):
            term = name or re.sub(r"^(ابحث|بحث|search|find|مريض)\s*", "", msg, flags=re.IGNORECASE).strip()
            if not term or len(term) < 2:
                return {"reply": "🔍 يرجى كتابة اسم المريض.\nمثال: **ابحث عن محمد**"}
            rows = query("""
                SELECT DISTINCT pu.FullName AS PatientName, pu.Phone,
                       pt.BloodType, pt.Allergies, pt.ChronicDiseases
                FROM Appointments a
                JOIN Patients pt ON a.PatientID=pt.PatientID
                JOIN Users pu ON pt.UserID=pu.UserID
                WHERE a.DoctorID=? AND pu.FullName LIKE ?
            """, (did, f"%{term}%"))
            if not rows:
                return {"reply": f"🔍 لا يوجد مريض بالاسم \"{term}\" في قائمتك"}
            lines = "\n".join(f"• 👤 {r['PatientName']} | 📞 {r['Phone']} | 🩸 {r['BloodType']} | ⚠️ {r['Allergies'] or 'لا يوجد'}" for r in rows)
            return {"reply": f"🔍 **نتائج البحث**\n\n{lines}"}

    # ════════════════════════════════════════════════════════════════════════
    # PATIENT
    # ════════════════════════════════════════════════════════════════════════
    if role == "patient":
        pt = query("SELECT PatientID FROM Patients WHERE UserID=?", (uid,))
        if not pt:
            return {"reply": "⚠️ لم يتم العثور على ملفك الطبي. تواصل مع المسؤول."}
        pid = pt[0]["PatientID"]

        # My appointments
        if has(msg, "مواعيدي", "مواعيد", "appointments", "حجوزاتي", "حجوزات", "كل مواعيدي"):
            rows = query("""
                SELECT a.BookingCode, a.AppDate, a.AppTime, a.Status,
                       du.FullName AS DoctorName, d.SpecialtyAR, c.NameAR AS ClinicName
                FROM Appointments a
                JOIN Doctors d ON a.DoctorID=d.DoctorID
                JOIN Users du ON d.UserID=du.UserID
                JOIN Clinics c ON d.ClinicID=c.ClinicID
                WHERE a.PatientID=? ORDER BY a.AppDate DESC
            """, (pid,))
            if not rows:
                return {"reply": "📭 لا توجد مواعيد في سجلك بعد.\n💡 يمكنك حجز موعد جديد من قائمة **حجز جديد**"}
            lines = "\n".join(apt_line(r) for r in rows)
            return {"reply": f"📅 **مواعيدي** ({len(rows)})\n\n{lines}"}

        # Next appointment
        if has(msg, "قادم", "القادم", "التالي", "next", "اقرب", "أقرب", "موعدي القادم", "متى موعدي"):
            rows = query("""
                SELECT TOP 1 a.BookingCode, a.AppDate, a.AppTime, a.Status,
                       du.FullName AS DoctorName, d.SpecialtyAR, c.NameAR AS ClinicName
                FROM Appointments a
                JOIN Doctors d ON a.DoctorID=d.DoctorID
                JOIN Users du ON d.UserID=du.UserID
                JOIN Clinics c ON d.ClinicID=c.ClinicID
                WHERE a.PatientID=? AND a.AppDate >= ? AND a.Status NOT IN ('cancelled','no_show')
                ORDER BY a.AppDate, a.AppTime
            """, (pid, today_str))
            if not rows:
                return {"reply": "📭 لا يوجد موعد قادم.\n💡 احجز موعدك من قسم **حجز جديد**"}
            r = rows[0]
            return {"reply": (
                f"⏰ **موعدك القادم**\n\n"
                f"👨‍⚕️ {r['DoctorName']} | {r['SpecialtyAR']}\n"
                f"🏥 {r['ClinicName']}\n"
                f"📅 {fmt_date(r['AppDate'])} 🕐 {fmt_time(r['AppTime'])}\n"
                f"🏷️ كود الحجز: **{r['BookingCode']}**\n"
                f"الحالة: {STATUS_AR.get(r['Status'], r['Status'])}"
            )}

        # Doctors search
        if has(msg, "الاطباء", "الأطباء", "اطباء", "أطباء", "doctors", "دكتور", "طبيب", "الدكاتره", "دكاتره", "ابحث عن دكتور"):
            name = extract_name(msg)
            if name:
                rows = query("""
                    SELECT u.FullName, d.SpecialtyAR, c.NameAR AS ClinicName,
                           d.WorkStart, d.WorkEnd, d.ConsultFee
                    FROM Doctors d JOIN Users u ON d.UserID=u.UserID JOIN Clinics c ON d.ClinicID=c.ClinicID
                    WHERE u.FullName LIKE ?
                """, (f"%{name}%",))
            else:
                rows = query("""
                    SELECT u.FullName, d.SpecialtyAR, c.NameAR AS ClinicName,
                           d.WorkStart, d.WorkEnd, d.ConsultFee
                    FROM Doctors d JOIN Users u ON d.UserID=u.UserID JOIN Clinics c ON d.ClinicID=c.ClinicID
                """)
            if not rows:
                return {"reply": "🔍 لم يتم العثور على طبيب"}
            lines = "\n".join(
                f"• 👨‍⚕️ {r['FullName']} | {r['SpecialtyAR']} | 🏥 {r['ClinicName']} | 💰 {r['ConsultFee']} د.أ | ⏰ {fmt_time(r['WorkStart'])}–{fmt_time(r['WorkEnd'])}"
                for r in rows
            )
            return {"reply": f"👨‍⚕️ **الأطباء المتاحون** ({len(rows)})\n\n{lines}"}

        # My profile
        if has(msg, "ملفي", "profile", "بياناتي", "معلوماتي", "ملفي الطبي", "فصيلة دمي", "فصيله دمي", "حساسيتي"):
            rows = query("""
                SELECT u.FullName, u.Phone, p.BloodType, p.Allergies,
                       p.ChronicDiseases, p.DateOfBirth, p.Gender
                FROM Patients p JOIN Users u ON p.UserID=u.UserID WHERE p.PatientID=?
            """, (pid,))
            if not rows:
                return {"reply": "⚠️ لم يتم العثور على ملفك"}
            r = rows[0]
            return {"reply": (
                f"👤 **ملفك الطبي**\n\n"
                f"الاسم: **{r['FullName']}**\n"
                f"📞 الهاتف: {r['Phone']}\n"
                f"🎂 تاريخ الميلاد: {fmt_date(r['DateOfBirth'])}\n"
                f"🩸 فصيلة الدم: **{r['BloodType']}**\n"
                f"⚠️ الحساسيات: {r['Allergies'] or 'لا يوجد'}\n"
                f"🏥 الأمراض المزمنة: {r['ChronicDiseases'] or 'لا يوجد'}"
            )}

        # Treatment plan
        if has(msg, "علاج", "خطه", "خطة", "treatment", "مراحل", "plan", "خطتي"):
            rows = query("""
                SELECT tp.TitleAR, tp.StartDate, tp.Status,
                       u.FullName AS DoctorName,
                       COUNT(ts.StepID) AS TotalSteps,
                       SUM(CASE WHEN ts.Status='completed' THEN 1 ELSE 0 END) AS DoneSteps
                FROM TreatmentPlans tp
                JOIN Doctors d ON tp.DoctorID=d.DoctorID
                JOIN Users u ON d.UserID=u.UserID
                LEFT JOIN TreatmentSteps ts ON ts.PlanID=tp.PlanID
                WHERE tp.PatientID=?
                GROUP BY tp.PlanID, tp.TitleAR, tp.StartDate, tp.Status, u.FullName
            """, (pid,))
            if not rows:
                return {"reply": "📭 لا توجد خطة علاج مسجلة لك"}
            lines = "\n".join(
                f"• 📋 {r['TitleAR']} | 👨‍⚕️ {r['DoctorName']} | ✅ {r['DoneSteps']}/{r['TotalSteps']} مراحل مكتملة"
                for r in rows
            )
            return {"reply": f"🗂️ **خطتي العلاجية**\n\n{lines}"}

    # ── FALLBACK ─────────────────────────────────────────────────────────────
    tips = {
        "manager": "• مواعيد اليوم\n• إحصائيات\n• الغياب\n• ابحث عن [اسم]",
        "doctor":  "• جدول اليوم\n• مواعيد قادمة\n• إحصائياتي\n• ابحث عن [اسم المريض]",
        "patient": "• مواعيدي\n• موعدي القادم\n• الأطباء\n• ملفي الطبي",
    }
    return {"reply": (
        f"🤖 لم أفهم سؤالك تماماً.\n\n"
        f"اكتب **مساعدة** لترى كل ما يمكنني فعله، أو جرب:\n{tips.get(role, '')}"
    )}
