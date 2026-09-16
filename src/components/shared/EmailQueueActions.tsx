import { Button } from "@/components/ui/button";
import {
  useEmailSubmissions,
  useFetchEmailMailbox,
  useProcessPendingEmails,
} from "@/hooks/useEmailSubmission";
import { Inbox, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export function EmailQueueActions() {
  const { t } = useTranslation();
  const { data = [], refetch, isFetching } = useEmailSubmissions();
  const fetchMailbox = useFetchEmailMailbox();
  const processPending = useProcessPendingEmails();
  const pendingCount = data.filter((item) => item.status === "PENDING").length;
  const errorCount = data.filter((item) => item.status === "ERROR").length;

  const runFetch = async () => {
    try {
      const message = await fetchMailbox.mutateAsync();
      toast.success(message);
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("emailOperations.fetchError"));
    }
  };

  const runProcess = async () => {
    try {
      const message = await processPending.mutateAsync();
      toast.success(message);
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("emailOperations.processError"));
    }
  };

  const busy = fetchMailbox.isPending || processPending.isPending;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={t("emailOperations.title")}>
      <span className="inline-flex h-8 items-center gap-1.5 rounded-md bg-slate-100 px-2.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
        <Inbox className="h-3.5 w-3.5" />
        {t("emailOperations.queueCount", { count: pendingCount + errorCount })}
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 gap-1.5 px-3 text-xs"
        disabled={busy}
        onClick={runFetch}>
        {fetchMailbox.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
        {t("emailOperations.fetch")}
      </Button>
      <Button
        type="button"
        size="sm"
        className="h-8 gap-1.5 bg-indigo-600 px-3 text-xs text-white hover:bg-indigo-700"
        disabled={busy || (data.length > 0 && pendingCount + errorCount === 0)}
        onClick={runProcess}>
        {processPending.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        {t("emailOperations.process")}
      </Button>
      <button
        type="button"
        className="sr-only"
        onClick={() => void refetch()}
        disabled={isFetching}>
        {t("common.refresh")}
      </button>
    </div>
  );
}
