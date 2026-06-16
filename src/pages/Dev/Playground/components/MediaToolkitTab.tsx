import { FileText, ImageIcon, Link2, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { addDays } from "date-fns";

import { HomepageHeader } from "@/components/homepage-redesign";
import { Footer } from "@/components/layouts";
import {
  DateTimePicker,
  FormMediaUploader,
  ImageZoomPreview,
  MediaLightboxDialog,
  PdfPreviewViewer,
  UniversalMediaUploader,
} from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CVUploadModal } from "@/components/ui/cv-upload-modal";
import { FileUploadInput } from "@/components/ui/file-upload-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inferFileKind, normalizeRelativeAssetPath } from "@/lib/media-file-utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import type {
  MediaViewerItem,
  UploaderDisplayMode,
  UploaderPreset,
  UploaderThemeVariant,
  UploadTransportMode,
} from "@/components/shared";

const TEMP_IMAGE_URL = normalizeRelativeAssetPath("temp-file/Screenshot 2026-01-21 153334.png");
const TEMP_PDF_URL = normalizeRelativeAssetPath("temp-file/rereree.pdf");

function buildTempSampleItems(t: (key: string) => string): MediaViewerItem[] {
  return [
    {
      id: "temp-image",
      name: t("adminUsermanagement.hide"),
      src: TEMP_IMAGE_URL,
      alt: t("adminUsermanagement.hide"),
      kind: "image",
      requireAuth: false,
    },
    {
      id: "temp-pdf",
      name: t("sharedMediatoolkitplaygroundpage.samplePdf"),
      src: TEMP_PDF_URL,
      kind: "pdf",
      requireAuth: false,
    },
  ];
}

export function MediaToolkitTab() {
  const { t } = useTranslation();
  const tempSampleItems = useMemo(() => buildTempSampleItems(t), [t]);

  // ── Uploader Demo 1: Dashboard mode controls
  const [transportMode, setTransportMode] = useState<UploadTransportMode>("mock");
  const [uploadEndpoint, setUploadEndpoint] = useState("");
  const [sequentialUpload, setSequentialUpload] = useState(true);
  const [bundleUpload, setBundleUpload] = useState(false);
  const [enableWebcam, setEnableWebcam] = useState(false);
  const [enableScreenCapture, setEnableScreenCapture] = useState(false);
  const [enableCompressor, setEnableCompressor] = useState(false);
  const [enableImageEditor, setEnableImageEditor] = useState(true);

  // ── Uploader Demo 4: Preset showcase
  const [activePreset, setActivePreset] = useState<UploaderPreset>("mixed");

  // ── Uploader Demo 5: Theme showcase
  const [activeTheme, setActiveTheme] = useState<UploaderThemeVariant>("default");

  // ── Uploader Demo 6: Display mode showcase
  const [activeDisplayMode, setActiveDisplayMode] = useState<UploaderDisplayMode>("dashboard");

  // ── FormMediaUploader demo form
  const demoForm = useForm<{ files: File[] }>();
  const demoFormFiles = demoForm.watch("files") as File[] | undefined;

  const [mediaItems, setMediaItems] = useState<MediaViewerItem[]>(tempSampleItems);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const [pdfSource, setPdfSource] = useState<string | File | null>(TEMP_PDF_URL);
  const [pdfRequireAuth, setPdfRequireAuth] = useState(false);

  const [date1, setDate1] = useState<Date | null>(new Date());
  const [date2, setDate2] = useState<Date | null>(null);
  const [date3, setDate3] = useState<Date | null>(new Date());
  const [date4, setDate4] = useState<Date | null>(new Date());
  const [date5, setDate5] = useState<Date | null>(new Date());

  const preferredImageItem = useMemo(
    () => mediaItems.find((item) => (item.kind ?? inferFileKind(item)) === "image" && item.src),
    [mediaItems]
  );

  // States for FileUploadInput Demo
  const [demoFile, setDemoFile] = useState<File | null>(null);
  const [demoFileUrl, setDemoFileUrl] = useState<string | null>(null);
  const [demoFileError, setDemoFileError] = useState<string | undefined>(undefined);
  const [demoFileType, setDemoFileType] = useState<"image" | "pdf" | "all">("all");

  // States for CVUploadModal Demo
  const [cvModalOpen, setCvModalOpen] = useState(false);
  const [cvUrl, setCvUrl] = useState<string | null>(TEMP_PDF_URL);
  const [cvName, setCvName] = useState<string | null>("sample_cv.pdf");
  const [cvUploading, setCvUploading] = useState(false);

  const handleCvUploadMock = async (file: File) => {
    setCvUploading(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setCvUploading(false);
    const objectUrl = URL.createObjectURL(file);
    setCvUrl(objectUrl);
    setCvName(file.name);
    toast.success(t("common.uploadCvSuccessfully") || "CV uploaded successfully!");
  };

  const handleAppendLocalFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const nextItems: MediaViewerItem[] = Array.from(files).map((file, index) => {
      const kind = inferFileKind({
        fileName: file.name,
        mimeType: file.type,
      });

      return {
        id: `local-${Date.now()}-${index}`,
        name: file.name,
        file,
        mimeType: file.type,
        kind,
        requireAuth: false,
      };
    });

    setMediaItems((previous) => [...nextItems, ...previous]);

    const localPdf = nextItems.find((item) => item.kind === "pdf" && item.file);
    if (localPdf?.file) {
      setPdfSource(localPdf.file);
      setPdfRequireAuth(false);
    }

    event.target.value = "";
  };

  const handleOpenViewer = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  const handleResetTempSamples = () => {
    setMediaItems(buildTempSampleItems(t));
    setPdfSource(TEMP_PDF_URL);
    setPdfRequireAuth(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 dark:bg-slate-950">
      <HomepageHeader />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Media Toolkit Playground (DEV)</CardTitle>
              <CardDescription>
                {t("sharedMediatoolkitplaygroundpage.playgroundUploaderDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {t("sharedMediatoolkitplaygroundpage.samplePhoto")} {TEMP_IMAGE_URL}
                </Badge>
                <Badge variant="outline">
                  {t("sharedMediatoolkitplaygroundpage.samplePdf")} {TEMP_PDF_URL}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" onClick={handleResetTempSamples}>
                  {t("sharedMediatoolkitplaygroundpage.reloadTempFileData")}
                </Button>
                <Label
                  htmlFor="local-media-input"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-900">
                  <UploadCloud className="h-4 w-4" />
                  {t("sharedMediatoolkitplaygroundpage.addPhotosPdfsFromYour")}
                </Label>
                <Input
                  id="local-media-input"
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf,application/pdf"
                  multiple
                  onChange={handleAppendLocalFiles}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold">
                Shared DateTime Picker Playground (DEV)
              </CardTitle>
              <CardDescription>
                Test interactive instances of the new premium DateTimePicker component supporting
                quick presets, scroll wheel time alignment, and role themes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2 rounded-xl border border-slate-200 bg-white/50 p-4 dark:border-slate-800 dark:bg-slate-900/30">
                  <Label className="text-xs font-bold text-slate-500 uppercase">
                    1. Standard (24h format)
                  </Label>
                  <DateTimePicker
                    value={date1}
                    onChange={setDate1}
                    placeholder={t("general.selectDateTime")}
                    hour12={false}
                  />
                  <p className="font-mono text-[11px] text-slate-500">
                    Value: {date1 ? date1.toISOString() : "null"}
                  </p>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-white/50 p-4 dark:border-slate-800 dark:bg-slate-900/30">
                  <Label className="text-xs font-bold text-slate-500 uppercase">
                    2. 12h Format (with AM/PM)
                  </Label>
                  <DateTimePicker
                    value={date2}
                    onChange={setDate2}
                    placeholder="dd/mm/yyyy --:-- --"
                    hour12={true}
                  />
                  <p className="font-mono text-[11px] text-slate-500">
                    Value: {date2 ? date2.toISOString() : "null"}
                  </p>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-white/50 p-4 dark:border-slate-800 dark:bg-slate-900/30">
                  <Label className="text-xs font-bold text-slate-500 uppercase">
                    3. Date Only Picker
                  </Label>
                  <DateTimePicker value={date3} onChange={setDate3} showTime={false} />
                  <p className="font-mono text-[11px] text-slate-500">
                    Value: {date3 ? date3.toISOString() : "null"}
                  </p>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-white/50 p-4 dark:border-slate-800 dark:bg-slate-900/30">
                  <Label className="text-xs font-bold text-emerald-600 uppercase">
                    4. Mentor Theme (Green, Step 15)
                  </Label>
                  <DateTimePicker
                    value={date4}
                    onChange={setDate4}
                    themeVariant="mentor"
                    minuteStep={15}
                  />
                  <p className="font-mono text-[11px] text-slate-500">
                    Value: {date4 ? date4.toISOString() : "null"}
                  </p>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-white/50 p-4 dark:border-slate-800 dark:bg-slate-900/30">
                  <Label className="text-xs font-bold text-blue-600 uppercase">
                    5. User Theme (Blue, Limit +7 Days)
                  </Label>
                  <DateTimePicker
                    value={date5}
                    onChange={setDate5}
                    themeVariant="user"
                    minDate={new Date()}
                    maxDate={addDays(new Date(), 7)}
                  />
                  <p className="font-mono text-[11px] text-slate-500">
                    Value: {date5 ? date5.toISOString() : "null"}
                  </p>
                </div>

                <div className="flex flex-col justify-center space-y-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/10">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    💡 Test Tips:
                  </h4>
                  <ul className="list-inside list-disc space-y-1 text-[11px] text-slate-500">
                    <li>{t("sharedMediatoolkitplaygroundpage.testTip1")}</li>
                    <li>{t("sharedMediatoolkitplaygroundpage.testTip2")}</li>
                    <li>{t("sharedMediatoolkitplaygroundpage.testTip3")}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ╔═══ Demo 1: Dashboard Mode ════════════════════════════════════════════════════ */}
          <Card>
            <CardHeader>
              <CardTitle>{t("sharedMediatoolkitplaygroundpage.demo1Title")}</CardTitle>
              <CardDescription>
                {t("sharedMediatoolkitplaygroundpage.demo1Description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Transport */}
              <div className="flex flex-wrap gap-2">
                <span className="flex items-center text-xs font-semibold text-slate-500">
                  {t("sharedMediatoolkitplaygroundpage.uploaderTransportLabel")}
                </span>
                {(["mock", "xhr"] as UploadTransportMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                      transportMode === mode
                        ? "border-[#0047AB] bg-[#DCEEFF] text-[#0047AB]"
                        : "border-slate-300 text-slate-600 hover:border-slate-400"
                    )}
                    onClick={() => setTransportMode(mode)}>
                    {mode === "mock"
                      ? t("sharedMediatoolkitplaygroundpage.uploaderTransportMock")
                      : t("sharedMediatoolkitplaygroundpage.uploaderTransportXhr")}
                  </button>
                ))}
              </div>

              {transportMode === "xhr" && (
                <div className="space-y-2">
                  <Label htmlFor="uploader-endpoint-d1">
                    {t("sharedMediatoolkitplaygroundpage.uploaderEndpointUrl")}
                  </Label>
                  <Input
                    id="uploader-endpoint-d1"
                    value={uploadEndpoint}
                    onChange={(event) => setUploadEndpoint(event.target.value)}
                    placeholder={t("sharedMediatoolkitplaygroundpage.exampleUrl")}
                  />
                </div>
              )}

              {/* Plugin toggles */}
              <div className="flex flex-wrap gap-2">
                <span className="flex items-center text-xs font-semibold text-slate-500">
                  {t("sharedMediatoolkitplaygroundpage.uploaderPluginsLabel")}
                </span>
                {(
                  [
                    {
                      label: t("sharedMediatoolkitplaygroundpage.uploaderPluginImageEditor"),
                      value: enableImageEditor,
                      setter: setEnableImageEditor,
                      id: "toggle-image-editor",
                    },
                    {
                      label: t("sharedMediatoolkitplaygroundpage.uploaderPluginCompressor"),
                      value: enableCompressor,
                      setter: setEnableCompressor,
                      id: "toggle-compressor",
                    },
                    {
                      label: t("sharedMediatoolkitplaygroundpage.uploaderPluginWebcam"),
                      value: enableWebcam,
                      setter: setEnableWebcam,
                      id: "toggle-webcam",
                    },
                    {
                      label: t("sharedMediatoolkitplaygroundpage.uploaderPluginScreenCapture"),
                      value: enableScreenCapture,
                      setter: setEnableScreenCapture,
                      id: "toggle-screen-capture",
                    },
                  ] as const
                ).map(({ label, value, setter, id }) => (
                  <label
                    key={id}
                    htmlFor={id}
                    className={cn(
                      "flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                      value
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                        : "border-slate-300 text-slate-600"
                    )}>
                    <input
                      id={id}
                      type="checkbox"
                      className="h-3 w-3"
                      checked={value}
                      onChange={(e) => setter(e.target.checked)}
                    />
                    {label}
                  </label>
                ))}
                <label
                  htmlFor="toggle-sequential"
                  className={cn(
                    "flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                    sequentialUpload
                      ? "border-blue-400 bg-blue-50 text-blue-700"
                      : "border-slate-300 text-slate-600"
                  )}>
                  <input
                    id="toggle-sequential"
                    type="checkbox"
                    className="h-3 w-3"
                    checked={sequentialUpload}
                    onChange={(e) => setSequentialUpload(e.target.checked)}
                  />
                  {t("sharedMediatoolkitplaygroundpage.uploaderSequentialUpload")}
                </label>
                <label
                  htmlFor="toggle-bundle"
                  className={cn(
                    "flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                    bundleUpload
                      ? "border-blue-400 bg-blue-50 text-blue-700"
                      : "border-slate-300 text-slate-600"
                  )}>
                  <input
                    id="toggle-bundle"
                    type="checkbox"
                    className="h-3 w-3"
                    checked={bundleUpload}
                    onChange={(e) => setBundleUpload(e.target.checked)}
                  />
                  {t("sharedMediatoolkitplaygroundpage.uploaderBundleUpload")}
                </label>
              </div>

              <UniversalMediaUploader
                displayMode="dashboard"
                preset="mixed"
                transportMode={transportMode}
                endpoint={uploadEndpoint || undefined}
                sequentialUpload={sequentialUpload}
                bundleUpload={bundleUpload}
                enableImageEditor={enableImageEditor}
                enableCompressor={enableCompressor}
                enableWebcam={enableWebcam}
                enableScreenCapture={enableScreenCapture}
                maxFileSizeMB={50}
                maxNumberOfFiles={50}
                themeVariant="default"
                onUploadComplete={(files) => toast.success(`Uploaded ${files.length} file(s)!`)}
              />

              <p className="text-xs text-slate-400 italic">
                {t("sharedMediatoolkitplaygroundpage.uploaderCtrlVTip")}
              </p>
            </CardContent>
          </Card>

          {/* ╔═══ Demo 2: Display Mode Switcher ═══════════════════════════════════════════════ */}
          <Card>
            <CardHeader>
              <CardTitle>{t("sharedMediatoolkitplaygroundpage.demo2Title")}</CardTitle>
              <CardDescription>
                {t("sharedMediatoolkitplaygroundpage.demo2Description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(["dashboard", "dropzone", "compact"] as UploaderDisplayMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={cn(
                      "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                      activeDisplayMode === mode
                        ? "border-[#0047AB] bg-[#DCEEFF] text-[#0047AB]"
                        : "border-slate-300 text-slate-600 hover:border-slate-400"
                    )}
                    onClick={() => setActiveDisplayMode(mode)}>
                    {mode}
                  </button>
                ))}
              </div>

              <div
                className={cn(
                  "rounded-xl border p-4",
                  activeDisplayMode === "dashboard" && "min-h-[480px]",
                  activeDisplayMode === "dropzone" && "max-w-md",
                  activeDisplayMode === "compact" && "max-w-xs"
                )}>
                <UniversalMediaUploader
                  key={activeDisplayMode}
                  displayMode={activeDisplayMode}
                  preset="mixed"
                  transportMode="mock"
                />
              </div>
            </CardContent>
          </Card>

          {/* ╔═══ Demo 3: Theme Variants ════════════════════════════════════════════════════════════ */}
          <Card>
            <CardHeader>
              <CardTitle>{t("sharedMediatoolkitplaygroundpage.demo3Title")}</CardTitle>
              <CardDescription>
                {t("sharedMediatoolkitplaygroundpage.demo3Description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { value: "default", label: "Default (Navy)", color: "#0047AB" },
                    { value: "user", label: "User (Blue)", color: "#007BFF" },
                    { value: "mentor", label: "Mentor (Green)", color: "#059669" },
                    { value: "admin", label: "Admin (Indigo)", color: "#4f46e5" },
                  ] as { value: UploaderThemeVariant; label: string; color: string }[]
                ).map(({ value, label, color }) => (
                  <button
                    key={value}
                    type="button"
                    className={cn(
                      "rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all",
                      activeTheme === value ? "shadow-md" : "opacity-70 hover:opacity-100"
                    )}
                    style={{
                      borderColor: color,
                      backgroundColor: activeTheme === value ? `${color}18` : "transparent",
                      color,
                    }}
                    onClick={() => setActiveTheme(value)}>
                    {label}
                  </button>
                ))}
              </div>

              <UniversalMediaUploader
                key={activeTheme}
                displayMode="dashboard"
                preset="mixed"
                transportMode="mock"
                themeVariant={activeTheme}
                height={380}
              />
            </CardContent>
          </Card>

          {/* ╔═══ Demo 4: Preset Showcase ════════════════════════════════════════════════════════════════════ */}
          <Card>
            <CardHeader>
              <CardTitle>{t("sharedMediatoolkitplaygroundpage.demo4Title")}</CardTitle>
              <CardDescription>
                {t("sharedMediatoolkitplaygroundpage.demo4Description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    "single-image",
                    "multi-image",
                    "single-pdf",
                    "multi-pdf",
                    "mixed",
                  ] as UploaderPreset[]
                ).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={cn(
                      "rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors",
                      activePreset === p
                        ? "border-violet-500 bg-violet-50 text-violet-700"
                        : "border-slate-300 text-slate-600 hover:border-slate-400"
                    )}
                    onClick={() => setActivePreset(p)}>
                    {p}
                  </button>
                ))}
              </div>

              <div className="rounded-md border bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600 dark:bg-slate-900/40">
                {`<UniversalMediaUploader preset="${activePreset}" />`}
              </div>

              <UniversalMediaUploader
                key={activePreset}
                displayMode="dashboard"
                preset={activePreset}
                transportMode="mock"
                height={380}
              />
            </CardContent>
          </Card>

          {/* ═══ Demo 5: Dropzone & Compact in forms ══════════════════════════ */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("sharedMediatoolkitplaygroundpage.demo5aTitle")}</CardTitle>
                <CardDescription>
                  {t("sharedMediatoolkitplaygroundpage.demo5aDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UniversalMediaUploader
                  displayMode="dropzone"
                  preset="single-pdf"
                  transportMode="mock"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("sharedMediatoolkitplaygroundpage.demo5bTitle")}</CardTitle>
                <CardDescription>
                  {t("sharedMediatoolkitplaygroundpage.demo5bDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Label>{t("sharedMediatoolkitplaygroundpage.demo5bProfilePhoto")}</Label>
                <UniversalMediaUploader
                  displayMode="compact"
                  preset="single-image"
                  transportMode="mock"
                />
              </CardContent>
            </Card>
          </div>

          {/* ╔═══ Demo 6: FormMediaUploader (react-hook-form) ══════════════════════════════════════════════ */}
          <Card>
            <CardHeader>
              <CardTitle>{t("sharedMediatoolkitplaygroundpage.demo6Title")}</CardTitle>
              <CardDescription>
                {t("sharedMediatoolkitplaygroundpage.demo6Description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                onSubmit={demoForm.handleSubmit(() =>
                  toast.success(`Form submitted with ${(demoFormFiles ?? []).length} file(s)!`)
                )}
                className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{t("sharedMediatoolkitplaygroundpage.demo6SupportingDocs")}</Label>
                  <FormMediaUploader
                    control={demoForm.control}
                    name="files"
                    displayMode="dropzone"
                    preset="multi-pdf"
                    transportMode="mock"
                    rules={{
                      required: t("sharedMediatoolkitplaygroundpage.demo6ValidationRequired"),
                    }}
                  />
                </div>

                {demoFormFiles && demoFormFiles.length > 0 && (
                  <div className="rounded-md border bg-green-50/60 p-3 text-xs text-green-700 dark:bg-green-950/20 dark:text-green-300">
                    <p className="font-semibold">
                      {t("sharedMediatoolkitplaygroundpage.demo6WatchLabel")}
                    </p>
                    <ul className="mt-1 list-inside list-disc">
                      {demoFormFiles.map((f, i) => (
                        <li key={i}>
                          {f.name} — {(f.size / 1024).toFixed(1)} KB
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button type="submit">
                    {t("sharedMediatoolkitplaygroundpage.demo6SubmitForm")}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => demoForm.reset()}>
                    {t("sharedMediatoolkitplaygroundpage.demo6Reset")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("sharedMediatoolkitplaygroundpage.2FlexiblePdfPreview")}</CardTitle>
                <CardDescription>
                  {t("sharedMediatoolkitplaygroundpage.defaultLoadPdfFetchAuth")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPdfSource(TEMP_PDF_URL)}>
                    {t("general.text")}
                  </Button>
                  <Label
                    htmlFor="local-pdf-input"
                    className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-900">
                    <FileText className="h-4 w-4" />
                    {t("sharedMediatoolkitplaygroundpage.selectPdfLocal")}
                  </Label>
                  <Input
                    id="local-pdf-input"
                    type="file"
                    className="hidden"
                    accept=".pdf,application/pdf"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) {
                        return;
                      }

                      setPdfSource(file);
                      setPdfRequireAuth(false);
                      event.target.value = "";
                    }}
                  />
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={pdfRequireAuth}
                    onChange={(event) => setPdfRequireAuth(event.target.checked)}
                    disabled={!(typeof pdfSource === "string")}
                  />
                  {t("sharedMediatoolkitplaygroundpage.requireAuthorizationWhenDownloadingFrom")}
                </label>

                <PdfPreviewViewer source={pdfSource} requireAuth={pdfRequireAuth} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("sharedMediatoolkitplaygroundpage.3PreviewEnlargedImage")}</CardTitle>
                <CardDescription>
                  {t("sharedMediatoolkitplaygroundpage.quickComponentClickToFullscreen")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ImageZoomPreview
                  src={preferredImageItem?.src ?? TEMP_IMAGE_URL}
                  alt={t("sharedMediatoolkitplaygroundpage.zoomDemoImage")}
                  title={t("sharedMediatoolkitplaygroundpage.seeEnlargedPhoto")}
                  className="w-full"
                  imageClassName="max-h-96"
                  requireAuth={false}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>4. File Upload Input (Reusable Input Component)</CardTitle>
                <CardDescription>
                  Interactive test for the generic <code>FileUploadInput</code> component supporting
                  single-file selection, local thumbnail previews, format-specific icons, and clear
                  triggers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-semibold text-slate-500">
                    Cấu hình định dạng accept:
                  </span>
                  <Button
                    type="button"
                    variant={demoFileType === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setDemoFileType("all");
                      setDemoFile(null);
                      setDemoFileUrl(null);
                    }}>
                    Tất cả (All)
                  </Button>
                  <Button
                    type="button"
                    variant={demoFileType === "image" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setDemoFileType("image");
                      setDemoFile(null);
                      setDemoFileUrl(null);
                    }}>
                    Chỉ ảnh (Image)
                  </Button>
                  <Button
                    type="button"
                    variant={demoFileType === "pdf" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setDemoFileType("pdf");
                      setDemoFile(null);
                      setDemoFileUrl(null);
                    }}>
                    Chỉ PDF (PDF)
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDemoFileUrl(TEMP_IMAGE_URL);
                      setDemoFile(null);
                    }}>
                    Simulate Server Image URL
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDemoFileUrl(TEMP_PDF_URL);
                      setDemoFile(null);
                    }}>
                    Simulate Server PDF URL
                  </Button>
                </div>

                <div className="rounded-xl border bg-slate-50 p-4 dark:bg-slate-900/40">
                  <FileUploadInput
                    id="demo-file-upload-input"
                    label="Tải lên tài liệu hoặc ảnh"
                    fileType={demoFileType}
                    currentFileUrl={demoFileUrl}
                    fileName={demoFileUrl ? "server_document_preview" : undefined}
                    error={demoFileError}
                    placeholder={`Chọn một file (${demoFileType.toUpperCase()})...`}
                    onFileChange={(file) => {
                      setDemoFile(file);
                      if (file) {
                        setDemoFileError(undefined);
                      }
                    }}
                    onClear={() => {
                      setDemoFile(null);
                      setDemoFileUrl(null);
                    }}
                  />
                </div>

                {demoFile && (
                  <div className="rounded-md border bg-green-50/50 p-3 text-xs text-green-800 dark:bg-green-950/20 dark:text-green-300">
                    <p className="font-semibold">Local file selected successfully:</p>
                    <ul className="mt-1 list-inside list-disc">
                      <li>Name: {demoFile.name}</li>
                      <li>Size: {(demoFile.size / 1024).toFixed(2)} KB</li>
                      <li>Mime Type: {demoFile.type}</li>
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>5. CV Upload Modal (PDF-Only Uploader Dialog)</CardTitle>
                <CardDescription>
                  Interactive test for the popup <code>CVUploadModal</code> component. Click the
                  button to trigger a standard PDF-restricted dialog displaying current files and
                  parsing previews.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 rounded-xl border bg-slate-50 p-4 dark:bg-slate-900/40">
                  <div>
                    <span className="text-xs font-medium text-slate-500">
                      Trạng thái CV hiện tại trên server:
                    </span>
                    <p className="mt-1 text-sm font-semibold">
                      {cvUrl ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          Đã tải lên ({cvName || "CV.pdf"})
                        </span>
                      ) : (
                        <span className="text-red-500">Chưa có CV nào</span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" onClick={() => setCvModalOpen(true)}>
                      Mở CV Upload Modal
                    </Button>
                    {cvUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setCvUrl(null);
                          setCvName(null);
                        }}>
                        Xóa CV hiện tại
                      </Button>
                    )}
                  </div>
                </div>

                <CVUploadModal
                  isOpen={cvModalOpen}
                  onOpenChange={setCvModalOpen}
                  currentCvUrl={cvUrl}
                  currentCvName={cvName}
                  isUploading={cvUploading}
                  onUpload={handleCvUploadMock}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                {t("sharedMediatoolkitplaygroundpage.fullscreenViewerMultiple")}
              </CardTitle>
              <CardDescription>
                {t("sharedMediatoolkitplaygroundpage.supportNextPrevZoomRotate")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mediaItems.length === 0 ? (
                <p className="text-sm text-slate-500">{t("common.notYet")}</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {mediaItems.map((item, index) => {
                    const itemKind = item.kind ?? inferFileKind(item);

                    return (
                      <div key={item.id} className="overflow-hidden rounded-lg border bg-white">
                        <div className="flex h-36 items-center justify-center bg-slate-100 dark:bg-slate-900">
                          {itemKind === "image" && item.src ? (
                            <img
                              src={item.src}
                              alt={item.alt ?? item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : itemKind === "image" ? (
                            <ImageIcon className="h-8 w-8 text-slate-500" />
                          ) : itemKind === "pdf" ? (
                            <FileText className="h-8 w-8 text-rose-500" />
                          ) : (
                            <Link2 className="h-8 w-8 text-slate-500" />
                          )}
                        </div>

                        <div className="space-y-2 p-3">
                          <p className="line-clamp-2 text-sm font-medium">{item.name}</p>
                          <Badge variant="outline">{itemKind.toUpperCase()}</Badge>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => handleOpenViewer(index)}>
                            {t("sharedMediatoolkitplaygroundpage.openFullscreen")}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <MediaLightboxDialog
                open={viewerOpen}
                onOpenChange={setViewerOpen}
                items={mediaItems}
                initialIndex={viewerIndex}
              />
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
