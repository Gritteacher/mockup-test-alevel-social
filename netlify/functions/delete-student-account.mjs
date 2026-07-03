const SUPABASE_URL = "https://afrjifttnrjrsnxoqpdx.supabase.co";
const FROM_EMAIL = "Mock Exam <no-reply@auth.grits.online>";

function response(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return response(405, { error: "method_not_allowed" });
  }

  const token = String(event.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const anonKey = String(event.headers["x-supabase-anon-key"] || "");
  const resendKey = process.env.RESEND_API_KEY;
  if (!token || !anonKey) return response(401, { error: "unauthorized" });
  if (!resendKey) return response(503, { error: "email_service_not_configured" });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return response(400, { error: "invalid_json" });
  }

  const studentId = String(body.studentId || "");
  const reason = String(body.reason || "").trim();
  if (!studentId || reason.length < 5 || reason.length > 1000) {
    return response(400, { error: "invalid_request" });
  }

  const supabaseHeaders = {
    apikey: anonKey,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: supabaseHeaders,
  });
  const authUser = await userResponse.json().catch(() => null);
  if (!userResponse.ok || !authUser?.id) return response(401, { error: "unauthorized" });

  async function profile(id, fields) {
    const query = new URLSearchParams({ id: `eq.${id}`, select: fields });
    const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?${query}`, {
      headers: supabaseHeaders,
    });
    if (!profileResponse.ok) return null;
    const rows = await profileResponse.json();
    return rows[0] || null;
  }

  const [admin, student] = await Promise.all([
    profile(authUser.id, "id,role"),
    profile(studentId, "id,email,full_name,role"),
  ]);

  if (admin?.role !== "admin") return response(403, { error: "admin_required" });
  if (!student) return response(404, { error: "student_not_found" });
  if (student.id === authUser.id || student.role !== "student") {
    return response(403, { error: "protected_account" });
  }
  if (!student.email) return response(400, { error: "student_email_missing" });

  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [student.email],
      subject: "แจ้งการลบบัญชี Mock Exam",
      text: [
        `เรียน ${student.full_name || "นักเรียน"}`,
        "",
        "บัญชี Mock Exam A-Level สังคมของคุณถูกลบโดยผู้ดูแลระบบ",
        `เหตุผล: ${reason}`,
        "",
        "หากมีข้อสงสัย กรุณาติดต่อครูไต๋ โรงเรียนเทพศิรินทร์ นนทบุรี",
      ].join("\n"),
    }),
  });
  const emailResult = await emailResponse.json().catch(() => ({}));
  if (!emailResponse.ok || !emailResult.id) {
    return response(502, { error: "email_delivery_failed" });
  }

  const deletionResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/admin_delete_student_account`,
    {
      method: "POST",
      headers: supabaseHeaders,
      body: JSON.stringify({
      p_user_id: studentId,
      p_reason: reason,
      p_notification_id: emailResult.id,
      }),
    },
  );
  const deletionResult = await deletionResponse.json().catch(() => null);
  if (!deletionResponse.ok) return response(500, { error: "account_deletion_failed" });

  return response(200, { ok: true, deletion: deletionResult });
}
