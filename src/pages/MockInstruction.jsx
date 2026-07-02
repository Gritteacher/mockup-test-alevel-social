import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Clock3, ListChecks, Ticket, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

export default function MockInstruction() {
  const { examId } = useParams()
  const nav = useNavigate()
  const [exam, setExam] = useState(null)
  const [wallet, setWallet] = useState({ mock_quota: 0, practice_points: 0 })
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!isSupabaseConfigured) return
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const [e, w] = await Promise.all([supabase.from('exam_sets').select('*, exam_set_questions(count)').eq('id', examId).single(), supabase.from('quota_wallets').select('*').eq('user_id', session.user.id).single()])
      if (e.data) setExam({ ...e.data, question_count: e.data.exam_set_questions?.[0]?.count || 0 })
      if (w.data) setWallet(w.data)
    })()
  }, [examId])
  async function start() {
    if (!exam) return
    if (wallet.mock_quota < exam.quota_cost) return alert('โควตาไม่เพียงพอ กรุณาฝึกทำโจทย์เพื่อสะสมโควตาเพิ่ม')
    setLoading(true)
    if (!isSupabaseConfigured) { alert('ยังไม่ได้เชื่อมต่อระบบ'); setLoading(false); return }
    const { data, error } = await supabase.rpc('start_mock_attempt', { p_exam_set_id: examId })
    if (error) { alert(error.message?.includes('quota') ? 'โควตาไม่เพียงพอ กรุณาสะสมโควตาเพิ่ม' : 'ไม่สามารถเริ่มสอบได้ กรุณาลองใหม่'); setLoading(false); return }
    nav(`/mock/attempt/${data.id || data}`)
  }
  if (!exam) return <div className="page narrow"><div className="empty-state">ไม่พบชุดข้อสอบนี้</div></div>
  return <div className="page narrow instruction-page">
    <div className="simple-page-title"><Link to="/mock"><ArrowLeft /></Link><h1>คำชี้แจงก่อนสอบ</h1></div>
    <section className="panel exam-summary"><h2>{exam.title}</h2><div><b><Clock3 />{exam.duration_minutes} นาที</b><b><ListChecks />{exam.question_count} ข้อ</b><b className="quota-text"><Ticket />{exam.quota_cost} โควตา</b></div></section>
    <section className="instruction-body"><h2>ข้อปฏิบัติก่อนเข้าสอบ</h2><ol><li>เตรียมอุปกรณ์และสถานที่สอบให้พร้อม</li><li>ห้ามปิดหรือรีเฟรชหน้าจอขณะกำลังสอบ</li><li>ตรวจสอบว่าตอบครบทุกข้อก่อนกดส่ง</li><li>แนะนำให้ใช้สัญญาณอินเทอร์เน็ตที่เสถียร</li><li>ไม่สามารถหยุดพักหรือบันทึกไว้ทำต่อได้</li></ol><div className="warning"><AlertTriangle /><div><b>ตรวจสอบอินเทอร์เน็ตก่อนเริ่ม</b><span>โควตาจะถูกใช้ทันทีเมื่อเริ่มทำข้อสอบ</span></div></div><div className="quota-confirm"><b>โควตาปัจจุบัน</b><strong>{wallet.mock_quota}</strong><ArrowRight /><strong>{wallet.mock_quota - exam.quota_cost}</strong></div><button className="button primary full large" onClick={start} disabled={loading}>{loading ? 'กำลังเตรียมข้อสอบ…' : 'พร้อมแล้ว เริ่มทำข้อสอบ'} <ArrowRight /></button></section>
  </div>
}
