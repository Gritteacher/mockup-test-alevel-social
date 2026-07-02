import { useEffect, useState } from 'react'
import { BookOpen, Scale, TrendingUp, Clock3, MapPin, LockKeyhole, Star, Info } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

const subjects = ['ศาสนา', 'หน้าที่พลเมือง', 'เศรษฐศาสตร์', 'ประวัติศาสตร์', 'ภูมิศาสตร์']
const icons = [BookOpen, Scale, TrendingUp, Clock3, MapPin]

export default function Practice() {
  const [points, setPoints] = useState(0)
  useEffect(() => {
    if (!isSupabaseConfigured) return
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase.from('quota_wallets').select('practice_points').eq('user_id', session.user.id).single()
      setPoints(data?.practice_points || 0)
    })()
  }, [])
  return <div className="page practice-page"><div className="page-heading"><div><h1>ฝึกทำโจทย์</h1><p>เลือกหัวข้อที่ต้องการฝึก</p></div></div><section className="practice-points-card"><span>Practice Points ของคุณ</span><b>{points} pts <Star /></b></section><div className="practice-info"><Info />สะสม 100 Practice Points = Mock Quota 1 ครั้ง</div><h2 className="practice-title">เลือกสาระที่ต้องการฝึก</h2><div className="practice-grid">{subjects.map((subject, index) => { const Icon = icons[index]; return <article key={subject}><span className="subject-icon"><Icon /></span><h2>{subject}</h2><div className="coming"><LockKeyhole />Phase 2</div></article> })}</div></div>
}
