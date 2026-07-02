import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  GraduationCap,
  Minus,
  Plus,
  School,
  Star,
  Target,
  Ticket,
  Timer,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";

function percent(attempt) {
  const total = Number(attempt.total_questions || 0);
  return total ? Math.round((Number(attempt.score || 0) / total) * 100) : 0;
}

function walletOf(profile) {
  const relation = profile?.quota_wallets;
  return (Array.isArray(relation) ? relation[0] : relation) || {};
}

export default function StudentDetail() {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    Promise.all([
      supabase
        .from("profiles")
        .select("*, quota_wallets(mock_quota,practice_points)")
        .eq("id", studentId)
        .eq("role", "student")
        .single(),
      supabase
        .from("attempts")
        .select("*, exam_sets(title)")
        .eq("user_id", studentId)
        .order("created_at", { ascending: false }),
    ]).then(([studentResult, attemptResult]) => {
      if (studentResult.data) {
        const wallet = walletOf(studentResult.data);
        setStudent({
          ...studentResult.data,
          mock_quota: Number(wallet.mock_quota || 0),
          practice_points: Number(wallet.practice_points || 0),
        });
      }
      setAttempts(attemptResult.data || []);
      setLoading(false);
    });
  }, [studentId]);

  const average = useMemo(
    () => {
      const completed = attempts.filter((attempt) => attempt.status === "submitted");
      return completed.length
        ? Math.round(
            completed.reduce((sum, attempt) => sum + percent(attempt), 0) /
              completed.length,
          )
        : 0;
    },
    [attempts],
  );
  const completedAttempts = useMemo(
    () => attempts.filter((attempt) => attempt.status === "submitted"),
    [attempts],
  );

  async function adjustQuota(amount) {
    if (adjusting) return;
    setAdjusting(true);
    const { error } = await supabase.rpc("admin_adjust_quota", {
      p_user_id: studentId,
      p_amount: amount,
      p_note: amount > 0 ? "เพิ่มโควตาโดยครู" : "ลดโควตาโดยครู",
    });
    setAdjusting(false);
    if (error) return alert("ปรับโควตาไม่สำเร็จ กรุณาลองใหม่");
    setStudent((current) => ({
      ...current,
      mock_quota: Math.max(0, Number(current.mock_quota || 0) + amount),
    }));
  }

  if (loading)
    return <div className="page student-detail-page empty-state">กำลังโหลดข้อมูลนักเรียน…</div>;
  if (!student)
    return (
      <div className="page student-detail-page">
        <Link className="page-back text-back" to="/admin/students">
          <ArrowLeft /> กลับหน้ารายชื่อนักเรียน
        </Link>
        <div className="empty-state">ไม่พบข้อมูลนักเรียน</div>
      </div>
    );

  const initials = (student.full_name || student.email || "?")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <div className="page student-detail-page">
      <div className="student-detail-nav">
        <Link className="page-back text-back" to="/admin/students">
          <ArrowLeft /> กลับหน้ารายชื่อนักเรียน
        </Link>
      </div>

      <section className="student-profile-hero">
        <span className="student-detail-avatar">{initials}</span>
        <div>
          <span className="eyebrow">ข้อมูลนักเรียน</span>
          <h1>{student.full_name || "ไม่ระบุชื่อ"}</h1>
          <p>{student.email || "-"}</p>
        </div>
        <div className="student-quota-control">
          <span>ปรับโควตา</span>
          <div>
            <button
              onClick={() => adjustQuota(-1)}
              disabled={adjusting || Number(student.mock_quota || 0) === 0}
              aria-label="ลดโควตา"
            >
              <Minus />
            </button>
            <b>{student.mock_quota || 0}</b>
            <button
              onClick={() => adjustQuota(1)}
              disabled={adjusting}
              aria-label="เพิ่มโควตา"
            >
              <Plus />
            </button>
          </div>
        </div>
      </section>

      <div className="student-detail-stats">
        <article>
          <Ticket />
          <span>Mock Quota</span>
          <b>{student.mock_quota || 0}</b>
        </article>
        <article>
          <Star />
          <span>Practice Points</span>
          <b>{student.practice_points || 0}</b>
        </article>
        <article>
          <BookOpenCheck />
          <span>จำนวนครั้งที่สอบ</span>
          <b>{completedAttempts.length}</b>
        </article>
        <article>
          <TrendingUp />
          <span>คะแนนเฉลี่ย</span>
          <b>{average}%</b>
        </article>
      </div>

      <section className="panel student-profile-info">
        <h2>
          <UserRound /> ข้อมูลส่วนตัว
        </h2>
        <div>
          <span>
            <School /> โรงเรียน
            <b>{student.school || "-"}</b>
          </span>
          <span>
            <GraduationCap /> ระดับชั้น / ห้อง
            <b>
              {[student.grade, student.room].filter(Boolean).join(" / ") || "-"}
            </b>
          </span>
          <span>
            <Target /> คะแนนเป้าหมาย
            <b>{student.target_score ?? "-"}</b>
          </span>
          <span>
            <UserRound /> ชื่อเล่น
            <b>{student.nickname || "-"}</b>
          </span>
        </div>
      </section>

      <section className="student-attempt-section">
        <div className="section-title">
          <div>
            <h2>ประวัติการทำข้อสอบ</h2>
            <p>เรียงจากรายการล่าสุด</p>
          </div>
          <span>{attempts.length} รายการ</span>
        </div>
        {attempts.length === 0 ? (
          <div className="empty-state">นักเรียนคนนี้ยังไม่มีประวัติการสอบ</div>
        ) : (
          <div className="student-attempt-list">
            {attempts.map((attempt) => {
              const scorePercent = percent(attempt);
              const duration = Math.round(Number(attempt.duration_seconds || 0) / 60);
              return (
                <article key={attempt.id}>
                  <span className="attempt-date-icon">
                    <CalendarDays />
                  </span>
                  <div className="attempt-main">
                    <h3>
                      {attempt.exam_sets?.title || "ชุดข้อสอบ"}
                      <span className={`attempt-status ${attempt.status}`}>
                        {attempt.status === "submitted"
                          ? "ส่งแล้ว"
                          : attempt.status === "expired"
                            ? "หมดเวลา"
                            : "กำลังทำ"}
                      </span>
                    </h3>
                    <p>
                      {new Date(attempt.created_at).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {duration > 0 && (
                        <>
                          <Timer /> {duration} นาที
                        </>
                      )}
                    </p>
                  </div>
                  <div className="attempt-raw-score">
                    <span>คะแนน</span>
                    <b>
                      {attempt.score || 0}/{attempt.total_questions || 0}
                    </b>
                  </div>
                  <strong
                    className={
                      scorePercent >= 70
                        ? "attempt-percent good"
                        : "attempt-percent medium-score"
                    }
                  >
                    {scorePercent}%
                  </strong>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
