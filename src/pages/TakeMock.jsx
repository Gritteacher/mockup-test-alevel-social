import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Clock3, Flag, ChevronLeft, ChevronRight, Send, Menu, CheckCircle2, XCircle, Lightbulb } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

export default function TakeMock() {
  const { attemptId } = useParams()
  const nav = useNavigate()
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [checkedAnswers, setCheckedAnswers] = useState({})
  const [index, setIndex] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [totalSeconds, setTotalSeconds] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [exam, setExam] = useState(null)
  const shuffle = (items) => [...items].sort(() => Math.random() - .5)
  useEffect(() => {
    if (!isSupabaseConfigured) return
    ;(async () => {
      const { data: a } = await supabase.from('attempts').select('*, exam_sets(duration_minutes,title,shuffle_questions,shuffle_choices,answer_reveal,passing_score)').eq('id', attemptId).single()
      if (a) { const duration = a.exam_sets.duration_minutes * 60; setSeconds(duration); setTotalSeconds(duration); setExam(a.exam_sets) }
      const { data } = await supabase.from('exam_set_questions').select('position, questions(*, question_choices(*))').eq('exam_set_id', a?.exam_set_id).order('position')
      if (data) {
        let prepared = data.map(x => { const orderedChoices = [...(x.questions.question_choices || [])].sort((left, right) => Number(left.position || 0) - Number(right.position || 0)); const choiceRows = a?.exam_sets?.shuffle_choices ? shuffle(orderedChoices) : orderedChoices; return { ...x.questions, choices: choiceRows.map(c => c.choice_text), choice_rows: choiceRows, correct_index: choiceRows.findIndex(c => c.is_correct) } })
        if (a?.exam_sets?.shuffle_questions) prepared = shuffle(prepared)
        setQuestions(prepared)
      }
    })()
  }, [attemptId])
  useEffect(() => { const timer = setInterval(() => setSeconds(s => { if (s <= 1) { clearInterval(timer); submit(true); return 0 } return s - 1 }), 1000); return () => clearInterval(timer) }, [questions, answers])
  const answered = Object.keys(answers).length
  const q = questions[index]
  const time = `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  const progress = useMemo(() => Math.round(answered / questions.length * 100), [answered, questions])
  function checkCurrentAnswer() {
    if (answers[q.id] === undefined) return
    setCheckedAnswers(current => ({ ...current, [q.id]: true }))
  }
  async function submit(auto = false) {
    if (submitting) return
    if (!auto && answered < questions.length && !confirm(`ยังไม่ได้ตอบ ${questions.length - answered} ข้อ ต้องการส่งคำตอบหรือไม่?`)) return
    setSubmitting(true)
    let correct = 0
    const rows = questions.map((x, i) => { const selected = answers[x.id]; const ok = selected === x.correct_index; if (ok) correct++; return { attempt_id: attemptId, question_id: x.id, selected_choice_id: x.choice_rows?.[selected]?.id || null, is_correct: ok, order_no: i + 1 } })
    const result = { id: attemptId, score: correct, total: questions.length, percentage: questions.length ? Math.round(correct / questions.length * 100) : 0, duration_seconds: Math.max(0, totalSeconds - seconds), passing_score: exam?.passing_score ?? 70, answers, questions }
    if (isSupabaseConfigured) { await supabase.from('attempt_answers').insert(rows); /* TODO: move scoring to RPC submit_attempt */ await supabase.from('attempts').update({ score: correct, total_questions: questions.length, status: 'submitted', submitted_at: new Date().toISOString(), duration_seconds: result.duration_seconds }).eq('id', attemptId) } else { alert('ยังไม่ได้เชื่อมต่อระบบ'); setSubmitting(false); return }
    nav(`/mock/result/${attemptId}`)
  }
  if (!q) return <div className="page-loader">กำลังโหลดข้อสอบ…</div>
  return <div className="exam-page">
    <header className="exam-header"><button className="exam-menu" aria-label="เมนูข้อสอบ"><Menu /></button><div><span>A-Level สังคม</span><b>{exam?.title || 'ชุดข้อสอบ'}</b></div><div className={'timer ' + (seconds < 300 ? 'danger' : '')}><Clock3 /><b>{time}</b></div><button className="button primary desktop-submit" onClick={() => submit(false)}><Send />ส่งข้อสอบ</button></header>
    <div className="exam-progress"><i style={{ width: `${progress}%` }} /></div>
    <main className="exam-workspace"><aside className="question-map"><h3>ข้อสอบทั้งหมด</h3><div>{questions.map((x, i) => <button key={x.id} className={(i === index ? 'current ' : '') + (answers[x.id] !== undefined ? 'answered ' : '') + (checkedAnswers[x.id] ? 'checked' : '')} onClick={() => setIndex(i)}>{i + 1}</button>)}</div></aside><section className="question-card"><div className="question-prompt"><div className="question-top"><span>ข้อที่ {index + 1}</span><button><Flag />ทำเครื่องหมาย</button></div><h2>{q.question_text}</h2>{q.image_url && <figure className="question-image"><img src={q.image_url} alt={q.image_alt || `รูปประกอบข้อ ${index + 1}`} /></figure>}</div><div className="choices">{q.choices.map((c, i) => { const reveal = exam?.answer_reveal === 'immediate' && checkedAnswers[q.id]; const className = reveal ? (i === q.correct_index ? 'correct' : answers[q.id] === i ? 'wrong' : '') : answers[q.id] === i ? 'selected' : ''; return <button key={i} className={className} disabled={Boolean(reveal)} onClick={() => setAnswers({ ...answers, [q.id]: i })}><span></span>{c}</button> })}</div>{exam?.answer_reveal === 'immediate' && (!checkedAnswers[q.id] ? <button className="button primary check-answer-button" disabled={answers[q.id] === undefined} onClick={checkCurrentAnswer}>ตรวจคำตอบข้อนี้</button> : <div className={`mock-answer-feedback ${answers[q.id] === q.correct_index ? 'correct' : 'wrong'}`}>{answers[q.id] === q.correct_index ? <CheckCircle2 /> : <XCircle />}<div><h3>{answers[q.id] === q.correct_index ? 'ตอบถูก!' : 'คำตอบยังไม่ถูก'}</h3><p><Lightbulb />{q.explanation || 'ยังไม่มีคำอธิบายสำหรับข้อนี้'}</p></div></div>)}<button className="mobile-submit" onClick={() => submit(false)}>ส่งข้อสอบ</button><div className="question-actions"><button className="button ghost" disabled={index === 0} onClick={() => setIndex(index - 1)}><ChevronLeft />ก่อนหน้า</button><span>{index + 1} / {questions.length}</span><button className="button primary" disabled={index === questions.length - 1} onClick={() => setIndex(index + 1)}>ถัดไป<ChevronRight /></button></div></section></main>
  </div>
}
