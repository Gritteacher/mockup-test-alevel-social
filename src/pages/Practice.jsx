import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  Info,
  MapPin,
  Scale,
  Star,
  TrendingUp,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

const subjects = [
  ["ศาสนา", BookOpen],
  ["หน้าที่พลเมือง", Scale],
  ["เศรษฐศาสตร์", TrendingUp],
  ["ประวัติศาสตร์", Clock3],
  ["ภูมิศาสตร์", MapPin],
];

export default function Practice() {
  const [points, setPoints] = useState(0);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return setLoading(false);
      const [walletResult, setResult] = await Promise.all([
        supabase
          .from("quota_wallets")
          .select("practice_points")
          .eq("user_id", session.user.id)
          .single(),
        supabase
          .from("exam_sets")
          .select("id,subject")
          .eq("exam_type", "practice")
          .eq("status", "published"),
      ]);
      const nextCounts = {};
      (setResult.data || []).forEach((set) => {
        nextCounts[set.subject] = (nextCounts[set.subject] || 0) + 1;
      });
      setPoints(Number(walletResult.data?.practice_points || 0));
      setCounts(nextCounts);
      setLoading(false);
    })();
  }, []);

  return <div className="page practice-page">
    <div className="page-heading"><div>
      <span className="eyebrow">Practice Mode</span>
      <h1>ฝึกทำโจทย์</h1>
      <p>เลือกสาระ แล้วเลือกชุดแบบฝึกฝนที่ต้องการทำ</p>
    </div></div>
    <section className="practice-points-card">
      <span>Practice Points ของคุณ</span>
      <b>{points} pts <Star /></b>
      <i><u style={{ width: `${Math.min(100, points)}%` }} /></i>
      <small>อีก {points ? 100 - points : 100} คะแนน รับ Mock Quota 1 ครั้ง</small>
    </section>
    <div className="practice-info"><Info /> ตอบได้ครั้งเดียวต่อข้อในแต่ละรอบ · ต้องทำครบชุดจึงเริ่มรอบใหม่ได้</div>
    <h2 className="practice-title">เลือกสาระที่ต้องการฝึก</h2>
    <div className="practice-grid practice-subject-grid">
      {subjects.map(([subject, Icon]) => <Link
        className="practice-subject-card"
        to={`/practice/${encodeURIComponent(subject)}`}
        key={subject}
      >
        <span className="subject-icon"><Icon /></span>
        <div><h2>{subject}</h2><p>{loading ? "กำลังโหลด…" : `${counts[subject] || 0} ชุดแบบฝึกฝน`}</p></div>
        <ArrowRight />
      </Link>)}
    </div>
  </div>;
}
