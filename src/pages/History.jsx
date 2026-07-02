import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CalendarDays, ChevronRight, Clock3, History as HistoryIcon, Share2, Trophy } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

function percent(attempt) {
  const total = Number(attempt.total_questions || 0);
  return total ? Math.round(Number(attempt.score || 0) / total * 100) : 0;
}

export default function History() {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!isSupabaseConfigured) return setLoading(false);
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return setLoading(false);
      const { data } = await supabase
        .from("attempts")
        .select("*, exam_sets(title,passing_score)")
        .eq("user_id", session.user.id)
        .eq("status", "submitted")
        .order("created_at", { ascending: false });
      setAttempts(data || []);
      setLoading(false);
    })();
  }, []);

  return <div className="page history-page">
    <div className="history-heading"><Link to="/student/dashboard" aria-label="กลับหน้าภาพรวม"><ArrowLeft /></Link><div><span className="eyebrow">Exam History</span><h1>ประวัติการสอบ</h1><p>เปิดดูผล เฉลย และแชร์การสอบที่ผ่านมา</p></div><span><HistoryIcon />{attempts.length} ครั้ง</span></div>
    {loading ? <div className="empty-state">กำลังโหลดประวัติการสอบ…</div> : attempts.length === 0 ? <div className="empty-state">ยังไม่มีประวัติการสอบ</div> : <div className="history-list">{attempts.map(attempt => { const score = percent(attempt); const passed = score >= Number(attempt.exam_sets?.passing_score ?? 70); return <Link to={`/mock/result/${attempt.id}`} className="history-card" key={attempt.id}>
      <span className={`history-score ${passed ? 'passed' : ''}`}><b>{score}</b><small>/100</small></span>
      <div className="history-main"><h2>{attempt.exam_sets?.title || 'ชุดข้อสอบ'}</h2><p><CalendarDays />{new Date(attempt.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}{Number(attempt.duration_seconds) > 0 && <><Clock3 />{Math.round(Number(attempt.duration_seconds) / 60)} นาที</>}</p></div>
      <div className="history-result"><span><Trophy />{attempt.score || 0}/{attempt.total_questions || 0} ข้อ</span><b><Share2 />ดูผลและแชร์</b></div><ChevronRight />
    </Link> })}</div>}
  </div>;
}
