/* eslint-disable @typescript-eslint/no-unused-vars, no-unused-vars */
import { PaginationControl, ReloadButton } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SpinnerBlock } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSortable } from "@/hooks/useSortable";
import { formatDate } from "@/lib/formatting";
import { extractDataArray } from "@/lib/utils";
import {
  codeReviewProblemManager,
  type CodeFile,
  type CodeReviewProblem,
  type ExpectedIssue,
} from "@/services/code-review-problem.manager";
import { AlertTriangle, Bot, ChevronRight, Eye, Lightbulb, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
type ViewState = { mode: "list" } | { mode: "create" } | { mode: "detail"; problemId: number };
type SortableProblem = CodeReviewProblem & {
  idSortValue: number;
  titleSortValue: string;
  difficultySortValue: string;
  createdAtSortValue: number;
};
export function CodeReviewProblemManagementPage() {
  const { t } = useTranslation();
  const [view, setView] = useState<ViewState>({ mode: "list" });
  const [problems, setProblems] = useState<CodeReviewProblem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [selectedProblem, setSelectedProblem] = useState<CodeReviewProblem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const loadProblems = useCallback(
    async (showReloading = false) => {
      if (showReloading) {
        setIsReloading(true);
      } else {
        setIsLoading(true);
      }
      try {
        const response = await codeReviewProblemManager.getAll();
        if (response.success && response.data) {
          const data = extractDataArray<CodeReviewProblem>(response);
          setProblems(data);
        } else {
          toast.error(response.error || t("common.unableToLoadArticleList"));
        }
      } catch {
        toast.error(t("common.unableToLoadArticleList"));
      } finally {
        if (showReloading) {
          setIsReloading(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [t]
  );
  useEffect(() => {
    void loadProblems();
  }, [loadProblems]);
  const sortableProblems = useMemo<SortableProblem[]>(() => {
    return problems.map((problem) => ({
      ...problem,
      idSortValue: typeof problem.id === "number" ? problem.id : 0,
      titleSortValue: problem.title?.toLowerCase() || "",
      difficultySortValue: problem.difficulty || "",
      createdAtSortValue: problem.createdAt ? new Date(problem.createdAt).getTime() : 0,
    }));
  }, [problems]);
  const { sortedData } = useSortable(sortableProblems, {
    defaultSort: { key: "createdAtSortValue", direction: "desc" },
    noSortBehavior: "preserve",
    tieBreaker: { key: "idSortValue", direction: "desc" },
  });
  const [pageSize, setPageSize] = useHybridPageSize({
    key: "src_pages_admin_codereviewproblemmanagement_page_pagesize",
    defaultPageSize: 10,
  });
  const pagination = usePagination({ totalCount: sortedData.length, pageSize });
  const pageItems = useMemo(
    () => sortedData.slice(pagination.startIndex, pagination.endIndex + 1),
    [pagination.endIndex, pagination.startIndex, sortedData]
  );
  const filteredProblems = useMemo(() => {
    return problems.filter((problem) => {
      if (difficultyFilter !== "all" && problem.difficulty !== difficultyFilter) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          problem.title?.toLowerCase().includes(q) ||
          problem.language?.toLowerCase().includes(q) ||
          String(problem.id).includes(q)
        );
      }
      return true;
    });
  }, [problems, searchQuery, difficultyFilter]);
  const getDifficultyBadge = (difficulty?: string) => {
    switch (difficulty) {
      case "EASY":
        return { label: t("common.easy") || "Dù+ù", className: "bg-green-100 text-green-700" };
      case "MEDIUM":
        return {
          label: t("common.medium") || "Trung b+ùnh",
          className: "bg-amber-100 text-amber-700",
        };
      case "HARD":
        return { label: t("common.hard") || "Kh+ù", className: "bg-red-100 text-red-700" };
      default:
        return { label: difficulty || "-", className: "bg-slate-100 text-slate-700" };
    }
  };
  const handleViewDetail = (problem: CodeReviewProblem) => {
    setSelectedProblem(problem);
    setIsDetailOpen(true);
  };
  const handleBack = () => {
    setView({ mode: "list" });
  };
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiTargetLevel, setAiTargetLevel] = useState("");
  const [aiProgrammingLanguage, setAiProgrammingLanguage] = useState("");
  const [aiContextJobTitle, setAiContextJobTitle] = useState("");
  const [aiContextRequirement, setAiContextRequirement] = useState("");
  const [aiContextPrompting, setAiContextPrompting] = useState("");
  const [generating, setGenerating] = useState(false);
  const handleGenerateAI = useCallback(async () => {
    if (!aiTopic.trim() || !aiTargetLevel.trim() || !aiProgrammingLanguage.trim()) {
      toast.error(
        t("adminCodeReviewProblem.requiredFields") ||
          "Vui l+ùng nh?ùp -ùù+ù Topic, Level v+ù Language"
      );
      return;
    }
    setGenerating(true);
    try {
      const response = await codeReviewProblemManager.generate({
        topic: aiTopic.trim(),
        targetLevel: aiTargetLevel.trim(),
        programmingLanguage: aiProgrammingLanguage.trim(),
        context: {
          jobTitle: aiContextJobTitle.trim() || undefined,
          requirement: aiContextRequirement.trim() || undefined,
          prompting: aiContextPrompting.trim() || undefined,
        },
      });
      if (response.success && response.data) {
        const data = response.data as Partial<CodeReviewProblem>;
        if (data.title) setGeneratedTitle(data.title);
        if (data.problemStatement) setGeneratedProblemStatement(data.problemStatement);
        if (data.language) setGeneratedLanguage(data.language);
        if (data.difficulty) setGeneratedDifficulty(data.difficulty as "EASY" | "MEDIUM" | "HARD");
        if (data.files) setGeneratedFiles(data.files);
        if (data.expectedIssues) setGeneratedIssues(data.expectedIssues);
        setAiDialogOpen(false);
        toast.success(
          t("adminCodeReviewProblem.generatedSuccessfully") || "-ù+ù t?ùo b+ùi t?ùp b?ùng AI"
        );
      } else {
        toast.error(
          response.error ||
            t("adminCodeReviewProblem.generateFailed") ||
            "T?ùo b+ùi t?ùp th?ùt b?ùi"
        );
      }
    } catch {
      toast.error(t("adminCodeReviewProblem.generateFailed") || "T?ùo b+ùi t?ùp th?ùt b?ùi");
    } finally {
      setGenerating(false);
    }
  }, [
    aiTopic,
    aiTargetLevel,
    aiProgrammingLanguage,
    aiContextJobTitle,
    aiContextRequirement,
    aiContextPrompting,
    t,
  ]);
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [generatedDifficulty, setGeneratedDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">(
    "MEDIUM"
  );
  const [generatedLanguage, setGeneratedLanguage] = useState("");
  const [generatedProblemStatement, setGeneratedProblemStatement] = useState("");
  const [generatedFiles, setGeneratedFiles] = useState<CodeFile[]>([]);
  const [generatedIssues, setGeneratedIssues] = useState<ExpectedIssue[]>([]);
  const resetGenerated = useCallback(() => {
    setGeneratedTitle("");
    setGeneratedDifficulty("MEDIUM");
    setGeneratedLanguage("");
    setGeneratedProblemStatement("");
    setGeneratedFiles([]);
    setGeneratedIssues([]);
  }, []);
  if (view.mode === "create") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        {" "}
        <div className="border-b bg-white/80 backdrop-blur-sm">
          {" "}
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {" "}
            <div className="flex h-16 items-center justify-between">
              {" "}
              <div className="flex items-center gap-2 text-sm">
                {" "}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="text-slate-600 hover:text-slate-900">
                  {" "}
                  <ChevronRight className="mr-1 h-4 w-4 rotate-180" />{" "}
                  {t("common.backToTheList") || "Quay l?ùi"}{" "}
                </Button>{" "}
                <Separator orientation="vertical" className="mx-2 h-4" />{" "}
                <nav className="flex items-center gap-2 text-slate-500">
                  {" "}
                  <span className="cursor-pointer hover:text-slate-700" onClick={handleBack}>
                    {" "}
                    {t("adminCodeReviewProblem.pageTitle") || "Qu?ùn l++ b+ùi t?ùp"}{" "}
                  </span>{" "}
                  <ChevronRight className="h-3 w-3" />{" "}
                  <span className="font-medium text-slate-900">
                    {" "}
                    {t("common.create") || "T?ùo mù+ùi"}{" "}
                  </span>{" "}
                </nav>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {" "}
          <div className="mb-8">
            {" "}
            <div className="flex items-center gap-3">
              {" "}
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
                {" "}
                <Plus className="h-6 w-6" />{" "}
              </div>{" "}
              <div>
                {" "}
                <h1 className="text-2xl font-bold text-slate-900">
                  {" "}
                  {t("common.create") || "T?ùo b+ùi t?ùp Code Review"}{" "}
                </h1>{" "}
                <p className="mt-1 text-sm text-slate-600">
                  {" "}
                  {t("adminCodeReviewProblem.createDescription") ||
                    "T?ùo b+ùi t?ùp -ù+ùnh gi+ù code review mù+ùi cho ù+ùng vi+ùn"}{" "}
                </p>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {" "}
            <div className="lg:col-span-2">
              {" "}
              <Card className="border-0 shadow-lg">
                {" "}
                <CardContent className="p-6">
                  {" "}
                  <CodeReviewProblemForm
                    onSuccess={() => {
                      handleBack();
                      void loadProblems(true);
                    }}
                    onCancel={handleBack}
                  />{" "}
                </CardContent>{" "}
              </Card>{" "}
            </div>{" "}
            <div className="lg:col-span-1">
              {" "}
              <div className="sticky top-8 space-y-6">
                {" "}
                <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg">
                  {" "}
                  <CardContent className="p-6">
                    {" "}
                    <div className="mb-4 flex items-center gap-2">
                      {" "}
                      <Lightbulb className="h-5 w-5 text-amber-500" />{" "}
                      <h3 className="font-semibold text-slate-900">M?ùo t?ùo b+ùi t?ùp</h3>{" "}
                    </div>{" "}
                    <ul className="space-y-3 text-sm text-slate-700">
                      {" "}
                      <li className="flex items-start gap-2">
                        {" "}
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />{" "}
                        <span>
                          -ù?+t ti+ùu -ùù+ù r+ù r+ùng, cù+ù thù+ù vù+ù v?ùn -ùù+ù code review
                        </span>{" "}
                      </li>{" "}
                      <li className="flex items-start gap-2">
                        {" "}
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />{" "}
                        <span>Cung c?ùp code m?ùu -ùa d?ùng tù+ù nhiù+ùu file</span>{" "}
                      </li>{" "}
                      <li className="flex items-start gap-2">
                        {" "}
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />{" "}
                        <span>Liù+ùt k+ù expected issues chi ti?+t vù+ùi severity</span>{" "}
                      </li>{" "}
                      <li className="flex items-start gap-2">
                        {" "}
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />{" "}
                        <span>Sù+ù dù+ùng AI -ùù+ù generate -ùù+ù b+ùi nhanh ch+ùng</span>{" "}
                      </li>{" "}
                    </ul>{" "}
                  </CardContent>{" "}
                </Card>{" "}
                <Card className="border-0 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-lg">
                  {" "}
                  <CardContent className="p-6">
                    {" "}
                    <div className="mb-4 flex items-center gap-2">
                      {" "}
                      <Bot className="h-5 w-5 text-emerald-600" />{" "}
                      <h3 className="font-semibold text-slate-900">T?ùo b?ùng AI</h3>{" "}
                    </div>{" "}
                    <p className="mb-4 text-sm text-slate-700">
                      {" "}
                      Sù+ù dù+ùng AI -ùù+ù tù+ù -ùù+ùng generate -ùù+ù b+ùi code review chù+ù trong
                      v+ùi gi+ùy.{" "}
                    </p>{" "}
                    <Button
                      variant="outline"
                      className="w-full gap-2 border-emerald-200 bg-white hover:bg-emerald-50"
                      onClick={() => setAiDialogOpen(true)}>
                      {" "}
                      <Bot className="h-4 w-4" />{" "}
                      {t("adminCodeReviewProblem.generateAI") || "T?ùo b?ùng AI"}{" "}
                    </Button>{" "}
                  </CardContent>{" "}
                </Card>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
          {" "}
          <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
            {" "}
            <DialogHeader>
              {" "}
              <DialogTitle>
                {" "}
                {t("adminCodeReviewProblem.aiGenerateTitle") || "T?ùo b+ùi t?ùp b?ùng AI"}{" "}
              </DialogTitle>{" "}
            </DialogHeader>{" "}
            <div className="space-y-4">
              {" "}
              <div className="space-y-2">
                {" "}
                <Label>{t("adminCodeReviewProblem.topic") || "Chù+ù -ùù+ù"} *</Label>{" "}
                <Input
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="Spring Security..."
                />{" "}
              </div>{" "}
              <div className="grid grid-cols-2 gap-4">
                {" "}
                <div className="space-y-2">
                  {" "}
                  <Label>{t("adminCodeReviewProblem.difficulty") || "-ùù+ù kh+ù"} *</Label>{" "}
                  <Select
                    value={generatedDifficulty}
                    onValueChange={(v) => setGeneratedDifficulty(v as "EASY" | "MEDIUM" | "HARD")}>
                    {" "}
                    <SelectTrigger>
                      {" "}
                      <SelectValue {...{}} />{" "}
                    </SelectTrigger>{" "}
                    <SelectContent>
                      {" "}
                      <SelectItem value="EASY">{t("common.easy") || "Dù+ù"}</SelectItem>{" "}
                      <SelectItem value="MEDIUM">{t("common.medium") || "Trung b+ùnh"}</SelectItem>{" "}
                      <SelectItem value="HARD">{t("common.hard") || "Kh+ù"}</SelectItem>{" "}
                    </SelectContent>{" "}
                  </Select>{" "}
                </div>{" "}
                <div className="space-y-2">
                  {" "}
                  <Label>
                    {t("adminCodeReviewProblem.programmingLanguage") || "Ng+ùn ngù+ù"} *
                  </Label>{" "}
                  <Input
                    value={aiProgrammingLanguage}
                    onChange={(e) => setAiProgrammingLanguage(e.target.value)}
                    placeholder="Java"
                  />{" "}
                </div>{" "}
              </div>{" "}
              <div className="space-y-2">
                {" "}
                <Label>{t("adminCodeReviewProblem.targetLevel") || "Mù+ùc ti+ùu"} *</Label>{" "}
                <Input
                  value={aiTargetLevel}
                  onChange={(e) => setAiTargetLevel(e.target.value)}
                  placeholder="Junior, Senior..."
                />{" "}
              </div>{" "}
              <div className="space-y-2">
                {" "}
                <Label>
                  {t("adminCodeReviewProblem.contextJobTitle") || "Vù+ù tr+ù c+ùng viù+ùc"}
                </Label>{" "}
                <Input
                  value={aiContextJobTitle}
                  onChange={(e) => setAiContextJobTitle(e.target.value)}
                  placeholder="Backend Developer"
                />{" "}
              </div>{" "}
              <div className="space-y-2">
                {" "}
                <Label>{t("adminCodeReviewProblem.contextRequirement") || "Y+ùu c?ùu"}</Label>{" "}
                <Textarea
                  value={aiContextRequirement}
                  onChange={(e) => setAiContextRequirement(e.target.value)}
                  placeholder="M+ù t?ù y+ùu c?ùu..."
                  rows={2}
                />{" "}
              </div>{" "}
              <div className="space-y-2">
                {" "}
                <Label>
                  {t("adminCodeReviewProblem.contextPrompting") || "Hùùù+ùng d?ùn th+ùm"}
                </Label>{" "}
                <Textarea
                  value={aiContextPrompting}
                  onChange={(e) => setAiContextPrompting(e.target.value)}
                  placeholder="Gù+ùi ++ th+ùm cho AI..."
                  rows={2}
                />{" "}
              </div>{" "}
              <div className="flex gap-3">
                {" "}
                <Button onClick={handleGenerateAI} disabled={generating} className="flex-1">
                  {" "}
                  {generating ? (
                    <>
                      {" "}
                      <SpinnerBlock size="sm" />{" "}
                      {t("adminCodeReviewProblem.generating") || "-ùang t?ùo..."}{" "}
                    </>
                  ) : (
                    <>
                      {" "}
                      <Bot className="mr-2 h-4 w-4" />{" "}
                      {t("adminCodeReviewProblem.generate") || "T?ùo b+ùi t?ùp"}{" "}
                    </>
                  )}{" "}
                </Button>{" "}
                <Button variant="outline" onClick={() => setAiDialogOpen(false)}>
                  {" "}
                  {t("general.cancel") || "Hù+ùy"}{" "}
                </Button>{" "}
              </div>{" "}
            </div>{" "}
          </DialogContent>{" "}
        </Dialog>{" "}
      </div>
    );
  }
  return (
    <div className="space-y-6 p-6">
      {" "}
      <div className="flex flex-wrap items-start justify-between gap-3">
        {" "}
        <div>
          {" "}
          <h1 className="text-2xl font-bold">
            {" "}
            {t("adminCodeReviewProblem.pageTitle") || "Qu?ùn l++ b+ùi t?ùp Code Review"}{" "}
          </h1>{" "}
          <p className="text-muted-foreground text-sm">
            {" "}
            {t("adminCodeReviewProblem.pageDescription") ||
              "T?ùo v+ù qu?ùn l++ c+ùc b+ùi t?ùp -ù+ùnh gi+ù code review"}{" "}
          </p>{" "}
        </div>{" "}
        <div className="flex items-center gap-2">
          {" "}
          <ReloadButton
            onReload={() => loadProblems(true)}
            isLoading={isReloading}
            tooltip={t("common.reload")}
          />{" "}
          <Button onClick={() => setView({ mode: "create" })}>
            {" "}
            <Plus className="mr-1 h-4 w-4" /> {t("common.create") || "T?ùo mù+ùi"}{" "}
          </Button>{" "}
        </div>{" "}
      </div>{" "}
      <Card>
        {" "}
        <CardContent className="space-y-4 pt-6">
          {" "}
          <div className="flex flex-wrap gap-3">
            {" "}
            <div className="relative min-w-[220px] flex-1">
              {" "}
              <Input
                placeholder={
                  t("adminCodeReviewProblem.searchPlaceholder") ||
                  "T+ùm theo t+ùn, ng+ùn ngù+ù, ID..."
                }
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  pagination.goToFirstPage();
                }}
              />{" "}
            </div>{" "}
            <Select
              value={difficultyFilter}
              onValueChange={(value) => {
                setDifficultyFilter(value);
                pagination.goToFirstPage();
              }}>
              {" "}
              <SelectTrigger className="w-[180px]">
                {" "}
                <SelectValue
                  placeholder={t("adminCodeReviewProblem.difficulty") || "-ùù+ù kh+ù"}
                />{" "}
              </SelectTrigger>{" "}
              <SelectContent>
                {" "}
                <SelectItem value="all">{t("common.allStatus") || "T?ùt c?ù"}</SelectItem>{" "}
                <SelectItem value="EASY">{t("common.easy") || "Dù+ù"}</SelectItem>{" "}
                <SelectItem value="MEDIUM">{t("common.medium") || "Trung b+ùnh"}</SelectItem>{" "}
                <SelectItem value="HARD">{t("common.hard") || "Kh+ù"}</SelectItem>{" "}
              </SelectContent>{" "}
            </Select>{" "}
          </div>{" "}
          {isLoading ? (
            <SpinnerBlock size="lg" />
          ) : filteredProblems.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              {" "}
              {t("common.noDataAvailable") || "Kh+ùng c+ù dù+ù liù+ùu"}{" "}
            </div>
          ) : (
            <div className="rounded-md border">
              {" "}
              <table className="w-full">
                {" "}
                <thead>
                  {" "}
                  <tr className="border-b bg-slate-50">
                    {" "}
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">
                      ID
                    </th>{" "}
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">
                      {" "}
                      {t("common.title1") || "Ti+ùu -ùù+ù"}{" "}
                    </th>{" "}
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">
                      {" "}
                      {t("adminCodeReviewProblem.language") || "Ng+ùn ngù+ù"}{" "}
                    </th>{" "}
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">
                      {" "}
                      {t("adminCodeReviewProblem.difficulty") || "-ùù+ù kh+ù"}{" "}
                    </th>{" "}
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">
                      {" "}
                      {t("common.creationDate") || "Ng+ùy t?ùo"}{" "}
                    </th>{" "}
                    <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">
                      {" "}
                      {t("common.operation") || "Thao t+ùc"}{" "}
                    </th>{" "}
                  </tr>{" "}
                </thead>{" "}
                <tbody>
                  {" "}
                  {pageItems.map((problem) => {
                    const difficultyBadge = getDifficultyBadge(problem.difficulty);
                    return (
                      <tr key={problem.id} className="border-b last:border-0">
                        {" "}
                        <td className="px-4 py-3 text-sm">#{problem.id}</td>{" "}
                        <td className="px-4 py-3">
                          {" "}
                          <p className="font-medium">{problem.title}</p>{" "}
                          {problem.problemStatement && (
                            <p className="text-muted-foreground line-clamp-1 text-xs">
                              {" "}
                              {problem.problemStatement}{" "}
                            </p>
                          )}{" "}
                        </td>{" "}
                        <td className="px-4 py-3 text-sm">{problem.language || "-"}</td>{" "}
                        <td className="px-4 py-3">
                          {" "}
                          <Badge className={difficultyBadge.className}>
                            {" "}
                            {difficultyBadge.label}{" "}
                          </Badge>{" "}
                        </td>{" "}
                        <td className="px-4 py-3 text-sm">
                          {" "}
                          {problem.createdAt ? formatDate(problem.createdAt) : "-"}{" "}
                        </td>{" "}
                        <td className="px-4 py-3">
                          {" "}
                          <div className="flex justify-end gap-1">
                            {" "}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewDetail(problem)}>
                              {" "}
                              <Eye className="h-4 w-4" />{" "}
                            </Button>{" "}
                          </div>{" "}
                        </td>{" "}
                      </tr>
                    );
                  })}{" "}
                </tbody>{" "}
              </table>{" "}
            </div>
          )}{" "}
          <PaginationControl
            pagination={pagination}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              pagination.goToFirstPage();
            }}
            pageSizeOptions={[6, 9, 10, 20]}
          />{" "}
        </CardContent>{" "}
      </Card>{" "}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        {" "}
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          {" "}
          <DialogHeader>
            {" "}
            <DialogTitle>{selectedProblem?.title}</DialogTitle>{" "}
          </DialogHeader>{" "}
          {selectedProblem && (
            <div className="space-y-4">
              {" "}
              <div className="flex flex-wrap gap-2">
                {" "}
                <Badge className={getDifficultyBadge(selectedProblem.difficulty).className}>
                  {" "}
                  {getDifficultyBadge(selectedProblem.difficulty).label}{" "}
                </Badge>{" "}
                {selectedProblem.language && (
                  <Badge variant="outline">{selectedProblem.language}</Badge>
                )}{" "}
              </div>{" "}
              {selectedProblem.problemStatement && (
                <div>
                  {" "}
                  <h3 className="mb-2 text-sm font-semibold">
                    {" "}
                    {t("adminCodeReviewProblem.problemStatement") || "-ùù+ù b+ùi"}{" "}
                  </h3>{" "}
                  <div className="rounded-lg bg-slate-50 p-4 text-sm whitespace-pre-wrap dark:bg-slate-800">
                    {" "}
                    {selectedProblem.problemStatement}{" "}
                  </div>{" "}
                </div>
              )}{" "}
              {selectedProblem.files && selectedProblem.files.length > 0 && (
                <div>
                  {" "}
                  <h3 className="mb-2 text-sm font-semibold">
                    {" "}
                    {t("adminCodeReviewProblem.files") || "Files"}{" "}
                  </h3>{" "}
                  <div className="space-y-2">
                    {" "}
                    {selectedProblem.files.map((file: CodeFile, idx: number) => (
                      <div key={idx} className="rounded-lg border p-3">
                        {" "}
                        <p className="text-sm font-medium">
                          {file.filename || `File ${idx + 1}`}
                        </p>{" "}
                        {file.language && (
                          <Badge variant="outline" className="mt-1">
                            {" "}
                            {file.language}{" "}
                          </Badge>
                        )}{" "}
                        {file.content && (
                          <pre className="mt-2 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
                            {" "}
                            {file.content}{" "}
                          </pre>
                        )}{" "}
                      </div>
                    ))}{" "}
                  </div>{" "}
                </div>
              )}{" "}
              {selectedProblem.expectedIssues && selectedProblem.expectedIssues.length > 0 && (
                <div>
                  {" "}
                  <h3 className="mb-2 text-sm font-semibold">
                    {" "}
                    {t("adminCodeReviewProblem.expectedIssues") || "Expected Issues"}{" "}
                  </h3>{" "}
                  <div className="space-y-2">
                    {" "}
                    {selectedProblem.expectedIssues.map((issue: ExpectedIssue, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 rounded-lg border p-3">
                        {" "}
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />{" "}
                        <div>
                          {" "}
                          <p className="text-sm">
                            {" "}
                            {issue.filename && (
                              <span className="font-medium">{issue.filename}</span>
                            )}{" "}
                            {issue.lineNumber && (
                              <span className="text-slate-500">:{issue.lineNumber}</span>
                            )}{" "}
                          </p>{" "}
                          {issue.description && (
                            <p className="text-muted-foreground text-xs">{issue.description}</p>
                          )}{" "}
                          {issue.severity && (
                            <Badge variant="outline" className="mt-1">
                              {" "}
                              {issue.severity}{" "}
                            </Badge>
                          )}{" "}
                        </div>{" "}
                      </div>
                    ))}{" "}
                  </div>{" "}
                </div>
              )}{" "}
              <div className="text-muted-foreground text-xs">
                {" "}
                {selectedProblem.createdAt && (
                  <span>
                    {" "}
                    {t("common.creationDate") || "Ng+ùy t?ùo"}:{" "}
                    {formatDate(selectedProblem.createdAt)}{" "}
                  </span>
                )}{" "}
                {selectedProblem.updatedAt && (
                  <span className="ml-4">
                    {" "}
                    {t("adminCodeReviewProblem.updatedAt") || "C?ùp nh?ùt"}:{" "}
                    {formatDate(selectedProblem.updatedAt)}{" "}
                  </span>
                )}{" "}
              </div>{" "}
            </div>
          )}{" "}
        </DialogContent>{" "}
      </Dialog>{" "}
    </div>
  );
}
function CodeReviewProblemForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [language, setLanguage] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [expectedIssues, setExpectedIssues] = useState<ExpectedIssue[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const handleAddFile = () => {
    setFiles((prev) => [...prev, { filename: "", content: "", language: "" }]);
  };
  const handleUpdateFile = (index: number, field: keyof CodeFile, value: string) => {
    setFiles((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };
  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };
  const handleAddIssue = () => {
    setExpectedIssues((prev) => [...prev, {}]);
  };
  const handleUpdateIssue = (
    index: number,
    field: keyof ExpectedIssue,
    value: string | number | undefined
  ) => {
    setExpectedIssues((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };
  const handleRemoveIssue = (index: number) => {
    setExpectedIssues((prev) => prev.filter((_, i) => i !== index));
  };
  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error(t("adminCodeReviewProblem.titleRequired") || "Vui l+ùng nh?ùp ti+ùu -ùù+ù");
      return;
    }
    setSubmitting(true);
    try {
      const payload: Partial<CodeReviewProblem> = {
        title: title.trim(),
        difficulty,
        language: language.trim() || undefined,
        problemStatement: problemStatement.trim() || undefined,
        files: files.length > 0 ? files : undefined,
        expectedIssues: expectedIssues.length > 0 ? expectedIssues : undefined,
      };
      const response = await codeReviewProblemManager.create(payload);
      if (response.success) {
        toast.success(t("common.success") || "T?ùo th+ùnh c+ùng");
        onSuccess();
      } else {
        toast.error(response.error || t("common.unableToSave") || "Kh+ùng thù+ù lùùu");
      }
    } catch {
      toast.error(t("common.unableToSave") || "Kh+ùng thù+ù lùùu");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="space-y-6">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <h2 className="text-lg font-semibold">{t("common.create") || "T?ùo mù+ùi"}</h2>{" "}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAiDialogOpenChange(true)}
          className="gap-2">
          {" "}
          <Bot className="h-4 w-4" />{" "}
          {t("adminCodeReviewProblem.generateAI") || "T?ùo b?ùng AI"}{" "}
        </Button>{" "}
      </div>{" "}
      <div className="space-y-2">
        {" "}
        <Label>{t("common.title1") || "Ti+ùu -ùù+ù"}</Label>{" "}
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            t("adminCodeReviewProblem.titlePlaceholder") || "Nh?ùp ti+ùu -ùù+ù b+ùi t?ùp"
          }
        />{" "}
      </div>{" "}
      <div className="grid grid-cols-2 gap-4">
        {" "}
        <div className="space-y-2">
          {" "}
          <Label>{t("adminCodeReviewProblem.difficulty") || "-ùù+ù kh+ù"}</Label>{" "}
          <Select
            value={difficulty}
            onValueChange={(v) => setDifficulty(v as "EASY" | "MEDIUM" | "HARD")}>
            {" "}
            <SelectTrigger>
              {" "}
              <SelectValue {...{}} />{" "}
            </SelectTrigger>{" "}
            <SelectContent>
              {" "}
              <SelectItem value="EASY">{t("common.easy") || "Dù+ù"}</SelectItem>{" "}
              <SelectItem value="MEDIUM">{t("common.medium") || "Trung b+ùnh"}</SelectItem>{" "}
              <SelectItem value="HARD">{t("common.hard") || "Kh+ù"}</SelectItem>{" "}
            </SelectContent>{" "}
          </Select>{" "}
        </div>{" "}
        <div className="space-y-2">
          {" "}
          <Label>{t("adminCodeReviewProblem.language") || "Ng+ùn ngù+ù"}</Label>{" "}
          <Input
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            placeholder="Java, Python..."
          />{" "}
        </div>{" "}
      </div>{" "}
      <div className="space-y-2">
        {" "}
        <Label>{t("adminCodeReviewProblem.problemStatement") || "-ùù+ù b+ùi"}</Label>{" "}
        <Textarea
          value={problemStatement}
          onChange={(e) => setProblemStatement(e.target.value)}
          placeholder={
            t("adminCodeReviewProblem.problemStatementPlaceholder") || "Nh?ùp -ùù+ù b+ùi..."
          }
          rows={5}
        />{" "}
      </div>{" "}
      <div className="space-y-2">
        {" "}
        <div className="flex items-center justify-between">
          {" "}
          <Label>{t("adminCodeReviewProblem.files") || "Files"}</Label>{" "}
          <Button type="button" variant="outline" size="sm" onClick={handleAddFile}>
            {" "}
            <Plus className="mr-1 h-4 w-4" /> {t("common.add") || "Th+ùm"}{" "}
          </Button>{" "}
        </div>{" "}
        <div className="space-y-2">
          {" "}
          {files.map((file, idx) => (
            <div key={idx} className="space-y-2 rounded-lg border p-3">
              {" "}
              <div className="flex items-center justify-between">
                {" "}
                <span className="text-sm font-medium">
                  {" "}
                  {t("adminCodeReviewProblem.file") || "File"} #{idx + 1}{" "}
                </span>{" "}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveFile(idx)}>
                  {" "}
                  <Eye className="h-4 w-4 text-red-500" />{" "}
                </Button>{" "}
              </div>{" "}
              <Input
                value={file.filename || ""}
                onChange={(e) => handleUpdateFile(idx, "filename", e.target.value)}
                placeholder={t("adminCodeReviewProblem.filename") || "T+ùn file"}
              />{" "}
              <Input
                value={file.language || ""}
                onChange={(e) => handleUpdateFile(idx, "language", e.target.value)}
                placeholder={t("adminCodeReviewProblem.languagePlaceholder") || "Ng+ùn ngù+ù"}
              />{" "}
              <Textarea
                value={file.content || ""}
                onChange={(e) => handleUpdateFile(idx, "content", e.target.value)}
                placeholder={t("adminCodeReviewProblem.contentPlaceholder") || "Nù+ùi dung code"}
                rows={4}
              />{" "}
            </div>
          ))}{" "}
        </div>{" "}
      </div>{" "}
      <div className="space-y-2">
        {" "}
        <div className="flex items-center justify-between">
          {" "}
          <Label>{t("adminCodeReviewProblem.expectedIssues") || "Expected Issues"}</Label>{" "}
          <Button type="button" variant="outline" size="sm" onClick={handleAddIssue}>
            {" "}
            <Plus className="mr-1 h-4 w-4" /> {t("common.add") || "Th+ùm"}{" "}
          </Button>{" "}
        </div>{" "}
        <div className="space-y-2">
          {" "}
          {expectedIssues.map((issue, idx) => (
            <div key={idx} className="space-y-2 rounded-lg border p-3">
              {" "}
              <div className="flex items-center justify-between">
                {" "}
                <span className="text-sm font-medium">
                  {" "}
                  {t("adminCodeReviewProblem.issue") || "Issue"} #{idx + 1}{" "}
                </span>{" "}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveIssue(idx)}>
                  {" "}
                  <Eye className="h-4 w-4 text-red-500" />{" "}
                </Button>{" "}
              </div>{" "}
              <div className="grid grid-cols-2 gap-2">
                {" "}
                <Input
                  value={issue.filename || ""}
                  onChange={(e) => handleUpdateIssue(idx, "filename", e.target.value)}
                  placeholder={t("adminCodeReviewProblem.filename") || "T+ùn file"}
                />{" "}
                <Input
                  type="number"
                  value={issue.lineNumber ?? ""}
                  onChange={(e) =>
                    handleUpdateIssue(
                      idx,
                      "lineNumber",
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  placeholder={t("adminCodeReviewProblem.lineNumber") || "D+ùng"}
                />{" "}
              </div>{" "}
              <Input
                value={issue.severity || ""}
                onChange={(e) => handleUpdateIssue(idx, "severity", e.target.value)}
                placeholder={t("adminCodeReviewProblem.severity") || "CRITICAL/WARNING/INFO"}
              />{" "}
              <Textarea
                value={issue.description || ""}
                onChange={(e) => handleUpdateIssue(idx, "description", e.target.value)}
                placeholder={t("adminCodeReviewProblem.description") || "M+ù t?ù v?ùn -ùù+ù"}
                rows={2}
              />{" "}
            </div>
          ))}{" "}
        </div>{" "}
      </div>{" "}
      <div className="flex gap-3 pt-2">
        {" "}
        <Button type="submit" disabled={submitting} onClick={handleSubmit}>
          {" "}
          {submitting
            ? t("common.saving") || "-ùang lùùu..."
            : t("common.saveChanges") || "Lùùu"}{" "}
        </Button>{" "}
        <Button type="button" variant="outline" onClick={onCancel}>
          {" "}
          {t("general.cancel") || "Hù+ùy"}{" "}
        </Button>{" "}
      </div>{" "}
    </div>
  );
}
