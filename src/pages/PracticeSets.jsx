import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Info } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

export default function PracticeSets() {
  const { subject } = useParams();
  const [sets, setSets] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) return setLoading(false);
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return setLoading(false);
      const { data: setRows } = await supabase
        .from("exam_sets")
        .select("id,title,description,subject,difficulty,duration_minutes,exam_set_questions(question_id)")
        .eq("exam_type", "practice")
        .eq("status", "published")
        .eq("subject", subject)
        .order("created_at", { ascending: true });
      const availableSets = (setRows || []).map((item) => ({
        ...item,
        question_count: item.exam_set_questions?.length || 0,
      })).filter((item) => item.question_count > 0);
      let attemptRows = [];
      if (availableSets.length) {
        const { data } = await supabase
          .from("attempts")
          .select("id,exam_set_id,status,score,total_questions,created_at,attempt_answers(count)")
          .eq("user_id", session.user.id)
          .in("exam_set_id", availableSets.map((item) => item.id))
          .order("created_at", { ascending: false });
        attemptRows = data || [];
      }
      setSets(availableSets);
      setAttempts(attemptRows);
      setLoading(false);
    })();
  }, [subject]);

  function activeAttempt(examSetId) {
    return attempts.find((attempt) =>
      attempt.exam_set_id === examSetId && attempt.status === "in_progress",
    );
  }

  return <div className="page practice-sets-page">
    <header className="practice-sets-heading">
      <Link className="page-back" to="/practice" aria-label="กลับไปเลือกสาระ"><ArrowLeft /></Link>
      <span><BookOpen /></span>
      <div><small>ชุดแบบฝึกฝน</small><h1>{subject}</h1><p>เลือกชุดที่ต้องการฝึก</p></div>
    </header>
    <div className="practice-info"><Info /> หากตอบผิด จะทำข้อนั้นใหม่ได้เมื่อทำครบชุดและเริ่มรอบใหม่</div>
    {loading ? <div className="empty-state">กำลังโหลดชุดแบบฝึกฝน…</div> : sets.length === 0 ? <div className="empty-state"><h2>ยังไม่มีชุดแบบฝึกฝน</h2><p>เมื่อครูเผยแพร่ชุดสาระ{subject} จะแสดงที่หน้านี้</p></div> : <div className="practice-set-grid">
      {sets.map((set) => {
        const attempt = activeAttempt(set.id);
        const answered = Number(attempt?.attempt_answers?.[0]?.count || 0);
        return <Link className="practice-set-card" to={`/practice/set/${set.id}`} key={set.id}>
          <div className="practice-set-copy">
            <span className="practice-set-state">{attempt ? "กำลังทำ" : "พร้อมฝึก"}</span>
            <h3>{set.title}</h3>
            <p>{set.description || `แบบฝึกฝนสาระ${subject}`}</p>
          </div>
          <div className="practice-set-meta">
            <span>{set.question_count} ข้อ</span><span>{set.difficulty || "ปานกลาง"}</span>
            {attempt && <strong>{answered}/{set.question_count}</strong>}<ArrowRight />
          </div>
        </Link>;
      })}
    </div>}
  </div>;
}
