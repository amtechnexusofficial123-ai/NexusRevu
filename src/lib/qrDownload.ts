const GOOGLE_BLUE = "#4285F4";
const GOOGLE_RED = "#EA4335";
const GOOGLE_YELLOW = "#FBBC05";
const GOOGLE_GREEN = "#34A853";
const INK = "#14171C";
const MUTED = "#5C6370";
const CTA_BLUE = "#1A73E8";
const BG = "#FFFFFF";

export type QrFlyerOptions = {
  businessName: string;
  logoUrl?: string | null;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

function fitLogoDimensions(
  imgWidth: number,
  imgHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (imgWidth <= 0 || imgHeight <= 0) return { width: maxWidth, height: maxHeight };
  const ratio = imgWidth / imgHeight;
  let width = maxWidth;
  let height = width / ratio;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }
  return { width, height };
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function drawGoogleRoundedBorder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  thickness: number
) {
  const r = Math.min(radius, w / 2, h / 2);
  const tl = { x: x + r, y: y + r };
  const tr = { x: x + w - r, y: y + r };
  const br = { x: x + w - r, y: y + h - r };
  const bl = { x: x + r, y: y + h - r };

  const strokeArc = (cx: number, cy: number, start: number, end: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, end);
    ctx.stroke();
  };

  strokeArc(tl.x, tl.y, Math.PI, Math.PI * 1.5, GOOGLE_BLUE);
  strokeArc(tr.x, tr.y, Math.PI * 1.5, Math.PI * 2, GOOGLE_RED);
  strokeArc(br.x, br.y, 0, Math.PI * 0.5, GOOGLE_YELLOW);
  strokeArc(bl.x, bl.y, Math.PI * 0.5, Math.PI, GOOGLE_GREEN);

  const strokeLine = (x1: number, y1: number, x2: number, y2: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.lineCap = "butt";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  strokeLine(tl.x, y, tr.x, y, GOOGLE_RED);
  strokeLine(x + w, tr.y, x + w, br.y, GOOGLE_YELLOW);
  strokeLine(br.x, y + h, bl.x, y + h, GOOGLE_GREEN);
  strokeLine(x, bl.y, x, tl.y, GOOGLE_BLUE);
}

function drawGoogleWordmark(ctx: CanvasRenderingContext2D, centerX: number, y: number, size: number) {
  const letters = [
    { char: "G", color: GOOGLE_BLUE },
    { char: "o", color: GOOGLE_RED },
    { char: "o", color: GOOGLE_YELLOW },
    { char: "g", color: GOOGLE_BLUE },
    { char: "l", color: GOOGLE_GREEN },
    { char: "e", color: GOOGLE_RED },
  ];
  ctx.font = `600 ${size}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
  const widths = letters.map((l) => ctx.measureText(l.char).width);
  const total = widths.reduce((a, b) => a + b, 0);
  let x = centerX - total / 2;
  for (let i = 0; i < letters.length; i++) {
    ctx.fillStyle = letters[i].color;
    ctx.fillText(letters[i].char, x, y);
    x += widths[i];
  }
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number
) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawStarsRow(ctx: CanvasRenderingContext2D, centerX: number, y: number, size: number) {
  const gap = size * 1.15;
  const totalW = gap * 4;
  let x = centerX - totalW / 2;
  ctx.fillStyle = GOOGLE_YELLOW;
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, x, y, size, size * 0.45);
    x += gap;
  }
}

function drawScanIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const s = size / 2;
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = size * 0.12;
  ctx.lineCap = "round";
  roundRectPath(ctx, cx - s * 0.55, cy - s * 0.7, s * 1.1, s * 1.4, s * 0.15);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.2, cy + s * 0.35);
  ctx.lineTo(cx + s * 0.2, cy + s * 0.35);
  ctx.stroke();
}

function drawFooterIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  type: "shield" | "heart"
) {
  ctx.fillStyle = CTA_BLUE;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = r * 0.22;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (type === "shield") {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.45);
    ctx.lineTo(cx + r * 0.4, cy - r * 0.15);
    ctx.lineTo(cx + r * 0.4, cy + r * 0.2);
    ctx.quadraticCurveTo(cx, cy + r * 0.55, cx - r * 0.4, cy + r * 0.2);
    ctx.lineTo(cx - r * 0.4, cy - r * 0.15);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.15, cy + r * 0.05);
    ctx.lineTo(cx - r * 0.02, cy + r * 0.22);
    ctx.lineTo(cx + r * 0.18, cy - r * 0.02);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.35);
    ctx.bezierCurveTo(cx - r * 0.5, cy + r * 0.05, cx - r * 0.35, cy - r * 0.35, cx, cy - r * 0.15);
    ctx.bezierCurveTo(cx + r * 0.35, cy - r * 0.35, cx + r * 0.5, cy + r * 0.05, cx, cy + r * 0.35);
    ctx.stroke();
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function normalizeFlyerOptions(options?: QrFlyerOptions | string | null): QrFlyerOptions {
  if (typeof options === "string" || options === null || options === undefined) {
    return { businessName: "Our business", logoUrl: typeof options === "string" ? options : null };
  }
  return options;
}

/** Renders the full review QR flyer to a canvas (shared by preview and download). */
export async function renderQrFlyerCanvas(
  qrDataUrl: string,
  options?: QrFlyerOptions | string | null
): Promise<HTMLCanvasElement> {
  const opts = normalizeFlyerOptions(options);
  const businessName = opts.businessName?.trim() || "Our business";
  const qr = await loadImage(qrDataUrl);

  let logo: HTMLImageElement | null = null;
  const trimmedLogo = opts.logoUrl?.trim();
  if (trimmedLogo) {
    try {
      logo = await loadImage(trimmedLogo);
    } catch {
      logo = null;
    }
  }

  const CARD_W = 520;
  const OUTER_BORDER = 10;
  const PAD = 28;
  const INNER_W = CARD_W - OUTER_BORDER * 2 - PAD * 2;
  const QR_SIZE = Math.min(280, INNER_W - 16);
  const BORDER_R = 22;
  const QR_BORDER = 6;
  const QR_FRAME_R = 14;

  const logoMaxW = INNER_W * 0.72;
  const logoMaxH = 88;
  const logoDims =
    logo !== null
      ? fitLogoDimensions(logo.naturalWidth, logo.naturalHeight, logoMaxW, logoMaxH)
      : { width: 0, height: 0 };

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create image");

  ctx.font = `600 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
  const nameLines = wrapText(ctx, businessName, INNER_W - 8);
  const nameBlockH = nameLines.length * 32;

  let contentH = PAD;
  if (logo) contentH += logoDims.height + 16;
  contentH += nameBlockH + 8 + 20 + 52 + 28 + QR_SIZE + QR_BORDER * 2 + 36 + 44 + 56 + PAD;

  canvas.width = CARD_W;
  canvas.height = contentH + OUTER_BORDER * 2;

  const innerX = OUTER_BORDER;
  const innerY = OUTER_BORDER;
  const innerW = CARD_W - OUTER_BORDER * 2;
  const innerH = canvas.height - OUTER_BORDER * 2;

  ctx.fillStyle = BG;
  roundRectPath(ctx, innerX, innerY, innerW, innerH, BORDER_R);
  ctx.fill();

  drawGoogleRoundedBorder(ctx, innerX, innerY, innerW, innerH, BORDER_R, OUTER_BORDER);

  let y = innerY + PAD;
  const centerX = CARD_W / 2;

  if (logo) {
    const logoX = centerX - logoDims.width / 2;
    ctx.drawImage(logo, logoX, y, logoDims.width, logoDims.height);
    y += logoDims.height + 16;
  }

  ctx.fillStyle = INK;
  ctx.font = `600 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const line of nameLines) {
    ctx.fillText(line, centerX, y);
    y += 32;
  }

  y += 4;
  ctx.fillStyle = MUTED;
  ctx.font = `400 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
  ctx.fillText("Thank you for choosing us!", centerX, y);
  y += 28;

  drawGoogleWordmark(ctx, centerX, y + 28, 42);
  y += 50;

  ctx.fillStyle = CTA_BLUE;
  ctx.font = `600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
  const reviewsText = "Reviews";
  const reviewsW = ctx.measureText(reviewsText).width;
  const starSize = 10;
  const starSpan = starSize * 1.15;
  const starsBlockW = starSpan * 4;
  const rowW = reviewsW + 14 + starsBlockW;
  const rx = centerX - rowW / 2;
  ctx.textAlign = "left";
  ctx.fillText(reviewsText, rx, y + 18);
  drawStarsRow(ctx, rx + reviewsW + 14 + starsBlockW / 2, y + 12, starSize);
  ctx.textAlign = "center";
  y += 44;

  const qrFrameW = QR_SIZE + QR_BORDER * 2;
  const qrFrameX = centerX - qrFrameW / 2;
  const qrFrameY = y;
  const qrFrameH = qrFrameW;

  ctx.fillStyle = BG;
  roundRectPath(ctx, qrFrameX, qrFrameY, qrFrameW, qrFrameH, QR_FRAME_R);
  ctx.fill();
  drawGoogleRoundedBorder(ctx, qrFrameX, qrFrameY, qrFrameW, qrFrameH, QR_FRAME_R, QR_BORDER);

  ctx.drawImage(qr, qrFrameX + QR_BORDER, qrFrameY + QR_BORDER, QR_SIZE, QR_SIZE);
  y += qrFrameH + 28;

  const ctaW = INNER_W - 8;
  const ctaH = 44;
  const ctaX = centerX - ctaW / 2;
  const ctaY = y;
  roundRectPath(ctx, ctaX, ctaY, ctaW, ctaH, ctaH / 2);
  ctx.fillStyle = CTA_BLUE;
  ctx.fill();

  const iconR = 14;
  const iconCx = ctaX + 36;
  const iconCy = ctaY + ctaH / 2;
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath();
  ctx.arc(iconCx, iconCy, iconR, 0, Math.PI * 2);
  ctx.fill();
  drawScanIcon(ctx, iconCx, iconCy, 18);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText("SCAN TO LEAVE A REVIEW", ctaX + 64, ctaY + 15);
  y += ctaH + 24;

  const footerY = y;
  const colW = INNER_W / 2 - 8;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  const leftCx = innerX + PAD + 18;
  drawFooterIcon(ctx, leftCx, footerY + 18, 16, "shield");
  ctx.fillStyle = MUTED;
  ctx.font = `400 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
  const leftText = wrapText(ctx, "Your feedback helps us serve you better.", colW - 44);
  let ty = footerY + 10;
  for (const line of leftText) {
    ctx.fillText(line, leftCx + 28, ty);
    ty += 14;
  }

  const rightCx = centerX + 8;
  drawFooterIcon(ctx, rightCx + 18, footerY + 18, 16, "heart");
  const rightText = wrapText(ctx, "We appreciate your support!", colW - 44);
  ty = footerY + 10;
  for (const line of rightText) {
    ctx.fillText(line, rightCx + 28, ty);
    ty += 14;
  }

  return canvas;
}

/** Data URL for in-app flyer preview (matches downloaded PNG). */
export async function generateQrFlyerDataUrl(
  qrDataUrl: string,
  options?: QrFlyerOptions | string | null
): Promise<string> {
  const canvas = await renderQrFlyerCanvas(qrDataUrl, options);
  return canvas.toDataURL("image/png");
}

/** Downloads a print-ready review QR flyer PNG. */
export async function downloadQrImage(
  qrDataUrl: string,
  filename: string,
  options?: QrFlyerOptions | string | null
) {
  const canvas = await renderQrFlyerCanvas(qrDataUrl, options);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Could not create image");

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  link.click();
  URL.revokeObjectURL(url);
}
