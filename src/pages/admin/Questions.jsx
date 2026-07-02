import { useEffect, useState } from "react";
import { Plus, Search, Pencil, Trash2, X, Save } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";
const subjects = ["ศาสนา", "หน้าที่พลเมือง", "เศรษฐศาสตร์", "ประวัติศาสตร์", "ภูมิศาสตร์"];
const blank = {
  question_text: "",
  subject: "ศาสนา",
  topic_id: "",
  difficulty: "ปานกลาง",
  explanation: "",
  choices: ["", "", "", "", ""],
  correct_index: 0,
};
export default function Questions() {
  const [rows, setRows] = useState([]),
    [show, setShow] = useState(false),
    [form, setForm] = useState(blank),
    [q, setQ] = useState("");
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from("questions")
      .select("*, question_choices(*)")
      .then(({ data }) => {
        if (!data) return;
        setRows(
          data.map((item) => ({
            ...item,
            choices: item.question_choices?.map((choice) => choice.choice_text) || [],
            correct_index: item.question_choices?.findIndex((choice) => choice.is_correct) ?? 0,
          })),
        );
      });
  }, []);
  function edit(x) {
    setForm({ ...x, choices: [...x.choices] });
    setShow(true);
  }
  async function save(e) {
    e.preventDefault();
    if (!form.question_text || form.choices.some((x) => !x.trim()))
      return alert("กรุณากรอกคำถามและตัวเลือกให้ครบ");
    if (isSupabaseConfigured) {
      const payload = {
        question_text: form.question_text,
        subject: form.subject,
        subject_id: form.subject_id || null,
        topic_id: form.topic_id || null,
        difficulty: form.difficulty,
        explanation: form.explanation,
      };
      const { data, error } = form.id
        ? await supabase
            .from("questions")
            .update(payload)
            .eq("id", form.id)
            .select()
            .single()
        : await supabase.from("questions").insert(payload).select().single();
      if (error) return alert("บันทึกไม่สำเร็จ");
      if (!form.id)
        await supabase
          .from("question_choices")
          .insert(
            form.choices.map((choice_text, i) => ({
              question_id: data.id,
              choice_text,
              is_correct: i === Number(form.correct_index),
            })),
          );
    }
    const item = { ...form, id: form.id || `q${Date.now()}` };
    setRows(
      form.id
        ? rows.map((x) => (x.id === form.id ? item : x))
        : [item, ...rows],
    );
    setShow(false);
    setForm(blank);
  }
  async function remove(id) {
    if (!confirm("ยืนยันการลบคำถามนี้?")) return;
    if (isSupabaseConfigured)
      await supabase.from("questions").delete().eq("id", id);
    setRows(rows.filter((x) => x.id !== id));
  }
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Question Bank</span>
          <h1>คลังคำถาม</h1>
          <p>สร้างและจัดการโจทย์สำหรับนำไปจัดชุดข้อสอบ</p>
        </div>
        <button
          className="button primary"
          onClick={() => {
            setForm(blank);
            setShow(true);
          }}
        >
          <Plus />
          เพิ่มคำถาม
        </button>
      </div>
      <div className="panel table-panel">
        <div className="table-toolbar">
          <label className="search">
            <Search />
            <input
              placeholder="ค้นหาคำถาม…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <span>{rows.length} คำถาม</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>คำถาม</th>
                <th>สาระ</th>
                <th>ระดับ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .filter((x) => x.question_text.includes(q))
                .map((x) => (
                  <tr key={x.id}>
                    <td className="question-cell">{x.question_text}</td>
                    <td>
                      <span className="tag">{x.subject}</span>
                    </td>
                    <td>{x.difficulty}</td>
                    <td>
                      <div className="row-actions">
                        <button onClick={() => edit(x)}>
                          <Pencil />
                        </button>
                        <button
                          className="danger-icon"
                          onClick={() => remove(x.id)}
                        >
                          <Trash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {rows.filter((item) => item.question_text.includes(q)).length === 0 && (
            <div className="empty-state">ยังไม่มีคำถามในคลัง</div>
          )}
        </div>
      </div>
      {show && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={save}>
            <header>
              <div>
                <h2>{form.id ? "แก้ไขคำถาม" : "เพิ่มคำถามใหม่"}</h2>
                <p>กรอกข้อมูลและกำหนดคำตอบที่ถูกต้อง</p>
              </div>
              <button type="button" onClick={() => setShow(false)}>
                <X />
              </button>
            </header>
            <label>
              <span>โจทย์คำถาม</span>
              <textarea
                rows="3"
                value={form.question_text}
                onChange={(e) =>
                  setForm({ ...form, question_text: e.target.value })
                }
              />
            </label>
            <div className="form-grid">
              <label>
                <span>สาระ</span>
                <select
                  value={form.subject}
                  onChange={(e) =>
                    setForm({ ...form, subject: e.target.value })
                  }
                >
                  {subjects.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>ระดับความยาก</span>
                <select
                  value={form.difficulty}
                  onChange={(e) =>
                    setForm({ ...form, difficulty: e.target.value })
                  }
                >
                  <option>ง่าย</option>
                  <option>ปานกลาง</option>
                  <option>ยาก</option>
                </select>
              </label>
              <label>
                <span>Topic ID</span>
                <input
                  value={form.topic_id || ""}
                  onChange={(e) =>
                    setForm({ ...form, topic_id: e.target.value })
                  }
                />
              </label>
            </div>
            <fieldset>
              <legend>ตัวเลือก (เลือกวงกลมหน้าคำตอบที่ถูก)</legend>
              {form.choices.map((c, i) => (
                <div className="choice-input" key={i}>
                  <input
                    type="radio"
                    name="correct"
                    checked={Number(form.correct_index) === i}
                    onChange={() => setForm({ ...form, correct_index: i })}
                  />
                  <span>{String.fromCharCode(65 + i)}</span>
                  <input
                    value={c}
                    onChange={(e) => {
                      const choices = [...form.choices];
                      choices[i] = e.target.value;
                      setForm({ ...form, choices });
                    }}
                  />
                </div>
              ))}
            </fieldset>
            <label>
              <span>คำอธิบายเฉลย</span>
              <textarea
                rows="3"
                value={form.explanation}
                onChange={(e) =>
                  setForm({ ...form, explanation: e.target.value })
                }
              />
            </label>
            <footer>
              <button
                type="button"
                className="button ghost"
                onClick={() => setShow(false)}
              >
                ยกเลิก
              </button>
              <button className="button primary">
                <Save />
                บันทึกคำถาม
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
