import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, ChevronDown } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'

const percent = (item) => Number(item.total_questions) > 0 ? Math.round(Number(item.score || 0) / Number(item.total_questions) * 100) : 0
const walletOf = (profile) => {
  const relation = profile.quota_wallets
  return (Array.isArray(relation) ? relation[0] : relation) || {}
}

export default function Analytics() {
  const [attempts, setAttempts] = useState([])
  const [students, setStudents] = useState(0)
  const [lowQuota, setLowQuota] = useState([])
  useEffect(() => {
    if (!isSupabaseConfigured) return
    Promise.all([
      supabase.from('attempts').select('*').order('created_at', { ascending: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('profiles').select('full_name, quota_wallets(mock_quota)').eq('role', 'student'),
    ]).then(([attemptResult, studentResult, quotaResult]) => {
      setAttempts((attemptResult.data || []).filter(item => item.status === 'submitted'))
      setStudents(studentResult.count || 0)
      setLowQuota((quotaResult.data || []).filter(item => Number(walletOf(item).mock_quota || 0) <= 1))
    })
  }, [])
  const average = useMemo(() => attempts.length ? (attempts.reduce((sum, item) => sum + percent(item), 0) / attempts.length).toFixed(1) : '0.0', [attempts])
  const points = attempts.slice(-8).map((item, index, list) => `${index * (300 / Math.max(1, list.length - 1))},${100 - percent(item)}`).join(' ')
  return <div className="page analytics-page"><div className="page-heading"><div><h1>วิเคราะห์ผลสอบ</h1><p>ติดตามแนวโน้มและนักเรียนที่ต้องดูแล</p></div></div><div className="analytics-filters"><button>ทุกชุด <ChevronDown /></button><button>ทั้งหมด <ChevronDown /></button></div><div className="analytics-metrics"><div><span>เฉลี่ย</span><b>{average}</b></div><div><span>สอบ</span><b>{attempts.length}</b></div><div><span>นักเรียน</span><b>{students}</b></div></div><section className="panel trend-card"><h2>แนวโน้มคะแนน</h2>{points ? <svg viewBox="0 0 300 110" role="img" aria-label="กราฟแนวโน้มคะแนน"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" /></svg> : <div className="empty-state">ยังไม่มีข้อมูลคะแนน</div>}</section><section className="low-quota-list"><h2>โควตาใกล้หมด</h2>{lowQuota.length === 0 ? <div className="empty-state">ยังไม่มีนักเรียนที่โควตาใกล้หมด</div> : lowQuota.map(item => { const quota = Number(walletOf(item).mock_quota || 0); return <div key={item.id || item.full_name}><AlertCircle /><b>{item.full_name || 'ไม่ระบุชื่อ'}</b><span className={quota === 0 ? 'empty' : ''}>โควตา {quota}</span></div> })}</section></div>
}
