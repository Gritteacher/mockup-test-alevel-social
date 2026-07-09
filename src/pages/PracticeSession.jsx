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
  const { examId } = useParams();
  const [exam, setExam] = useState(null);
  const [attemptId, setAttemptId] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answered, setAnswered] = useState(new Set());
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [points, setPoints] = useState(0);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [completeAfterFeedback, setCompleteAfterFeedback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [roundKey, setRoundKey] = useState(0);
  const current = questions[index];

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError("");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) {
        setLoadError("กรุณาเข้าสู่ระบบอีกครั้ง");
        setLoading(false);
        return;
      }
      const { data: attempt, error: startError } = await supabase.rpc(
        "start_practice_attempt",
        { p_exam_set_id: examId },
      );
      if (cancelled) return;
      if (startError || !attempt) {
        setLoadError("เริ่มชุดแบบฝึกฝนไม่สำเร็จ กรุณาลองใหม่");
        setLoading(false);
        return;
      }

      const [examResult, answerResult, walletResult] = await Promise.all([
        supabase
          .from("exam_sets")
          .select("id,title,description,subject,difficulty,exam_set_questions(position,questions(id,question_text,image_url,image_alt,subject,difficulty,explanation,question_choices(id,choice_text,position)))")
          .eq("id", examId)
          .single(),
        supabase
          .from("attempt_answers")
          .select("question_id,is_correct")
          .eq("attempt_id", attempt.id),
        supabase
          .from("quota_wallets")
          .select("practice_points")
          .eq("user_id", session.user.id)
          .single(),
      ]);
      if (cancelled) return;
      if (examResult.error || !examResult.data) {
        setLoadError("โหลดคำถามในชุดนี้ไม่สำเร็จ");
        setLoading(false);
        return;
      }

      const orderedQuestions = [...(examResult.data.exam_set_questions || [])]
        .sort((left, right) => Number(left.position) - Number(right.position))
        .map((link) => ({
          ...link.questions,
          question_choices: [...(link.questions?.question_choices || [])]
            .sort((left, right) => Number(left.position) - Number(right.position)),
        }))
        .filter((question) => question?.question_choices?.length);
      const answeredIds = new Set((answerResult.data || []).map((item) => item.question_id));
      const firstUnanswered = orderedQuestions.findIndex((question) => !answeredIds.has(question.id));

      setExam(examResult.data);
      setAttemptId(attempt.id);
      setQuestions(orderedQuestions);
      setAnswered(answeredIds);
      setScore((answerResult.data || []).filter((item) => item.is_correct).length);
      setPoints(Number(walletResult.data?.practice_points || 0));
      setIndex(firstUnanswered < 0 ? 0 : firstUnanswered);
      setSelected("");
      setFeedback(null);
      setCompleted(false);
      setCompleteAfterFeedback(false);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [examId, roundKey]);

  const progressPercent = useMemo(
    () => (questions.length ? (answered.size / questions.length) * 100 : 0),
    [questions.length, answered],
  );

  async function submit() {
    if (!selected || !current || submitting || feedback) return;
    setSubmitting(true);
    const { data, error } = await supabase.rpc("submit_practice_attempt_answer", {
      p_attempt_id: attemptId,
      p_question_id: current.id,
      p_choice_id: selected,
    });
    setSubmitting(false);
    if (error) {
      alert(error.message?.includes("already answered")
        ? "ข้อนี้ถูกตอบแล้ว กรุณาไปข้อถัดไป"
        : "ตรวจคำตอบไม่สำเร็จ กรุณาลองใหม่");
      return;
    }
    setFeedback(data);
    setPoints(Number(data.practice_points || 0));
    setScore(Number(data.score || 0));
    setAnswered((currentAnswered) => new Set(currentAnswered).add(current.id));
    setCompleteAfterFeedback(Boolean(data.completed));
  }

  function next() {
    if (completeAfterFeedback) {
      setCompleted(true);
      setFeedback(null);
      return;
    }
    const nextIndex = questions.findIndex(
      (question, questionIndex) => questionIndex > index && !answered.has(question.id),
    );
    const wrappedIndex = questions.findIndex((question) => !answered.has(question.id));
    setIndex(nextIndex >= 0 ? nextIndex : wrappedIndex);
    setSelected("");
    setFeedback(null);
  }

  if (loading) return <div className="page practice-session empty-state">กำลังเตรียมชุดแบบฝึกฝน…</div>;
  if (loadError || !questions.length) return <div className="page practice-session">
    <Link className="page-back" to="/practice"><ArrowLeft /> กลับไปเลือกชุด</Link>
    <div className="empty-state practice-empty">
      <h2>{loadError || "ชุดนี้ยังไม่มีคำถาม"}</h2>
      <p>กรุณากลับไปเลือกชุดแบบฝึกฝนอีกครั้ง</p>
    </div>
  </div>;

  if (completed) return <div className="page practice-session">
    <header className="practice-session-head">
      <Link className="page-back" to="/practice" aria-label="กลับไปเลือกชุด"><ArrowLeft /></Link>
      <div><span>{exam?.subject}</span><h1>{exam?.title}</h1></div>
      <div className="practice-live-points"><Star /> {points} pts</div>
    </header>
    <section className="practice-complete-card">
      <span><CheckCircle2 /></span>
      <h2>ทำครบชุดแล้ว</h2>
      <p>ตอบถูก {score} จาก {questions.length} ข้อ</p>
      <div>
        <Link className="button ghost" to="/practice">เลือกชุดอื่น</Link>
        <button className="button primary" onClick={() => setRoundKey((key) => key + 1)}>
          <RotateCcw /> ทำชุดนี้อีกรอบ
        </button>
      </div>
    </section>
  </div>;

  return <div className="page practice-session">
    <header className="practice-session-head">
      <Link className="page-back" to="/practice" aria-label="กลับไปเลือกชุด"><ArrowLeft /></Link>
      <div><span>{exam?.subject}</span><h1>{exam?.title}</h1></div>
      <div className="practice-live-points"><Star /> {points} pts</div>
    </header>
    <div className="practice-progress">
      <span>ตอบแล้ว {answered.size}/{questions.length} ข้อ</span>
      <i><u style={{ width: `${progressPercent}%` }} /></i>
    </div>
    <section className="practice-question-card">
      <div className="practice-question-meta">
        <span>ข้อ {index + 1} จาก {questions.length}</span>
        <b>{current.difficulty || "ปานกลาง"}</b>
      </div>
      <h2>{current.question_text}</h2>
      {current.image_url && <figure className="question-image practice-question-image"><img src={current.image_url} alt={current.image_alt || `รูปประกอบข้อ ${index + 1}`} /></figure>}
      <div className="practice-choices">
        {current.question_choices.map((choice, choiceIndex) => {
          const isCorrect = feedback?.correct_choice_id === choice.id;
          const isWrong = feedback && selected === choice.id && !feedback.is_correct;
          return <button
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
          </button>;
        })}
      </div>
      {feedback && <div className={`practice-feedback ${feedback.is_correct ? "correct" : "wrong"}`}>
        {feedback.is_correct ? <CheckCircle2 /> : <XCircle />}
        <div>
          <h3>{feedback.is_correct ? "ตอบถูก!" : "ยังไม่ถูก — ข้อนี้จะทำใหม่ได้ในรอบถัดไป"}</h3>
          {feedback.points_earned > 0 && <b>+{feedback.points_earned} pts</b>}
          {feedback.quota_earned > 0 && <b className="quota-earned"><Ticket /> +{feedback.quota_earned} Mock Quota</b>}
          <p>{feedback.explanation || "ยังไม่มีคำอธิบายสำหรับข้อนี้"}</p>
        </div>
      </div>}
      <footer className="practice-actions">
        {!feedback ? <button className="button primary" onClick={submit} disabled={!selected || submitting}>
          {submitting ? "กำลังตรวจ…" : "ตรวจคำตอบ"}
        </button> : <button className="button primary" onClick={next}>
          {completeAfterFeedback ? "ดูสรุปรอบนี้" : "ข้อถัดไป"} <ArrowRight />
        </button>}
      </footer>
    </section>
  </div>;
}
