import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  Info,
  MapPin,
  Scale,
  Star,
  TrendingUp,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

const subjects = [
  ["ศาสนา", BookOpen],
  ["หน้าที่พลเมือง", Scale],
  ["เศรษฐศาสตร์", TrendingUp],
  ["ประวัติศาสตร์", Clock3],
  ["ภูมิศาสตร์", MapPin],
];

export default function Practice() {
  const [points, setPoints] = useState(0);
  const [counts, setCounts] = useState({});
  const [solvedCounts, setSolvedCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return setLoading(false);

      const [walletResult, questionResult, progressResult] = await Promise.all([
        supabase
          .from("quota_wallets")
          .select("practice_points")
          .eq("user_id", session.user.id)
          .single(),
        supabase.from("questions").select("id,subject"),
        supabase
          .from("practice_progress")
          .select("question_id,solved_at")
          .eq("user_id", session.user.id)
          .not("solved_at", "is", null),
      ]);

      setPoints(walletResult.data?.practice_points || 0);
      const questions = questionResult.data || [];
      const nextCounts = {};
      questions.forEach((question) => {
        nextCounts[question.subject] = (nextCounts[question.subject] || 0) + 1;
      });
      setCounts(nextCounts);

      const subjectByQuestion = Object.fromEntries(
        questions.map((question) => [question.id, question.subject]),
      );
      const nextSolved = {};
      (progressResult.data || []).forEach((progress) => {
        const subject = subjectByQuestion[progress.question_id];
        if (subject) nextSolved[subject] = (nextSolved[subject] || 0) + 1;
      });
      setSolvedCounts(nextSolved);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="page practice-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Practice Mode</span>
          <h1>ฝึกทำโจทย์</h1>
          <p>เลือกสาระ ตอบคำถาม และสะสมคะแนนเพื่อรับโควตา</p>
        </div>
      </div>
      <section className="practice-points-card">
        <span>Practice Points ของคุณ</span>
        <b>
          {points} pts <Star />
        </b>
        <i>
          <u style={{ width: `${points}%` }} />
        </i>
        <small>อีก {100 - points} คะแนน รับ Mock Quota 1 ครั้ง</small>
      </section>
      <div className="practice-info">
        <Info /> ตอบถูกครั้งแรก +10 คะแนน · ครบ 100 คะแนนแลกโควตาอัตโนมัติ
      </div>
      <h2 className="practice-title">เลือกสาระที่ต้องการฝึก</h2>
      <div className="practice-grid practice-subject-grid">
        {subjects.map(([subject, Icon]) => {
          const total = counts[subject] || 0;
          const solved = solvedCounts[subject] || 0;
          const content = (
            <>
              <span className="subject-icon">
                <Icon />
              </span>
              <div>
                <h2>{subject}</h2>
                <p>
                  {loading
                    ? "กำลังโหลด…"
                    : total
                      ? `ทำสำเร็จ ${solved}/${total} ข้อ`
                      : "ยังไม่มีโจทย์ในสาระนี้"}
                </p>
              </div>
              <ArrowRight />
            </>
          );
          return total ? (
            <Link
              className="practice-subject-card"
              to={`/practice/${encodeURIComponent(subject)}`}
              key={subject}
            >
              {content}
            </Link>
          ) : (
            <article className="practice-subject-card disabled" key={subject}>
              {content}
            </article>
          );
        })}
      </div>
    </div>
  );
}
