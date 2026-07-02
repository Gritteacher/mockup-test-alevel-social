import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, ShieldX } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

export default function AdminRoute({ children }) {
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStatus("unauthenticated");
      return;
    }
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setStatus("unauthenticated");
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();
      setStatus(
        !error && ["teacher", "admin"].includes(data?.role)
          ? "allowed"
          : "denied",
      );
    })();
  }, []);

  if (status === "loading")
    return (
      <div className="page-loader">
        <span className="spinner" /> กำลังตรวจสอบสิทธิ์…
      </div>
    );
  if (status === "unauthenticated") return <Navigate to="/login" replace />;
  if (status === "denied")
    return (
      <main className="admin-access-denied">
        <section>
          <span>
            <ShieldX />
          </span>
          <h1>ไม่มีสิทธิ์เข้าถึง</h1>
          <p>บัญชีนี้ไม่ได้รับสิทธิ์สำหรับหน้า Admin</p>
          <Link className="button primary" to="/student/dashboard">
            <ArrowLeft /> กลับหน้าของนักเรียน
          </Link>
        </section>
      </main>
    );
  return children;
}
