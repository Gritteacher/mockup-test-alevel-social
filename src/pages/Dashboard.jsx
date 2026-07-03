import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ticket, Dumbbell, ClipboardCheck, Trophy, ArrowRight, TrendingUp, Clock3, BookOpen, Flame, PlusCircle } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

export default function Dashboard() {
  const [profile, setProfile] = useState({ full_name: '', nickname: '', target_score: 0 })
  const [wallet, setWallet] = useState({ mock_quota: 0, practice_points: 0 })
  const [attempts, setAttempts] = useState([])
  useEffect(() => {
    if (!isSupabaseConfigured) return
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const [p, w, a] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
        supabase.from('quota_wallets').select('*').eq('user_id', session.user.id).single(),
        supabase.from('attempts').select('*, exam_sets(title)').eq('user_id', session.user.id).eq('status', 'submitted').order('created_at', { ascending: false }),
      ])
      if (p.data) setProfile(p.data)
      if (w.data) setWallet(w.data)
      if (a.data) setAttempts(a.data)
    })()
  }, [])
  const latest = attempts[0]
  const scoreOf = (attempt) => Number(attempt?.total_questions) > 0 ? Math.round(Number(attempt.score || 0) / Number(attempt.total_questions) * 100) : 0
  const latestScore = scoreOf(latest)
  return <div className="page dashboard-page">
    <div className="welcome"><div><h1>{profile.nickname || profile.full_name ? `สวัสดี, ${profile.nickname || profile.full_name}` : 'สวัสดี'}</h1><p>วันนี้มาเตรียมความพร้อมให้ใกล้เป้าหมายขึ้นอีกนิดกัน</p></div></div>
    <div className="stat-grid">
      <Stat icon={Ticket} tone="indigo" label="โควตาคงเหลือ" value={wallet.mock_quota} suffix="ครั้ง" />
      <Stat icon={Dumbbell} tone="green" label="Practice Points" value={wallet.practice_points} suffix="คะแนน" />
      <Stat icon={ClipboardCheck} tone="blue" label="ครั้งที่สอบ" value={attempts.length} suffix="ครั้ง" />
      <Stat icon={Trophy} tone="indigo" label="คะแนนล่าสุด" value={latestScore} suffix="/100" />
    </div>
    <div className="dashboard-grid">
      <section className="start-card"><div className="start-content"><span className="pill">พร้อมทดสอบตัวเองหรือยัง?</span><h2>เริ่ม Mock Exam</h2><span className="quota-pill">เลือกตามชุดข้อสอบ</span><p>เลือกชุดและรูปแบบข้อสอบที่เหมาะกับคุณ<br />พร้อมดูผลวิเคราะห์ทันทีหลังทำเสร็จ</p><Link className="button white" to="/mock">เลือกชุดข้อสอบ <ArrowRight /></Link></div><div className="decor-number">A</div></section>
      <section className="quick-card"><div className="section-title"><div><h2>เป้าหมายของฉัน</h2><p>คะแนนเป้าหมาย A-Level สังคม</p></div><b className="target-score">{profile.target_score}</b></div><div className="goal-track"><i style={{ width: `${latestScore}%` }} /><span>คะแนนล่าสุด {latestScore}</span></div><div className="goal-tip"><TrendingUp /><span>{latest ? <>อีกเพียง <b>{Math.max(0, profile.target_score - latestScore)} คะแนน</b> ก็ถึงเป้าหมายแล้ว</> : 'เริ่มทำข้อสอบเพื่อดูระยะห่างจากเป้าหมาย'}</span></div></section>
    </div>
    <Link className="practice-cta" to="/practice"><div><b>ฝึกเพื่อสะสมโควตา</b><span>สะสม 100 pts = 1 โควตา</span></div><PlusCircle /></Link>
    <div className="content-grid dashboard-content"><section className="panel recent-panel"><div className="section-title"><div><h2>ผลสอบล่าสุด</h2><p>ประวัติการทำข้อสอบของคุณ</p></div><Link to="/student/history">ดูทั้งหมด <ArrowRight /></Link></div>{attempts.length === 0 ? <div className="empty-state">ยังไม่มีประวัติการสอบ</div> : attempts.slice(0, 3).map(a => { const score = scoreOf(a); return <Link className="activity activity-link" to={`/mock/result/${a.id}`} key={a.id}><span className="activity-icon"><BookOpen /></span><div><b>{a.exam_sets?.title || 'ชุดข้อสอบ'}</b><span><Clock3 /> {new Date(a.created_at).toLocaleDateString('th-TH')}</span></div><strong className={score >= 70 ? 'good' : 'medium-score'}>{score}/100</strong></Link> })}</section><section className="panel practice-mini"><div className="section-title"><div><h2>ฝึกเพื่อรับโควตา</h2><p>สะสมให้ครบ 100 คะแนน</p></div><Dumbbell /></div><div className="points-circle"><b>{wallet.practice_points % 100}</b><span>/ 100</span></div><Link to="/practice" className="button secondary">ไปฝึกทำโจทย์</Link></section></div>
  </div>
}

function Stat({ icon: Icon, tone, label, value, suffix }) {
  return <div className="stat-card"><span className={'stat-icon ' + tone}><Icon /></span><div><span>{label}</span><b>{value} <small>{suffix}</small></b></div></div>
}
