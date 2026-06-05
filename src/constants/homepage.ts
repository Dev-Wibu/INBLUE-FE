import { useTranslation } from "react-i18next";

export const homepageStats = {
  offers: "3,000+",
  costSaving: "70%",
  accuracy: "90%",
  availability: "24/7",
};

export function useHomepageJobRoles() {
  const { t } = useTranslation();
  return [
    { id: 1, name: t("general.softwareEngineer"), icon: "code" },
    { id: 2, name: t("general.dataScientist"), icon: "database" },
    { id: 3, name: t("general.marketing"), icon: "megaphone" },
    { id: 4, name: t("general.productManager"), icon: "briefcase" },
    { id: 5, name: t("common.uiuxDesign"), icon: "palette" },
    { id: 6, name: t("general.financialAnalysis"), icon: "chart" },
  ];
}

export function useHomepageFeatures() {
  const { t } = useTranslation();
  return [
    {
      id: 1,
      title: t("general.aiSimulationInterview"),
      headline: t("general.personalizedExperience"),
      description: t("general.tailorTheInterviewToSuit"),
      cta: t("general.startAMockInterview"),
    },
    {
      id: 2,
      title: t("general.trendingQuestions"),
      headline: t("general.masterPracticeQuestions"),
      description: t("general.discoverRealInterviewQuestionsThat"),
      cta: t("general.startPracticingNow"),
    },
    {
      id: 3,
      title: t("general.smartJobDescriptions"),
      headline: t("general.practiceFromTheJobDescription"),
      description: t("general.startYourMockInterviewFrom"),
      cta: t("general.tryItNow"),
    },
  ];
}

export function useHomepageInterviewModes() {
  const { t } = useTranslation();
  return [
    {
      id: 1,
      title: t("common.textMode"),
      description: t("general.perfectForCreatingThoughtfulAnd"),
      benefits: [
        t("general.createPerfectAnswers"),
        t("general.masterProvenFrameworks"),
        t("general.buildTrustSystematically"),
      ],
      icon: "text",
    },
    {
      id: 2,
      title: t("common.voiceMode"),
      description: t("general.practiceSayingYourAnswersOut"),
      benefits: [
        t("general.perfectYourDeliveryAndTone"),
        t("general.overcomeAnxietyWhenSpeaking"),
        t("general.practiceInRealTime"),
      ],
      icon: "mic",
    },
    {
      id: 3,
      title: t("general.conversationMode"),
      description: t("general.theMostAuthenticInterviewExperience"),
      benefits: [
        t("general.theMostRealisticExperience"),
        t("general.handleUnexpectedQuestions"),
        t("general.buildQuickThinkingSkills"),
      ],
      icon: "video",
    },
  ];
}

export function useHomepageTestimonials() {
  const { t } = useTranslation();
  return [
    {
      id: 1,
      name: t("common.nguyenPhamThuHa"),
      role: t("common.roleSoftwareEngineering"),
      content: t("common.testimonialHaContent"),
      avatar: null,
      rating: 5,
    },
    {
      id: 2,
      name: t("homepageHomepage.tranMinhDuc"),
      role: t("common.roleDataScience"),
      content: t("common.testimonialDucContent"),
      avatar: null,
      rating: 5,
    },
    {
      id: 3,
      name: t("common.leThiMaiAnh"),
      role: t("common.roleProductManagement"),
      content: t("common.testimonialAnhContent"),
      avatar: null,
      rating: 5,
    },
    {
      id: 4,
      name: t("common.phamVanHung"),
      role: t("common.roleFrontendDeveloper"),
      content: t("common.phamVanHungTestimonial"),
      avatar: null,
      rating: 5,
    },
    {
      id: 5,
      name: t("common.hoangThiLinh"),
      role: t("common.roleUxDesigner"),
      content: t("common.designInterviewQuestionsAreDifficult"),
      avatar: null,
      rating: 4,
    },
    {
      id: 6,
      name: t("homepageHomepage.ngoDinhKhoa"),
      role: t("common.roleBackendEngineer"),
      content: t("common.aiInterviewHelpsMeBeMuchMoreConfi"),
      avatar: null,
      rating: 5,
    },
  ];
}
