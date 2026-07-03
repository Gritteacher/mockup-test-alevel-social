import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  Info,
  Layers3,
  MapPin,
  Scale,
  Star,
  TrendingUp,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

const subjectOrder = [
  "ศาสนา",
  "หน้าที่พลเมือง",
  "เศรษฐศาสตร์",
  "ประวัติศาสตร์",
  "ภูมิศาสตร์",
  "แบบรวมสาระ",
];

const subjectIcons = {
  ศาสนา: BookOpen,
  หน้าที่พลเมือง: Scale,
  เศรษฐศาสตร์: TrendingUp,
  ประวัติศาสตร์: Clock3,
  ภูมิศาสตร์: MapPin,
  แบบรวมสาระ: Layers3,
};

export default function Practice() {
  const [points, setPoints] = useState(0);
  const [sets, setSets] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return setLoading(false);

      const [walletResult, setResult] = await Promise.all([
        supabase
          .from("quota_wallets")
          .select("practice_points")
          .eq("user_id", session.user.id)
          .single(),
        supabase
          .from("exam_sets")
          .select("id,title,description,subject,difficulty,duration_minutes,exam_set_questions(question_id)")
          .eq("exam_type", "practice")
          .eq("status", "published")
          .order("created_at", { ascending: true }),
      ]);

      const availableSets = (setResult.data || []).map((item) => ({
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

      setPoints(Number(walletResult.data?.practice_points || 0));
      setSets(availableSets);
      setAttempts(attemptRows);
      setLoading(false);
    })();
  }, []);

  const groupedSets = useMemo(() => {
    const groups = new Map();
    sets.forEach((set) => {
      const subject = set.subject || "แบบรวมสาระ";
      if (!groups.has(subject)) groups.set(subject, []);
      groups.get(subject).push(set);
    });
    return [...groups.entries()].sort(([left], [right]) => {
      const leftIndex = subjectOrder.indexOf(left);
      const rightIndex = subjectOrder.indexOf(right);
      return (leftIndex < 0 ? 99 : leftIndex) - (rightIndex < 0 ? 99 : rightIndex);
    });
  }, [sets]);

  function attemptFor(examSetId) {
    return attempts.find((attempt) =>
      attempt.exam_set_id === examSetId && attempt.status === "in_progress",
    ) || attempts.find((attempt) => attempt.exam_set_id === examSetId);
  }

  return (
    <div className="page practice-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Practice Mode</span>
          <h1>ฝึกทำโจทย์เป็นชุด</h1>
          <p>เลือกสาระและทำให้ครบชุด ก่อนเริ่มฝึกรอบใหม่</p>
        </div>
      </div>
      <section className="practice-points-card">
        <span>Practice Points ของคุณ</span>
        <b>{points} pts <Star /></b>
        <i><u style={{ width: `${Math.min(100, points)}%` }} /></i>
        <small>อีก {points ? 100 - points : 100} คะแนน รับ Mock Quota 1 ครั้ง</small>
      </section>
      <div className="practice-info">
        <Info /> ตอบได้ครั้งเดียวต่อข้อในแต่ละรอบ · ต้องทำครบชุดจึงเริ่มรอบใหม่ได้
      </div>

      {loading ? (
        <div className="empty-state">กำลังโหลดชุดแบบฝึกฝน…</div>
      ) : groupedSets.length === 0 ? (
        <div className="empty-state">ยังไม่มีชุดแบบฝึกฝนที่เผยแพร่</div>
      ) : groupedSets.map(([subject, subjectSets]) => {
        const Icon = subjectIcons[subject] || BookOpen;
        return <section className="practice-subject-section" key={subject}>
          <header><span><Icon /></span><div><h2>{subject}</h2><p>{subjectSets.length} ชุดแบบฝึกฝน</p></div></header>
          <div className="practice-set-grid">
            {subjectSets.map((set) => {
              const attempt = attemptFor(set.id);
              const answered = attempt?.status === "in_progress"
                ? Number(attempt.attempt_answers?.[0]?.count || 0)
                : 0;
              const isActive = attempt?.status === "in_progress";
              return <Link className="practice-set-card" to={`/practice/set/${set.id}`} key={set.id}>
                <div className="practice-set-copy">
                  <span className="practice-set-state">{isActive ? "กำลังทำ" : "พร้อมฝึก"}</span>
                  <h3>{set.title}</h3>
                  <p>{set.description || `แบบฝึกฝนสาระ${subject}`}</p>
                </div>
                <div className="practice-set-meta">
                  <span>{set.question_count} ข้อ</span>
                  <span>{set.difficulty || "ปานกลาง"}</span>
                  {isActive && <strong>{answered}/{set.question_count}</strong>}
                  <ArrowRight />
                </div>
              </Link>;
            })}
          </div>
        </section>;
      })}
    </div>
  );
}
