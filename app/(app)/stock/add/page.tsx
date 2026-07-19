"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AttributeSelect } from "@/components/AttributeSelect";
import type { AttributesByType } from "@/lib/types";
import { compressImageFile } from "@/lib/clientImage";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function AddSareePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [attributes, setAttributes] = useState<AttributesByType>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [region, setRegion] = useState("");
  const [material, setMaterial] = useState("");
  const [designType, setDesignType] = useState("");
  const [vendor, setVendor] = useState("");
  const [color, setColor] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [dateReceived, setDateReceived] = useState(today());

  const [submitting, setSubmitting] = useState(false);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedCode, setSavedCode] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/attributes")
      .then((r) => r.json())
      .then((d) => setAttributes(d.attributes ?? {}));
  }, []);

  async function addAttribute(attribute_type: string, value: string) {
    const res = await fetch("/api/attributes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attribute_type, value }),
    });
    const data = await res.json();
    if (data.attributes) setAttributes(data.attributes);
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingPhoto(true);
    setError(null);
    try {
      const compressed = await compressImageFile(file);
      setPhotoFile(compressed);
      setPhotoPreview(URL.createObjectURL(compressed));
    } catch {
      // Fall back to the original file -- the server will still try to
      // process it, this just skips the client-side HEIC/size safety net.
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    } finally {
      setProcessingPhoto(false);
    }
  }

  const canSubmit =
    photoFile &&
    !processingPhoto &&
    region &&
    material &&
    designType &&
    vendor &&
    color.trim() &&
    costPrice &&
    sellingPrice &&
    dateReceived;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !photoFile) return;

    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("photo", photoFile);
      form.set("region", region);
      form.set("material", material);
      form.set("design_type", designType);
      form.set("vendor", vendor);
      form.set("color", color.trim());
      form.set("cost_price", costPrice);
      form.set("selling_price", sellingPrice);
      form.set("date_received", dateReceived);

      const res = await fetch("/api/inventory", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save saree");
      }
      const data = await res.json();
      setSavedCode(data.saree.saree_code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (savedCode) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="text-5xl">🌸</div>
        <h1 className="font-serif text-2xl text-sage">Saved as {savedCode}</h1>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/stock")}
            className="rounded-xl bg-sage px-5 py-3 text-cream"
          >
            Back to Stock
          </button>
          <button
            onClick={() => {
              setSavedCode(null);
              setPhotoFile(null);
              setPhotoPreview(null);
              setColor("");
              setCostPrice("");
              setSellingPrice("");
              setDateReceived(today());
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="rounded-xl border-2 border-sage px-5 py-3 text-sage"
          >
            Add Another
          </button>
        </div>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl border-2 border-gold/30 bg-white px-4 py-3 text-base text-sage-dark outline-none focus:border-sage";

  return (
    <div className="flex flex-1 flex-col pb-24">
      <header className="p-4 pb-2">
        <h1 className="font-serif text-2xl text-sage">Add Saree</h1>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4">
        <label className="flex flex-col items-center gap-2">
          <div className="flex h-48 w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gold/50 bg-white">
            {processingPhoto ? (
              <span className="text-sage-dark/50">Processing photo...</span>
            ) : photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="Saree preview" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sage-dark/50">📷 Tap to take a photo</span>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            className="hidden"
          />
        </label>

        <AttributeSelect
          label="Region"
          options={attributes.Region ?? []}
          value={region}
          onChange={setRegion}
          onAddNew={(v) => addAttribute("Region", v)}
        />
        <AttributeSelect
          label="Material"
          options={attributes.Material ?? []}
          value={material}
          onChange={setMaterial}
          onAddNew={(v) => addAttribute("Material", v)}
        />
        <AttributeSelect
          label="Design"
          options={attributes.Design ?? []}
          value={designType}
          onChange={setDesignType}
          onAddNew={(v) => addAttribute("Design", v)}
        />
        <AttributeSelect
          label="Vendor"
          options={attributes.Vendor ?? []}
          value={vendor}
          onChange={setVendor}
          onAddNew={(v) => addAttribute("Vendor", v)}
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-sage-dark/80">Color</label>
          <input
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="e.g. Maroon"
            className={inputClass}
          />
        </div>

        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-sm font-medium text-sage-dark/80">Cost Price</label>
            <input
              type="number"
              inputMode="decimal"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              placeholder="₹"
              className={inputClass}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-sm font-medium text-sage-dark/80">Selling Price</label>
            <input
              type="number"
              inputMode="decimal"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              placeholder="₹"
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-sage-dark/80">Date Received</label>
          <input
            type="date"
            value={dateReceived}
            onChange={(e) => setDateReceived(e.target.value)}
            className={inputClass}
          />
        </div>

        {error && <p className="text-center text-terracotta">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="w-full rounded-2xl bg-sage py-4 text-lg font-medium text-cream shadow-sm disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save Saree"}
        </button>
      </form>
    </div>
  );
}
