import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ticket, Dumbbell, ClipboardCheck, Trophy, ArrowRight, TrendingUp, Clock3, BookOpen, Flame, PlusCircle } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { demoProfile, demoWallet, demoAttempts } from '../lib/demoData'

export default function Dashboard() {
  const [profile, setProfile] = useState(demoProfile)
  const [wallet, setWallet] = useState(demoWallet)
  const [attempts, setAttempts] = useState(demoAttempts)
  useEffect(() => {
    if (!isSupabaseConfigured) return
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const [p, w, a] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
        supabase.from('quota_wallets').select('*').eq('user_id', session.user.id).single(),
        supabase.from('attempts').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      ])
      if (p.data) setProfile(p.data)
      if (w.data) setWallet(w.data)
      if (a.data) setAttempts(a.data)
    })()
  }, [])
  const latest = attempts[0]
  return <div className="page dashboard-page">
    <div className="welcome"><div><span className="muted dashboard-date">วันพุธที่ 1 กรกฎาคม 2569</span><h1>สวัสดี, {profile.nickname || profile.full_name}</h1><p>วันนี้มาเตรียมความพร้อมให้ใกล้เป้าหมายขึ้นอีกนิดกัน</p></div><div className="streak"><Flame /><div><b>7 วัน</b><span>ฝึกต่อเนื่อง</span></div></div></div>
    <div className="stat-grid">
      <Stat icon={Ticket} tone="indigo" label="โควตาคงเหลือ" value={wallet.mock_quota} suffix="ครั้ง" />
      <Stat icon={Dumbbell} tone="green" label="Practice Points" value={wallet.practice_points} suffix="คะแนน" />
      <Stat icon={ClipboardCheck} tone="blue" label="ครั้งที่สอบ" value={attempts.length} suffix="ครั้ง" />
      <Stat icon={Trophy} tone="indigo" label="คะแนนล่าสุด" value={latest?.percentage || 0} suffix="/100" />
    </div>
    <div className="dashboard-grid">
      <section className="start-card"><div className="start-content"><span className="pill">พร้อมทดสอบตัวเองหรือยัง?</span><h2>เริ่ม Mock Up Test</h2><span className="quota-pill">1 โควตา</span><p>จำลองการสอบจริง 50 ข้อ ภายใน 90 นาที<br />พร้อมดูผลวิเคราะห์ทันทีหลังทำเสร็จ</p><Link className="button white" to="/mock">เลือกชุดข้อสอบ <ArrowRight /></Link></div><div className="decor-number">A</div></section>
      <section className="quick-card"><div className="section-title"><div><h2>เป้าหมายของฉัน</h2><p>คะแนนเป้าหมาย A-Level สังคม</p></div><b className="target-score">{profile.target_score}</b></div><div className="goal-track"><i style={{ width: '76%' }} /><span>คะแนนล่าสุด 76</span></div><div className="goal-tip"><TrendingUp /><span>อีกเพียง <b>{Math.max(0, profile.target_score - 76)} คะแนน</b> ก็ถึงเป้าหมายแล้ว</span></div></section>
    </div>
    <Link className="practice-cta" to="/practice"><div><b>ฝึกเพื่อสะสมโควตา</b><span>สะสม 100 pts = 1 โควตา</span></div><PlusCircle /></Link>
    <div className="content-grid dashboard-content"><section className="panel recent-panel"><div className="section-title"><div><h2>ผลสอบล่าสุด</h2><p>ประวัติการทำข้อสอบของคุณ</p></div><Link to="/quota">ดูทั้งหมด</Link></div>{attempts.slice(0, 3).map(a => <div className="activity" key={a.id}><span className="activity-icon"><BookOpen /></span><div><b>{a.exam || 'Mock Up Test'}</b><span><Clock3 /> {new Date(a.created_at).toLocaleDateString('th-TH')}</span></div><strong className={a.percentage >= 70 ? 'good' : 'medium-score'}>{a.percentage}/100</strong></div>)}</section><section className="panel practice-mini"><div className="section-title"><div><h2>ฝึกเพื่อรับโควตา</h2><p>สะสมให้ครบ 100 คะแนน</p></div><Dumbbell /></div><div className="points-circle"><b>{wallet.practice_points % 100}</b><span>/ 100</span></div><p>คุณมีคะแนนพร้อมแลกโควตาแล้ว!</p><Link to="/practice" className="button secondary">ไปฝึกทำโจทย์</Link></section></div>
  </div>
}

function Stat({ icon: Icon, tone, label, value, suffix }) {
  return <div className="stat-card"><span className={'stat-icon ' + tone}><Icon /></span><div><span>{label}</span><b>{value} <small>{suffix}</small></b></div></div>
}
