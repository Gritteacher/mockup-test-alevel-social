# Mock Up Test A-Level สังคม By ครูไต๋

เว็บแอป React + Vite สำหรับจำลองสอบ A-Level สังคม พร้อมระบบนักเรียนและแอดมิน

## เริ่มใช้งาน

```bash
npm install
cp .env.example .env
npm run dev
```

ใส่ `VITE_SUPABASE_ANON_KEY` ใน `.env` เพื่อเชื่อมฐานข้อมูลจริง หากยังไม่ใส่ค่า ระบบจะเปิดด้วยข้อมูลตัวอย่างสำหรับทดลอง UI และ flow ทั้งหมด

Supabase project URL ที่ตั้งไว้แล้ว:

```env
VITE_SUPABASE_URL=https://afrjifttnrjrsnxoqpdx.supabase.co
```

## ตั้งค่า Supabase

1. เปิด Supabase SQL Editor
2. Run ไฟล์ `supabase/schema.sql`
3. เปิด Authentication → Providers → Google แล้วตั้งค่า Gmail OAuth
4. เพิ่ม Redirect URL:
   - `http://localhost:5173/student/dashboard`
   - `https://YOUR-NETLIFY-SITE.netlify.app/student/dashboard`
5. Login เป็นบัญชีครู 1 ครั้ง แล้ว run SQL นี้เพื่อให้เข้า admin ได้:

```sql
update public.profiles
set role = 'teacher'
where email = 'YOUR_GMAIL_HERE';
```

## Deploy Netlify

โปรเจกต์นี้เตรียม `netlify.toml` ไว้แล้ว ให้ Connect repo นี้ใน Netlify แล้วใช้ค่า default ได้เลย:

- Build command: `npm run build`
- Publish directory: `dist`

ต้องเพิ่ม Environment variable ใน Netlify:

```text
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

หลัง deploy ครั้งแรก ให้นำ URL ของ Netlify ไปเพิ่มใน Supabase Auth Redirect URLs:

```text
https://YOUR-NETLIFY-SITE.netlify.app/student/dashboard
```

RPC ที่ต้องมีในโปรเจกต์ฐานข้อมูลคือ `start_mock_attempt` และ `admin_adjust_quota` ตามพารามิเตอร์ที่ระบุในโค้ด
