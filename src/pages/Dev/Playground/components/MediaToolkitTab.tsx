import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { HomepageHeader } from "@/components/homepage-redesign";
import { Footer } from "@/components/layouts";
import { FormMediaUploader, UniversalMediaUploader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import type { UploaderPreset } from "@/components/shared";

export function MediaToolkitTab() {
  const { t } = useTranslation();

  // ── Uploader Demo 1: Dashboard mode controls
  const [enableWebcam, setEnableWebcam] = useState(false);
  const [enableScreenCapture, setEnableScreenCapture] = useState(false);
  const [enableImageEditor, setEnableImageEditor] = useState(true);

  // ── Demo 2: Modal mode form and config (formerly Demo 7)
  const demo2Form = useForm<{ files: File[] }>();
  // eslint-disable-next-line react-hooks/incompatible-library
  const demo2FormFiles = demo2Form.watch("files") as File[] | undefined;
  const [demo2Preset, setDemo2Preset] = useState<UploaderPreset>("mixed");
  const [demo2EnableWebcam, setDemo2EnableWebcam] = useState(true);
  const [demo2EnableScreenCapture, setDemo2EnableScreenCapture] = useState(true);
  const [demo2EnableImageEditor, setDemo2EnableImageEditor] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 dark:bg-slate-950">
      <HomepageHeader />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">UniversalMediaUploader Playground (DEV)</CardTitle>
              <CardDescription>
                {t("sharedMediatoolkitplaygroundpage.playgroundUploaderDesc")}
              </CardDescription>
            </CardHeader>
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
              </div>

              <UniversalMediaUploader
                displayMode="dashboard"
                preset="mixed"
                enableImageEditor={enableImageEditor}
                enableWebcam={enableWebcam}
                enableScreenCapture={enableScreenCapture}
                maxFileSizeMB={10}
                maxNumberOfFiles={50}
                themeVariant="default"
              />

              <p className="text-xs text-slate-400 italic">
                {t("sharedMediatoolkitplaygroundpage.uploaderCtrlVTip")}
              </p>
            </CardContent>
          </Card>

          {/* ╔═══ Demo 2: Modal Uploader Deep Test ═══════════════════════════════════════════════════ */}
          <Card id="demo-2-modal">
            <CardHeader>
              <CardTitle>{t("sharedMediatoolkitplaygroundpage.demo7Title")}</CardTitle>
              <CardDescription>
                {t("sharedMediatoolkitplaygroundpage.demo7Description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Configuration Sandbox for Modal */}
              <div className="rounded-lg border bg-slate-50 p-4 dark:bg-slate-900">
                <div className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t("sharedMediatoolkitplaygroundpage.demo7ConfigTitle")}
                </div>

                <div className="space-y-4">
                  {/* Preset Selector */}
                  <div>
                    <Label className="mb-2 block text-xs text-slate-500">
                      {t("sharedMediatoolkitplaygroundpage.demo7ConfigPreset")}
                    </Label>
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
                            demo2Preset === p
                              ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                              : "border-slate-300 text-slate-600 hover:border-slate-400"
                          )}
                          onClick={() => setDemo2Preset(p)}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Plugins Toggle */}
                  <div>
                    <Label className="mb-2 block text-xs text-slate-500">Plugins</Label>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          {
                            label: t("sharedMediatoolkitplaygroundpage.demo7ConfigEditor"),
                            value: demo2EnableImageEditor,
                            setter: setDemo2EnableImageEditor,
                            id: "demo2-toggle-image-editor",
                          },
                          {
                            label: t("sharedMediatoolkitplaygroundpage.demo7ConfigWebcam"),
                            value: demo2EnableWebcam,
                            setter: setDemo2EnableWebcam,
                            id: "demo2-toggle-webcam",
                          },
                          {
                            label: t("sharedMediatoolkitplaygroundpage.demo7ConfigScreenCapture"),
                            value: demo2EnableScreenCapture,
                            setter: setDemo2EnableScreenCapture,
                            id: "demo2-toggle-screen-capture",
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
                    </div>
                  </div>
                </div>
              </div>

              <form
                onSubmit={demo2Form.handleSubmit(() =>
                  toast.success(
                    `Demo Modal Form submitted with ${(demo2FormFiles ?? []).length} file(s)!`
                  )
                )}
                className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{t("sharedMediatoolkitplaygroundpage.demo7SupportingDocs")}</Label>
                  <FormMediaUploader
                    key={`modal-${demo2Preset}-${demo2EnableWebcam}-${demo2EnableImageEditor}-${demo2EnableScreenCapture}`}
                    control={demo2Form.control}
                    name="files"
                    displayMode="modal"
                    preset={demo2Preset}
                    enableImageEditor={demo2EnableImageEditor}
                    enableWebcam={demo2EnableWebcam}
                    enableScreenCapture={demo2EnableScreenCapture}
                    rules={{
                      required: t("sharedMediatoolkitplaygroundpage.demo7ValidationRequired"),
                    }}
                  />
                </div>

                {demo2FormFiles && demo2FormFiles.length > 0 && (
                  <div className="rounded-md border bg-indigo-50/60 p-3 text-xs text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-300">
                    <p className="font-semibold">
                      {t("sharedMediatoolkitplaygroundpage.demo7WatchLabel")}
                    </p>
                    <ul className="mt-1 list-inside list-disc">
                      {demo2FormFiles.map((f, i) => (
                        <li key={i}>
                          {f.name} — {(f.size / 1024).toFixed(1)} KB
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button type="submit">
                    {t("sharedMediatoolkitplaygroundpage.demo7SubmitForm")}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => demo2Form.reset()}>
                    {t("sharedMediatoolkitplaygroundpage.demo7Reset")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
