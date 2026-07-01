export const demoUser = { id: 'demo-user', email: 'student@example.com', user_metadata: { avatar_url: '' } }
export const demoProfile = { id: 'demo-user', full_name: 'ณัฐชา ตั้งใจเรียน', nickname: 'มีน', school: 'โรงเรียนสาธิตศึกษา', grade: 'ม.6', room: '2', target_score: 75, role: 'student' }
export const demoWallet = { mock_quota: 3, practice_points: 240 }
export const subjects = ['ศาสนา', 'หน้าที่พลเมือง', 'เศรษฐศาสตร์', 'ประวัติศาสตร์', 'ภูมิศาสตร์']
export const demoExams = [
  { id:'social-01', title:'Mock Up Test ชุดที่ 1', description:'จำลองสนามสอบจริง ครบทั้ง 5 สาระการเรียนรู้', duration_minutes:90, question_count:50, quota_cost:1, status:'published', mode:'mock', attempts:128, average:68 },
  { id:'social-02', title:'Mock Up Test ชุดที่ 2', description:'โจทย์เข้มข้น เน้นวิเคราะห์และเชื่อมโยงสถานการณ์', duration_minutes:90, question_count:50, quota_cost:1, status:'published', mode:'mock', attempts:84, average:64 },
  { id:'social-03', title:'Mock Up Test ชุดที่ 3', description:'ชุดทบทวนโค้งสุดท้าย พร้อมเฉลยละเอียด', duration_minutes:90, question_count:50, quota_cost:1, status:'draft', mode:'mock', attempts:0, average:0 },
]
export const demoQuestions = [
 { id:'q1', subject:'ศาสนา', difficulty:'ปานกลาง', question_text:'ข้อใดสะท้อนหลักมัชฌิมาปฏิปทาได้ชัดเจนที่สุด', explanation:'มัชฌิมาปฏิปทาคือทางสายกลาง หลีกเลี่ยงความสุดโต่งทั้งสองด้าน', choices:['ใช้ชีวิตอย่างพอเหมาะและมีสติ','ปฏิเสธความสุขทุกชนิด','สะสมทรัพย์สินให้มากที่สุด','ทำตามความต้องการเสมอ','แยกตัวออกจากสังคม'], correct_index:0 },
 { id:'q2', subject:'หน้าที่พลเมือง', difficulty:'ง่าย', question_text:'หลักการใดเป็นพื้นฐานสำคัญของระบอบประชาธิปไตย', explanation:'อำนาจอธิปไตยเป็นของประชาชน ซึ่งใช้อำนาจโดยตรงหรือผ่านผู้แทน', choices:['อำนาจอธิปไตยเป็นของประชาชน','ผู้นำมีอำนาจสูงสุด','รัฐควบคุมสื่อทั้งหมด','ประชาชนไม่มีสิทธิตรวจสอบ','กฎหมายใช้เฉพาะบางกลุ่ม'], correct_index:0 },
 { id:'q3', subject:'เศรษฐศาสตร์', difficulty:'ปานกลาง', question_text:'เมื่อราคาสินค้าชนิดหนึ่งสูงขึ้น โดยปัจจัยอื่นคงที่ ปริมาณความต้องการซื้อจะเป็นอย่างไร', explanation:'ตามกฎอุปสงค์ ราคาและปริมาณความต้องการซื้อเปลี่ยนแปลงในทิศทางตรงกันข้าม', choices:['ลดลง','เพิ่มขึ้น','คงที่เสมอ','เท่ากับอุปทาน','ไม่สามารถระบุได้'], correct_index:0 },
 { id:'q4', subject:'ประวัติศาสตร์', difficulty:'ยาก', question_text:'ปัจจัยใดมีบทบาทสำคัญต่อการเปลี่ยนแปลงทางเศรษฐกิจของสยามหลังสนธิสัญญาเบาว์ริง', explanation:'สยามเปิดการค้าเสรีมากขึ้น ส่งผลให้เศรษฐกิจเงินตราและการส่งออกข้าวขยายตัว', choices:['การเปิดเสรีทางการค้า','การยกเลิกเงินตรา','การปิดประเทศ','การยกเลิกการเพาะปลูก','การลดการค้ากับต่างชาติ'], correct_index:0 },
 { id:'q5', subject:'ภูมิศาสตร์', difficulty:'ปานกลาง', question_text:'ปรากฏการณ์เอลนีโญส่งผลต่อประเทศไทยโดยทั่วไปอย่างไร', explanation:'เอลนีโญมักทำให้อุณหภูมิสูงขึ้นและฝนต่ำกว่าค่าเฉลี่ยในเอเชียตะวันออกเฉียงใต้', choices:['อากาศร้อนและฝนน้อยลง','อากาศหนาวจัดตลอดปี','ฝนตกหนักทุกพื้นที่','ระดับทะเลลดลงทันที','เกิดแผ่นดินไหวถี่ขึ้น'], correct_index:0 },
]
export const demoTransactions = [
 { id:1, created_at:'2026-06-28T10:20:00', amount:-1, type:'ใช้ทำ Mock Test', note:'Mock Up Test ชุดที่ 1' },
 { id:2, created_at:'2026-06-25T08:15:00', amount:1, type:'แลก Practice Points', note:'ครบ 100 คะแนนฝึกฝน' },
 { id:3, created_at:'2026-06-20T09:00:00', amount:3, type:'โควตาเริ่มต้น', note:'ต้อนรับสมาชิกใหม่' },
]
export const demoAttempts = [
 { id:'a1', student:'ณัฐชา ตั้งใจเรียน', exam:'Mock Up Test ชุดที่ 1', score:38, total:50, percentage:76, created_at:'2026-06-28T10:20:00', duration_seconds:4280 },
 { id:'a2', student:'ธนกฤต ใฝ่รู้', exam:'Mock Up Test ชุดที่ 1', score:34, total:50, percentage:68, created_at:'2026-06-27T13:10:00' },
 { id:'a3', student:'ปภาวี พัฒนา', exam:'Mock Up Test ชุดที่ 2', score:41, total:50, percentage:82, created_at:'2026-06-26T16:30:00' },
]
