"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Send, X } from "lucide-react";
import {
  reportSchema,
  type ReportInput,
  MAX_IMAGE_BYTES,
} from "@/lib/validation/report";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox, TargetCard } from "@/components/ui/checkbox";
import { Card, Label, FieldError } from "@/components/ui/card";
import { ReportPreviewDialog } from "@/components/report-preview-dialog";
import { TelegramPreview } from "@/components/telegram-preview";
import { cn } from "@/lib/utils";

interface Target {
  key: string;
  label: string;
  kind: "group" | "dm";
}

const SKIP_PREVIEW_KEY = "skipReportPreview";
const DESKRIPSI_MAX = 1850;
const MITIGASI_MAX = 1850;

const KIND_LABEL: Record<Target["kind"], string> = {
  group: "Grup Telegram",
  dm: "Pesan langsung",
};

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

export function ReportForm({ username }: { username: string }) {
  const router = useRouter();
  // Recomputed each render (cheap) rather than memoized/module-level —
  // module-level would fix "today" at first module load, risking a stale
  // value across a long-lived session and a server/client mismatch during
  // hydration. This only feeds the date picker's UI-level `max` (a
  // convenience, not the security boundary — see maxAllowedDate() in
  // lib/validation/report.ts for the actual server-enforced check), so
  // using the browser's local date here (not UTC) is intentional: the
  // calendar should visually cap at "today" the way the user perceives it.
  const todayLocal = new Date().toLocaleDateString("en-CA");
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
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<ReportInput>({
    resolver: zodResolver(reportSchema),
    defaultValues: { targetKeys: [] },
  });

  // useWatch (not the watch() method) — plays nicer with React Compiler's
  // memoization, since watch() returns a new function reference each
  // render that the compiler can't safely memoize around.
  const judulValue = useWatch({ control, name: "judul" }) ?? "";
  const tanggalValue = useWatch({ control, name: "tanggal" }) ?? "";
  const deskripsiValue = useWatch({ control, name: "deskripsi" }) ?? "";
  const mitigasiValue = useWatch({ control, name: "mitigasi" }) ?? "";
  const selectedKeys = useWatch({ control, name: "targetKeys" }) ?? [];

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

  // Shared by both the file picker and paste-from-clipboard so the same
  // size check applies regardless of how the image arrived — dimension/
  // magic-byte validation still happens server-side in lib/image.ts
  // either way, this is just the client-side size precheck for fast
  // feedback.
  function applyImageFile(file: File) {
    setImageError(null);
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("Ukuran gambar maksimal 5MB");
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setImageFile(file);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      applyImageFile(file);
    } else {
      setImageError(null);
      setImageFile(null);
    }
  }

  function clearImage() {
    setImageFile(null);
    setImageError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Lets a staff member paste a screenshot straight from the clipboard
  // (e.g. after Win+Shift+S) instead of having to save it to a file and
  // then browse for it — meaningful time saved during an active incident.
  // Only intercepts the paste when it actually carries image data; a
  // normal text paste into judul/deskripsi/etc. is left untouched.
  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const item = Array.from(e.clipboardData.items).find((it) =>
      it.type.startsWith("image/")
    );
    if (!item) return;
    const file = item.getAsFile();
    if (!file) return;
    e.preventDefault();
    applyImageFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = Array.from(e.dataTransfer.files).find((f) =>
      f.type.startsWith("image/")
    );
    if (file) applyImageFile(file);
  }

  function resetForm() {
    reset({ targetKeys: [] });
    clearImage();
    setSubmitError(null);
  }

  const allSelected =
    targets.length > 0 && selectedKeys.length === targets.length;

  function toggleAll() {
    setValue("targetKeys", allSelected ? [] : targets.map((t) => t.key), {
      shouldValidate: true,
    });
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
      const notice = data.partial ? data.message : "Laporan berhasil dikirim.";
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
    .filter((t) => selectedKeys.includes(t.key))
    .map((t) => t.label);

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <Card className="p-5 sm:p-6" onPaste={handlePaste}>
          <form onSubmit={onOpenPreview} method="post" className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="judul">
                  Judul <span className="text-brand-red">*</span>
                </Label>
                <Input
                  id="judul"
                  placeholder="Ringkasan singkat laporan"
                  {...register("judul")}
                />
                <FieldError message={errors.judul?.message} />
              </div>

              <div>
                <Label htmlFor="tanggal">
                  Tanggal <span className="text-brand-red">*</span>
                </Label>
                <Input
                  id="tanggal"
                  type="date"
                  max={todayLocal}
                  {...register("tanggal")}
                />
                <FieldError message={errors.tanggal?.message} />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <Label className="mb-0">
                  Target <span className="text-brand-red">*</span>
                </Label>
                {targets.length > 1 && (
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="text-[13px] font-medium text-primary hover:underline"
                  >
                    {allSelected ? "Hapus semua" : "Pilih semua"}
                  </button>
                )}
              </div>

              {targetsLoading ? (
                <p className="text-[14px] text-ink-muted-48">
                  Memuat target...
                </p>
              ) : targets.length === 0 ? (
                <p className="text-[14px] text-danger">
                  Tidak ada target tersedia. Hubungi admin.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {targets.map((t) => (
                    <TargetCard
                      key={t.key}
                      id={`target-${t.key}`}
                      label={t.label}
                      sublabel={KIND_LABEL[t.kind]}
                      value={t.key}
                      {...register("targetKeys")}
                    />
                  ))}
                </div>
              )}
              <FieldError message={errors.targetKeys?.message} />
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <Label htmlFor="deskripsi" className="mb-0">
                  Deskripsi <span className="text-brand-red">*</span>
                </Label>
                <span className="tabular text-[12px] text-ink-faint">
                  {deskripsiValue.length}/{DESKRIPSI_MAX}
                </span>
              </div>
              <Textarea
                id="deskripsi"
                maxLength={DESKRIPSI_MAX}
                placeholder="Jelaskan kejadian, dampak, dan sistem yang terdampak"
                className="min-h-32"
                {...register("deskripsi")}
              />
              <FieldError message={errors.deskripsi?.message} />
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <Label htmlFor="mitigasi" className="mb-0">
                  Mitigasi <span className="text-brand-red">*</span>
                </Label>
                <span className="tabular text-[12px] text-ink-faint">
                  {mitigasiValue.length}/{MITIGASI_MAX}
                </span>
              </div>
              <Textarea
                id="mitigasi"
                maxLength={MITIGASI_MAX}
                placeholder="Langkah yang sudah atau akan dilakukan"
                className="min-h-32"
                {...register("mitigasi")}
              />
              <FieldError message={errors.mitigasi?.message} />
            </div>

            <div>
              <Label htmlFor="image">Gambar (opsional)</Label>

              {imagePreviewUrl ? (
                <div className="flex items-start gap-3 rounded-lg border border-hairline-strong p-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreviewUrl}
                    alt="Pratinjau gambar terlampir"
                    className="size-16 shrink-0 rounded object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">
                      {imageFile?.name}
                    </span>
                    <span className="tabular block text-[12px] text-ink-muted-48">
                      {((imageFile?.size ?? 0) / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={clearImage}
                    aria-label="Hapus gambar"
                    className="rounded p-1 text-ink-muted-48 transition-colors hover:bg-canvas-parchment hover:text-danger"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="image"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-lg border border-dashed px-3 py-3 text-[13px] transition-colors",
                    dragOver
                      ? "border-primary bg-[#F2F4FC] text-ink-muted-80"
                      : "border-hairline-strong text-ink-muted-48 hover:border-primary-focus hover:text-ink-muted-80"
                  )}
                >
                  <ImagePlus className="size-4 shrink-0" />
                  {dragOver
                    ? "Lepaskan gambar di sini"
                    : "Pilih file, seret ke sini, atau tempel dengan Ctrl+V"}
                </label>
              )}

              <input
                ref={fileInputRef}
                id="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                className="sr-only"
              />
              <p className="mt-1.5 text-[12px] text-ink-muted-48">
                JPEG, PNG, atau WebP. Maksimal 5MB. Metadata EXIF (termasuk
                lokasi) dihapus otomatis sebelum dikirim.
              </p>
              <FieldError message={imageError ?? undefined} />
            </div>

            <FieldError message={submitError ?? undefined} />

            {/* Sticky so the send button stays reachable on a long form
                without scrolling to the bottom first. -mx/-mb pull it to
                the card's edges; the matching px/pb restore the inset. */}
            <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-wrap items-center justify-between gap-3 border-t border-hairline bg-canvas px-5 pb-5 pt-4 sm:-mx-6 sm:-mb-6 sm:px-6 sm:pb-6">
              <Checkbox
                id="skip-preview"
                label="Jangan tampilkan konfirmasi lagi"
                checked={skipPreview}
                onChange={(e) => updateSkipPreview(e.target.checked)}
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resetForm}
                  disabled={submitting}
                >
                  Kosongkan
                </Button>
                <Button type="submit" size="lg" loading={submitting}>
                  {!submitting && <Send />}
                  {submitting
                    ? "Mengirim..."
                    : skipPreview
                      ? "Kirim ke Telegram"
                      : "Periksa & Kirim"}
                </Button>
              </div>
            </div>
          </form>
        </Card>

        <TelegramPreview
          judul={judulValue}
          tanggal={tanggalValue}
          deskripsi={deskripsiValue}
          mitigasi={mitigasiValue}
          submittedBy={username}
          targetLabels={selectedTargetLabels}
          imagePreviewUrl={imagePreviewUrl}
          onRemoveImage={clearImage}
          className="self-start lg:sticky lg:top-6"
        />
      </div>

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
