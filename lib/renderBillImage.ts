// Renders the bill image directly on a <canvas> via drawImage/fillText,
// instead of the DOM-to-SVG-to-canvas trick that html-to-image (and every
// similar library) uses. That approach relies on Safari correctly
// rasterizing an <img> inside an SVG <foreignObject>, which is a known,
// long-standing WebKit weak spot -- two attempts at working around it
// (waiting for image decode, then inlining the logo as a data URI) still
// left the logo blank on iOS. Plain canvas drawImage/fillText has no
// comparable cross-browser flakiness, so this sidesteps the problem
// entirely rather than patching around it again.
import type { Bill, Customer } from "./types";
import { fullName } from "./customerName";
import { BILL_LOGO_DATA_URI } from "./billLogoBase64";

const SAGE = "#4F7C6C";
const SAGE_DARK = "#33473F";
const TERRACOTTA = "#D98B5F";
const GOLD = "#C9A15A";
const CREAM = "#F7F1E6";

export type BillImageItem = {
  saree_code: string;
  description: string;
  price: number;
};

const WIDTH = 600;
const MARGIN = 32;
const LINE_HEIGHT = 24;
const LOGO_SIZE = 140;
const SCALE = 2; // supersampled for crisp output

type LayoutCommand =
  | { type: "logo" }
  | { type: "gap"; size: number }
  | { type: "divider"; weight?: number }
  | { type: "row"; label: string; value: string; bold?: boolean; color?: string }
  | { type: "center"; text: string; bold?: boolean; color?: string; size?: number };

function buildLayout(bill: Bill, customer: Customer, items: BillImageItem[]): LayoutCommand[] {
  const paidInFull = bill.amount_due <= 0;
  const cmds: LayoutCommand[] = [
    { type: "logo" },
    { type: "gap", size: 12 },
    { type: "divider", weight: 2 },
    { type: "gap", size: 20 },
    { type: "row", label: "Bill No", value: bill.bill_number },
    { type: "row", label: "Date", value: bill.date },
    { type: "row", label: "Customer", value: fullName(customer) },
    { type: "row", label: "Phone", value: customer.phone },
    { type: "gap", size: 8 },
    { type: "divider" },
    { type: "gap", size: 12 },
  ];

  for (const item of items) {
    cmds.push({
      type: "row",
      label: `${item.saree_code} - ${item.description}`,
      value: `₹${item.price}`,
    });
  }

  cmds.push({ type: "divider" }, { type: "gap", size: 12 });
  cmds.push({ type: "row", label: "Subtotal", value: `₹${bill.subtotal}` });
  if (bill.discount > 0) {
    cmds.push({ type: "row", label: "Discount", value: `-₹${bill.discount}` });
  }
  cmds.push({ type: "row", label: "Total", value: `₹${bill.total_amount}`, bold: true });
  cmds.push({ type: "row", label: "Paid", value: `₹${bill.amount_paid}` });
  if (bill.amount_due > 0) {
    cmds.push({
      type: "row",
      label: "Due",
      value: `₹${bill.amount_due}`,
      bold: true,
      color: TERRACOTTA,
    });
  }

  cmds.push({ type: "gap", size: 8 }, { type: "divider" }, { type: "gap", size: 16 });
  cmds.push({
    type: "center",
    text: paidInFull ? "PAID IN FULL" : bill.payment_status.toUpperCase(),
    bold: true,
    color: paidInFull ? SAGE : TERRACOTTA,
    size: 13,
  });
  cmds.push({ type: "gap", size: 20 });
  cmds.push({ type: "center", text: "Thank you for shopping with AdiSutra! 🌸", size: 13 });

  return cmds;
}

function commandHeight(cmd: LayoutCommand): number {
  switch (cmd.type) {
    case "logo":
      return LOGO_SIZE;
    case "gap":
      return cmd.size;
    case "divider":
      return cmd.weight ?? 1;
    case "row":
    case "center":
      return LINE_HEIGHT;
  }
}

function truncateToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
}

let logoImagePromise: Promise<HTMLImageElement> | null = null;
function loadLogoImage(): Promise<HTMLImageElement> {
  if (!logoImagePromise) {
    logoImagePromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load logo image"));
      img.src = BILL_LOGO_DATA_URI;
    });
  }
  return logoImagePromise;
}

export async function renderBillToBlob(
  bill: Bill,
  customer: Customer,
  items: BillImageItem[]
): Promise<Blob> {
  const logo = await loadLogoImage();
  const layout = buildLayout(bill, customer, items);
  const contentHeight = layout.reduce((sum, cmd) => sum + commandHeight(cmd), 0);
  const height = MARGIN * 2 + contentHeight;

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported on this browser");
  ctx.scale(SCALE, SCALE);

  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, WIDTH, height);

  let y = MARGIN;
  for (const cmd of layout) {
    switch (cmd.type) {
      case "logo":
        ctx.drawImage(logo, (WIDTH - LOGO_SIZE) / 2, y, LOGO_SIZE, LOGO_SIZE);
        y += LOGO_SIZE;
        break;
      case "gap":
        y += cmd.size;
        break;
      case "divider":
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = cmd.weight ?? 1;
        ctx.beginPath();
        ctx.moveTo(MARGIN, y);
        ctx.lineTo(WIDTH - MARGIN, y);
        ctx.stroke();
        y += cmd.weight ?? 1;
        break;
      case "row": {
        const font = cmd.bold ? "bold 14px Arial, sans-serif" : "14px Arial, sans-serif";
        ctx.font = font;
        ctx.fillStyle = cmd.color ?? SAGE_DARK;
        ctx.textAlign = "right";
        ctx.fillText(cmd.value, WIDTH - MARGIN, y + 12);
        const valueWidth = ctx.measureText(cmd.value).width;
        const maxLabelWidth = WIDTH - MARGIN * 2 - valueWidth - 12;
        ctx.textAlign = "left";
        ctx.fillText(truncateToWidth(ctx, cmd.label, maxLabelWidth), MARGIN, y + 12);
        y += LINE_HEIGHT;
        break;
      }
      case "center":
        ctx.font = `${cmd.bold ? "bold " : ""}${cmd.size ?? 13}px Arial, sans-serif`;
        ctx.fillStyle = cmd.color ?? SAGE_DARK;
        ctx.textAlign = "center";
        ctx.fillText(cmd.text, WIDTH / 2, y + 12);
        y += LINE_HEIGHT;
        break;
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to generate the bill image"));
    }, "image/png");
  });
}
