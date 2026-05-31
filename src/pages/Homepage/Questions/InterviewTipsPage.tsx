import { HomepageHeader } from "@/components/homepage-redesign";
import { Footer } from "@/components/layouts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import i18n from "@/lib/i18n";
import { getDashboardPath, useAuthStore } from "@/stores/authStore";
import {
  ArrowRight,
  BookCheck,
  Brain,
  CheckCircle2,
  Clock,
  GraduationCap,
  Lightbulb,
  MessageSquare,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
const t = i18n.t.bind(i18n);
const interviewTips = [
  {
    id: 1,
    title: t("homepageQuestions.starMethod"),
    description: t("homepageQuestions.learnHowToAnswerBehavioral"),
    icon: Target,
    category: "Behavioral",
    readTime: t("homepageQuestions.5Minutes"),
  },
  {
    id: 2,
    title: t("homepageQuestions.companyResearch"),
    description: t("homepageQuestions.researchThoroughlyAboutTheCompany"),
    icon: BookCheck,
    category: t("homepageQuestions.prepare"),
    readTime: t("homepageQuestions.8Minutes"),
  },
  {
    id: 3,
    title: t("homepageQuestions.bodyLanguage"),
    description: t("homepageQuestions.theImportanceOfNonverbalCommunication"),
    icon: Users,
    category: t("common.softSkills"),
    readTime: t("homepageQuestions.6Minutes"),
  },
  {
    id: 4,
    title: t("homepageQuestions.handlingDifficultQuestions"),
    description: t("homepageQuestions.strategiesForDealingWithUnexpected"),
    icon: Brain,
    category: t("common.skill"),
    readTime: t("homepageQuestions.7Minutes"),
  },
  {
    id: 5,
    title: t("homepageQuestions.salaryNegotiation"),
    description: t("homepageQuestions.howToResearchMarketSalaries"),
    icon: TrendingUp,
    category: t("homepageQuestions.negotiate"),
    readTime: t("homepageQuestions.10Minutes"),
  },
  {
    id: 6,
    title: t("homepageQuestions.questionsForEmployers"),
    description: t("homepageQuestions.listOfSmartQuestionsTo"),
    icon: MessageSquare,
    category: t("homepageQuestions.strategy"),
    readTime: t("homepageQuestions.5Minutes"),
  },
];
const quickTips = [
  t("homepageQuestions.arrive1015MinutesEarly"),
  t("homepageQuestions.bringACopyOfYour"),
  t("homepageQuestions.turnOffYourPhoneOr"),
  t("homepageQuestions.dressProfessionallyAndInAccordance"),
  t("homepageQuestions.prepareQuestionsToAskThe"),
  t("homepageQuestions.sendAThankYouEmail"),
];
export function InterviewTipsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuthStore();
  const dashboardPath = isLoggedIn ? getDashboardPath(user?.role) : "/login";
  const ctaPath = isLoggedIn ? getDashboardPath(user?.role) : "/select-role";
  return (
    <div className="relative w-full overflow-hidden bg-white dark:bg-slate-950">
      <HomepageHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-[#DCEEFF]/30 py-16 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-1/4 h-72 w-72 rounded-full bg-[#66B2FF]/20 blur-3xl" />
          <div className="absolute right-1/4 bottom-20 h-72 w-72 rounded-full bg-[#A5C8F2]/20 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <Badge
              variant="secondary"
              className="mb-4 bg-[#DCEEFF] text-[#0047AB] dark:bg-[#0047AB]/20 dark:text-[#66B2FF]">
              <Lightbulb className="mr-2 h-4 w-4" />
              {t("common.interviewTips")}
            </Badge>
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-slate-900 lg:text-5xl dark:text-white">
              {t("homepageQuestions.secretsToSuccessfulInterviews")}
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
              {t("homepageQuestions.collectionOfTheMostEffective")}
            </p>
          </div>
        </div>
      </section>

      {/* Quick Tips Banner */}
      <section className="border-b bg-[#DCEEFF]/50 py-8 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <Clock className="h-5 w-5 text-[#0047AB] dark:text-[#66B2FF]" />
            {t("homepageQuestions.quickTipsForInterviewDay")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quickTips.map((tip, index) => (
              <div
                key={index}
                className="flex items-start gap-2 rounded-lg bg-white p-3 shadow-sm dark:bg-slate-800">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                <span className="text-sm text-slate-700 dark:text-slate-300">{tip}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tips Cards */}
      <section className="py-16 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="mb-8 text-2xl font-bold text-slate-900 dark:text-white">
            {t("homepageQuestions.detailedInstructions")}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {interviewTips.map((tip) => {
              const Icon = tip.icon;
              return (
                <Card
                  key={tip.id}
                  className="group cursor-pointer transition-all hover:shadow-lg dark:border-slate-700 dark:bg-slate-800">
                  <CardHeader>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#DCEEFF] transition-colors group-hover:bg-[#A5C8F2] dark:bg-[#0047AB]/30 dark:group-hover:bg-[#0047AB]/50">
                        <Icon className="h-6 w-6 text-[#0047AB] dark:text-[#66B2FF]" />
                      </div>
                      <Badge variant="outline" className="text-xs dark:border-slate-600">
                        {tip.category}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg dark:text-white">{tip.title}</CardTitle>
                    <CardDescription className="dark:text-slate-400">
                      {tip.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                        <Clock className="h-4 w-4" />
                        {tip.readTime}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[#0047AB] dark:text-[#66B2FF]"
                        onClick={() => navigate(dashboardPath)}>
                        {t("homepageQuestions.readMore")}
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-[#0047AB] to-[#007BFF] py-16">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <GraduationCap className="mx-auto mb-4 h-12 w-12 text-white/80" />
          <h2 className="mb-4 text-3xl font-bold text-white">
            {t("homepageQuestions.readyForYourNextInterview")}
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-[#A5C8F2]">
            {t("homepageQuestions.signUpToPracticeWith")}
          </p>
          <div className="flex justify-center gap-4">
            <Button
              size="lg"
              variant="secondary"
              className="rounded-full bg-white text-[#0047AB] hover:bg-slate-100"
              asChild>
              <Link to={ctaPath}>
                {isLoggedIn ? t("common.openDashboard") : t("homepageQuestions.startPracticing")}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
