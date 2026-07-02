import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Star,
  Ticket,
  XCircle,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

export default function PracticeSession() {
  const { subject } = useParams();
  const [questions, setQuestions] = useState([]);
  const [solved, setSolved] = useState(new Set());
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const current = questions[index];

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
      const [questionResult, walletResult] = await Promise.all([
        supabase
          .from("exam_sets")
          .select("exam_set_questions(questions(id,question_text,subject,difficulty,explanation,question_choices(id,choice_text,position)))")
          .eq("exam_type", "practice")
          .eq("status", "published"),
        supabase
          .from("quota_wallets")
          .select("practice_points")
          .eq("user_id", session.user.id)
          .single(),
      ]);
      const available = Array.from(new Map((questionResult.data || [])
        .flatMap((exam) => exam.exam_set_questions || [])
        .map((link) => link.questions)
        .filter((question) => question?.subject === subject && question.question_choices?.length)
        .map((question) => [question.id, {
          ...question,
          question_choices: [...question.question_choices].sort((a, b) => Number(a.position || 0) - Number(b.position || 0)),
        }])).values());
      let solvedIds = new Set();
      if (available.length) {
        const { data: progress } = await supabase
          .from("practice_progress")
          .select("question_id")
          .eq("user_id", session.user.id)
          .not("solved_at", "is", null)
          .in(
            "question_id",
            available.map((question) => question.id),
          );
        solvedIds = new Set((progress || []).map((item) => item.question_id));
      }
      available.sort(
        (a, b) => Number(solvedIds.has(a.id)) - Number(solvedIds.has(b.id)),
      );
      setQuestions(available);
      setSolved(solvedIds);
      setPoints(walletResult.data?.practice_points || 0);
      setLoading(false);
    })();
  }, [subject]);

  const progressPercent = useMemo(
    () => (questions.length ? (solved.size / questions.length) * 100 : 0),
    [questions.length, solved],
  );

  async function submit() {
    if (!selected || !current || submitting) return;
    setSubmitting(true);
    const { data, error } = await supabase.rpc("submit_practice_answer", {
      p_question_id: current.id,
      p_choice_id: selected,
    });
    setSubmitting(false);
    if (error) {
      alert("ตรวจคำตอบไม่สำเร็จ กรุณาลองใหม่");
      return;
    }
    setFeedback(data);
    setPoints(data.practice_points || 0);
    if (data.is_correct) {
      setSolved((currentSolved) => new Set(currentSolved).add(current.id));
    }
  }

  function next() {
    setSelected("");
    setFeedback(null);
    setIndex((currentIndex) => (currentIndex + 1) % questions.length);
  }

  if (loading)
    return <div className="page practice-session empty-state">กำลังโหลดโจทย์…</div>;
  if (!questions.length)
    return (
      <div className="page practice-session">
        <Link className="page-back" to="/practice">
          <ArrowLeft /> กลับไปเลือกสาระ
        </Link>
        <div className="empty-state practice-empty">
          <h2>ยังไม่มีโจทย์สำหรับ {subject}</h2>
          <p>เมื่อครูเพิ่มคำถามในสาระนี้แล้ว คุณจะเริ่มฝึกได้ทันที</p>
        </div>
      </div>
    );

  return (
    <div className="page practice-session">
      <header className="practice-session-head">
        <Link className="page-back" to="/practice" aria-label="กลับไปเลือกสาระ">
          <ArrowLeft />
        </Link>
        <div>
          <span>ฝึกทำโจทย์</span>
          <h1>{subject}</h1>
        </div>
        <div className="practice-live-points">
          <Star /> {points} pts
        </div>
      </header>
      <div className="practice-progress">
        <span>
          ทำสำเร็จ {solved.size}/{questions.length} ข้อ
        </span>
        <i>
          <u style={{ width: `${progressPercent}%` }} />
        </i>
      </div>
      <section className="practice-question-card">
        <div className="practice-question-meta">
          <span>
            ข้อ {index + 1} จาก {questions.length}
          </span>
          <b>{current.difficulty || "ปานกลาง"}</b>
        </div>
        <h2>{current.question_text}</h2>
        <div className="practice-choices">
          {current.question_choices.map((choice, choiceIndex) => {
            const isCorrect = feedback?.correct_choice_id === choice.id;
            const isWrong =
              feedback && selected === choice.id && !feedback.is_correct;
            return (
              <button
                type="button"
                className={`practice-choice${selected === choice.id ? " selected" : ""}${isCorrect ? " correct" : ""}${isWrong ? " wrong" : ""}`}
                onClick={() => !feedback && setSelected(choice.id)}
                disabled={Boolean(feedback)}
                key={choice.id}
              >
                <span>{String.fromCharCode(65 + choiceIndex)}</span>
                {choice.choice_text}
                {isCorrect && <CheckCircle2 />}
                {isWrong && <XCircle />}
              </button>
            );
          })}
        </div>
        {feedback && (
          <div
            className={`practice-feedback ${feedback.is_correct ? "correct" : "wrong"}`}
          >
            {feedback.is_correct ? <CheckCircle2 /> : <XCircle />}
            <div>
              <h3>{feedback.is_correct ? "ตอบถูก!" : "ยังไม่ถูก ลองทบทวนอีกนิด"}</h3>
              {feedback.points_earned > 0 && <b>+{feedback.points_earned} pts</b>}
              {feedback.quota_earned > 0 && (
                <b className="quota-earned">
                  <Ticket /> +{feedback.quota_earned} Mock Quota
                </b>
              )}
              <p>{feedback.explanation || "ยังไม่มีคำอธิบายสำหรับข้อนี้"}</p>
            </div>
          </div>
        )}
        <footer className="practice-actions">
          {!feedback ? (
            <button
              className="button primary"
              onClick={submit}
              disabled={!selected || submitting}
            >
              {submitting ? "กำลังตรวจ…" : "ตรวจคำตอบ"}
            </button>
          ) : (
            <>
              {!feedback.is_correct && (
                <button
                  className="button ghost"
                  onClick={() => {
                    setSelected("");
                    setFeedback(null);
                  }}
                >
                  <RotateCcw /> ลองข้อนี้อีกครั้ง
                </button>
              )}
              <button className="button primary" onClick={next}>
                ข้อถัดไป <ArrowRight />
              </button>
            </>
          )}
        </footer>
      </section>
    </div>
  );
}
