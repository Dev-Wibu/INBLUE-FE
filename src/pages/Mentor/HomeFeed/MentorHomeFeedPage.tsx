import { CommunityFeedPage } from "@/components/post";
import { useTranslation } from "react-i18next";
export function MentorHomeFeedPage() {
  const { t } = useTranslation();
  return (
    <CommunityFeedPage
      title={t("common.home")}
      description={t("mentorHomefeed.updateTheLatestArticlesFrom")}
    />
  );
}
