import { Button } from "@/components/ui/button";
import { CodeReviewEditor } from "@/components/ui/code-review-editor";
import { CodingEditor } from "@/components/ui/coding-editor";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QuizEditor } from "@/components/ui/quiz-editor";
import { ScoreInput } from "@/components/ui/score-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  ChevronLeft,
  Clock,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { getAvailableRoundsTemplates } from "./constants";
import type { RoundType, UIRound, UIRoundConfig } from "./types";
import { getBestConnection, getDistanceToSegment } from "./utils";

export interface RoundCanvasEditorWorkspaceProps {
  isOpen?: boolean;
  onClose: () => void;
  initialRounds: UIRound[];
  onSave: (
    rounds: UIRound[],
    metadata: { name: string; category: string; description: string }
  ) => Promise<void>;
  isSaving?: boolean;
  showMetadataInputs?: boolean;
  initialMetadata?: { name: string; category: string; description: string };
  title?: string;
}

export function RoundCanvasEditorWorkspace({
  isOpen = true,
  onClose,
  initialRounds,
  onSave,
  isSaving = false,
  showMetadataInputs = false,
  initialMetadata = { name: "", category: "", description: "" },
  title,
}: RoundCanvasEditorWorkspaceProps) {
  const { t } = useTranslation();
  const AVAILABLE_ROUNDS_TEMPLATES = useMemo(() => getAvailableRoundsTemplates(t), [t]);

  const [templateName, setTemplateName] = useState(initialMetadata.name);
  const [templateCategory, setTemplateCategory] = useState(initialMetadata.category);
  const [templateDescription, setTemplateDescription] = useState(initialMetadata.description);
  const [rounds, setRounds] = useState<UIRound[]>([]);
  const [positions, setPositions] = useState<{ x: number; y: number }[]>([]);

  useEffect(() => {
    if (isOpen) {
      setTemplateName(initialMetadata.name);
      setTemplateCategory(initialMetadata.category);
      setTemplateDescription(initialMetadata.description);
      setRounds(JSON.parse(JSON.stringify(initialRounds)));
    }
  }, [
    isOpen,
    initialMetadata.name,
    initialMetadata.category,
    initialMetadata.description,
    initialRounds,
  ]);

  const [selectedRoundIndex, setSelectedRoundIndex] = useState<number | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [dialogEditingTime, setDialogEditingTime] = useState(false);

  const codingEditorRef = useRef<{
    saveCurrentProblem: () => Promise<
      | boolean
      | { ids: number[]; problems: { problemId?: number; title?: string; difficulty?: string }[] }
    >;
  }>(null);
  const codeReviewEditorRef = useRef<{
    saveCurrentProblem: () => Promise<
      | boolean
      | {
          ids: number[];
          problems: {
            problemId?: number;
            title?: string;
            difficulty?: string;
            language?: string;
          }[];
        }
    >;
  }>(null);

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const initialDataRef = useRef<{ rounds: string; name: string; category: string; desc: string }>({
    rounds: "",
    name: "",
    category: "",
    desc: "",
  });

  useEffect(() => {
    if (isOpen) {
      initialDataRef.current = {
        rounds: JSON.stringify(initialRounds),
        name: initialMetadata.name,
        category: initialMetadata.category,
        desc: initialMetadata.description,
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const hasUnsavedChanges =
    isOpen &&
    (JSON.stringify(rounds) !== initialDataRef.current.rounds ||
      templateName !== initialDataRef.current.name ||
      templateCategory !== initialDataRef.current.category ||
      templateDescription !== initialDataRef.current.desc);

  const [activeDragType, setActiveDragType] = useState<RoundType | null>(null);
  const [dragOverGap, setDragOverGap] = useState<number | null>(null);

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const [movingCardIdx, setMovingCardIdx] = useState<number | null>(null);
  const [moveOffset, setMoveOffset] = useState({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPositions((prev) => {
      const containerW = scrollContainerRef.current?.clientWidth;
      const availableWidth =
        containerW && containerW > 400
          ? containerW
          : typeof window !== "undefined"
            ? Math.max(600, window.innerWidth - 320)
            : 1000;
      const maxCols = Math.max(1, Math.floor((availableWidth - 60) / 280));

      const next = prev.slice(0, rounds.length);
      for (let i = next.length; i < rounds.length; i++) {
        const row = Math.floor(i / maxCols);
        const colInRow = i % maxCols;
        const col = row % 2 === 0 ? colInRow : maxCols - 1 - colInRow;
        next.push({ x: col * 280 + 40, y: row * 210 + 40 });
      }
      return next;
    });
  }, [rounds.length]);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(2.0, parseFloat((z + 0.15).toFixed(2))));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.4, parseFloat((z - 0.15).toFixed(2))));
  const handleZoomReset = () => setZoomLevel(1.0);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleWheelNative = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomFactor = 1.15;
        let newZoom = zoomLevel;
        if (e.deltaY < 0) {
          newZoom = Math.min(2.0, parseFloat((zoomLevel * zoomFactor).toFixed(2)));
        } else {
          newZoom = Math.max(0.4, parseFloat((zoomLevel / zoomFactor).toFixed(2)));
        }
        if (newZoom === zoomLevel) return;
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const canvasX = (mouseX + container.scrollLeft) / zoomLevel;
        const canvasY = (mouseY + container.scrollTop) / zoomLevel;
        setZoomLevel(newZoom);
        container.scrollLeft = canvasX * newZoom - mouseX;
        container.scrollTop = canvasY * newZoom - mouseY;
      }
    };
    container.addEventListener("wheel", handleWheelNative, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheelNative);
    };
  }, [zoomLevel, rounds.length, isOpen]);

  const handleBgPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if (
      (e.target as HTMLElement).closest(".round-card") ||
      (e.target as HTMLElement).closest("button")
    )
      return;
    setIsPanning(true);
    if (scrollContainerRef.current) {
      setPanStart({
        x: e.clientX,
        y: e.clientY,
        scrollLeft: scrollContainerRef.current.scrollLeft,
        scrollTop: scrollContainerRef.current.scrollTop,
      });
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handleBgPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning || !scrollContainerRef.current) return;
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    scrollContainerRef.current.scrollLeft = panStart.scrollLeft - dx;
    scrollContainerRef.current.scrollTop = panStart.scrollTop - dy;
  };

  const handleBgPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    setIsPanning(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleCanvasDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const draggedType = (e.dataTransfer.getData("text/plain") as RoundType) || activeDragType;
    if (!draggedType) return;
    const template = AVAILABLE_ROUNDS_TEMPLATES.find((t) => t.type === draggedType);
    if (!template) return;
    const newRound: UIRound = {
      name: template.title,
      roundType: draggedType,
      passThreshold: 0.8,
      configData: JSON.parse(JSON.stringify(template.defaultConfig)),
    };
    if (rounds.length === 0) {
      setRounds([newRound].map((r, idx) => ({ ...r, roundOrder: idx + 1 })));
      setPositions([{ x: 80, y: 80 }]);
      setActiveDragType(null);
      toast.success(`Đã thêm vòng ${template.title}`);
      return;
    }
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const dropX = (e.clientX - rect.left) / zoomLevel - 104;
    const dropY = (e.clientY - rect.top) / zoomLevel - 60;
    const CARD_W = 208;
    const CARD_H = 130;
    const dropCenter = { x: dropX + CARD_W / 2, y: dropY + CARD_H / 2 };
    let insertIndex = rounds.length;
    let minDistance = Infinity;
    for (let i = 0; i < rounds.length - 1; i++) {
      const from = positions[i];
      const to = positions[i + 1];
      if (from && to) {
        const cx1 = from.x + CARD_W / 2;
        const cy1 = from.y + CARD_H / 2;
        const cx2 = to.x + CARD_W / 2;
        const cy2 = to.y + CARD_H / 2;
        const dist = getDistanceToSegment(dropCenter.x, dropCenter.y, cx1, cy1, cx2, cy2);
        if (dist < minDistance) {
          minDistance = dist;
          insertIndex = i + 1;
        }
      }
    }
    const shouldInsert = minDistance < 120;
    const finalIndex = shouldInsert ? insertIndex : rounds.length;
    const updatedRounds = [...rounds];
    updatedRounds.splice(finalIndex, 0, newRound);
    const newPositions = [...positions];
    newPositions.splice(finalIndex, 0, { x: Math.max(8, dropX), y: Math.max(8, dropY) });
    setRounds(updatedRounds.map((r, idx) => ({ ...r, roundOrder: idx + 1 })));
    setPositions(newPositions);
    setActiveDragType(null);
    toast.success(`Đã thêm vòng ${template.title}`);
  };

  const handleCardPointerDown = (e: React.PointerEvent<HTMLDivElement>, idx: number) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const pos = positions[idx] ?? { x: 0, y: 0 };
    setMovingCardIdx(idx);
    setMoveOffset({ x: e.clientX / zoomLevel - pos.x, y: e.clientY / zoomLevel - pos.y });
    setDragStartPos({ x: e.clientX, y: e.clientY });
  };

  const handleCardPointerMove = (e: React.PointerEvent<HTMLDivElement>, idx: number) => {
    if (movingCardIdx !== idx) return;
    const newX = e.clientX / zoomLevel - moveOffset.x;
    const newY = e.clientY / zoomLevel - moveOffset.y;
    setPositions((prev) => {
      const next = [...prev];
      next[idx] = { x: Math.max(0, newX), y: Math.max(0, newY) };
      return next;
    });
  };

  const handleCardPointerUp = (e: React.PointerEvent<HTMLDivElement>, idx: number) => {
    if (movingCardIdx !== idx) return;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    setMovingCardIdx(null);
    const startX = dragStartPos.x;
    const startY = dragStartPos.y;
    const endX = e.clientX;
    const endY = e.clientY;
    const dist = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
    if (dist < 4) {
      setSelectedRoundIndex(idx);
      setConfigModalOpen(true);
    } else {
      const myPos = positions[idx];
      if (myPos) {
        const CARD_W = 208;
        const CARD_H = 130;
        let overlapIdx = -1;
        for (let i = 0; i < positions.length; i++) {
          if (i === idx) continue;
          const otherPos = positions[i];
          if (otherPos) {
            const isOverlapping =
              myPos.x < otherPos.x + CARD_W &&
              myPos.x + CARD_W > otherPos.x &&
              myPos.y < otherPos.y + CARD_H &&
              myPos.y + CARD_H > otherPos.y;
            if (isOverlapping) {
              overlapIdx = i;
              break;
            }
          }
        }
        if (overlapIdx !== -1) {
          const newRounds = [...rounds];
          const tempRound = newRounds[idx];
          newRounds[idx] = newRounds[overlapIdx];
          newRounds[overlapIdx] = tempRound;
          const newPositions = [...positions];
          const tempPos = newPositions[idx];
          newPositions[idx] = newPositions[overlapIdx];
          newPositions[overlapIdx] = tempPos;
          setRounds(newRounds.map((r, i) => ({ ...r, roundOrder: i + 1 })));
          setPositions(newPositions);
          toast.success(`Đã đổi vị trí vòng ${idx + 1} và vòng ${overlapIdx + 1}`);
        }
      }
    }
  };

  const handleRemoveRound = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = rounds
      .filter((_, idx) => idx !== index)
      .map((r, idx) => ({ ...r, roundOrder: idx + 1 }));
    setRounds(updated);
    const newPositions = [...positions];
    newPositions.splice(index, 1);
    setPositions(newPositions);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateRoundField = (index: number, field: keyof UIRound, value: any) => {
    const updated = [...rounds];
    updated[index] = { ...updated[index], [field]: value };
    setRounds(updated);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateRoundConfigField = (index: number, field: keyof UIRoundConfig, value: any) => {
    const updated = [...rounds];
    updated[index] = {
      ...updated[index],
      configData: {
        ...updated[index].configData,
        [field]: value,
      },
    };
    setRounds(updated);
  };

  const handleCloseAttempt = () => {
    if (hasUnsavedChanges) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };

  const handleSaveWrapper = async (forceCloseAfter = true, customRounds?: UIRound[]) => {
    if (showMetadataInputs && (!templateName.trim() || !templateCategory.trim())) {
      toast.error(t("adminCompanymanagement.nameAndCategoryRequired"));
      return;
    }
    const savingRounds = customRounds || rounds;
    await onSave(savingRounds, {
      name: templateName,
      category: templateCategory,
      description: templateDescription,
    });
    if (forceCloseAfter) {
      onClose();
    }
  };

  const selectedRound = selectedRoundIndex !== null ? rounds[selectedRoundIndex] : null;

  if (!isOpen) return null;

  return (
    <div className="relative flex h-full w-full flex-1 flex-row gap-0 overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* 1. Toolbox Sidebar (Left) */}
      <div className="flex h-full w-[28%] max-w-[340px] min-w-[300px] shrink-0 flex-col border-r border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="flex h-[64px] shrink-0 flex-col justify-center border-b border-slate-200 bg-slate-100/50 px-5 dark:border-slate-800 dark:bg-slate-900/30">
          <h3 className="text-xs font-bold tracking-wider text-slate-700 uppercase dark:text-slate-400">
            {t("adminCompanymanagement.recruitmentRoundTemplate")}
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-500">
            {t("template.dragToCenter")}
          </p>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5">
          <div className="my-auto space-y-3 py-2">
            {AVAILABLE_ROUNDS_TEMPLATES.map((template) => (
              <div
                key={template.type}
                draggable
                onDragStart={() => setActiveDragType(template.type)}
                onDragEnd={() => setActiveDragType(null)}
                className={cn(
                  "group flex cursor-grab items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 transition-all duration-200 hover:border-indigo-300 hover:bg-slate-50 hover:shadow-md active:cursor-grabbing dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-indigo-700 dark:hover:bg-slate-900",
                  template.bgColor,
                  template.color
                )}>
                <div className="mt-0.5 shrink-0 rounded-xl bg-slate-100 p-2 shadow-inner dark:bg-black/40">
                  {template.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm leading-tight font-bold text-slate-800 transition-colors group-hover:text-slate-950 dark:text-slate-200 dark:group-hover:text-white">
                    {template.title}
                  </h4>
                  <p className="mt-1 text-xs leading-normal text-slate-500 group-hover:text-slate-600 dark:text-slate-400 dark:group-hover:text-slate-300">
                    {template.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Main Editor Area (Center Header + Canvas Studio) */}
      <div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
        {/* Studio Top Header Toolbar */}
        <div className="flex h-[64px] shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={handleCloseAttempt}
              className="h-8 w-8 shrink-0 border-slate-200 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
              title={t("common.goBack")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {showMetadataInputs ? (
              <div className="flex max-w-2xl flex-1 items-center gap-2">
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder={t("adminCompanymanagement.templateNamePlaceholder")}
                  className="h-8 border-slate-200 bg-slate-50 text-xs font-bold dark:border-slate-800 dark:bg-slate-950"
                />
                <Input
                  value={templateCategory}
                  onChange={(e) => setTemplateCategory(e.target.value)}
                  placeholder={t("template.categoryRequired")}
                  className="h-8 w-36 border-slate-200 bg-slate-50 text-xs dark:border-slate-800 dark:bg-slate-950"
                />
                <Input
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder={t("template.descriptionPlaceholder")}
                  className="hidden h-8 flex-1 border-slate-200 bg-slate-50 text-xs md:block dark:border-slate-800 dark:bg-slate-950"
                />
              </div>
            ) : (
              <div className="min-w-0">
                <div className="flex items-center gap-1 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  <Sparkles className="h-3 w-3 text-indigo-500" />
                  {title || t("adminCompanymanagement.recruitmentRoundTemplate")}
                </div>
                <h1 className="truncate text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                  {initialMetadata.name || "Chỉnh sửa quy trình vòng tuyển dụng"}
                </h1>
              </div>
            )}
          </div>

          {/* Zoom controls & Save action buttons */}
          <div className="flex shrink-0 items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {rounds.length} {t("userApplicationhistory.rounds")}
              </span>
              <div className="flex items-center gap-0.5 rounded-full border border-slate-200 bg-slate-50 px-1.5 py-1 dark:border-slate-700 dark:bg-slate-800">
                <button
                  onClick={handleZoomOut}
                  title={t("adminCompanymanagement.zoomOut")}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white">
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-[36px] text-center text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  title={t("adminCompanymanagement.zoomIn")}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white">
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleZoomReset}
                  title={t("adminCompanymanagement.resetZoom")}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white">
                  <RotateCcw className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

            <Button
              variant="outline"
              onClick={handleCloseAttempt}
              className="h-8 border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => handleSaveWrapper(true)}
              disabled={isSaving}
              className="h-8 gap-1.5 bg-indigo-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-indigo-700">
              <Save className="h-3.5 w-3.5" />
              {isSaving ? t("common.saving") : t("template.saveTemplate")}
            </Button>
          </div>
        </div>

        {/* Canvas viewport */}
        <div className="flex min-h-0 flex-1 overflow-hidden bg-slate-100 dark:bg-slate-950">
          {rounds.length === 0 ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverGap(0);
              }}
              onDragLeave={() => setDragOverGap(null)}
              onDrop={handleCanvasDrop}
              className="flex flex-1 items-center justify-center p-8 select-none">
              <div
                className={cn(
                  "flex h-52 w-96 flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition-all duration-300",
                  dragOverGap === 0
                    ? "border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/30"
                    : "border-slate-300 bg-white/60 dark:border-slate-700 dark:bg-slate-900/20"
                )}>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                  <ArrowRight className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                </div>
                <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400">
                  {t("template.emptyTemplate")}
                </h4>
                <p className="mt-1.5 max-w-[200px] text-xs leading-relaxed text-slate-400 dark:text-slate-500">
                  {t("userApplicationhistory.rounds")} từ cột bên trái và thả vào đây để thiết lập
                </p>
              </div>
            </div>
          ) : (
            <div
              ref={scrollContainerRef}
              className={cn(
                "relative h-full w-full overflow-auto select-none",
                isPanning ? "cursor-grabbing" : "cursor-grab"
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleCanvasDrop}
              onPointerDown={handleBgPointerDown}
              onPointerMove={handleBgPointerMove}
              onPointerUp={handleBgPointerUp}>
              {(() => {
                const baseWidth = Math.max(
                  2400,
                  positions.reduce((m, p) => Math.max(m, (p?.x ?? 0) + 280), 0) + 200
                );
                const baseHeight = Math.max(
                  1600,
                  positions.reduce((m, p) => Math.max(m, (p?.y ?? 0) + 180), 0) + 200
                );
                return (
                  <div
                    style={{
                      width: `${baseWidth * zoomLevel}px`,
                      height: `${baseHeight * zoomLevel}px`,
                      position: "relative",
                    }}>
                    <div
                      ref={canvasRef}
                      style={{
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: "top left",
                        width: `${baseWidth}px`,
                        height: `${baseHeight}px`,
                        position: "absolute",
                        top: 0,
                        left: 0,
                      }}>
                      {/* SVG arrow connections */}
                      {rounds.length > 1 && (
                        <svg
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            pointerEvents: "none",
                            overflow: "visible",
                          }}>
                          <defs>
                            <marker
                              id="arrow-head"
                              markerWidth="8"
                              markerHeight="8"
                              refX="6"
                              refY="3"
                              orient="auto">
                              <path d="M0,0 L0,6 L6,3 z" fill="#94a3b8" />
                            </marker>
                          </defs>
                          {rounds.slice(0, -1).map((_, idx) => {
                            const from = positions[idx];
                            const to = positions[idx + 1];
                            if (!from || !to) return null;
                            const conn = getBestConnection(from, to);
                            return (
                              <path
                                key={idx}
                                d={`M ${conn.x1} ${conn.y1} C ${conn.cp1x} ${conn.cp1y}, ${conn.cp2x} ${conn.cp2y}, ${conn.x2} ${conn.y2}`}
                                stroke="#94a3b8"
                                strokeWidth="1.8"
                                strokeDasharray="6 4"
                                fill="none"
                                markerEnd="url(#arrow-head)"
                              />
                            );
                          })}
                        </svg>
                      )}

                      {/* Round cards */}
                      {rounds.map((round, idx) => {
                        const containerW = scrollContainerRef.current?.clientWidth;
                        const availableWidth =
                          containerW && containerW > 400
                            ? containerW
                            : typeof window !== "undefined"
                              ? Math.max(600, window.innerWidth - 320)
                              : 1000;
                        const maxCols = Math.max(1, Math.floor((availableWidth - 60) / 280));
                        const row = Math.floor(idx / maxCols);
                        const colInRow = idx % maxCols;
                        const col = row % 2 === 0 ? colInRow : maxCols - 1 - colInRow;

                        const pos = positions[idx] ?? {
                          x: col * 280 + 40,
                          y: row * 210 + 40,
                        };
                        const template = AVAILABLE_ROUNDS_TEMPLATES.find(
                          (t) => t.type === round.roundType
                        );
                        const isSelected = selectedRoundIndex === idx;
                        const isMovingThis = movingCardIdx === idx;
                        return (
                          <div
                            key={idx}
                            style={{
                              position: "absolute",
                              left: pos.x,
                              top: pos.y,
                              width: 208,
                              zIndex: isMovingThis ? 50 : isSelected ? 10 : 1,
                              cursor: isMovingThis ? "grabbing" : "grab",
                              userSelect: "none",
                              touchAction: "none",
                            }}
                            className={cn(
                              "round-card group rounded-2xl border bg-white p-4 shadow-md transition-shadow duration-150 dark:bg-slate-900/80 dark:shadow-lg",
                              isSelected
                                ? "border-blue-400 shadow-xl ring-2 ring-blue-400/30 dark:border-blue-500"
                                : "border-slate-200 hover:border-slate-300 hover:shadow-xl dark:border-slate-800 dark:hover:border-slate-600",
                              isMovingThis ? "shadow-2xl" : ""
                            )}
                            onPointerDown={(e) => handleCardPointerDown(e, idx)}
                            onPointerMove={(e) => handleCardPointerMove(e, idx)}
                            onPointerUp={(e) => handleCardPointerUp(e, idx)}>
                            <div className="absolute -top-3 -left-3 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-800 shadow-md dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                              {idx + 1}
                            </div>

                            <button
                              onClick={(e) => handleRemoveRound(idx, e)}
                              className="absolute -top-2.5 -right-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 opacity-0 shadow-md transition-all group-hover:opacity-100 hover:border-red-300 hover:bg-red-50 hover:text-red-500 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-red-800 dark:hover:bg-red-950 dark:hover:text-red-400"
                              title={t("adminCompanymanagement.deleteRound")}>
                              <Trash2 className="h-3 w-3" />
                            </button>

                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "rounded-xl p-2",
                                  template?.bgColor,
                                  template?.color
                                )}>
                                {template?.icon}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="truncate text-sm font-bold text-slate-800 dark:text-slate-200">
                                  {round.name}
                                </h4>
                                <p className="mt-0.5 text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                  {template?.title}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-500 dark:border-slate-800/40 dark:text-slate-400">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 opacity-60" />
                                <span>
                                  {round.configData?.timeLimitMinutes
                                    ? round.roundType === "MENTOR_REVIEW" ||
                                      round.roundType === "MENTROR_REVIEW"
                                      ? `${round.configData.timeLimitMinutes / 1440} ngày`
                                      : `${round.configData.timeLimitMinutes}p`
                                    : "∞"}
                                </span>
                              </div>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {t("common.obtain")}{" "}
                                {Math.round((round.passThreshold ?? 0.8) * 100)}%
                              </span>
                            </div>

                            {round.roundType === "QUIZ" &&
                              (!round.configData?.quizQuestions ||
                                round.configData.quizQuestions.length === 0) && (
                                <div className="mt-2 flex items-center gap-1 rounded-lg border border-amber-500/20 bg-amber-500/10 p-1.5 text-[10px] font-medium text-amber-500">
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                  <span>{t("adminCompanymanagement.noQuestionsYet")}</span>
                                </div>
                              )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* 3. Sub-modal configuration dialog for selected round card */}
      {selectedRoundIndex !== null && selectedRound && (
        <Dialog
          open={configModalOpen}
          onOpenChange={(open) => {
            setConfigModalOpen(open);
            if (!open) setSelectedRoundIndex(null);
          }}>
          <DialogContent
            showCloseButton={false}
            onOpenAutoFocus={(e) => e.preventDefault()}
            className={cn(
              "flex flex-col gap-0 overflow-hidden border-slate-200 bg-white p-0 dark:border-slate-800 dark:bg-slate-950",
              selectedRound?.roundType === "QUIZ" ||
                selectedRound?.roundType === "CODING" ||
                selectedRound?.roundType === "CODE_REVIEW"
                ? "h-[96vh] max-h-[96vh] w-[98vw] max-w-[98vw]"
                : "h-auto max-h-[85vh] w-[960px] max-w-[96vw]"
            )}>
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/30">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "rounded-lg p-1.5",
                    AVAILABLE_ROUNDS_TEMPLATES.find((t) => t.type === selectedRound.roundType)
                      ?.bgColor,
                    AVAILABLE_ROUNDS_TEMPLATES.find((t) => t.type === selectedRound.roundType)
                      ?.color
                  )}>
                  {AVAILABLE_ROUNDS_TEMPLATES.find((t) => t.type === selectedRound.roundType)?.icon}
                </div>
                <div>
                  <div className="flex items-center gap-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                    <span>
                      {t("userApplicationhistory.round")} {selectedRoundIndex + 1}:
                    </span>
                    <input
                      type="text"
                      value={selectedRound.name || ""}
                      onChange={(e) => updateRoundField(selectedRoundIndex, "name", e.target.value)}
                      className="-ml-1 w-48 rounded border-b border-transparent bg-transparent px-1 py-0.5 font-bold text-slate-900 hover:border-slate-300 focus:border-indigo-500 focus:outline-none dark:text-slate-100"
                      placeholder={t("adminCompanymanagement.recruitmentRoundName")}
                    />
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {
                      AVAILABLE_ROUNDS_TEMPLATES.find((t) => t.type === selectedRound.roundType)
                        ?.title
                    }
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-full px-3 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                onClick={() => {
                  setConfigModalOpen(false);
                  setSelectedRoundIndex(null);
                }}>
                {t("compUi.close")}
              </Button>
            </div>

            <div
              className={cn(
                "flex-1 overflow-hidden",
                selectedRound.roundType !== "QUIZ" &&
                  selectedRound.roundType !== "CODING" &&
                  selectedRound.roundType !== "CODE_REVIEW" &&
                  "overflow-y-auto"
              )}>
              {selectedRound.roundType === "QUIZ" ? (
                <QuizEditor
                  questions={selectedRound.configData?.quizQuestions || []}
                  onChange={(questions) =>
                    updateRoundConfigField(selectedRoundIndex, "quizQuestions", questions)
                  }
                  maxScore={selectedRound.configData?.maxScore ?? 100}
                  onMaxScoreChange={(v) =>
                    updateRoundConfigField(selectedRoundIndex, "maxScore", v)
                  }
                  passThreshold={selectedRound.passThreshold ?? 0.8}
                  onPassThresholdChange={(v) =>
                    updateRoundField(selectedRoundIndex, "passThreshold", v)
                  }
                  timeLimitMinutes={selectedRound.configData?.timeLimitMinutes ?? 0}
                  onTimeLimitMinutesChange={(v) =>
                    updateRoundConfigField(selectedRoundIndex, "timeLimitMinutes", v)
                  }
                />
              ) : selectedRound.roundType === "CODING" ? (
                <CodingEditor
                  ref={codingEditorRef}
                  codingProblemsId={selectedRound.configData?.codingProblemsId || []}
                  codingProblems={selectedRound.configData?.codingProblems || []}
                  onChange={(ids, problems) => {
                    const updated = [...rounds];
                    updated[selectedRoundIndex] = {
                      ...updated[selectedRoundIndex],
                      configData: {
                        ...updated[selectedRoundIndex].configData,
                        codingProblemsId: ids,
                        codingProblems: problems,
                      },
                    };
                    setRounds(updated);
                  }}
                  maxScore={selectedRound.configData?.maxScore ?? 100}
                  onMaxScoreChange={(v) =>
                    updateRoundConfigField(selectedRoundIndex, "maxScore", v)
                  }
                  passThreshold={selectedRound.passThreshold ?? 0.8}
                  onPassThresholdChange={(v) =>
                    updateRoundField(selectedRoundIndex, "passThreshold", v)
                  }
                  timeLimitMinutes={selectedRound.configData?.timeLimitMinutes ?? 0}
                  onTimeLimitMinutesChange={(v) =>
                    updateRoundConfigField(selectedRoundIndex, "timeLimitMinutes", v)
                  }
                />
              ) : selectedRound.roundType === "CODE_REVIEW" ? (
                <CodeReviewEditor
                  ref={codeReviewEditorRef}
                  codeReviewProblemsId={selectedRound.configData?.codeReviewProblemsId || []}
                  codeReviewProblems={selectedRound.configData?.codeReviewProblems || []}
                  onChange={(ids, problems) => {
                    const updated = [...rounds];
                    updated[selectedRoundIndex] = {
                      ...updated[selectedRoundIndex],
                      configData: {
                        ...updated[selectedRoundIndex].configData,
                        codeReviewProblemsId: ids,
                        codeReviewProblems: problems,
                      },
                    };
                    setRounds(updated);
                  }}
                  maxScore={selectedRound.configData?.maxScore ?? 100}
                  onMaxScoreChange={(v) =>
                    updateRoundConfigField(selectedRoundIndex, "maxScore", v)
                  }
                  passThreshold={selectedRound.passThreshold ?? 0.8}
                  onPassThresholdChange={(v) =>
                    updateRoundField(selectedRoundIndex, "passThreshold", v)
                  }
                  timeLimitMinutes={selectedRound.configData?.timeLimitMinutes ?? 0}
                  onTimeLimitMinutesChange={(v) =>
                    updateRoundConfigField(selectedRoundIndex, "timeLimitMinutes", v)
                  }
                />
              ) : (
                <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-12">
                  <div className="space-y-5 lg:col-span-5">
                    <div className="border-b border-slate-100 pb-2 dark:border-slate-800/40">
                      <h4 className="text-xs font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                        {t("general.generalConfiguration")}
                      </h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start gap-4">
                        <div
                          className={cn(
                            "space-y-1",
                            selectedRound.roundType === "CV_SCREENING" ||
                              selectedRound.roundType === "EMAIL_SIMULATOR"
                              ? "w-full"
                              : "w-[55%]"
                          )}>
                          <Label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                            {t("adminCompanymanagement.maximumScore")}
                          </Label>
                          <ScoreInput
                            value={selectedRound.configData?.maxScore ?? 100}
                            min={1}
                            max={500}
                            step={5}
                            accent="indigo"
                            variant="simple"
                            onChange={(v) =>
                              updateRoundConfigField(selectedRoundIndex, "maxScore", v)
                            }
                          />
                        </div>
                        {selectedRound.roundType !== "CV_SCREENING" &&
                          selectedRound.roundType !== "EMAIL_SIMULATOR" && (
                            <div className="w-[45%] space-y-1">
                              <Label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                                {t("common.time")}
                              </Label>
                              {dialogEditingTime ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min={0}
                                    autoFocus
                                    value={
                                      selectedRound.roundType === "MENTROR_REVIEW" ||
                                      selectedRound.roundType === "MENTOR_REVIEW"
                                        ? (selectedRound.configData?.timeLimitMinutes ?? 0) / 1440
                                        : (selectedRound.configData?.timeLimitMinutes ?? 0)
                                    }
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      updateRoundConfigField(
                                        selectedRoundIndex,
                                        "timeLimitMinutes",
                                        selectedRound.roundType === "MENTROR_REVIEW" ||
                                          selectedRound.roundType === "MENTOR_REVIEW"
                                          ? val * 1440
                                          : val
                                      );
                                    }}
                                    onBlur={() => setDialogEditingTime(false)}
                                    onKeyDown={(e) =>
                                      e.key === "Enter" && setDialogEditingTime(false)
                                    }
                                    className="h-11 w-full [appearance:textfield] border-slate-200 bg-white text-center text-xs font-bold dark:border-slate-800 dark:bg-slate-950 dark:text-white [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                  />
                                  <span className="shrink-0 text-[9px] text-slate-400">
                                    {selectedRound.roundType === "MENTROR_REVIEW" ||
                                    selectedRound.roundType === "MENTOR_REVIEW"
                                      ? "ngày"
                                      : t("common.minute")}
                                  </span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDialogEditingTime(true)}
                                  className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-600 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-400">
                                  <Clock className="h-4 w-4 text-slate-400" />
                                  {(selectedRound.configData?.timeLimitMinutes ?? 0) > 0
                                    ? selectedRound.roundType === "MENTROR_REVIEW" ||
                                      selectedRound.roundType === "MENTOR_REVIEW"
                                      ? `${(selectedRound.configData?.timeLimitMinutes ?? 0) / 1440} ngày`
                                      : `${selectedRound.configData?.timeLimitMinutes} phút`
                                    : t("adminCompanymanagement.noLimit")}
                                </button>
                              )}
                            </div>
                          )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                          {t("adminCompanymanagement.minimumPassingScore")}
                        </Label>
                        <div className="flex justify-center">
                          <ScoreInput
                            value={Math.round(
                              (selectedRound.passThreshold ?? 0.8) *
                                (selectedRound.configData?.maxScore ?? 100)
                            )}
                            min={0}
                            max={selectedRound.configData?.maxScore ?? 100}
                            step={1}
                            accent="emerald"
                            variant="circular"
                            size="sm"
                            onChange={(val) => {
                              const max = selectedRound.configData?.maxScore ?? 100;
                              updateRoundField(
                                selectedRoundIndex,
                                "passThreshold",
                                max > 0 ? val / max : 0.8
                              );
                            }}
                          />
                        </div>
                      </div>
                      {selectedRound.roundType === "CV_SCREENING" && (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {t("adminCompanymanagement.submissionFormat")}
                          </Label>
                          <Select
                            value={selectedRound.configData?.submissionFormat || "pdf"}
                            onValueChange={(val) =>
                              updateRoundConfigField(selectedRoundIndex, "submissionFormat", val)
                            }>
                            <SelectTrigger className="border-slate-200 bg-white text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-slate-200 bg-white text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                              <SelectItem value="pdf">
                                {t("adminCompanymanagement.pdfFile")}
                              </SelectItem>
                              <SelectItem value="doc">
                                {t("adminCompanymanagement.wordFile")}
                              </SelectItem>
                              <SelectItem value="any">
                                {t("adminCompanymanagement.allDocumentFormats")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5 border-t border-slate-100 pt-4 dark:border-slate-800/40">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {t("adminCompanymanagement.instructionsForCandidates")}
                      </Label>
                      <Textarea
                        value={selectedRound.configData?.instruction || ""}
                        onChange={(e) =>
                          updateRoundConfigField(selectedRoundIndex, "instruction", e.target.value)
                        }
                        placeholder={
                          selectedRound.roundType === "CV_SCREENING"
                            ? t("template.exampleCvUpload")
                            : selectedRound.roundType === "EMAIL_SIMULATOR"
                              ? t("template.exampleCustomerService")
                              : t("adminCompanymanagement.instructionsForCandidatesPlaceholder")
                        }
                        rows={4}
                        className="border-slate-200 bg-white text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-5 lg:col-span-7 lg:border-l lg:border-slate-200 lg:pl-6 lg:dark:border-slate-800">
                    <div className="border-b border-slate-100 pb-2 dark:border-slate-800/40">
                      <h4 className="text-xs font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                        {t("general.detailedConfiguration")}
                      </h4>
                    </div>
                    {selectedRound.roundType === "CV_SCREENING" && (
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {t("template.hrAddonCriteria")}
                          </Label>
                          <Textarea
                            value={selectedRound.configData?.aiSystemPrompt || ""}
                            onChange={(e) =>
                              updateRoundConfigField(
                                selectedRoundIndex,
                                "aiSystemPrompt",
                                e.target.value
                              )
                            }
                            placeholder={t("template.exampleHrCriteria")}
                            rows={6}
                            className="border-slate-200 bg-white text-xs text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                          />
                          <p className="text-[10px] leading-normal text-slate-500">
                            {t("template.addonCriteriaExplanation")}
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedRound.roundType === "EMAIL_SIMULATOR" && (
                      <div className="space-y-5">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {t("template.emailScenario")}
                          </Label>
                          <Textarea
                            value={selectedRound.configData?.evaluationCriteria || ""}
                            onChange={(e) =>
                              updateRoundConfigField(
                                selectedRoundIndex,
                                "evaluationCriteria",
                                e.target.value
                              )
                            }
                            placeholder={t("template.exampleEmailScenario")}
                            rows={6}
                            className="border-slate-200 bg-white text-xs text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {t("template.hrAddonCriteria")}
                          </Label>
                          <Textarea
                            value={selectedRound.configData?.aiSystemPrompt || ""}
                            onChange={(e) =>
                              updateRoundConfigField(
                                selectedRoundIndex,
                                "aiSystemPrompt",
                                e.target.value
                              )
                            }
                            placeholder={t("template.exampleEmailCriteria")}
                            rows={6}
                            className="border-slate-200 bg-white text-xs text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                          />
                          <p className="text-[10px] leading-normal text-slate-500">
                            {t("template.addonCriteriaExplanation")}
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedRound.roundType === "AI_INTERVIEW" && (
                      <div className="space-y-5">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            AI System Prompt
                          </Label>
                          <Textarea
                            value={selectedRound.configData?.aiSystemPrompt || ""}
                            onChange={(e) =>
                              updateRoundConfigField(
                                selectedRoundIndex,
                                "aiSystemPrompt",
                                e.target.value
                              )
                            }
                            placeholder={t("adminCompanymanagement.provideAiRoleConfigPrompt")}
                            rows={5}
                            className="border-slate-200 bg-white text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                          />
                        </div>
                        <div className="mt-4 space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {t("adminCompanymanagement.evaluationCriteria")}
                          </Label>
                          <Textarea
                            value={selectedRound.configData?.evaluationCriteria || ""}
                            onChange={(e) =>
                              updateRoundConfigField(
                                selectedRoundIndex,
                                "evaluationCriteria",
                                e.target.value
                              )
                            }
                            placeholder={t(
                              "adminCompanymanagement.candidateEvaluationCriteriaPlaceholder"
                            )}
                            rows={4}
                            className="border-slate-200 bg-white text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900/50">
              <Button
                type="button"
                className="h-9 bg-indigo-600 px-4 text-xs font-bold text-white shadow-md hover:bg-indigo-700"
                onClick={async () => {
                  let finalRounds = rounds;
                  if (selectedRound?.roundType === "CODING" && codingEditorRef.current) {
                    const result = await codingEditorRef.current.saveCurrentProblem();
                    if (!result) return;
                    if (result !== true) {
                      const updated = [...rounds];
                      updated[selectedRoundIndex] = {
                        ...updated[selectedRoundIndex],
                        configData: {
                          ...updated[selectedRoundIndex].configData,
                          codingProblemsId: result.ids,
                          codingProblems: result.problems,
                        },
                      };
                      finalRounds = updated;
                      setRounds(updated);
                    }
                  } else if (
                    selectedRound?.roundType === "CODE_REVIEW" &&
                    codeReviewEditorRef.current
                  ) {
                    const result = await codeReviewEditorRef.current.saveCurrentProblem();
                    if (!result) return;
                    if (result !== true) {
                      const updated = [...rounds];
                      updated[selectedRoundIndex] = {
                        ...updated[selectedRoundIndex],
                        configData: {
                          ...updated[selectedRoundIndex].configData,
                          codeReviewProblemsId: result.ids,
                          codeReviewProblems: result.problems,
                        },
                      };
                      finalRounds = updated;
                      setRounds(updated);
                    }
                  }
                  setConfigModalOpen(false);
                  setSelectedRoundIndex(null);
                  await handleSaveWrapper(false, finalRounds);
                }}>
                {t("template.saveTemplate")} {t("userApplicationhistory.rounds")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 4. Confirmation dialog for unsaved changes when exiting workspace */}
      {showExitConfirm && (
        <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
          <DialogContent className="max-w-md border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t("adminCompanymanagement.unsavedChanges")}
            </h3>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {t("template.unsavedChangesWarning2")}
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                onClick={() => setShowExitConfirm(false)}>
                {t("common.goBack")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-red-200 text-xs text-red-500 hover:bg-red-50 hover:text-red-600 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                onClick={() => {
                  setShowExitConfirm(false);
                  onClose();
                }}>
                {t("adminCompanymanagement.doNotSave")}
              </Button>
              <Button
                size="sm"
                className="h-8 bg-indigo-600 px-3.5 text-xs text-white hover:bg-indigo-700"
                onClick={async () => {
                  setShowExitConfirm(false);
                  await handleSaveWrapper(true);
                }}>
                {t("adminCompanymanagement.saveAndExit")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
