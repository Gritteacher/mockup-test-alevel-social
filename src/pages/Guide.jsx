import { Link } from 'react-router-dom'
import { ArrowLeft, LogIn, ClipboardList, Timer, BarChart3, Ticket, ArrowRight } from 'lucide-react'

const steps = [
  [LogIn, 'เข้าสู่ระบบ', 'ใช้บัญชี Google เพื่อเข้าสู่ระบบและบันทึกผลการสอบของคุณ'],
  [ClipboardList, 'เลือกชุดข้อสอบ', 'เลือก Mock Test ที่ต้องการและอ่านคำชี้แจงก่อนเริ่มสอบ'],
  [Timer, 'ทำข้อสอบ', 'ตอบคำถามภายในเวลาที่กำหนด สามารถย้อนกลับไปแก้คำตอบได้'],
  [BarChart3, 'ดูผลและทบทวน', 'ตรวจคะแนนแยกตามสาระ พร้อมดูเฉลยและหัวข้อที่ควรทบทวน'],
  [Ticket, 'สะสมโควตา', 'ฝึกทำโจทย์และสะสม Practice Points เพื่อแลกโควตาสอบเพิ่ม'],
]

export default function Guide() {
  return <div className="guide-page"><header className="guide-header"><Link to="/" aria-label="กลับหน้าหลัก"><ArrowLeft/></Link><div><span className="brand-mark">M</span><b>คู่มือการใช้งาน</b></div></header><main><div className="guide-intro"><span>เริ่มต้นใช้งานได้ง่าย ๆ</span><h1>วิธีใช้งาน Mock Up Test</h1><p>ทำตามขั้นตอนด้านล่างเพื่อเริ่มจำลองสอบ A-Level สังคม</p></div><div className="guide-steps">{steps.map(([Icon,title,text],i)=><article key={title}><span className="guide-number">{i+1}</span><span className="guide-icon"><Icon/></span><div><h2>{title}</h2><p>{text}</p></div></article>)}</div><Link className="button primary guide-start" to="/login">เริ่มใช้งาน <ArrowRight/></Link></main></div>
}
