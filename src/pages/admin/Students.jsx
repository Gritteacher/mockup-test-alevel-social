import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Minus, Users, ChevronRight, School, GraduationCap, Star, Ticket } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";

function walletOf(profile) {
  const relation = profile.quota_wallets;
  return (Array.isArray(relation) ? relation[0] : relation) || {};
}

export default function Students() {
  const [rows, setRows] = useState([]),
    [q, setQ] = useState(""),
    [loading, setLoading] = useState(true),
    [adjustingId, setAdjustingId] = useState("");
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    supabase
        .from("profiles")
        .select("*, quota_wallets(*)")
        .eq("role", "student")
        .order("full_name", { ascending: true })
        .then(
          ({ data }) =>
            setRows((data || []).map((x) => {
              const wallet = walletOf(x);
              return {
                ...x,
                mock_quota: Number(wallet.mock_quota || 0),
                practice_points: Number(wallet.practice_points || 0),
              };
            })),
        )
        .finally(() => setLoading(false));
  }, []);
  async function adjust(id, amount) {
    if (adjustingId) return;
    const student = rows.find((item) => item.id === id);
    if (amount < 0 && Number(student?.mock_quota || 0) === 0) return;
    setAdjustingId(id);
    if (isSupabaseConfigured) {
      const { error } = await supabase.rpc("admin_adjust_quota", {
        p_user_id: id,
        p_amount: amount,
        p_note: amount > 0 ? "เพิ่มโควตาโดยครู" : "ลดโควตาโดยครู",
      });
      if (error) {
        setAdjustingId("");
        return alert("ปรับโควตาไม่สำเร็จ: " + error.message);
      }
    }
    setRows(
      rows.map((x) =>
        x.id === id
          ? { ...x, mock_quota: Math.max(0, (x.mock_quota || 0) + amount) }
          : x,
      ),
    );
    setAdjustingId("");
  }
  const filtered = rows.filter((x) =>
    [x.full_name, x.nickname, x.email, x.school, x.grade, x.room].filter(Boolean).join(" ")
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  const initials = (student) => (student.full_name || student.email || "?")
    .split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2);
  return (
    <div className="page students-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">จัดการผู้เรียน</span>
          <h1>นักเรียน</h1>
          <p>ดูข้อมูลและจัดการโควตาของนักเรียนทั้งหมด</p>
        </div>
        <span className="count-badge">
          <Users />
          {rows.length} คน
        </span>
      </div>
      <div className="panel table-panel">
        <div className="table-toolbar">
          <label className="search">
            <Search />
            <input
              placeholder="ค้นหาชื่อหรืออีเมล…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <span className="student-result-count">แสดง {filtered.length} จาก {rows.length} คน</span>
        </div>
        <div className="table-scroll students-desktop-table">
          <table>
            <thead>
              <tr>
                <th>นักเรียน</th>
                <th>โรงเรียน / ชั้น</th>
                <th>โควตา</th>
                <th>Practice Points</th>
                <th aria-label="ดูรายละเอียด"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((x) => (
                <tr key={x.id}>
                  <td>
                    <div className="student-cell">
                      <span className="avatar">{initials(x)}</span>
                      <div>
                        <Link className="student-name-link" to={`/admin/students/${x.id}`}>
                          {x.full_name || "ไม่ระบุชื่อ"}
                        </Link>
                        <small>{x.email || "-"}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="student-school"><b>{x.school || "ยังไม่ระบุโรงเรียน"}</b><span>{[x.grade, x.room].filter(Boolean).join(" / ") || "ยังไม่ระบุชั้นเรียน"}</span></div>
                  </td>
                  <td>
                    <div className="quota-stepper">
                      <button onClick={() => adjust(x.id, -1)} disabled={adjustingId === x.id || x.mock_quota === 0} aria-label={`ลดโควตา ${x.full_name || "นักเรียน"}`}><Minus /></button>
                      <b className={x.mock_quota < 1 ? "bad" : ""}>{x.mock_quota}</b>
                      <button onClick={() => adjust(x.id, 1)} disabled={adjustingId === x.id} aria-label={`เพิ่มโควตา ${x.full_name || "นักเรียน"}`}><Plus /></button>
                    </div>
                  </td>
                  <td><span className="points-value"><Star />{x.practice_points}</span></td>
                  <td><Link className="student-view-link" to={`/admin/students/${x.id}`} aria-label={`ดูข้อมูล ${x.full_name || "นักเรียน"}`}><ChevronRight /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="students-mobile-list">
          {filtered.map((x) => <article className="student-mobile-card" key={x.id}>
            <header><span className="avatar">{initials(x)}</span><div><b>{x.full_name || "ไม่ระบุชื่อ"}</b><span>{x.email || "-"}</span></div><Link to={`/admin/students/${x.id}`} aria-label={`ดูข้อมูล ${x.full_name || "นักเรียน"}`}><ChevronRight /></Link></header>
            <div className="student-mobile-info">
              <span><School /><small>โรงเรียน</small><b>{x.school || "-"}</b></span>
              <span><GraduationCap /><small>ชั้น / ห้อง</small><b>{[x.grade, x.room].filter(Boolean).join(" / ") || "-"}</b></span>
              <span><Star /><small>Practice Points</small><b>{x.practice_points}</b></span>
            </div>
            <footer><span><Ticket />Mock Quota</span><div className="quota-stepper"><button onClick={() => adjust(x.id, -1)} disabled={adjustingId === x.id || x.mock_quota === 0} aria-label={`ลดโควตา ${x.full_name || "นักเรียน"}`}><Minus /></button><b className={x.mock_quota < 1 ? "bad" : ""}>{x.mock_quota}</b><button onClick={() => adjust(x.id, 1)} disabled={adjustingId === x.id} aria-label={`เพิ่มโควตา ${x.full_name || "นักเรียน"}`}><Plus /></button></div></footer>
          </article>)}
        </div>
        {!loading && filtered.length === 0 && <div className="empty-state">{q ? "ไม่พบนักเรียนที่ค้นหา" : "ยังไม่มีข้อมูลนักเรียน"}</div>}
        {loading && <div className="empty-state">กำลังโหลดข้อมูลนักเรียน…</div>}
      </div>
    </div>
  );
}
