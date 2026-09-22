"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { reportSchema, type ReportInput, MAX_IMAGE_BYTES } from "@/lib/validation/report";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { Card, Label, FieldError } from "@/components/ui/card";
import { ReportPreviewDialog } from "@/components/report-preview-dialog";

interface Target {
  key: string;
  label: string;
}

const SKIP_PREVIEW_KEY = "skipReportPreview";
const DESKRIPSI_MAX = 3000;
const MITIGASI_MAX = 3000;

function readSkipPreview(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SKIP_PREVIEW_KEY) === "true";
  } catch {
    // localStorage unavailable (private browsing, etc.) — default to
    // always showing the preview, the safer fallback.
    return false;
  }
}

export function ReportForm() {
  const router = useRouter();
  const [targets, setTargets] = useState<Target[]>([]);
  const [targetsLoading, setTargetsLoading] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Lazy initializer (not an effect) — this is a synchronous one-time read
  // on mount, guarded by the `typeof window` check for SSR, not a sync
  // with an external system that changes over time.
  const [skipPreview, setSkipPreview] = useState(readSkipPreview);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    getValues,
    control,
    formState: { errors },
  } = useForm<ReportInput>({
    resolver: zodResolver(reportSchema),
    defaultValues: { targetKeys: [] },
  });

  // useWatch (not the watch() method) — plays nicer with React Compiler's
  // memoization, since watch() returns a new function reference each
  // render that the compiler can't safely memoize around.
  const deskripsiValue = useWatch({ control, name: "deskripsi" });
  const mitigasiValue = useWatch({ control, name: "mitigasi" });
  const deskripsiLength = deskripsiValue?.length ?? 0;
  const mitigasiLength = mitigasiValue?.length ?? 0;

  useEffect(() => {
    fetch("/api/reports/targets")
      .then((res) => res.json())
      .then((data) => setTargets(data.targets ?? []))
      .catch(() => setTargets([]))
      .finally(() => setTargetsLoading(false));
  }, []);

  function updateSkipPreview(value: boolean) {
    setSkipPreview(value);
    try {
      localStorage.setItem(SKIP_PREVIEW_KEY, String(value));
    } catch {
      // Best-effort only — if storage isn't available, the preference
      // simply won't persist across visits.
    }
  }

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
      formData.set("targetKeys", JSON.stringify(values.targetKeys));
      if (imageFile) formData.set("image", imageFile);

      const res = await fetch("/api/reports", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSubmitError(data.error ?? "Gagal mengirim laporan.");
        setShowPreview(false);
        return;
      }

      // Partial success (some targets failed) still counts as a completed
      // submission, but the user needs to know not everything went
      // through — carry the notice across to the history page.
      const notice = data.partial
        ? data.message
        : "Laporan berhasil dikirim.";
      sessionStorage.setItem("reportSubmitNotice", notice);
      sessionStorage.setItem(
        "reportSubmitNoticeVariant",
        data.partial ? "info" : "success"
      );
      router.push("/history");
      router.refresh();
    } catch {
      setSubmitError("Terjadi kesalahan jaringan. Coba lagi.");
      setShowPreview(false);
    } finally {
      setSubmitting(false);
    }
  }

  const onOpenPreview = handleSubmit(() => {
    if (skipPreview) {
      doSubmit();
    } else {
      setShowPreview(true);
    }
  });

  const selectedTargetLabels = targets
    .filter((t) => getValues("targetKeys")?.includes(t.key))
    .map((t) => t.label);

  return (
    <>
      <Card className="w-full max-w-2xl">
        <h1 className="text-[28px] font-semibold text-ink mb-6">
          Laporan Baru
        </h1>

        <form onSubmit={onOpenPreview} method="post" className="space-y-5">
          <div>
            <Label htmlFor="judul">
              Judul <span className="text-danger">*</span>
            </Label>
            <Input id="judul" {...register("judul")} />
            <FieldError message={errors.judul?.message} />
          </div>

          <div>
            <Label htmlFor="tanggal">
              Tanggal <span className="text-danger">*</span>
            </Label>
            <Input id="tanggal" type="date" {...register("tanggal")} />
            <FieldError message={errors.tanggal?.message} />
          </div>

          <div>
            <Label>
              Target <span className="text-danger">*</span>
            </Label>
            {targetsLoading ? (
              <p className="text-[14px] text-ink-muted-48">Memuat target...</p>
            ) : targets.length === 0 ? (
              <p className="text-[14px] text-danger">
                Tidak ada target tersedia. Hubungi admin.
              </p>
            ) : (
              <div className="space-y-0.5">
                {targets.map((t) => (
                  <Checkbox
                    key={t.key}
                    id={`target-${t.key}`}
                    label={t.label}
                    value={t.key}
                    {...register("targetKeys")}
                  />
                ))}
              </div>
            )}
            <FieldError message={errors.targetKeys?.message} />
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <Label htmlFor="deskripsi">
                Deskripsi <span className="text-danger">*</span>
              </Label>
              <span className="text-[12px] text-ink-muted-48">
                {deskripsiLength}/{DESKRIPSI_MAX}
              </span>
            </div>
            <Textarea
              id="deskripsi"
              maxLength={DESKRIPSI_MAX}
              {...register("deskripsi")}
            />
            <FieldError message={errors.deskripsi?.message} />
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <Label htmlFor="mitigasi">
                Mitigasi <span className="text-danger">*</span>
              </Label>
              <span className="text-[12px] text-ink-muted-48">
                {mitigasiLength}/{MITIGASI_MAX}
              </span>
            </div>
            <Textarea
              id="mitigasi"
              maxLength={MITIGASI_MAX}
              {...register("mitigasi")}
            />
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

          <div className="flex items-center justify-between gap-4 pt-1">
            <Checkbox
              id="skip-preview"
              label="Jangan tampilkan konfirmasi lagi"
              checked={skipPreview}
              onChange={(e) => updateSkipPreview(e.target.checked)}
            />
          </div>

          <Button
            type="submit"
            className="w-full gap-2"
            disabled={submitting}
          >
            {submitting && <Spinner />}
            {submitting
              ? "Mengirim..."
              : skipPreview
                ? "Kirim ke Telegram"
                : "Periksa & Kirim"}
          </Button>
        </form>
      </Card>

      {showPreview && (
        <ReportPreviewDialog
          data={getValues()}
          targetLabels={selectedTargetLabels}
          imagePreviewUrl={imagePreviewUrl}
          submitting={submitting}
          onConfirm={doSubmit}
          onCancel={() => setShowPreview(false)}
        />
      )}
    </>
  );
}
