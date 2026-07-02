import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, LogOut } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

export default function Profile() {
  const [form, setForm] = useState({
    full_name: "",
    nickname: "",
    school: "",
    grade: "",
    room: "",
    target_score: "",
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [email, setEmail] = useState("");
  const nav = useNavigate();
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      setEmail(session.user.email || "");
      const { data } = await supabase
        .from("profiles")
        .select("full_name,nickname,school,grade,room,target_score")
        .eq("id", session.user.id)
        .single();
      if (data) setForm((f) => ({ ...f, ...data }));
    })();
  }, []);
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  async function save(e) {
    e.preventDefault();
    setSaving(true);
    const safe = {
      full_name: form.full_name,
      nickname: form.nickname,
      school: form.school,
      grade: form.grade,
      room: form.room,
      target_score: Number(form.target_score),
    };
    if (isSupabaseConfigured) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const { error } = await supabase
        .from("profiles")
        .update(safe)
        .eq("id", session.user.id);
      if (error) {
        alert("บันทึกไม่สำเร็จ");
        setSaving(false);
        return;
      }
    }
    setTimeout(() => {
      setSaving(false);
      setDone(true);
      setTimeout(() => setDone(false), 2500);
    }, 400);
  }
  async function logout() {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    nav("/login");
  }
  return (
    <div className="page narrow profile-page">
      <div className="page-heading">
        <div>
          <h1>โปรไฟล์ของฉัน</h1>
          <p>จัดการข้อมูลส่วนตัว</p>
        </div>
      </div>
      <form onSubmit={save}>
        <section className="panel profile-card">
          <span className="avatar huge">
            {form.full_name ? form.full_name.slice(0, 2) : "ผ"}
          </span>
          <h2>{form.full_name || "ยังไม่ได้ระบุชื่อ"}</h2>
          <p>{email}</p>
        </section>
        {done && (
          <div className="profile-success">
            <CheckCircle2 />
            บันทึกข้อมูลเรียบร้อยแล้ว
          </div>
        )}
        <div className="profile-form">
          <Field
            label="ชื่อ–นามสกุล"
            name="full_name"
            value={form.full_name}
            onChange={change}
          />
          <Field
            label="ชื่อเล่น"
            name="nickname"
            value={form.nickname}
            onChange={change}
          />
          <Field
            label="โรงเรียน"
            name="school"
            value={form.school}
            onChange={change}
            wide
          />
          <Field
            label="ระดับชั้น"
            name="grade"
            value={form.grade}
            onChange={change}
          />
          <Field label="ห้อง" name="room" value={form.room} onChange={change} />
          <Field
            label="คะแนนเป้าหมาย"
            name="target_score"
            type="number"
            value={form.target_score}
            onChange={change}
            wide
          />
        </div>
        <button className="button primary full large" disabled={saving}>
          {saving ? "กำลังบันทึก…" : "บันทึกข้อมูล"}
        </button>
        <button type="button" className="profile-logout" onClick={logout}>
          <LogOut />
          ออกจากระบบ
        </button>
      </form>
    </div>
  );
}
function Field({ label, wide, ...props }) {
  return (
    <label className={wide ? "wide" : ""}>
      <span>{label}</span>
      <div className="field-control">
        <input {...props} />
        {props.name === "target_score" && <b>/100</b>}
      </div>
    </label>
  );
}
