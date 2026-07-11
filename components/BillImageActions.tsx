"use client";

import { useRef, useState } from "react";
import { toBlob } from "html-to-image";
import type { Bill, Customer } from "@/lib/types";
import { BillImageTemplate, type BillImageItem } from "./BillImageTemplate";

type Props = {
  bill: Bill;
  customer: Customer;
  items: BillImageItem[];
};

/**
 * Renders the off-screen bill template and offers two actions:
 * - "Send on WhatsApp": tries the Web Share API with the image file attached
 *   directly (so it lands in the picked chat pre-attached, no manual save+
 *   attach step) on browsers that support sharing files. Falls back to the
 *   original download-then-open-wa.me flow where file sharing isn't
 *   supported (e.g. desktop browsers) -- true one-tap "send to this exact
 *   contact with image attached" isn't possible via the free wa.me link,
 *   only via the paid WhatsApp Business API, which the spec explicitly
 *   ruled out.
 * - "Download Bill Image": regenerates the same PNG on demand, so old bills
 *   can be re-downloaded from the bill detail page, not just right after
 *   creation.
 */
export function BillImageActions({ bill, customer, items }: Props) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"share" | "download" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generateFile(): Promise<File> {
    if (!captureRef.current) throw new Error("Nothing to capture");
    const blob = await toBlob(captureRef.current, { pixelRatio: 2 });
    if (!blob) throw new Error("Failed to generate the bill image");
    return new File([blob], `${bill.bill_number}.png`, { type: "image/png" });
  }

  function downloadFile(file: File) {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleShare() {
    setBusy("share");
    setError(null);
    try {
      const file = await generateFile();
      const message = `Hi ${customer.name}, thank you for your purchase! Bill attached below 🌸`;

      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: message, title: "AdiSutra Bill" });
        return;
      }

      downloadFile(file);
      const phoneDigits = customer.phone.replace(/\D/g, "");
      window.open(`https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`, "_blank");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return; // user cancelled the share sheet
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  async function handleDownload() {
    setBusy("download");
    setError(null);
    try {
      const file = await generateFile();
      downloadFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="fixed left-[-9999px] top-0">
        <div ref={captureRef}>
          <BillImageTemplate bill={bill} customer={customer} items={items} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={handleShare}
          disabled={busy !== null}
          className="rounded-xl bg-sage px-6 py-4 text-lg font-medium text-cream disabled:opacity-60"
        >
          {busy === "share" ? "Preparing..." : "Send on WhatsApp"}
        </button>
        <button
          onClick={handleDownload}
          disabled={busy !== null}
          className="rounded-xl border-2 border-sage px-6 py-3 text-sage disabled:opacity-60"
        >
          {busy === "download" ? "Preparing..." : "Download Bill Image"}
        </button>
        {error && <p className="text-center text-terracotta">{error}</p>}
      </div>
    </>
  );
}
