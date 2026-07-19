"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AttributeSelect } from "@/components/AttributeSelect";
import type { AttributesByType, Saree } from "@/lib/types";
import { compressImageFile } from "@/lib/clientImage";
import { photoProxySrc } from "@/lib/photoUrl";

export default function EditSareePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saree, setSaree] = useState<Saree | null | undefined>(undefined);
  const [attributes, setAttributes] = useState<AttributesByType>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [processingPhoto, setProcessingPhoto] = useState(false);

  const [region, setRegion] = useState("");
  const [material, setMaterial] = useState("");
  const [designType, setDesignType] = useState("");
  const [vendor, setVendor] = useState("");
  const [color, setColor] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [dateReceived, setDateReceived] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/attributes")
      .then((r) => r.json())
      .then((d) => setAttributes(d.attributes ?? {}));
  }, []);

  useEffect(() => {
    fetch(`/api/inventory/${code}`)
      .then(async (res) => (res.ok ? (await res.json()).saree : null))
      .then((s: Saree | null) => {
        setSaree(s);
        if (s) {
          setRegion(s.region);
          setMaterial(s.material);
          setDesignType(s.design_type);
          setVendor(s.vendor);
          setColor(s.color);
          setCostPrice(String(s.cost_price));
          setSellingPrice(String(s.selling_price));
          setDateReceived(s.date_received);
          setPhotoPreview(photoProxySrc(s.photo_url));
        }
      });
  }, [code]);

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
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    } finally {
      setProcessingPhoto(false);
    }
  }

  const canSubmit =
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
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      if (photoFile) form.set("photo", photoFile);
      form.set("region", region);
      form.set("material", material);
      form.set("design_type", designType);
      form.set("vendor", vendor);
      form.set("color", color.trim());
      form.set("cost_price", costPrice);
      form.set("selling_price", sellingPrice);
      form.set("date_received", dateReceived);

      const res = await fetch(`/api/inventory/${code}`, { method: "PATCH", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update saree");
      }
      router.push(`/stock/${code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (saree === undefined) {
    return <p className="p-8 text-center text-sage-dark/60">Loading...</p>;
  }

  if (saree === null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sage-dark/70">Saree not found.</p>
        <button onClick={() => router.push("/stock")} className="text-sage underline">
          Back to Stock
        </button>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl border-2 border-gold/30 bg-white px-4 py-3 text-base text-sage-dark outline-none focus:border-sage";

  return (
    <div className="flex flex-1 flex-col pb-24">
      <header className="flex items-center gap-3 p-4 pb-2">
        <button onClick={() => router.back()} className="text-2xl text-sage-dark/70">
          ←
        </button>
        <h1 className="font-serif text-2xl text-sage">Edit {saree.saree_code}</h1>
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
              <span className="text-sage-dark/50">📷 Tap to change photo</span>
            )}
          </div>
          <span className="text-xs text-sage-dark/50">Tap photo to replace it</span>
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
          {submitting ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
