import i18n from "@/lib/i18n";
const t = i18n.t.bind(i18n);
export const homepageStats = {
  offers: "3,000+",
  costSaving: "70%",
  accuracy: "90%",
  availability: "24/7",
};
export const homepageJobRoles = [
  {
    id: 1,
    name: t("general.softwareEngineer"),
    icon: "code",
  },
  {
    id: 2,
    name: t("general.dataScientist"),
    icon: "database",
  },
  {
    id: 3,
    name: "Marketing",
    icon: "megaphone",
  },
  {
    id: 4,
    name: t("general.productManager"),
    icon: "briefcase",
  },
  {
    id: 5,
    name: t("common.uiuxDesign"),
    icon: "palette",
  },
  {
    id: 6,
    name: t("general.financialAnalysis"),
    icon: "chart",
  },
];
export const homepageFeatures = [
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
export const homepageInterviewModes = [
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
export const homepageTestimonials = [
  {
    id: 1,
    name: t("homepage_homepage.tsx.nguyen_pham_thu_ha"),
    role: "Software Engineering",
    content:
      "I always felt confident about coding, but behavioral questions were a different story. AMA Interview helped me practice clear, impactful answers using the STAR method. It gave me the confidence to handle even the toughest behavioral rounds.",
    avatar: null,
    rating: 5,
  },
  {
    id: 2,
    name: t("homepage_homepage.tsx.tran_minh_uc"),
    role: "Data Science",
    content:
      "The AI interview practice sessions were incredibly helpful. I could practice anytime, anywhere, and the feedback was detailed and actionable. After two weeks of practice, I landed my dream job at a top tech company.",
    avatar: null,
    rating: 5,
  },
  {
    id: 3,
    name: t("homepage_homepage.tsx.le_thi_mai_anh"),
    role: "Product Management",
    content:
      "As a PM transitioning from engineering, I needed help with product sense questions. InBlue Interview's curated questions and AI feedback helped me understand what interviewers look for. Highly recommend!",
    avatar: null,
    rating: 5,
  },
  {
    id: 4,
    name: t("homepage_homepage.tsx.pham_van_hung"),
    role: "Frontend Developer",
    content: t("homepage_homepage.tsx.toi_a_chuan_bi_rat_nhieu_cho_cac_buoi_ph"),
    avatar: null,
    rating: 5,
  },
  {
    id: 5,
    name: t("homepage_homepage.tsx.hoang_thi_linh"),
    role: "UX Designer",
    content: t("homepage_homepage.tsx.cac_cau_hoi_phong_van_thiet_ke_rat_kho_t"),
    avatar: null,
    rating: 4,
  },
  {
    id: 6,
    name: t("homepage_homepage.tsx.ngo_inh_khoa"),
    role: "Backend Engineer",
    content: t("homepage_homepage.tsx.ai_interview_giup_toi_tu_tin_hon_rat_nhi"),
    avatar: null,
    rating: 5,
  },
];
