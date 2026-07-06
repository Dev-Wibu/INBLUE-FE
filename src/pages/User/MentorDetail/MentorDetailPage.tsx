import { MediaLightboxDialog, type MediaViewerItem } from "@/components/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMentorFeedbacksByMentor } from "@/hooks/useMentorFeedback";
import type { SchemaMentorResponse } from "@/interfaces/schema.types";
import { formatCurrency } from "@/lib/formatting";
import { chatManager } from "@/services/chat.manager";
import { ArrowLeft, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  MentorActionPanel,
  MentorDetailHero,
  MentorHighlights,
  SimilarMentors,
} from "./components";
function isActiveMentor(mentor: SchemaMentorResponse): boolean {
  return mentor.active === true;
}
function buildMentorHighlights(
  mentor: SchemaMentorResponse,
  t: (_key: string, _opts?: Record<string, unknown>) => string
): string[] {
  const highlights: string[] = [];
  if (mentor.yearsOfExperience && mentor.yearsOfExperience > 0) {
    highlights.push(
      t("general.yearsOfPracticalInterviewTraining", {
        var_0: mentor.yearsOfExperience,
      })
    );
  }
  if (mentor.totalSession && mentor.totalSession > 0) {
    highlights.push(
      t("general.accompaniedSessionsWithStudentsOf", {
        var_0: mentor.totalSession,
      })
    );
  }
  if (mentor.currentCompany) {
    highlights.push(
      t("general.currentlyOrPreviouslyWorkingAt", {
        var_0: mentor.currentCompany,
      })
    );
  }
  if (mentor.expertise) {
    highlights.push(
      t("general.coreStrengths", {
        var_0: mentor.expertise,
      })
    );
  }
  if (highlights.length === 0) {
    highlights.push(t("userMentordetail.abilityToProvide11"));
    highlights.push(t("userMentordetail.suitableForPracticingCvReview"));
    highlights.push(t("userMentordetail.readyToHelpBuildA"));
  }
  return highlights.slice(0, 4);
}
function buildSlaEstimate(
  mentor: SchemaMentorResponse | null,
  t: (_key: string) => string
): string {
  if (!mentor) {
    return t("userMentordetail.usuallyRespondsWithin24Hours");
  }
  if (mentor.active === false) {
    return t("userMentordetail.responseMayTakeLongerThan");
  }
  return t("userMentordetail.usuallyRespondsWithin24Hours");
}
function buildExpertiseTags(mentor: SchemaMentorResponse): string[] {
  if (!mentor.expertise) {
    return [];
  }
  const normalized = mentor.expertise
    .split(/[,/|]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
  if (normalized.length === 0) {
    return [mentor.expertise.trim()];
  }
  return Array.from(new Set(normalized)).slice(0, 6);
}
export function MentorDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { mentorId } = useParams<{
    mentorId: string;
  }>();
  const parsedMentorId = Number(mentorId);
  const isMentorIdValid = Number.isFinite(parsedMentorId) && parsedMentorId > 0;
  const [mentor, setMentor] = useState<SchemaMentorResponse | null>(null);
  const [allMentors, setAllMentors] = useState<SchemaMentorResponse[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItems, setViewerItems] = useState<MediaViewerItem[]>([]);
  const [mentorUnavailableReason, setMentorUnavailableReason] = useState<
    "inactive" | "not-found" | null
  >(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!isMentorIdValid) {
      setLoading(false);
      return;
    }
    const fetchMentorData = async () => {
      setLoading(true);
      setMentor(null);
      setMentorUnavailableReason(null);
      try {
        const [detailRes, listRes] = await Promise.all([
          chatManager.getMentorDetail(parsedMentorId),
          chatManager.getAllMentors(),
        ]);
        if (detailRes.success && detailRes.data) {
          if (isActiveMentor(detailRes.data)) {
            setMentor(detailRes.data);
          } else {
            setMentorUnavailableReason("inactive");
          }
        } else {
          setMentorUnavailableReason("not-found");
          toast.error(t("userMentordetail.unableToLoadMentorProfile"));
        }
        if (listRes.success && listRes.data) {
          setAllMentors(listRes.data.filter(isActiveMentor));
        }
      } catch {
        setMentorUnavailableReason("not-found");
        toast.error(t("userMentordetail.anErrorOccurredWhileLoading"));
      } finally {
        setLoading(false);
      }
    };
    fetchMentorData();
  }, [isMentorIdValid, parsedMentorId, t]);
  const ratingText = useMemo(() => {
    const raw = mentor?.averageRating;
    if (typeof raw !== "number" || Number.isNaN(raw)) {
      return null;
    }
    return raw.toFixed(1);
  }, [mentor?.averageRating]);
  const hasRating = ratingText !== null;
  const priceText = useMemo(() => {
    const pricePerMinute = mentor?.pricePerMinute;
    if (typeof pricePerMinute !== "number" || pricePerMinute <= 0) {
      return null;
    }
    return formatCurrency(pricePerMinute);
  }, [mentor?.pricePerMinute]);
  const hasPrice = priceText !== null;
  const totalSessions = useMemo(() => {
    const raw = mentor?.totalSession;
    if (typeof raw !== "number" || raw <= 0) {
      return 0;
    }
    return raw;
  }, [mentor?.totalSession]);
  const highlights = useMemo(() => (mentor ? buildMentorHighlights(mentor, t) : []), [mentor, t]);
  const expertiseTags = useMemo(() => (mentor ? buildExpertiseTags(mentor) : []), [mentor]);
  const slaEstimate = useMemo(() => buildSlaEstimate(mentor, t), [mentor, t]);
  const similarMentors = useMemo(() => {
    if (!mentor || allMentors.length === 0) {
      return [];
    }
    return allMentors
      .filter(
        (candidate) =>
          candidate.id !== undefined && candidate.id !== mentor.id && isActiveMentor(candidate)
      )
      .sort((candidateA, candidateB) => {
        const ratingDiff = (candidateB.averageRating || 0) - (candidateA.averageRating || 0);
        if (ratingDiff !== 0) {
          return ratingDiff;
        }
        return (candidateB.totalSession || 0) - (candidateA.totalSession || 0);
      })
      .slice(0, 3);
  }, [allMentors, mentor]);
  const handleStartChat = () => {
    if (!mentor || mentor.id === undefined) {
      toast.error(t("common.notEnoughInformationToStartAConver"));
      return;
    }
    if (!isActiveMentor(mentor)) {
      toast.error(t("common.mentorIsCurrentlyInactive"));
      return;
    }
    navigate("/user?tab=messenger", {
      state: {
        openMentorId: mentor.id,
        mentorData: mentor,
      },
    });
  };
  const handleBookNow = () => {
    if (!mentor || mentor.id === undefined) {
      toast.error(t("userMentordetail.notEnoughInformationToSchedule"));
      return;
    }
    if (!isActiveMentor(mentor)) {
      toast.error(t("common.mentorIsCurrentlyInactive"));
      return;
    }
    navigate("/user/mock-interview/schedule", {
      state: {
        preselectedMentorId: mentor.id,
      },
    });
  };
  const handleViewSimilarProfile = (targetMentor: SchemaMentorResponse) => {
    if (!isActiveMentor(targetMentor)) {
      toast.error(t("common.mentorIsCurrentlyInactive"));
      return;
    }
    if (targetMentor.id === undefined) {
      toast.error(t("userMentordetail.notEnoughInformationToView"));
      return;
    }
    navigate(`/user/mentors/${targetMentor.id}`);
  };
  if (!isMentorIdValid) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">
          {t("userMentordetail.mentorIsNotValid")}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {t("userMentordetail.mentorProfilePathIsIncorrect")}
        </p>
        <Button className="mt-5" variant="outline" onClick={() => navigate("/user?tab=mentors")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("userMentordetail.returnToMentorList")}
        </Button>
      </section>
    );
  }
  if (loading) {
    return (
      <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <div className="h-8 w-56 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="h-72 animate-pulse border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900" />
          <Card className="h-72 animate-pulse border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900" />
        </div>
      </section>
    );
  }
  if (!mentor) {
    const isInactiveMentor = mentorUnavailableReason === "inactive";
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">
          {isInactiveMentor
            ? t("userMentordetail.mentorIsTemporarilyClosed")
            : t("common.noMentorFound")}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {isInactiveMentor
            ? t("userMentordetail.thisMentorIsNotCurrently")
            : t("userMentordetail.mentorProfileMayBeHidden")}
        </p>
        <Button className="mt-5" variant="outline" onClick={() => navigate("/user?tab=mentors")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("userMentordetail.returnToMentorList")}
        </Button>
      </section>
    );
  }
  return (
    <section className="h-full overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 md:p-6 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <div className="space-y-5">
        <MentorDetailHero
          mentor={mentor}
          onBack={() => navigate("/user?tab=mentors")}
          onAvatarClick={() => {
            if (mentor.avatarUrl) {
              setViewerItems([
                {
                  id: "mentor-avatar",
                  name: t("common.avatar"),
                  src: mentor.avatarUrl,
                  alt: mentor.name,
                  kind: "image",
                },
              ]);
              setViewerOpen(true);
            }
          }}
        />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <Card className="border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {t("common.introduce")}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-200">
                {mentor.bio || t("userMentordetail.mentorHasNotUpdatedThe")}
              </p>
            </Card>

            <MentorHighlights
              highlights={highlights}
              slaEstimate={slaEstimate}
              ratingText={ratingText}
              hasRating={hasRating}
              totalSessions={totalSessions}
              priceText={priceText}
              hasPrice={hasPrice}
              expertiseTags={expertiseTags}
            />

            <SimilarMentors mentors={similarMentors} onViewProfile={handleViewSimilarProfile} />

            <MentorReviewsSection mentorId={parsedMentorId} />
          </div>

          <MentorActionPanel
            mentor={mentor}
            onBookNow={handleBookNow}
            onStartChat={handleStartChat}
          />
        </div>
      </div>

      <MediaLightboxDialog
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        items={viewerItems}
        initialIndex={0}
      />
    </section>
  );
}

function MentorReviewsSection({ mentorId }: { mentorId: number }) {
  const { t } = useTranslation();
  const { data, isLoading } = useMentorFeedbacksByMentor(mentorId);
  const feedbacks = data || [];

  if (!mentorId) {
    return null;
  }

  return (
    <Card className="border border-slate-200 bg-white p-5 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-950">
      <h2 className="text-lg font-semibold text-balance text-slate-900 dark:text-white">
        {t("common.reviewsFromStudents")}
      </h2>
      {isLoading ? (
        <div className="mt-5 space-y-4" aria-busy="true" aria-label={t("common.loading")}>
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : feedbacks.length > 0 ? (
        <ul className="mt-5 space-y-4" role="list" aria-label={t("common.reviewsFromStudents")}>
          {feedbacks.map((feedback, index) => (
            <li
              key={feedback.id}
              className={[
                "group rounded-xl border border-slate-200 bg-white p-4 transition-colors focus-within:border-[#0047AB] focus-within:ring-1 focus-within:ring-[#0047AB]/40 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-800/60",
                index !== feedbacks.length - 1 ? "mb-4" : "",
              ].join(" ")}>
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={feedback.user?.avatarUrl} />
                  <AvatarFallback>{(feedback.user?.name || "?").charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                    {feedback.user?.name}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                  <Star className="h-4 w-4 text-[#FFD700]" aria-hidden="true" />
                  <span>{feedback.rating}/5</span>
                </div>
              </div>
              {feedback.comment ? (
                <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {feedback.comment}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-sm text-slate-500 dark:text-slate-400" role="status">
          {t("common.noReviewsYet")}
        </p>
      )}
    </Card>
  );
}
