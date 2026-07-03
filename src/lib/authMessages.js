export function authErrorMessage(error) {
  const code = error?.code || "";
  const message = (error?.message || "").toLowerCase();
  if (code === "invalid_credentials" || message.includes("invalid login")) return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  if (code === "email_not_confirmed" || message.includes("email not confirmed")) return "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ";
  if (code === "user_already_exists" || message.includes("already registered")) return "อีเมลนี้ลงทะเบียนแล้ว กรุณาเข้าสู่ระบบ";
  if (code === "weak_password" || message.includes("password")) return "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
  if (code === "over_email_send_rate_limit" || message.includes("rate limit")) return "ส่งอีเมลบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่";
  return "ไม่สามารถดำเนินการได้ กรุณาลองใหม่อีกครั้ง";
}
