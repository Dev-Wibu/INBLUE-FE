import { HomepageHeader } from "@/components/homepage-redesign";
import { Footer } from "@/components/layouts";
import { JobDetailView } from "@/components/shared/JobDetailView";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useJdPurchaseStatus } from "@/hooks/useJdPurchaseStatus";
import { applicationService } from "@/services/application.manager";
import { companyManager, type JobDescription } from "@/services/company.manager";
import { jdPurchaseManager } from "@/services/jd-purchase.manager";
import { useAuthStore } from "@/stores/authStore";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

export function JobDescriptionDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const jdIdNum = Number(id);

  const { hasPurchased, refetchStatus } = useJdPurchaseStatus(jdIdNum);
  const [job, setJob] = useState<JobDescription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJob = async () => {
      if (!id) return;
      setIsLoading(true);
      setError(null);
      try {
        const result = await companyManager.getJobById(Number(id));
        if (result.success && result.data) {
          setJob(result.data);
        } else {
          setError(t("enterpriseJobdescriptiondetailpage.noVacancyInformationFound"));
        }
      } catch (err) {
        console.error("[JobDescriptionDetailPage] Error:", err);
        setError(t("enterpriseJobdescriptiondetailpage.errorLoadingInfo"));
      } finally {
        setIsLoading(false);
      }
    };
    fetchJob();
  }, [id, isLoggedIn, t]);

  const handleApply = async () => {
    if (!isLoggedIn) {
      toast.error(t("enterpriseJobdescriptiondetailpage.pleaseLoginToApply"));
      navigate(`/login?redirect=/enterprise/job/${id}`);
      return;
    }
    if (job?.status !== "OPEN") {
      toast.warning(t("enterpriseJobdescriptiondetailpage.thisPositionIsCurrentlyNo"));
      return;
    }
    if (!jdIdNum) return;

    setIsApplying(true);
    try {
      if (!hasPurchased && job.price && job.price > 0) {
        localStorage.setItem("pending_jd_purchase_id", String(jdIdNum));
        const checkoutUrl = await jdPurchaseManager.createPayment(jdIdNum);
        window.location.href = checkoutUrl;
        return;
      }

      const result = await applicationService.apply(jdIdNum);
      if (result.success) {
        toast.success(t("enterpriseJobdescriptiondetailpage.successfulApplicationGoodLuck"));
        await refetchStatus();
        const refreshResult = await companyManager.getJobById(jdIdNum);
        if (refreshResult.success && refreshResult.data) {
          setJob(refreshResult.data);
        }
        const createdAppId = result.data?.id;
        if (createdAppId) {
          navigate(`/user?tab=applicationHistory&appId=${createdAppId}`);
        } else {
          navigate(`/user?tab=applicationHistory`);
        }
      } else {
        const errorMsg =
          result.error ||
          t("enterpriseJobdescriptiondetailpage.applicationUnsuccessfulPleaseTryAgain");
        toast.error(errorMsg, { duration: 5000 });
      }
    } catch {
      toast.error(t("common.anErrorOccurredPleaseTryAgain", "Có lỗi xảy ra, vui lòng thử lại."));
    } finally {
      setIsApplying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-[72px] dark:bg-slate-950">
        <HomepageHeader />
        <div className="mx-auto max-w-5xl px-6 py-8">
          <Skeleton className="mb-6 h-8 w-24 rounded-full" />
          <div className="flex flex-col gap-8 md:flex-row">
            <Skeleton className="h-[280px] flex-1 rounded-[24px]" />
            <Skeleton className="h-[280px] w-full rounded-2xl md:w-[280px]" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <HomepageHeader />

        {/* Sleek Breadcrumb Header even on error */}
        <div className="border-b border-slate-200 bg-white py-4 dark:border-slate-800/60 dark:bg-slate-900/40">
          <div className="mx-auto max-w-7xl px-6">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-[#66B2FF]">
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("general.back")}
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <div className="rounded-[20px] border border-red-100 bg-red-50/50 p-8 shadow-sm dark:border-red-900/20 dark:bg-red-950/10">
            <div className="flex flex-col items-center justify-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {t("enterpriseJobdescriptiondetailpage.locationNotFound")}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {error || t("enterpriseJobdescriptiondetailpage.errorLoadingInfo")}
              </p>
              <Button
                onClick={() => navigate(-1)}
                className="mt-2 rounded-xl bg-indigo-600 hover:bg-indigo-700">
                {t("general.back")}
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-[72px] pb-24 md:pb-0 dark:bg-slate-950">
      <HomepageHeader />

      {/* Back button */}
      <div className="mx-auto max-w-5xl px-6 pt-8 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-[#66B2FF]">
          <ArrowLeft className="h-4 w-4" />
          {t("general.back")}
        </button>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-5xl px-6">
        <JobDetailView
          job={job}
          hasPurchased={hasPurchased}
          onApplyAction={handleApply}
          isLoadingAction={isApplying}
        />
      </div>

      <Footer />
    </div>
  );
}
