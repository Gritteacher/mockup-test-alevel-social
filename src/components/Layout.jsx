import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ClipboardCheck, Dumbbell, Ticket, UserRound, ShieldCheck, Users, FileJson, ChartNoAxesCombined, LogOut, Menu, X, GraduationCap } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

const studentLinks = [
  ['/student/dashboard', 'ภาพรวม', LayoutDashboard],
  ['/mock', 'Mock Test', ClipboardCheck],
  ['/practice', 'ฝึกทำโจทย์', Dumbbell],
  ['/quota', 'โควตา', Ticket],
  ['/student/profile', 'โปรไฟล์', UserRound],
]
const adminLinks = [
  ['/admin', 'ภาพรวม', LayoutDashboard],
  ['/admin/students', 'นักเรียน', Users],
  ['/admin/exams', 'จัดการข้อสอบ', FileJson],
  ['/admin/analytics', 'วิเคราะห์', ChartNoAxesCombined],
]

export default function Layout({ children, admin = false }) {
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState(null)
  const nav = useNavigate()
  const links = admin ? adminLinks : studentLinks
  useEffect(() => {
    if (!isSupabaseConfigured) return
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data } = await supabase.from('profiles').select('full_name,nickname,email,role').eq('id', session.user.id).single()
      setProfile(data || { email: session.user.email, role: 'student' })
    })
  }, [])
  const displayName = profile?.nickname || profile?.full_name || profile?.email?.split('@')[0] || 'ผู้ใช้งาน'
  const roleLabel = { admin: 'Admin', teacher: 'คุณครู', student: 'นักเรียน' }[profile?.role] || (admin ? 'Admin' : 'นักเรียน')
  async function logout() {
    if (isSupabaseConfigured) await supabase.auth.signOut()
    nav('/login')
  }
  return <div className={'app-shell ' + (admin ? 'admin-shell' : 'student-shell')}>
    <aside className={'sidebar ' + (open ? 'open' : '')}>
      <div className="brand"><span className="brand-mark"><GraduationCap /></span><div><strong>Mock Up Test</strong><small>A-Level สังคม</small></div></div>
      <button className="close-menu" onClick={() => setOpen(false)} aria-label="ปิดเมนู"><X /></button>
      <nav className="nav-list">{links.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/admin'} onClick={() => setOpen(false)}><Icon /><span>{label}</span></NavLink>)}</nav>
      {admin && <NavLink className="back-student" to="/student/dashboard">← กลับหน้าของนักเรียน</NavLink>}
      <button className="logout" onClick={logout}><LogOut />ออกจากระบบ</button>
    </aside>
    {open && <button className="overlay" onClick={() => setOpen(false)} aria-label="ปิดเมนู" />}
    <section className="app-main">
      <header className="topbar"><button className="menu-button" onClick={() => setOpen(true)} aria-label="เปิดเมนู"><Menu /></button><div className="mobile-brand">A-Level สังคม</div><div className="topbar-actions">{!admin && <NavLink className="admin-top-link" to="/admin" aria-label="ไปหน้า Admin"><ShieldCheck /><span>Admin</span></NavLink>}<div className="user-chip"><span className="avatar">{displayName[0]}</span><div><b>{displayName}</b><small>{roleLabel}</small></div></div></div></header>
      <main>{children}</main>
    </section>
    <nav className="bottom-nav">{links.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/admin'}><Icon /><span>{label}</span></NavLink>)}</nav>
  </div>
}
