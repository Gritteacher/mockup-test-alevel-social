import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { supabase } from "../lib/supabaseClient";

export default function AuthConfirm() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const tokenHash = params.get("token_hash");
    const type = params.get("type");
    const next = params.get("next") || "/student/dashboard";
    if (!tokenHash || !type) { setFailed(true); return; }
    supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ error }) => {
      if (error) return setFailed(true);
      nav(type === "recovery" ? "/reset-password" : next, { replace: true });
    });
  }, [nav, params]);
  return <AuthShell title="กำลังยืนยันบัญชี" description="โปรดรอสักครู่ ระบบกำลังตรวจสอบลิงก์ของคุณ">
    {failed ? <div className="auth-expired"><p>ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว</p><Link to="/login">กลับไปหน้าเข้าสู่ระบบ</Link></div> : <div className="auth-confirming"><span className="spinner" />กำลังยืนยัน…</div>}
  </AuthShell>;
}
