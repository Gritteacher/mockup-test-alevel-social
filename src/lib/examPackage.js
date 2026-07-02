export const examTypes = {
  mock: "Mock Test",
  practice: "แบบฝึกฝน",
  quiz: "แบบทดสอบย่อย",
  timed: "ข้อสอบจับเวลา",
};

export const subjects = ["ศาสนา", "หน้าที่พลเมือง", "เศรษฐศาสตร์", "ประวัติศาสตร์", "ภูมิศาสตร์", "แบบรวมสาระ"];
export const difficulties = ["ง่าย", "ปานกลาง", "ยาก", "ผสม"];
export const statuses = { draft: "ฉบับร่าง", published: "เผยแพร่", inactive: "ปิดใช้งาน" };
export const answerReveals = { immediate: "แสดงเฉลยทันที", after_submit: "แสดงหลังส่งข้อสอบ" };

export const fieldGuide = {
  title: "ชื่อชุดข้อสอบที่แสดงให้นักเรียนเห็น",
  description: "รายละเอียดหรือวัตถุประสงค์ของชุดข้อสอบ",
  exam_type: {
    description: "ประเภทของชุดข้อสอบ",
    options: examTypes,
  },
  subject: {
    description: "สาระหลักของข้อสอบ เลือกแบบรวมสาระเมื่อมีหลายสาระในชุดเดียว",
    options: subjects,
  },
  difficulty: {
    description: "ระดับความยากโดยรวมของชุดข้อสอบ",
    options: difficulties,
  },
  duration_minutes: "เวลาทำข้อสอบ หน่วยเป็นนาที",
  quota_cost: "จำนวน Mock Quota ที่ใช้ เริ่มแบบฝึกฝนควรกำหนดเป็น 0",
  passing_score: "คะแนนผ่านในรูปเปอร์เซ็นต์ ตั้งแต่ 0 ถึง 100",
  shuffle_questions: "true เพื่อสุ่มลำดับคำถาม หรือ false เพื่อเรียงตามไฟล์",
  shuffle_choices: "true เพื่อสุ่มตัวเลือกในแต่ละข้อ หรือ false เพื่อเรียงตามไฟล์",
  answer_reveal: {
    description: "เวลาที่ระบบแสดงเฉลย",
    options: { immediate: "ทันทีหลังตอบ", after_submit: "หลังส่งข้อสอบ" },
  },
  status: {
    description: "สถานะการใช้งานของชุดข้อสอบ",
    options: statuses,
  },
  questions: {
    question: "ข้อความโจทย์",
    subject: "สาระของคำถามแต่ละข้อ",
    topic: "หัวข้อย่อย (ไม่บังคับ)",
    difficulty: "ง่าย ปานกลาง หรือยาก",
    choices: "รายการตัวเลือก 2 ถึง 5 ตัวเลือก",
    correct_answer: "ตำแหน่งคำตอบที่ถูก เริ่มนับจาก 0 เช่น 0 คือตัวเลือกแรก",
    explanation: "คำอธิบายเฉลย",
  },
};

export function createExamTemplate() {
  return {
    schema_version: "1.0",
    ai_instructions: "สร้างข้อสอบตาม field_guide ห้ามลบชื่อฟิลด์ และให้ correct_answer เริ่มนับตัวเลือกจาก 0",
    field_guide: fieldGuide,
    exam: {
      title: "Mock Test A-Level ชุดที่ 1",
      description: "ข้อสอบจำลองรวมทุกสาระ",
      exam_type: "mock",
      subject: "แบบรวมสาระ",
      difficulty: "ผสม",
      duration_minutes: 90,
      quota_cost: 1,
      passing_score: 70,
      shuffle_questions: false,
      shuffle_choices: false,
      answer_reveal: "after_submit",
      status: "draft",
    },
    questions: [{
      question: "ข้อใดเป็นหน้าที่ของพลเมืองไทย",
      subject: "หน้าที่พลเมือง",
      topic: "พลเมืองดี",
      difficulty: "ปานกลาง",
      choices: ["เคารพกฎหมาย", "ละเมิดสิทธิผู้อื่น", "หลีกเลี่ยงภาษี", "ทำลายทรัพย์สินสาธารณะ", "ไม่รับผิดชอบต่อสังคม"],
      correct_answer: 0,
      explanation: "การเคารพกฎหมายเป็นหน้าที่พื้นฐานของพลเมือง",
    }],
  };
}

export function downloadJson(data, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function answerIndex(value) {
  if (Number.isInteger(value)) return value;
  const text = String(value ?? "").trim().toUpperCase();
  if (/^[A-E]$/.test(text)) return text.charCodeAt(0) - 65;
  if (/^[1-5]$/.test(text)) return Number(text) - 1;
  return -1;
}

function booleanValue(value) {
  if (typeof value === "string") return value.trim().toLowerCase() === "true";
  return Boolean(value);
}

export function parseExamPackage(text) {
  const source = JSON.parse(text);
  const exam = source.exam || source;
  const rawQuestions = source.questions || exam.questions || [];
  const settings = {
    title: String(exam.title || "").trim(),
    description: String(exam.description || "").trim(),
    exam_type: examTypes[exam.exam_type] ? exam.exam_type : "mock",
    subject: subjects.includes(exam.subject) ? exam.subject : "แบบรวมสาระ",
    difficulty: difficulties.includes(exam.difficulty) ? exam.difficulty : "ปานกลาง",
    duration_minutes: Math.max(1, Number(exam.duration_minutes || 90)),
    quota_cost: Math.max(0, Number(exam.quota_cost ?? (exam.exam_type === "practice" ? 0 : 1))),
    passing_score: Math.min(100, Math.max(0, Number(exam.passing_score ?? 70))),
    shuffle_questions: booleanValue(exam.shuffle_questions),
    shuffle_choices: booleanValue(exam.shuffle_choices),
    answer_reveal: answerReveals[exam.answer_reveal] ? exam.answer_reveal : "after_submit",
    status: statuses[exam.status] ? exam.status : "draft",
  };
  const questions = rawQuestions.map((raw, index) => {
    const choices = Array.isArray(raw.choices) ? raw.choices.map((choice) => String(choice?.text ?? choice).trim()) : [];
    const correct_index = answerIndex(raw.correct_answer ?? raw.correct_index);
    const selectedSubject = subjects.includes(raw.subject) && raw.subject !== "แบบรวมสาระ" ? raw.subject : (settings.subject === "แบบรวมสาระ" ? "" : settings.subject);
    const question = {
      row_number: index + 1,
      question_text: String(raw.question ?? raw.question_text ?? "").trim(),
      subject: selectedSubject,
      topic_id: String(raw.topic ?? raw.topic_id ?? "").trim() || null,
      difficulty: ["ง่าย", "ปานกลาง", "ยาก"].includes(raw.difficulty) ? raw.difficulty : (settings.difficulty === "ผสม" ? "ปานกลาง" : settings.difficulty),
      explanation: String(raw.explanation || "").trim(),
      choices,
      correct_index,
      errors: [],
    };
    if (!question.question_text) question.errors.push("ไม่มีข้อความคำถาม");
    if (!question.subject) question.errors.push("กรุณาระบุสาระของคำถาม");
    if (choices.length < 2 || choices.length > 5 || choices.some((choice) => !choice)) question.errors.push("ต้องมีตัวเลือก 2–5 ตัวเลือกและห้ามเว้นว่าง");
    if (correct_index < 0 || correct_index >= choices.length) question.errors.push("correct_answer ไม่ตรงกับตัวเลือก");
    return question;
  });
  const seen = new Map();
  questions.forEach((question) => {
    const key = question.question_text.replace(/\s+/g, " ").toLowerCase();
    if (!key) return;
    if (seen.has(key)) question.errors.push(`คำถามซ้ำกับข้อ ${seen.get(key)}`);
    else seen.set(key, question.row_number);
  });
  const errors = [];
  if (!settings.title) errors.push("กรุณาระบุชื่อชุดข้อสอบ");
  if (!questions.length) errors.push("ไฟล์ต้องมีคำถามอย่างน้อย 1 ข้อ");
  return { settings, questions, errors };
}
