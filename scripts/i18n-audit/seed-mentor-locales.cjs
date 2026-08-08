const fs = require("fs");
const path = require("path");

const LOCALES = ["en", "vi", "ja"];
const LOCALES_DIR = path.join(__dirname, "../../src/locales");

// Translations for the keys I introduced in this UI session.
// Anything not in this map will be left as-is (the auto-fixer's
// placeholder literal) and treated as a TODO.
const T = {
  "mentorSessions.candidateFeedback": {
    en: "Candidate feedback",
    vi: "Đánh giá của candidate",
    ja: "候補者からのフィードバック",
  },
  "mentorSessions.candidateHasNotLeftFeedbackYet": {
    en: "Candidate has not left feedback yet",
    vi: "Candidate chưa để lại đánh giá",
    ja: "候補者からの評価はまだ届いていません",
  },
  "mentorSessions.recording": {
    en: "Recording",
    vi: "Bản ghi",
    ja: "録画",
  },
  "mentorSessions.startTime": {
    en: "Start time",
    vi: "Thời gian bắt đầu",
    ja: "開始時刻",
  },
  "mentorSessions.endTime": {
    en: "End time",
    vi: "Thời gian kết thúc",
    ja: "終了時刻",
  },
  "mentorSessions.seeReviews": {
    en: "See reviews",
    vi: "Xem đánh giá",
    ja: "レビューを見る",
  },
  "mentorSessions.overviewOfAssessmentContentSent": {
    en: "Snapshot of the assessment you shared with the candidate.",
    vi: "Tóm tắt đánh giá bạn đã gửi cho candidate.",
    ja: "候補者と共有した評価のサマリー。",
  },
  "mentorSessions.youHaventSubmittedAReview": {
    en: "You haven't submitted a review for this session yet.",
    vi: "Bạn chưa gửi đánh giá cho session này.",
    ja: "このセッションにはまだレビューを送信していません。",
  },
  "mentorSessions.reviewOfSession": {
    en: "Review of session",
    vi: "Đánh giá của session",
    ja: "セッションのレビュー",
  },
  "common.backToTheSession": {
    en: "Back to the session",
    vi: "Về session",
    ja: "セッションに戻る",
  },
  "mentorReviews.candidate": {
    en: "Candidate",
    vi: "Candidate",
    ja: "候補者",
  },
  "compReview.promptSituation": {
    en: "Set the scene: what was the interview about, who was the student, and what was the wider context?",
    vi: "Phác thảo bối cảnh: buổi phỏng vấn về chủ đề gì, thông tin về student và bối cảnh rộng hơn?",
    ja: "状況を設定：面接のテーマ、学生の背景、より広い文脈は？",
  },
  "compReview.promptTask": {
    en: "What challenges or tasks did you give the student? What were they expected to solve?",
    vi: "Bạn đã giao cho student những thử thách hay nhiệm vụ nào? Họ được kỳ vọng giải quyết ra sao?",
    ja: "どんな課題やタスクを出しましたか？何を解決することが期待されましたか？",
  },
  "compReview.promptAction": {
    en: "How did the student respond? What specific steps, decisions, or techniques did they use?",
    vi: "Student đã phản ứng thế nào? Họ dùng những bước cụ thể, quyết định hay kỹ thuật nào?",
    ja: "学生はどう反応しましたか？具体的にどんな手順・判断・工夫をしましたか？",
  },
  "compReview.promptResult": {
    en: "What was the outcome? What did the student achieve, learn, or struggle with?",
    vi: "Kết quả thế nào? Student đạt được, học được, hay vướng mắc ở điểm nào?",
    ja: "結果はどうでしたか？何が達成され、何を学び、何で苦労しましたか？",
  },
  "mentorSessions.youScoredCandidateWith": {
    en: "You scored this candidate {{var_0}} / 5",
    vi: "Bạn đã chấm candidate {{var_0}} / 5",
    ja: "この候補者を {{var_0}} / 5 で評価しました",
  },
  "mentorReviews.mentorReviewReport": {
    en: "Mentor Review Report",
    vi: "Báo cáo đánh giá của mentor",
    ja: "メンターレビューレポート",
  },
  "common.timeline": {
    en: "Timeline",
    vi: "Dòng thời gian",
    ja: "タイムライン",
  },
  "common.open": {
    en: "Open",
    vi: "Mở",
    ja: "開く",
  },
  "common.checkNow": {
    en: "Check now",
    vi: "Kiểm tra ngay",
    ja: "今すぐ確認",
  },
  "common.copied": {
    en: "Copied",
    vi: "Đã sao chép",
    ja: "コピーしました",
  },
};

function loadJson(locale) {
  const p = path.join(LOCALES_DIR, `${locale}.json`);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function saveJson(locale, json) {
  const p = path.join(LOCALES_DIR, `${locale}.json`);
  fs.writeFileSync(p, JSON.stringify(json, null, 2) + "\n", "utf8");
}

function setNestedKey(obj, pathStr, value) {
  const parts = pathStr.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof cur[parts[i]] !== "object" || cur[parts[i]] === null) {
      cur[parts[i]] = {};
    }
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

let touched = 0;
for (const locale of LOCALES) {
  const json = loadJson(locale);
  for (const [key, translations] of Object.entries(T)) {
    setNestedKey(json, key, translations[locale]);
    touched++;
  }
  saveJson(locale, json);
}

console.log(`Updated ${touched} translations across en/vi/ja.`);