function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
}

function fitText(ctx, text, maxWidth, startSize, weight = 700) {
  let size = startSize;
  do {
    ctx.font = `${weight} ${size}px Prompt, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 2;
  } while (size > 28);
  return size;
}

export async function createResultStory(result) {
  await document.fonts?.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  const navy = "#14213d";
  const muted = "#64748b";
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
  gradient.addColorStop(0, "#f8fafc");
  gradient.addColorStop(1, "#e8eef7");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1920);

  ctx.fillStyle = navy;
  ctx.beginPath();
  ctx.arc(540, -110, 690, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.07)";
  ctx.beginPath();
  ctx.arc(900, 130, 250, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "600 36px Prompt, sans-serif";
  ctx.fillText("MOCK UP TEST", 540, 120);
  ctx.font = "400 28px Prompt, sans-serif";
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText("A-Level สังคม By ครูไต๋", 540, 170);

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(540, 315, 76, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = navy;
  ctx.font = "700 62px Prompt, sans-serif";
  ctx.fillText("✓", 540, 337);

  const passed = Number(result.percentage || 0) >= Number(result.passing_score ?? 70);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 58px Prompt, sans-serif";
  ctx.fillText(passed ? "ยอดเยี่ยมมาก!" : "เก่งขึ้นอีกก้าวแล้ว!", 540, 465);
  ctx.font = "400 30px Prompt, sans-serif";
  ctx.fillStyle = "#dbe4f0";
  ctx.fillText(result.student_name || "นักเรียนคนเก่ง", 540, 520);

  ctx.fillStyle = "#ffffff";
  roundedRect(ctx, 100, 650, 880, 730, 48);
  ctx.fillStyle = navy;
  ctx.font = "500 28px Prompt, sans-serif";
  ctx.fillText("คะแนนของฉัน", 540, 760);
  ctx.font = "700 190px Prompt, sans-serif";
  ctx.fillText(String(result.percentage || 0), 540, 980);
  ctx.font = "500 38px Prompt, sans-serif";
  ctx.fillStyle = muted;
  ctx.fillText("/ 100", 540, 1040);

  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(180, 1100);
  ctx.lineTo(900, 1100);
  ctx.stroke();

  const stats = [
    [String(result.score || 0), "ตอบถูก"],
    [String(Math.max(0, Number(result.total || 0) - Number(result.score || 0))), "ตอบผิด"],
    [`${Math.floor(Number(result.duration_seconds || 0) / 60)}`, "นาที"],
  ];
  stats.forEach(([value, label], index) => {
    const x = 270 + index * 270;
    ctx.fillStyle = navy;
    ctx.font = "700 50px Prompt, sans-serif";
    ctx.fillText(value, x, 1205);
    ctx.fillStyle = muted;
    ctx.font = "400 24px Prompt, sans-serif";
    ctx.fillText(label, x, 1250);
  });

  const title = result.exam_title || "Mock Up Test A-Level สังคม";
  fitText(ctx, title, 760, 36, 600);
  ctx.fillStyle = navy;
  ctx.fillText(title, 540, 1320);

  ctx.fillStyle = navy;
  roundedRect(ctx, 150, 1490, 780, 105, 52);
  ctx.fillStyle = "#ffffff";
  ctx.font = "600 28px Prompt, sans-serif";
  ctx.fillText(passed ? `ผ่านเกณฑ์ ${result.passing_score ?? 70}%` : "วันนี้ทำเต็มที่แล้ว พรุ่งนี้เก่งขึ้นอีก", 540, 1557);

  ctx.fillStyle = muted;
  ctx.font = "400 24px Prompt, sans-serif";
  ctx.fillText("ฝึกฝนวันนี้ เพื่อเป้าหมายที่ใกล้ขึ้นทุกวัน", 540, 1740);
  ctx.fillStyle = navy;
  ctx.font = "600 24px Prompt, sans-serif";
  ctx.fillText("socup.grits.online", 540, 1795);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 1));
  return { blob, url: URL.createObjectURL(blob) };
}

export function downloadStory(blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `mock-test-result-${Date.now()}.png`;
  link.click();
  URL.revokeObjectURL(url);
}
