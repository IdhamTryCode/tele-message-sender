"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { reportSchema, type ReportInput, MAX_IMAGE_BYTES } from "@/lib/validation/report";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, Label, FieldError } from "@/components/ui/card";
import { ReportPreviewDialog } from "@/components/report-preview-dialog";

interface Target {
  key: string;
  label: string;
}

export function ReportForm() {
  const router = useRouter();
  const [targets, setTargets] = useState<Target[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ReportInput>({
    resolver: zodResolver(reportSchema),
  });

  useEffect(() => {
    fetch("/api/reports/targets")
      .then((res) => res.json())
      .then((data) => setTargets(data.targets ?? []))
      .catch(() => setTargets([]));
  }, []);

  const imagePreviewUrl = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : null),
    [imageFile]
  );

  // Revoking is a side effect on an external system (the browser's blob URL
  // registry), so it belongs in an effect — but creating the URL above does
  // not need to be, since it derives synchronously from imageFile.
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageError(null);
    if (file && file.size > MAX_IMAGE_BYTES) {
      setImageError("Ukuran gambar maksimal 5MB");
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setImageFile(file);
  }

  async function doSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const values = getValues();
      const formData = new FormData();
      formData.set("judul", values.judul);
      formData.set("tanggal", values.tanggal);
      formData.set("deskripsi", values.deskripsi);
      formData.set("mitigasi", values.mitigasi);
      formData.set("targetKey", values.targetKey);
      if (imageFile) formData.set("image", imageFile);

      const res = await fetch("/api/reports", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSubmitError(data.error ?? "Gagal mengirim laporan.");
        setShowPreview(false);
        return;
      }

      router.push("/history");
      router.refresh();
    } catch {
      setSubmitError("Terjadi kesalahan jaringan. Coba lagi.");
      setShowPreview(false);
    } finally {
      setSubmitting(false);
    }
  }

  const onOpenPreview = handleSubmit(() => setShowPreview(true));
  const selectedTarget = targets.find((t) => t.key === getValues("targetKey"));

  return (
    <>
      <Card className="w-full max-w-2xl">
        <h1 className="text-[28px] font-semibold text-ink mb-6">
          Laporan Baru
        </h1>

        <form onSubmit={onOpenPreview} className="space-y-5">
          <div>
            <Label htmlFor="judul">Judul</Label>
            <Input id="judul" {...register("judul")} />
            <FieldError message={errors.judul?.message} />
          </div>

          <div>
            <Label htmlFor="tanggal">Tanggal</Label>
            <Input id="tanggal" type="date" {...register("tanggal")} />
            <FieldError message={errors.tanggal?.message} />
          </div>

          <div>
            <Label htmlFor="targetKey">Target</Label>
            <select
              id="targetKey"
              {...register("targetKey")}
              className="w-full rounded-lg border border-hairline bg-canvas px-4 py-2.5 text-[17px] text-ink focus:outline focus:outline-2 focus:outline-primary-focus"
            >
              <option value="">Pilih target...</option>
              {targets.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
            <FieldError message={errors.targetKey?.message} />
          </div>

          <div>
            <Label htmlFor="deskripsi">Deskripsi</Label>
            <Textarea id="deskripsi" {...register("deskripsi")} />
            <FieldError message={errors.deskripsi?.message} />
          </div>

          <div>
            <Label htmlFor="mitigasi">Mitigasi</Label>
            <Textarea id="mitigasi" {...register("mitigasi")} />
            <FieldError message={errors.mitigasi?.message} />
          </div>

          <div>
            <Label htmlFor="image">Gambar (opsional)</Label>
            <input
              ref={fileInputRef}
              id="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="block w-full text-[14px] text-ink-muted-80 file:mr-4 file:rounded-pill file:border-0 file:bg-canvas-parchment file:px-4 file:py-2 file:text-[14px] file:font-semibold file:text-ink-muted-80"
            />
            <p className="mt-1 text-[12px] text-ink-muted-48">
              JPEG, PNG, atau WebP. Maksimal 5MB. Metadata EXIF (termasuk lokasi) akan dihapus otomatis sebelum dikirim.
            </p>
            <FieldError message={imageError ?? undefined} />
          </div>

          <FieldError message={submitError ?? undefined} />

          <Button type="submit" className="w-full">
            Periksa & Kirim
          </Button>
        </form>
      </Card>

      {showPreview && (
        <ReportPreviewDialog
          data={getValues()}
          targetLabel={selectedTarget?.label ?? getValues("targetKey")}
          imagePreviewUrl={imagePreviewUrl}
          submitting={submitting}
          onConfirm={doSubmit}
          onCancel={() => setShowPreview(false)}
        />
      )}
    </>
  );
}
