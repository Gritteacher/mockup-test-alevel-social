import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import AuthShell from "../components/AuthShell";
import { authErrorMessage } from "../lib/authMessages";
import { supabase } from "../lib/supabaseClient";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setLoading(false);
    if (error) return setMessage({ type: "error", text: authErrorMessage(error) });
    setMessage({ type: "success", text: "หากอีเมลนี้มีบัญชี เราได้ส่งลิงก์ตั้งรหัสผ่านใหม่ให้แล้ว" });
  }
  return <AuthShell title="ลืมรหัสผ่าน" description="กรอกอีเมลที่ใช้ลงทะเบียนเพื่อรับลิงก์ตั้งรหัสผ่านใหม่">
    <form className="auth-form-new" onSubmit={submit}>
      <label><span>อีเมล</span><div className="auth-input"><Mail /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="name@example.com" required /></div></label>
      {message && <p className={`auth-message ${message.type}`} role="status">{message.text}</p>}
      <button className="auth-submit" type="submit" disabled={loading}>{loading ? "กำลังส่ง…" : "ส่งลิงก์ตั้งรหัสผ่านใหม่"}</button>
    </form>
    <p className="auth-switch"><Link to="/login">กลับไปหน้าเข้าสู่ระบบ</Link></p>
  </AuthShell>;
}
