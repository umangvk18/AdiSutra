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

const WEB_SHARE_SUPPORTED =
  typeof navigator !== "undefined" && typeof navigator.share === "function";

/**
 * Renders the off-screen bill template and offers three actions:
 * - "Share via WhatsApp": uses the Web Share API with the image file
 *   attached directly, so it lands in the picked chat pre-attached with no
 *   manual save+attach step. Best when the customer's number is already a
 *   saved contact, since you pick them from the share sheet.
 * - "Download & Open [Name]'s Chat": for numbers that AREN'T saved as a
 *   contact (so they won't show up in the share sheet) -- downloads the
 *   image and opens wa.me directly to that exact phone number's chat, the
 *   original flow. True one-tap "send with image already attached to this
 *   exact number" isn't possible via the free wa.me link, only the paid
 *   WhatsApp Business API, which the spec explicitly ruled out -- this is
 *   the manual-attach fallback for that case.
 * - "Download Bill Image": just regenerates and saves the PNG, no WhatsApp
 *   involved -- used for re-downloading old bills.
 */
export function BillImageActions({ bill, customer, items }: Props) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"share" | "download-open" | "download" | null>(null);
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

  function greeting() {
    return `Hi ${customer.name}, thank you for your purchase! Bill attached below 🌸`;
  }

  async function handleShareSheet() {
    setBusy("share");
    setError(null);
    try {
      const file = await generateFile();
      if (!navigator.canShare?.({ files: [file] })) {
        throw new Error("Sharing images isn't supported on this browser -- use the option below instead.");
      }
      await navigator.share({ files: [file], text: greeting(), title: "AdiSutra Bill" });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return; // user cancelled the share sheet
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  async function handleDownloadAndOpenChat() {
    setBusy("download-open");
    setError(null);
    try {
      const file = await generateFile();
      downloadFile(file);
      const phoneDigits = customer.phone.replace(/\D/g, "");
      window.open(`https://wa.me/${phoneDigits}?text=${encodeURIComponent(greeting())}`, "_blank");
    } catch (err) {
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
        {WEB_SHARE_SUPPORTED && (
          <button
            onClick={handleShareSheet}
            disabled={busy !== null}
            className="rounded-xl bg-sage px-6 py-4 text-lg font-medium text-cream disabled:opacity-60"
          >
            {busy === "share" ? "Preparing..." : "Share via WhatsApp (saved number)"}
          </button>
        )}
        <button
          onClick={handleDownloadAndOpenChat}
          disabled={busy !== null}
          className={
            WEB_SHARE_SUPPORTED
              ? "rounded-xl border-2 border-sage px-6 py-3 text-sage disabled:opacity-60"
              : "rounded-xl bg-sage px-6 py-4 text-lg font-medium text-cream disabled:opacity-60"
          }
        >
          {busy === "download-open" ? "Preparing..." : "Download & Open Chat (unsaved number)"}
        </button>
        <button
          onClick={handleDownload}
          disabled={busy !== null}
          className="rounded-xl border-2 border-gold/40 px-6 py-3 text-sage-dark disabled:opacity-60"
        >
          {busy === "download" ? "Preparing..." : "Download Bill Image"}
        </button>
        {error && <p className="text-center text-terracotta">{error}</p>}
      </div>
    </>
  );
}
