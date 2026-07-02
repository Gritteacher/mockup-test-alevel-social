import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Clock3, Download, Eye, EyeOff, FileJson, ListChecks, Pencil, Save, Settings2, Upload, X } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";
import { answerReveals, createExamTemplate, difficulties, downloadJson, examTypes, fieldGuide, parseExamPackage, statuses, subjects } from "../../lib/examPackage";

const blankSettings = {
  title: "",
  description: "",
  exam_type: "mock",
  subject: "แบบรวมสาระ",
  difficulty: "ปานกลาง",
  duration_minutes: 90,
  quota_cost: 1,
  passing_score: 70,
  shuffle_questions: false,
  shuffle_choices: false,
  answer_reveal: "after_submit",
  status: "draft",
};

export default function AdminExams() {
  const [rows, setRows] = useState([]);
  const [showImport, setShowImport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [fileName, setFileName] = useState("");
  const [settings, setSettings] = useState(blankSettings);
  const [questions, setQuestions] = useState([]);
  const [packageErrors, setPackageErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const invalidQuestions = useMemo(() => questions.filter((question) => question.errors.length), [questions]);

  async function loadExams() {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase
      .from("exam_sets")
      .select("*, exam_set_questions(question_id), attempts(count)")
      .order("updated_at", { ascending: false });
    if (data) setRows(data.map((item) => ({
      ...item,
      question_count: item.exam_set_questions?.length || 0,
      attempt_count: item.attempts?.[0]?.count || 0,
    })));
  }

  useEffect(() => { loadExams(); }, []);

  function resetImport() {
    setFileName("");
    setSettings(blankSettings);
    setQuestions([]);
    setPackageErrors([]);
  }

  async function chooseFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = parseExamPackage(await file.text());
      setFileName(file.name);
      setSettings(parsed.settings);
      setQuestions(parsed.questions);
      setPackageErrors(parsed.errors);
    } catch {
      resetImport();
      alert("อ่านไฟล์ไม่ได้ กรุณาตรวจว่าเป็น JSON ที่ถูกต้อง");
    }
    event.target.value = "";
  }

  function payloadOf(value) {
    return {
      title: value.title.trim(),
      description: value.description.trim(),
      exam_type: value.exam_type,
      mode: value.exam_type === "practice" ? "practice" : "mock",
      subject: value.subject,
      difficulty: value.difficulty,
      duration_minutes: Number(value.duration_minutes),
      quota_cost: value.exam_type === "practice" ? 0 : Number(value.quota_cost),
      passing_score: Number(value.passing_score),
      shuffle_questions: value.shuffle_questions,
      shuffle_choices: value.shuffle_choices,
      answer_reveal: value.answer_reveal,
      status: value.status,
      source_format: "json",
    };
  }

  async function importExam() {
    if (!settings.title.trim() || !questions.length || invalidQuestions.length || packageErrors.length) return;
    setSaving(true);
    const { data: exam, error: examError } = await supabase.from("exam_sets").insert(payloadOf(settings)).select().single();
    if (examError || !exam) {
      setSaving(false);
      return alert("สร้างชุดข้อสอบไม่สำเร็จ กรุณาตรวจการตั้งค่าหรือลองใหม่");
    }
    const { data: insertedQuestions, error: questionError } = await supabase.from("questions").insert(questions.map((question) => ({
      question_text: question.question_text,
      subject: question.subject,
      topic_id: question.topic_id,
      difficulty: question.difficulty,
      explanation: question.explanation,
    }))).select("id");
    if (questionError || insertedQuestions?.length !== questions.length) {
      await supabase.from("exam_sets").delete().eq("id", exam.id);
      setSaving(false);
      return alert("นำเข้าคำถามไม่สำเร็จ ระบบยกเลิกชุดนี้แล้ว");
    }
    const questionIds = insertedQuestions.map((question) => question.id);
    const links = questionIds.map((question_id, index) => ({ exam_set_id: exam.id, question_id, position: index + 1 }));
    const choices = questionIds.flatMap((question_id, questionIndex) => questions[questionIndex].choices.map((choice_text, choiceIndex) => ({
      question_id,
      choice_text,
      is_correct: choiceIndex === questions[questionIndex].correct_index,
      position: choiceIndex + 1,
    })));
    const [linkResult, choiceResult] = await Promise.all([
      supabase.from("exam_set_questions").insert(links),
      supabase.from("question_choices").insert(choices),
    ]);
    if (linkResult.error || choiceResult.error) {
      await supabase.from("exam_sets").delete().eq("id", exam.id);
      await supabase.from("questions").delete().in("id", questionIds);
      setSaving(false);
      return alert("เชื่อมคำถามกับชุดข้อสอบไม่สำเร็จ ระบบยกเลิกข้อมูลชุดนี้แล้ว");
    }
    await loadExams();
    setSaving(false);
    setShowImport(false);
    resetImport();
    alert(`สร้างชุดข้อสอบสำเร็จ ${questions.length} ข้อ`);
  }

  function editSettings(item) {
    setSettings({ ...blankSettings, ...item });
    setShowSettings(true);
  }

  async function saveSettings(event) {
    event.preventDefault();
    if (!settings.title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("exam_sets").update(payloadOf(settings)).eq("id", settings.id);
    setSaving(false);
    if (error) return alert("บันทึกการตั้งค่าไม่สำเร็จ");
    await loadExams();
    setShowSettings(false);
  }

  async function exportExam(item) {
    const { data, error } = await supabase
      .from("exam_sets")
      .select("*, exam_set_questions(position, questions(*, question_choices(*)))")
      .eq("id", item.id)
      .single();
    if (error || !data) return alert("ดาวน์โหลดชุดข้อสอบไม่สำเร็จ");
    const ordered = [...(data.exam_set_questions || [])].sort((a, b) => a.position - b.position);
    downloadJson({
      schema_version: "1.0",
      ai_instructions: "แก้ไขข้อมูลตาม field_guide โดยรักษาชื่อฟิลด์และให้ correct_answer เริ่มนับจาก 0",
      field_guide: fieldGuide,
      exam: Object.fromEntries(Object.keys(blankSettings).map((key) => [key, data[key]])),
      questions: ordered.map((link) => {
        const question = link.questions;
        const choices = [...(question.question_choices || [])].sort((a, b) => a.position - b.position);
        return {
          question: question.question_text,
          subject: question.subject,
          topic: question.topic_id,
          difficulty: question.difficulty,
          choices: choices.map((choice) => choice.choice_text),
          correct_answer: choices.findIndex((choice) => choice.is_correct),
          explanation: question.explanation,
        };
      }),
    }, `${data.title.replace(/[^\p{L}\p{N}]+/gu, "-") || "exam"}.json`);
  }

  return <div className="page unified-exams-page">
    <div className="page-heading">
      <div><span className="eyebrow">Exam Manager</span><h1>จัดการข้อสอบ</h1><p>อัปโหลด ตั้งค่า และเผยแพร่ข้อสอบครบในที่เดียว</p></div>
      <div className="heading-actions">
        <button className="button ghost" onClick={() => downloadJson(createExamTemplate(), "exam-package-template.json")}><Download />ไฟล์ JSON ตัวอย่าง</button>
        <button className="button primary" onClick={() => { resetImport(); setShowImport(true); }}><Upload />อัปโหลดข้อสอบ</button>
      </div>
    </div>
    <div className="exam-manager-note"><FileJson /><div><b>หนึ่งไฟล์ JSON = หนึ่งชุดข้อสอบ</b><span>ไฟล์เดียวบรรจุข้อมูลชุด การตั้งค่า คำถาม ตัวเลือก เฉลย และคำอธิบาย</span></div></div>
    <div className="unified-exam-grid">
      {rows.length === 0 && <div className="empty-state exam-empty">ยังไม่มีชุดข้อสอบ</div>}
      {rows.map((item) => <article className="unified-exam-card" key={item.id}>
        <header><span className={`exam-type type-${item.exam_type || item.mode}`}>{examTypes[item.exam_type] || examTypes[item.mode] || "Mock Test"}</span><span className={`exam-state state-${item.status}`}>{item.status === "published" ? <Eye /> : <EyeOff />}{statuses[item.status] || item.status}</span></header>
        <h2>{item.title}</h2><p>{item.description || "ไม่มีรายละเอียด"}</p>
        <div className="exam-package-tags"><span>{item.subject || "แบบรวมสาระ"}</span><span>{item.difficulty || "ปานกลาง"}</span></div>
        <div className="exam-package-stats"><span><ListChecks /><b>{item.question_count}</b> ข้อ</span><span><Clock3 /><b>{item.duration_minutes}</b> นาที</span><span><Settings2 /><b>{item.attempt_count}</b> ครั้ง</span></div>
        <footer><button className="button ghost" onClick={() => editSettings(item)}><Pencil />ตั้งค่า</button><button className="icon-button" onClick={() => exportExam(item)} aria-label={`ดาวน์โหลด ${item.title}`}><Download /></button></footer>
      </article>)}
    </div>

    {showImport && <div className="modal-backdrop"><section className="modal exam-import-modal">
      <header><div><h2>อัปโหลดชุดข้อสอบ JSON</h2><p>ระบบจะตรวจไฟล์ก่อนบันทึกลงฐานข้อมูล</p></div><button onClick={() => setShowImport(false)}><X /></button></header>
      <label className="json-file-drop"><FileJson /><b>{fileName || "เลือกไฟล์ JSON"}</b><span>คลิกเพื่อเลือกไฟล์ .json</span><input type="file" accept="application/json,.json" onChange={chooseFile} /></label>
      {fileName && <>
        <ExamSettings settings={settings} setSettings={setSettings} />
        <div className="json-validation"><b>ตรวจพบ {questions.length} คำถาม</b><span className={invalidQuestions.length || packageErrors.length ? "bad" : "good"}>{invalidQuestions.length || packageErrors.length ? `ต้องแก้ไข ${invalidQuestions.length + packageErrors.length} จุด` : "ไฟล์พร้อมนำเข้า"}</span></div>
        {(packageErrors.length > 0 || invalidQuestions.length > 0) && <div className="json-errors">{packageErrors.map((error) => <span key={error}><AlertCircle />{error}</span>)}{invalidQuestions.slice(0, 8).map((question) => <span key={question.row_number}><AlertCircle />ข้อ {question.row_number}: {question.errors.join(" · ")}</span>)}</div>}
        {questions.length > 0 && <div className="json-question-preview">{questions.slice(0, 5).map((question) => <div key={question.row_number}><span>{question.row_number}</span><b>{question.question_text || "ไม่มีคำถาม"}</b><small>{question.subject} · {question.choices.length} ตัวเลือก</small></div>)}{questions.length > 5 && <p>และอีก {questions.length - 5} ข้อ</p>}</div>}
      </>}
      <footer><button className="button ghost" onClick={() => setShowImport(false)}>ยกเลิก</button><button className="button primary" disabled={saving || !fileName || !settings.title.trim() || !questions.length || invalidQuestions.length > 0 || packageErrors.length > 0} onClick={importExam}>{saving ? "กำลังสร้างชุดข้อสอบ…" : "สร้างชุดข้อสอบ"}</button></footer>
    </section></div>}

    {showSettings && <div className="modal-backdrop"><form className="modal exam-settings-modal" onSubmit={saveSettings}>
      <header><div><h2>ตั้งค่าชุดข้อสอบ</h2><p>การแก้ไขนี้ไม่กระทบประวัติการสอบเดิม</p></div><button type="button" onClick={() => setShowSettings(false)}><X /></button></header>
      <ExamSettings settings={settings} setSettings={setSettings} />
      <footer><button type="button" className="button ghost" onClick={() => setShowSettings(false)}>ยกเลิก</button><button className="button primary" disabled={saving}><Save />บันทึกการตั้งค่า</button></footer>
    </form></div>}
  </div>;
}

function ExamSettings({ settings, setSettings }) {
  const change = (key, value) => setSettings((current) => ({ ...current, [key]: value }));
  return <div className="exam-settings-grid">
    <label className="wide"><span>ชื่อชุดข้อสอบ</span><input value={settings.title} onChange={(event) => change("title", event.target.value)} /></label>
    <label className="wide"><span>รายละเอียด</span><textarea rows="2" value={settings.description} onChange={(event) => change("description", event.target.value)} /></label>
    <label><span>ประเภท</span><select value={settings.exam_type} onChange={(event) => change("exam_type", event.target.value)}>{Object.entries(examTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label><span>สาระ</span><select value={settings.subject} onChange={(event) => change("subject", event.target.value)}>{subjects.map((value) => <option key={value}>{value}</option>)}</select></label>
    <label><span>ระดับความยาก</span><select value={settings.difficulty} onChange={(event) => change("difficulty", event.target.value)}>{difficulties.map((value) => <option key={value}>{value}</option>)}</select></label>
    <label><span>เวลาสอบ (นาที)</span><input type="number" min="1" value={settings.duration_minutes} onChange={(event) => change("duration_minutes", event.target.value)} /></label>
    <label><span>จำนวนโควตาที่ใช้</span><input type="number" min="0" disabled={settings.exam_type === "practice"} value={settings.exam_type === "practice" ? 0 : settings.quota_cost} onChange={(event) => change("quota_cost", event.target.value)} /></label>
    <label><span>คะแนนผ่าน (%)</span><input type="number" min="0" max="100" value={settings.passing_score} onChange={(event) => change("passing_score", event.target.value)} /></label>
    <label><span>การแสดงเฉลย</span><select value={settings.answer_reveal} onChange={(event) => change("answer_reveal", event.target.value)}>{Object.entries(answerReveals).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label><span>สถานะ</span><select value={settings.status} onChange={(event) => change("status", event.target.value)}>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="toggle-setting"><input type="checkbox" checked={settings.shuffle_questions} onChange={(event) => change("shuffle_questions", event.target.checked)} /><span>สุ่มลำดับคำถาม</span></label>
    <label className="toggle-setting"><input type="checkbox" checked={settings.shuffle_choices} onChange={(event) => change("shuffle_choices", event.target.checked)} /><span>สุ่มลำดับตัวเลือก</span></label>
  </div>;
}
