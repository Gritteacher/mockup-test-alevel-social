import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock3, ListChecks, Ticket, ArrowLeft, ClipboardCheck } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { demoExams } from '../lib/demoData'

export default function MockList() {
  const [exams, setExams] = useState(demoExams.filter(x => x.status === 'published'))
  useEffect(() => {
    if (isSupabaseConfigured) supabase.from('exam_sets').select('*, exam_set_questions(count)').eq('status', 'published').eq('mode', 'mock').then(({ data }) => data && setExams(data.map(x => ({ ...x, question_count: x.exam_set_questions?.[0]?.count || 0 }))))
  }, [])
  return <div className="page mock-list-page">
    <div className="page-heading compact-heading"><Link className="page-back" to="/student/dashboard"><ArrowLeft /></Link><div><h1>เลือกชุด Mock Test</h1><p>เลือกชุดข้อสอบที่ต้องการ</p></div><span className="quota-badge">โควตา <b>3</b></span></div>
    <div className="exam-grid">{exams.map((x, i) => <article className="exam-card" key={x.id}><div className="exam-title-row"><ClipboardCheck /><h2>{x.title}</h2><span className="status-pill">พร้อมสอบ</span></div><p>{x.description}</p><div className="exam-meta"><span><Clock3 />{x.duration_minutes} นาที</span><span><ListChecks />{x.question_count || 50} ข้อ</span><span><Ticket />{x.quota_cost} โควตา</span></div><Link className="button ghost full" to={`/mock/${x.id}/instruction`}>ดูคำชี้แจง</Link></article>)}</div>
  </div>
}
