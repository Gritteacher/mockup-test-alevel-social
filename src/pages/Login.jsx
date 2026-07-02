import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
export default function Login() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (isSupabaseConfigured)
      supabase.auth
        .getSession()
        .then(({ data }) => data.session && nav("/student/dashboard"));
  }, []);
  async function login() {
    setLoading(true);
    if (!isSupabaseConfigured) {
      alert("ยังไม่ได้เชื่อมต่อระบบ");
      setLoading(false);
      return;
    }
    const redirectTo = new URL(
      `${import.meta.env.BASE_URL}student/dashboard`,
      window.location.origin,
    ).toString();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      alert("ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่");
      setLoading(false);
    }
  }
  return (
    <div className="auth-page">
      <Link to="/" className="back-home">
        <ArrowLeft />
        กลับหน้าหลัก
      </Link>
      <div className="login-card">
        <span className="big-brand">M</span>
        <h2>Mock Up Test A-Level สังคม</h2>
        <p className="byline">By ครูไต๋</p>
        <hr />
        <h1>ยินดีต้อนรับ</h1>
        <p>เข้าสู่ระบบเพื่อเริ่มทำข้อสอบ</p>
        <button className="google-button" onClick={login} disabled={loading}>
          <GoogleIcon />
          {loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบด้วย Google"}
        </button>
        <div className="security-note">
          <span>
            ข้อมูลของคุณจะถูกเก็บเป็นความลับ
            <br />
            ปลอดภัยด้วย Google OAuth
          </span>
        </div>
      </div>
    </div>
  );
}
function GoogleIcon() {
  return (
    <svg className="google-g" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.33-1.59-5.04-3.72H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.96 10.7A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.16.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l3-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58A8.64 8.64 0 0 0 9 0 9 9 0 0 0 .96 4.97l3 2.33C4.67 5.17 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
