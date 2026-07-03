import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LockKeyhole, Mail } from "lucide-react";
import AuthShell from "../components/AuthShell";
import GoogleSignIn from "../components/GoogleSignIn";
import { authErrorMessage } from "../lib/authMessages";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

export default function Login() {
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const goToDashboard = useCallback(() => nav("/student/dashboard"), [nav]);
  const showGoogleError = useCallback((text) => setMessage({ type: "error", text }), []);

  useEffect(() => {
    if (isSupabaseConfigured) supabase.auth.getSession().then(({ data }) => data.session && nav("/student/dashboard"));
  }, [nav]);

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function signIn(event) {
    event.preventDefault();
    setMessage(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
    setLoading(false);
    if (error) return setMessage({ type: "error", text: authErrorMessage(error) });
    nav("/student/dashboard");
  }

  async function sendMagicLink() {
    if (!form.email.trim()) return setMessage({ type: "error", text: "กรุณากรอกอีเมลก่อนขอลิงก์เข้าสู่ระบบ" });
    setMessage(null);
    setLoading(true);
    const redirectTo = `${window.location.origin}/auth/confirm?next=/student/dashboard`;
    const { error } = await supabase.auth.signInWithOtp({ email: form.email.trim(), options: { emailRedirectTo: redirectTo, shouldCreateUser: false } });
    setLoading(false);
    if (error) return setMessage({ type: "error", text: authErrorMessage(error) });
    setMessage({ type: "success", text: "ส่งลิงก์เข้าสู่ระบบแล้ว กรุณาตรวจสอบอีเมล" });
  }

  return <AuthShell title="เข้าสู่ระบบ" description="เลือกวิธีที่สะดวกเพื่อเข้าสู่ Mock Exam">
    <GoogleSignIn onSuccess={goToDashboard} onError={showGoogleError} />
    <div className="auth-divider"><span>หรือใช้อีเมล</span></div>
    <form className="auth-form-new" onSubmit={signIn}>
      <label><span>อีเมล</span><div className="auth-input"><Mail /><input type="email" name="email" value={form.email} onChange={update} autoComplete="email" placeholder="name@example.com" required /></div></label>
      <label><span>รหัสผ่าน</span><div className="auth-input"><LockKeyhole /><input type="password" name="password" value={form.password} onChange={update} autoComplete="current-password" placeholder="รหัสผ่านของคุณ" required /></div></label>
      <div className="auth-form-links"><Link to="/forgot-password">ลืมรหัสผ่าน?</Link></div>
      {message && <p className={`auth-message ${message.type}`} role="status">{message.text}</p>}
      <button className="auth-submit" type="submit" disabled={loading}>{loading ? "กำลังดำเนินการ…" : "เข้าสู่ระบบ"}</button>
      <button className="auth-magic-link" type="button" onClick={sendMagicLink} disabled={loading}>ส่งลิงก์เข้าสู่ระบบทางอีเมล</button>
    </form>
    <p className="auth-switch">ยังไม่มีบัญชี? <Link to="/register">ลงทะเบียน</Link></p>
  </AuthShell>;
}
