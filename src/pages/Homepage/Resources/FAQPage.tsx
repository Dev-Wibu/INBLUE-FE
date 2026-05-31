import { HomepageHeader } from "@/components/homepage-redesign";
import { Footer } from "@/components/layouts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import i18n from "@/lib/i18n";
import { getDashboardPath, useAuthStore } from "@/stores/authStore";
import {
  ChevronDown,
  FileText,
  GraduationCap,
  HelpCircle,
  MessageCircle,
  Search,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
const t = i18n.t.bind(i18n);
const faqCategories = [
  {
    id: "general",
    name: t("homepageResources.generalQuestion"),
    icon: HelpCircle,
  },
  {
    id: "ai-interview",
    name: "AI Interview",
    icon: MessageCircle,
  },
  {
    id: "mentor",
    name: "Mock Interview",
    icon: GraduationCap,
  },
  {
    id: "account",
    name: t("common.account"),
    icon: FileText,
  },
];
const faqs = [
  {
    id: 1,
    category: "general",
    question: t("homepageResources.whatIsInblueAi"),
    answer: t("homepageResources.inblueAiIsAnOnline"),
  },
  {
    id: 2,
    category: "general",
    question: t("homepageResources.canITryItFor"),
    answer: t("homepageResources.haveYouCanSignUp"),
  },
  {
    id: 3,
    category: "general",
    question: t("homepageResources.whatProfessionsDoesInblueAi"),
    answer: t("homepageResources.weSupportAVarietyOf"),
  },
  {
    id: 4,
    category: "ai-interview",
    question: t("homepageResources.howDoesAiInterviewWork"),
    answer: t("homepageResources.aiInterviewUsesAdvancedAi"),
  },
  {
    id: 5,
    category: "ai-interview",
    question: t("homepageResources.canAiAnalyzeBodyLanguage"),
    answer: t("homepageResources.haveInVideoModeAi"),
  },
  {
    id: 6,
    category: "mentor",
    question: t("homepageResources.whoIsMentor"),
    answer: t("homepageResources.ourMentorsAreExpertsFrom"),
  },
  {
    id: 7,
    category: "mentor",
    question: t("homepageResources.howToScheduleAnAppointment"),
    answer: t("homepageResources.afterLoggingInYouCan"),
  },
  {
    id: 8,
    category: "account",
    question: t("homepageResources.howToUpgradeMyAccount"),
    answer: t("homepageResources.youCanUpgradeYourAccount"),
  },
  {
    id: 9,
    category: "account",
    question: t("homepageResources.isMyDataSecure"),
    answer: t("homepageResources.sureWeUseSslEncryption"),
  },
];
export function FAQPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuthStore();
  const dashboardPath = isLoggedIn ? getDashboardPath(user?.role) : "/login";
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory = selectedCategory === "all" || faq.category === selectedCategory;
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });
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
              <HelpCircle className="mr-2 h-4 w-4" />
              {t("homepageResources.supportCenter")}
            </Badge>
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-slate-900 lg:text-5xl dark:text-white">
              {t("common.frequentlyAskedQuestions")}
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
              {t("homepageResources.findQuickAnswersToCommon")}
            </p>

            {/* Search */}
            <div className="mx-auto max-w-xl">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder={t("common.searchQuestions")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 pl-10 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="border-b bg-white py-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("all")}
              className={
                selectedCategory === "all" ? "bg-[#0047AB] text-white" : "dark:border-slate-700"
              }>
              {t("general.all")}
            </Button>
            {faqCategories.map((category) => {
              const Icon = category.icon;
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className={
                    selectedCategory === category.id
                      ? "bg-[#0047AB] text-white"
                      : "dark:border-slate-700"
                  }>
                  <Icon className="mr-2 h-4 w-4" />
                  {category.name}
                </Button>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ List */}
      <section className="py-16 dark:bg-slate-900">
        <div className="mx-auto max-w-3xl px-6">
          <div className="space-y-4">
            {filteredFaqs.map((faq) => (
              <Card
                key={faq.id}
                className="cursor-pointer transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}>
                <CardContent className="p-0">
                  <div className="flex items-center justify-between p-4">
                    <h3 className="pr-4 font-medium text-slate-900 dark:text-white">
                      {faq.question}
                    </h3>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${expandedId === faq.id ? "rotate-180" : ""}`}
                    />
                  </div>
                  {expandedId === faq.id && (
                    <div className="border-t px-4 py-4 dark:border-slate-700">
                      <p className="text-slate-600 dark:text-slate-400">{faq.answer}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredFaqs.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-slate-500 dark:text-slate-400">
                {t("common.noMatchingQuestionsWereFound")}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Contact Section */}
      <section className="bg-slate-50 py-16 dark:bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h2 className="mb-4 text-2xl font-bold text-slate-900 dark:text-white">
            {t("homepageResources.didnTFindTheAnswer")}
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-slate-600 dark:text-slate-400">
            {t("homepageResources.ourSupportTeamIsAlways")}
          </p>
          <Button
            size="lg"
            className="rounded-full bg-gradient-to-r from-[#0047AB] to-[#007BFF]"
            onClick={() => navigate(dashboardPath)}>
            <MessageCircle className="mr-2 h-5 w-5" />
            {t("homepageResources.contactSupport")}
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
