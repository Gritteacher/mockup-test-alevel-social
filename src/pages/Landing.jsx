import { Link } from 'react-router-dom'
import { BookOpenText, LogIn, UserPlus } from 'lucide-react'

export default function Landing() {
  return <div className="landing landing-new">
    <main className="landing-new-content">
      <section className="landing-new-brand" aria-labelledby="landing-title">
        <span className="landing-new-logo" aria-hidden="true">M</span>
        <h1 id="landing-title">Mock Exam</h1>
        <p>By ครูไต๋ กฤษณพล ทองอุ่น<br />โรงเรียนเทพศิรินทร์ นนทบุรี</p>
      </section>

      <section className="landing-subjects" aria-label="สาระการเรียนรู้">
        <small>ครบทุกสาระสำคัญ</small>
        <div>
          <span>ศาสนา</span>
          <span>หน้าที่พลเมือง</span>
          <span>เศรษฐศาสตร์</span>
          <span>ประวัติศาสตร์</span>
          <span>ภูมิศาสตร์</span>
        </div>
      </section>

      <section className="landing-new-intro">
        <h2>A-Level สังคม</h2>
        <p>ระบบจำลองสอบ A-Level สังคม<br />พร้อมวิเคราะห์จุดอ่อนและสะสมโควตา</p>
      </section>

      <nav className="landing-new-actions" aria-label="เริ่มต้นใช้งาน">
        <Link className="landing-new-button primary" to="/login"><LogIn />เข้าสู่ระบบ</Link>
        <Link className="landing-new-button secondary" to="/register"><UserPlus />ลงทะเบียน</Link>
        <Link className="landing-new-button guide" to="/guide"><BookOpenText />คู่มือการใช้งาน</Link>
      </nav>
    </main>
    <footer className="landing-new-footer">© 2026 Mock Exam A-Level สังคม By ครูไต๋</footer>
  </div>
}
