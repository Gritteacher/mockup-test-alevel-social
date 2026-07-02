import { useEffect, useState } from "react";
import { Plus, Search, Pencil, Trash2, X, Save, Upload, Download, FileSpreadsheet, AlertCircle } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";
import { downloadQuestionTemplate, parseQuestionFile } from "../../lib/questionImport";
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
    [showImport, setShowImport] = useState(false),
    [importRows, setImportRows] = useState([]),
    [importFile, setImportFile] = useState(""),
    [importing, setImporting] = useState(false),
    [form, setForm] = useState(blank),
    [q, setQ] = useState("");
  async function loadQuestions() {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase
      .from("questions")
      .select("*, question_choices(*)")
      .order("created_at", { ascending: false });
    if (!data) return;
    setRows(data.map((item) => ({
      ...item,
      choices: item.question_choices?.map((choice) => choice.choice_text) || [],
      choice_ids: item.question_choices?.map((choice) => choice.id) || [],
      correct_index: item.question_choices?.findIndex((choice) => choice.is_correct) ?? 0,
    })));
  }
  useEffect(() => {
    loadQuestions();
  }, []);
  function edit(x) {
    setForm({ ...x, choices: [...x.choices] });
    setShow(true);
  }
  async function save(e) {
    e.preventDefault();
    if (!form.question_text || form.choices.length !== 5 || form.choices.some((x) => !x.trim()))
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
      if (!form.id) {
        const { error: choiceError } = await supabase
          .from("question_choices")
          .insert(
            form.choices.map((choice_text, i) => ({
              question_id: data.id,
              choice_text,
              is_correct: i === Number(form.correct_index),
            })),
          );
        if (choiceError) {
          await supabase.from("questions").delete().eq("id", data.id);
          return alert("บันทึกตัวเลือกไม่สำเร็จ");
        }
      } else {
        const updates = form.choices.map((choice_text, i) =>
          supabase.from("question_choices").update({
            choice_text,
            is_correct: i === Number(form.correct_index),
          }).eq("id", form.choice_ids[i]),
        );
        const results = await Promise.all(updates);
        if (results.some((result) => result.error)) return alert("บันทึกตัวเลือกไม่สำเร็จ");
      }
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
    if (isSupabaseConfigured) {
      const { error } = await supabase.from("questions").delete().eq("id", id);
      if (error) return alert("ลบคำถามไม่ได้ เพราะคำถามนี้อาจมีประวัติการใช้งานอยู่");
    }
    setRows(rows.filter((x) => x.id !== id));
  }
  async function chooseImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportFile(file.name);
    try {
      setImportRows(await parseQuestionFile(file));
    } catch (error) {
      setImportRows([]);
      alert(error.message || "อ่านไฟล์ไม่สำเร็จ");
    }
    event.target.value = "";
  }
  async function importQuestions() {
    const validRows = importRows.filter((row) => row.errors.length === 0);
    if (!validRows.length || importRows.some((row) => row.errors.length)) return;
    setImporting(true);
    const questionPayload = validRows.map((row) => ({
      question_text: row.question_text,
      subject: row.subject,
      topic_id: row.topic_id,
      difficulty: row.difficulty,
      explanation: row.explanation,
    }));
    const { data: inserted, error } = await supabase.from("questions").insert(questionPayload).select("id");
    if (error || !inserted) {
      setImporting(false);
      return alert("นำเข้าคำถามไม่สำเร็จ");
    }
    const choicePayload = inserted.flatMap((question, rowIndex) =>
      validRows[rowIndex].choices.map((choice_text, choiceIndex) => ({
        question_id: question.id,
        choice_text,
        is_correct: choiceIndex === validRows[rowIndex].correct_index,
      })),
    );
    const { error: choiceError } = await supabase.from("question_choices").insert(choicePayload);
    if (choiceError) {
      await supabase.from("questions").delete().in("id", inserted.map((item) => item.id));
      setImporting(false);
      return alert("นำเข้าตัวเลือกไม่สำเร็จ ระบบยกเลิกข้อมูลชุดนี้แล้ว");
    }
    await loadQuestions();
    setImporting(false);
    setShowImport(false);
    setImportRows([]);
    setImportFile("");
    alert(`นำเข้าสำเร็จ ${inserted.length} คำถาม`);
  }
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Question Bank</span>
          <h1>คลังคำถาม</h1>
          <p>สร้างและจัดการโจทย์สำหรับนำไปจัดชุดข้อสอบ</p>
        </div>
        <div className="heading-actions">
          <button className="button ghost" onClick={() => setShowImport(true)}><Upload />นำเข้าจากไฟล์</button>
          <button className="button primary" onClick={() => { setForm(blank); setShow(true); }}><Plus />เพิ่มคำถาม</button>
        </div>
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
      {showImport && (
        <div className="modal-backdrop">
          <section className="modal import-modal">
            <header>
              <div><h2>นำเข้าคำถามจากไฟล์</h2><p>รองรับ Excel (.xlsx, .xls) และ CSV</p></div>
              <button type="button" onClick={() => setShowImport(false)}><X /></button>
            </header>
            <div className="import-help">
              <FileSpreadsheet />
              <div><b>เตรียมไฟล์ตามหัวข้อตัวอย่าง</b><span>คำถาม, สาระ, ระดับ, หัวข้อ, คำอธิบาย, ตัวเลือก A-E และคำตอบ</span></div>
              <button className="button ghost" type="button" onClick={downloadQuestionTemplate}><Download />ไฟล์ตัวอย่าง</button>
            </div>
            <label className="file-drop">
              <Upload /><b>{importFile || "เลือกไฟล์ข้อสอบ"}</b><span>คลิกเพื่อเลือก .xlsx, .xls หรือ .csv</span>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={chooseImportFile} />
            </label>
            {importRows.length > 0 && <>
              <div className="import-summary">
                <span className="good">พร้อมนำเข้า {importRows.filter((row) => !row.errors.length).length} ข้อ</span>
                <span className={importRows.some((row) => row.errors.length) ? "bad" : ""}>ต้องแก้ไข {importRows.filter((row) => row.errors.length).length} แถว</span>
              </div>
              <div className="import-preview">
                {importRows.slice(0, 8).map((row) => <div key={row.row_number} className={row.errors.length ? "has-error" : ""}>
                  <span>แถว {row.row_number}</span><b>{row.question_text || "ไม่มีคำถาม"}</b>
                  {row.errors.length ? <small><AlertCircle />{row.errors.join(" · ")}</small> : <small>{row.subject} · คำตอบ {String.fromCharCode(65 + row.correct_index)}</small>}
                </div>)}
                {importRows.length > 8 && <p>และอีก {importRows.length - 8} แถว</p>}
              </div>
            </>}
            <footer>
              <button type="button" className="button ghost" onClick={() => setShowImport(false)}>ยกเลิก</button>
              <button type="button" className="button primary" disabled={importing || !importRows.length || importRows.some((row) => row.errors.length)} onClick={importQuestions}>{importing ? "กำลังนำเข้า…" : `นำเข้า ${importRows.length || 0} คำถาม`}</button>
            </footer>
          </section>
        </div>
      )}
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
