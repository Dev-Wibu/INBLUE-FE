import { CommunityFeedPage } from "@/components/post";
import { useTranslation } from "react-i18next";

export function StaffHomeFeedPage() {
  const { t } = useTranslation();
  return <CommunityFeedPage title={t("common.home")} />;
}
