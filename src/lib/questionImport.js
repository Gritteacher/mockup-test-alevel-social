const HEADER_ALIASES = {
  question_text: ["question_text", "question", "คำถาม", "โจทย์"],
  subject: ["subject", "สาระ", "วิชา"],
  difficulty: ["difficulty", "ระดับ", "ความยาก"],
  topic_id: ["topic_id", "topic", "หัวข้อ"],
  explanation: ["explanation", "คำอธิบาย", "เฉลยอธิบาย"],
  correct_answer: ["correct_answer", "answer", "คำตอบ", "คำตอบที่ถูก"],
  choice_a: ["choice_a", "choice a", "ตัวเลือก a", "ตัวเลือก 1"],
  choice_b: ["choice_b", "choice b", "ตัวเลือก b", "ตัวเลือก 2"],
  choice_c: ["choice_c", "choice c", "ตัวเลือก c", "ตัวเลือก 3"],
  choice_d: ["choice_d", "choice d", "ตัวเลือก d", "ตัวเลือก 4"],
  choice_e: ["choice_e", "choice e", "ตัวเลือก e", "ตัวเลือก 5"],
};

const SUBJECTS = ["ศาสนา", "หน้าที่พลเมือง", "เศรษฐศาสตร์", "ประวัติศาสตร์", "ภูมิศาสตร์"];
const DIFFICULTIES = ["ง่าย", "ปานกลาง", "ยาก"];

function clean(value) {
  return String(value ?? "").trim();
}

function normalizedRow(source) {
  const lookup = Object.fromEntries(
    Object.entries(source).map(([key, value]) => [clean(key).toLowerCase(), value]),
  );
  return Object.fromEntries(
    Object.entries(HEADER_ALIASES).map(([field, aliases]) => [
      field,
      clean(aliases.map((alias) => lookup[alias.toLowerCase()]).find((value) => value !== undefined)),
    ]),
  );
}

function answerIndex(value) {
  const normalized = clean(value).toUpperCase();
  if (/^[A-E]$/.test(normalized)) return normalized.charCodeAt(0) - 65;
  if (/^[1-5]$/.test(normalized)) return Number(normalized) - 1;
  return -1;
}

export async function parseQuestionFile(file) {
  const { read, utils } = await import("xlsx");
  const workbook = read(await file.arrayBuffer(), { type: "array", codepage: 65001 });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!worksheet) throw new Error("ไม่พบแผ่นงานในไฟล์");
  const rawRows = utils.sheet_to_json(worksheet, { defval: "", raw: false });

  return rawRows.map((source, index) => {
    const row = normalizedRow(source);
    const choices = [row.choice_a, row.choice_b, row.choice_c, row.choice_d, row.choice_e];
    const correct_index = answerIndex(row.correct_answer);
    const errors = [];
    if (!row.question_text) errors.push("ไม่มีคำถาม");
    if (!SUBJECTS.includes(row.subject)) errors.push("สาระไม่ถูกต้อง");
    if (choices.some((choice) => !choice)) errors.push("ตัวเลือกไม่ครบ 5 ข้อ");
    if (correct_index < 0) errors.push("คำตอบต้องเป็น A-E หรือ 1-5");
    if (row.difficulty && !DIFFICULTIES.includes(row.difficulty)) errors.push("ระดับไม่ถูกต้อง");
    return {
      row_number: index + 2,
      question_text: row.question_text,
      subject: row.subject,
      difficulty: row.difficulty || "ปานกลาง",
      topic_id: row.topic_id || null,
      explanation: row.explanation,
      choices,
      correct_index,
      errors,
    };
  });
}

export function downloadQuestionTemplate() {
  const header = ["คำถาม", "สาระ", "ระดับ", "หัวข้อ", "คำอธิบาย", "ตัวเลือก A", "ตัวเลือก B", "ตัวเลือก C", "ตัวเลือก D", "ตัวเลือก E", "คำตอบ"];
  const example = ["ข้อใดเป็นตัวอย่างของหน้าที่พลเมือง", "หน้าที่พลเมือง", "ปานกลาง", "พลเมืองดี", "เลือกคำตอบที่เหมาะสมที่สุด", "เคารพกฎหมาย", "ละเมิดสิทธิผู้อื่น", "ทิ้งขยะ", "ไม่รับผิดชอบ", "หลีกเลี่ยงภาษี", "A"];
  const csv = [header, example]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "question-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}
