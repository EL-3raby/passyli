/**
 * Passyli Match Bill Image Generator & Mobile Share Utility
 * Generates an authentic, high-resolution (Retina 2x) branded match receipt card
 * with squad cost-splitting breakdown to share as an image directly via WhatsApp / Web Share API.
 */

export interface MatchBillData {
  venueName: string;
  courtName: string;
  sport: "padel" | "football";
  bookerName: string;
  bookerPhone: string;
  displayDate: string;
  dayLabel: string;
  slotTime: string;
  durationMinutes: number;
  totalPrice: number;
  depositPaid: number;
  cashRemaining: number;
  playersCount: number;
  cashPerPlayer: number;
  totalPerPlayer: number;
  bookingRef: string;
}

export interface GeneratedBillResult {
  blob: Blob;
  file: File;
  dataUrl: string;
}

/**
 * Draws and generates the official match bill invoice as a PNG Blob and File
 */
export async function generateMatchBillBlob(data: MatchBillData): Promise<GeneratedBillResult> {
  if (typeof window === "undefined") {
    throw new Error("Canvas can only be rendered in browser environment");
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not acquire 2D canvas context");

  // High-Resolution 2x Retina dimensions (800x1120)
  const W = 800;
  const H = 1120;
  canvas.width = W;
  canvas.height = H;

  // 1. Canvas Dark Luxury Canvas Background
  ctx.fillStyle = "#111114";
  ctx.fillRect(0, 0, W, H);

  // Subtle Emerald Ambient Glow at top
  const ambientGlow = ctx.createLinearGradient(0, 0, W, 320);
  ambientGlow.addColorStop(0, "rgba(16, 185, 129, 0.12)");
  ambientGlow.addColorStop(1, "rgba(17, 17, 20, 0)");
  ctx.fillStyle = ambientGlow;
  ctx.fillRect(0, 0, W, 320);

  // Outer Border with rounded corners
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 3;
  drawRoundRect(ctx, 24, 24, W - 48, H - 48, 28);
  ctx.stroke();

  // 2. Brand Header (Top Bar)
  ctx.direction = "rtl";
  ctx.textAlign = "right";

  // The Speed P Square Badge
  ctx.fillStyle = "#10b981";
  drawRoundRect(ctx, W - 80, 52, 44, 44, 12);
  ctx.fill();
  ctx.fillStyle = "#000000";
  ctx.font = "900 24px var(--font-inter), Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("P", W - 58, 83);

  // Passyli Arabic Wordmark (باصيلي)
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.font = "900 30px var(--font-alexandria), Alexandria, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("باصي\u200D", W - 95, 83);
  const wordWidth = ctx.measureText("باصي\u200D").width;
  ctx.fillStyle = "#10b981";
  ctx.fillText("\u200Dلي", W - 95 - wordWidth, 83);

  // Official Status Badge (Left Side)
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
  drawRoundRect(ctx, 48, 54, 184, 40, 20);
  ctx.fill();
  ctx.strokeStyle = "rgba(16, 185, 129, 0.45)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Status Dot + Text
  ctx.fillStyle = "#10b981";
  ctx.beginPath();
  ctx.arc(68, 74, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = "bold 15px var(--font-ibm-plex), 'IBM Plex Sans Arabic', sans-serif";
  ctx.fillStyle = "#10b981";
  ctx.fillText("تذكرة معتمدة ومؤكدة", 82, 79);

  // Separator Line
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(48, 120);
  ctx.lineTo(W - 48, 120);
  ctx.stroke();

  // 3. Title & Booking Code Row
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "bold 15px var(--font-ibm-plex), 'IBM Plex Sans Arabic', sans-serif";
  ctx.fillText("فاتورة حساب الماتش وتوزيع الفلوس للفرقة", W - 48, 158);

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 24px var(--font-alexandria), Alexandria, sans-serif";
  ctx.fillText(data.venueName, W - 48, 195);

  ctx.textAlign = "left";
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "bold 13px var(--font-ibm-plex), 'IBM Plex Sans Arabic', sans-serif";
  ctx.fillText("كود الحجز المعتمد:", 48, 158);
  ctx.fillStyle = "#10b981";
  ctx.font = "900 22px var(--font-inter), monospace";
  ctx.fillText(data.bookingRef, 48, 195);

  // 4. Match Details Card
  ctx.fillStyle = "#18181c";
  drawRoundRect(ctx, 48, 225, W - 96, 180, 20);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Card Content
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "bold 14px var(--font-ibm-plex), 'IBM Plex Sans Arabic', sans-serif";
  ctx.fillText("الكورت والرياضة:", W - 74, 265);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 17px var(--font-ibm-plex), 'IBM Plex Sans Arabic', sans-serif";
  ctx.fillText(data.courtName, W - 74, 292);

  ctx.textAlign = "left";
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "bold 14px var(--font-ibm-plex), 'IBM Plex Sans Arabic', sans-serif";
  ctx.fillText("حاجز الميعاد (الكابتن):", 74, 265);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px var(--font-ibm-plex), 'IBM Plex Sans Arabic', sans-serif";
  ctx.fillText(`${data.bookerName} (${data.bookerPhone})`, 74, 292);

  // Subtle separator inside details card
  ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  ctx.beginPath();
  ctx.moveTo(70, 315);
  ctx.lineTo(W - 70, 315);
  ctx.stroke();

  // Date and Time
  ctx.textAlign = "right";
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "bold 14px var(--font-ibm-plex), 'IBM Plex Sans Arabic', sans-serif";
  ctx.fillText("اليوم والتاريخ:", W - 74, 350);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 17px var(--font-ibm-plex), 'IBM Plex Sans Arabic', sans-serif";
  ctx.fillText(`${data.dayLabel} (${data.displayDate})`, W - 74, 377);

  ctx.textAlign = "left";
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "bold 14px var(--font-ibm-plex), 'IBM Plex Sans Arabic', sans-serif";
  ctx.fillText("ميعاد الماتش والمدة:", 74, 350);
  ctx.fillStyle = "#10b981";
  ctx.font = "bold 18px var(--font-inter), monospace";
  ctx.fillText(`${data.slotTime} (${data.durationMinutes} دقيقة)`, 74, 377);

  // 5. The Financial Settlement Card (صلب الفاتورة)
  ctx.fillStyle = "#18181c";
  drawRoundRect(ctx, 48, 435, W - 96, 440, 20);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Header of Breakdown Card
  ctx.textAlign = "right";
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 19px var(--font-alexandria), Alexandria, sans-serif";
  ctx.fillText("حسبة الفلوس وتقسيم الحساب على الفرقة", W - 74, 480);

  // Table Rows
  drawBillRow(ctx, "إجمالي إيجار الملعب:", `${data.totalPrice} ج.م`, W, 525, "#ffffff", "#ffffff");
  drawBillRow(ctx, "العربون المدفوع مسبقاً (تم التحويل):", `${data.depositPaid} ج.م`, W, 565, "#a1a1aa", "#10b981");
  drawBillRow(ctx, "المتبقي كاش لإدارة الملعب:", `${data.cashRemaining} ج.م`, W, 605, "#ffffff", "#ffffff", true);
  drawBillRow(ctx, "عدد لاعبي الفرقة المقسم عليهم:", `${data.playersCount} لاعبين (${data.sport === "padel" ? "بادل 2v2" : "خماسي 5v5"})`, W, 645, "#a1a1aa", "#ffffff");

  // Highlight Box: Cash per Player
  ctx.fillStyle = "rgba(16, 185, 129, 0.1)";
  drawRoundRect(ctx, 68, 680, W - 136, 155, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(16, 185, 129, 0.55)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = "right";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 17px var(--font-ibm-plex), 'IBM Plex Sans Arabic', sans-serif";
  ctx.fillText("المطلوب من كل لاعب يجهزه كاش في الملعب:", W - 94, 725);

  ctx.fillStyle = "#a1a1aa";
  ctx.font = "13px var(--font-ibm-plex), 'IBM Plex Sans Arabic', sans-serif";
  ctx.fillText("(المبلغ الكاش المتبقي ÷ عدد اللاعبين)", W - 94, 750);

  // Big Bold Per-Player Price
  ctx.textAlign = "left";
  ctx.fillStyle = "#10b981";
  ctx.font = "900 44px var(--font-alexandria), Inter, sans-serif";
  ctx.fillText(`${data.cashPerPlayer} ج.م`, 94, 768);

  // Sub-note for total player share
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.font = "bold 13.5px var(--font-ibm-plex), 'IBM Plex Sans Arabic', sans-serif";
  ctx.fillText(`* إجمالي نصيب اللاعب في الساعة كاملة (شامل العربون): ${data.totalPerPlayer} ج.م`, W - 94, 810);

  // Perforated Line
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(48, 905);
  ctx.lineTo(W - 48, 905);
  ctx.stroke();
  ctx.setLineDash([]); // Reset line dash

  // 6. Security Barcode Indicator
  const barcodeY = 940;
  const barCount = 48;
  const barWidthTotal = W - 200;
  const barXStart = 100;
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < barCount; i++) {
    const bw = (i % 5 === 0) ? 4 : (i % 3 === 0) ? 2.5 : 1.5;
    const bx = barXStart + (i * (barWidthTotal / barCount));
    ctx.fillRect(bx, barcodeY, bw, 36);
  }

  // Security Hash
  ctx.textAlign = "center";
  ctx.fillStyle = "#71717a";
  ctx.font = "bold 12px var(--font-inter), monospace";
  ctx.fillText(`PASSYLI-VERIFIED-TICKET • ${data.bookingRef} • SECURE PROTOCOL`, W / 2, 1000);

  // Footer Tagline
  ctx.fillStyle = "#10b981";
  ctx.font = "bold 14px var(--font-alexandria), Alexandria, sans-serif";
  ctx.fillText("احجز ملعبك، كمّل ماتشك — باصيلي دمنهور والبحيرة", W / 2, 1045);

  ctx.fillStyle = "#52525b";
  ctx.font = "12px var(--font-ibm-plex), 'IBM Plex Sans Arabic', sans-serif";
  ctx.fillText("يرجى من كل لاعب تجهيز الفكة كاش لسرعة تسليم الإدارة", W / 2, 1070);

  // Return generated Blob and File
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas toBlob failed"));
          return;
        }
        const fileName = `passyli-bill-${data.bookingRef}.png`;
        const file = new File([blob], fileName, { type: "image/png" });
        const dataUrl = canvas.toDataURL("image/png");
        resolve({ blob, file, dataUrl });
      },
      "image/png",
      0.95
    );
  });
}

function drawBillRow(
  ctx: CanvasRenderingContext2D,
  label: string,
  val: string,
  W: number,
  y: number,
  labelCol: string,
  valCol: string,
  isBold = false
) {
  ctx.textAlign = "right";
  ctx.fillStyle = labelCol;
  ctx.font = isBold
    ? "bold 16px var(--font-ibm-plex), 'IBM Plex Sans Arabic', sans-serif"
    : "15px var(--font-ibm-plex), 'IBM Plex Sans Arabic', sans-serif";
  ctx.fillText(label, W - 74, y);

  ctx.textAlign = "left";
  ctx.fillStyle = valCol;
  ctx.font = isBold
    ? "900 18px var(--font-inter), monospace"
    : "bold 16px var(--font-inter), monospace";
  ctx.fillText(val, 74, y);
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Downloads the bill image file to user device
 */
export function downloadBillImage(blob: Blob, bookingRef: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `فاتورة-ماتش-باصيلي-${bookingRef}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
