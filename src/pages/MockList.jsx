import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock3, ListChecks, Ticket, ArrowLeft, ClipboardCheck } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { examTypes } from '../lib/examPackage'

export default function MockList() {
  const [exams, setExams] = useState([])
  const [quota, setQuota] = useState(0)
  useEffect(() => {
    if (!isSupabaseConfigured) return
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const [examResult, walletResult] = await Promise.all([
        supabase.from('exam_sets').select('*, exam_set_questions(count)').eq('status', 'published').eq('mode', 'mock'),
        supabase.from('quota_wallets').select('mock_quota').eq('user_id', session.user.id).single(),
      ])
      if (examResult.data) setExams(examResult.data.map(x => ({ ...x, question_count: x.exam_set_questions?.[0]?.count || 0 })))
      if (walletResult.data) setQuota(walletResult.data.mock_quota || 0)
    })()
  }, [])
  return <div className="page mock-list-page">
    <div className="page-heading compact-heading"><Link className="page-back" to="/student/dashboard"><ArrowLeft /></Link><div><h1>เลือกชุดข้อสอบ</h1><p>เลือกชุดข้อสอบที่ต้องการ</p></div><span className="quota-badge">โควตา <b>{quota}</b></span></div>
    <div className="exam-grid">{exams.length === 0 ? <div className="empty-state exam-empty">ยังไม่มีชุดข้อสอบที่เผยแพร่</div> : exams.map(x => <article className="exam-card" key={x.id}><div className="exam-title-row"><ClipboardCheck /><h2>{x.title}</h2><span className="status-pill">{examTypes[x.exam_type] || 'Mock Test'}</span></div><p>{x.description}</p><div className="exam-meta"><span><Clock3 />{x.duration_minutes} นาที</span><span><ListChecks />{x.question_count || 0} ข้อ</span><span><Ticket />{x.quota_cost} โควตา</span></div><Link className="button ghost full" to={`/mock/${x.id}/instruction`}>ดูคำชี้แจง</Link></article>)}</div>
  </div>
}
