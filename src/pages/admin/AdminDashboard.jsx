import { useEffect, useMemo, useState } from 'react'
import { Users, Files, ClipboardCheck, TrendingUp } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'

export default function AdminDashboard() {
  const [students, setStudents] = useState(0)
  const [examSets, setExamSets] = useState(0)
  const [attempts, setAttempts] = useState([])
  useEffect(() => {
    if (!isSupabaseConfigured) return
    Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('exam_sets').select('*', { count: 'exact', head: true }),
      supabase.from('attempts').select('*, profiles(full_name), exam_sets(title)').order('created_at', { ascending: false }),
    ]).then(([studentResult, examResult, attemptResult]) => {
      setStudents(studentResult.count || 0)
      setExamSets(examResult.count || 0)
      setAttempts(attemptResult.data || [])
    })
  }, [])
  const average = useMemo(() => attempts.length ? (attempts.reduce((sum, item) => sum + Number(item.percentage || 0), 0) / attempts.length).toFixed(1) : '0.0', [attempts])
  const bars = attempts.slice(0, 7).reverse().map(item => Math.max(8, Number(item.percentage || 0)))
  return <div className="page admin-dashboard"><div className="page-heading"><div><h1>ภาพรวมระบบ</h1><p>ติดตามการใช้งานของนักเรียน</p></div></div><div className="stat-grid admin-stats"><A icon={Users} label="นักเรียนทั้งหมด" value={students} /><A icon={Files} label="ชุดข้อสอบ" value={examSets} /><A icon={ClipboardCheck} label="จำนวนสอบ" value={attempts.length} /><A icon={TrendingUp} label="คะแนนเฉลี่ย" value={average} /></div><section className="panel weekly-chart"><h2>จำนวนการสอบล่าสุด</h2>{bars.length === 0 ? <div className="empty-state">ยังไม่มีข้อมูลการสอบ</div> : <div>{bars.map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div>}</section><section className="admin-recent"><h2>รายการสอบล่าสุด</h2>{attempts.length === 0 ? <div className="empty-state">ยังไม่มีรายการสอบ</div> : attempts.slice(0, 5).map(item => <div className="activity" key={item.id}><span className="avatar">{(item.profiles?.full_name || '?')[0]}</span><div><b>{item.profiles?.full_name || 'ไม่ระบุชื่อ'}</b><span>{item.exam_sets?.title || 'ชุดข้อสอบ'}</span></div><strong>{item.percentage || 0}</strong></div>)}</section></div>
}
function A({ icon: Icon, label, value }) { return <div className="stat-card"><Icon /><span>{label}</span><b>{value}</b></div> }
