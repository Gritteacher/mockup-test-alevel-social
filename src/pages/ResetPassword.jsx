import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import AuthShell from "../components/AuthShell";
import { authErrorMessage } from "../lib/authMessages";
import { supabase } from "../lib/supabaseClient";

export default function ResetPassword() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (form.password.length < 8) return setMessage({ type: "error", text: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" });
    if (form.password !== form.confirmPassword) return setMessage({ type: "error", text: "รหัสผ่านทั้งสองช่องไม่ตรงกัน" });
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: form.password });
    setLoading(false);
    if (error) return setMessage({ type: "error", text: authErrorMessage(error) });
    setMessage({ type: "success", text: "ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว" });
    await supabase.auth.signOut();
    setTimeout(() => nav("/login", { replace: true }), 900);
  }

  return <AuthShell title="ตั้งรหัสผ่านใหม่" description="กำหนดรหัสผ่านใหม่สำหรับบัญชีของคุณ">
    {!ready ? <div className="auth-expired"><p>ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว</p><Link to="/forgot-password">ขอลิงก์ใหม่</Link></div> : <form className="auth-form-new" onSubmit={submit}>
      <label><span>รหัสผ่านใหม่</span><div className="auth-input"><LockKeyhole /><input type="password" name="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete="new-password" placeholder="อย่างน้อย 8 ตัวอักษร" minLength="8" required /></div></label>
      <label><span>ยืนยันรหัสผ่านใหม่</span><div className="auth-input"><LockKeyhole /><input type="password" name="confirmPassword" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} autoComplete="new-password" placeholder="กรอกรหัสผ่านอีกครั้ง" minLength="8" required /></div></label>
      {message && <p className={`auth-message ${message.type}`} role="status">{message.text}</p>}
      <button className="auth-submit" type="submit" disabled={loading}>{loading ? "กำลังบันทึก…" : "บันทึกรหัสผ่านใหม่"}</button>
    </form>}
  </AuthShell>;
}
