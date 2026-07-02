import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Minus, Users, ChevronRight } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";

function walletOf(profile) {
  const relation = profile.quota_wallets;
  return (Array.isArray(relation) ? relation[0] : relation) || {};
}

export default function Students() {
  const [rows, setRows] = useState([]),
    [q, setQ] = useState("");
  useEffect(() => {
    if (isSupabaseConfigured)
      supabase
        .from("profiles")
        .select("*, quota_wallets(*)")
        .eq("role", "student")
        .then(
          ({ data }) =>
            data &&
            setRows(data.map((x) => {
              const wallet = walletOf(x);
              return {
                ...x,
                mock_quota: Number(wallet.mock_quota || 0),
                practice_points: Number(wallet.practice_points || 0),
              };
            })),
        );
  }, []);
  async function adjust(id, amount) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.rpc("admin_adjust_quota", {
        p_user_id: id,
        p_amount: amount,
        p_note: amount > 0 ? "เพิ่มโควตาโดยครู" : "ลดโควตาโดยครู",
      });
      if (error) return alert("ปรับโควตาไม่สำเร็จ: " + error.message);
    }
    setRows(
      rows.map((x) =>
        x.id === id
          ? { ...x, mock_quota: Math.max(0, (x.mock_quota || 0) + amount) }
          : x,
      ),
    );
  }
  const filtered = rows.filter((x) =>
    ((x.full_name || "") + (x.email || ""))
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  return (
    <div className="page">
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
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>นักเรียน</th>
                <th>โรงเรียน</th>
                <th>ระดับชั้น</th>
                <th>โควตา</th>
                <th>Practice Points</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((x) => (
                <tr key={x.id}>
                  <td>
                    <div className="student-cell">
                      <span className="avatar">{(x.full_name || "?")[0]}</span>
                      <div>
                        <Link className="student-name-link" to={`/admin/students/${x.id}`}>
                          {x.full_name || "ไม่ระบุชื่อ"}
                        </Link>
                        <small>{x.email || "-"}</small>
                      </div>
                    </div>
                  </td>
                  <td>{x.school || "-"}</td>
                  <td>{x.grade || "-"}</td>
                  <td>
                    <b className={(x.mock_quota || 0) < 1 ? "bad" : ""}>
                      {x.mock_quota || 0}
                    </b>
                  </td>
                  <td>{x.practice_points || 0}</td>
                  <td>
                    <div className="student-row-actions">
                      <Link
                        className="student-view-link"
                        to={`/admin/students/${x.id}`}
                        aria-label={`ดูข้อมูล ${x.full_name || "นักเรียน"}`}
                      >
                        <ChevronRight />
                      </Link>
                      <div className="quota-buttons">
                        <button
                          onClick={() => adjust(x.id, -1)}
                          title="ลดโควตา"
                        >
                          <Minus />
                        </button>
                        <button
                          onClick={() => adjust(x.id, 1)}
                          title="เพิ่มโควตา"
                        >
                          <Plus />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="empty-state">ยังไม่มีข้อมูลนักเรียน</div>
          )}
        </div>
      </div>
    </div>
  );
}
