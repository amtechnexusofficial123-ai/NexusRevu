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

/**
 * Downloads the QR as a PNG. When a logo is provided, composites it centered
 * above the code on a light background.
 */
export async function downloadQrImage(
  qrDataUrl: string,
  filename: string,
  logoUrl?: string | null
) {
  const qr = await loadImage(qrDataUrl);
  const qrSize = qr.width;
  const padding = 40;

  let logo: HTMLImageElement | null = null;
  const trimmedLogo = logoUrl?.trim();
  if (trimmedLogo) {
    try {
      logo = await loadImage(trimmedLogo);
    } catch {
      logo = null;
    }
  }

  const logoSize = Math.round(qrSize * 0.22);
  const gap = 28;
  const hasLogo = logo !== null;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create image");

  canvas.width = qrSize + padding * 2;
  canvas.height = hasLogo
    ? padding + logoSize + gap + qrSize + padding
    : qrSize + padding * 2;

  ctx.fillStyle = "#FAF9F6";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let y = padding;
  if (hasLogo && logo) {
    const logoX = (canvas.width - logoSize) / 2;
    const cx = logoX + logoSize / 2;
    const cy = y + logoSize / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, logoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logo, logoX, y, logoSize, logoSize);
    ctx.restore();
    y += logoSize + gap;
  }

  ctx.drawImage(qr, padding, y, qrSize, qrSize);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Could not create image");

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  link.click();
  URL.revokeObjectURL(url);
}
