import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LockKeyhole, Mail, UserRound } from "lucide-react";
import AuthShell from "../components/AuthShell";
import GoogleSignIn from "../components/GoogleSignIn";
import { authErrorMessage } from "../lib/authMessages";
import { supabase } from "../lib/supabaseClient";

export default function Register() {
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const goToDashboard = useCallback(() => nav("/student/dashboard"), [nav]);
  const showGoogleError = useCallback((text) => setMessage({ type: "error", text }), []);
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function register(event) {
    event.preventDefault();
    setMessage(null);
    if (form.password.length < 8) return setMessage({ type: "error", text: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" });
    if (form.password !== form.confirmPassword) return setMessage({ type: "error", text: "รหัสผ่านทั้งสองช่องไม่ตรงกัน" });
    setLoading(true);
    const redirectTo = `${window.location.origin}/auth/confirm?next=/student/dashboard`;
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: { emailRedirectTo: redirectTo, data: { full_name: form.name.trim(), name: form.name.trim() } },
    });
    setLoading(false);
    if (error) return setMessage({ type: "error", text: authErrorMessage(error) });
    if (data.session) return nav("/student/dashboard");
    setMessage({ type: "success", text: "ลงทะเบียนสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี" });
  }

  return <AuthShell title="ลงทะเบียน" description="สร้างบัญชีเพื่อเริ่มฝึกทำข้อสอบ">
    <GoogleSignIn onSuccess={goToDashboard} onError={showGoogleError} />
    <div className="auth-divider"><span>หรือสมัครด้วยอีเมล</span></div>
    <form className="auth-form-new" onSubmit={register}>
      <label><span>ชื่อ–นามสกุล</span><div className="auth-input"><UserRound /><input name="name" value={form.name} onChange={update} autoComplete="name" placeholder="ชื่อและนามสกุล" required /></div></label>
      <label><span>อีเมล</span><div className="auth-input"><Mail /><input type="email" name="email" value={form.email} onChange={update} autoComplete="email" placeholder="name@example.com" required /></div></label>
      <label><span>รหัสผ่าน</span><div className="auth-input"><LockKeyhole /><input type="password" name="password" value={form.password} onChange={update} autoComplete="new-password" placeholder="อย่างน้อย 8 ตัวอักษร" minLength="8" required /></div></label>
      <label><span>ยืนยันรหัสผ่าน</span><div className="auth-input"><LockKeyhole /><input type="password" name="confirmPassword" value={form.confirmPassword} onChange={update} autoComplete="new-password" placeholder="กรอกรหัสผ่านอีกครั้ง" minLength="8" required /></div></label>
      {message && <p className={`auth-message ${message.type}`} role="status">{message.text}</p>}
      <button className="auth-submit" type="submit" disabled={loading}>{loading ? "กำลังลงทะเบียน…" : "ลงทะเบียน"}</button>
    </form>
    <p className="auth-switch">มีบัญชีแล้ว? <Link to="/login">เข้าสู่ระบบ</Link></p>
  </AuthShell>;
}
