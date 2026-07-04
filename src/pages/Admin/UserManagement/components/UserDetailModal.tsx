import { MediaLightboxDialog, type MediaViewerItem } from "@/components/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Briefcase, Hash, Mail } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { UserRole, User as UserType } from "../types";

interface UserDetailModalProps {
  user: UserType | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const getRoleBadgeClass = (role?: UserRole): string => {
  switch (role) {
    case "ADMIN":
      return "bg-purple-600 hover:bg-purple-600";
    case "STAFF":
      return "bg-blue-600 hover:bg-blue-600";
    case "MENTOR":
      return "bg-orange-500 hover:bg-orange-500";
    default:
      return "bg-gray-500 hover:bg-gray-500";
  }
};

export function UserDetailModal({ user, isOpen, onOpenChange }: UserDetailModalProps) {
  const { t } = useTranslation();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItems, setViewerItems] = useState<MediaViewerItem[]>([]);

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800 dark:text-white">
            {t("common.userDetail") || "User Detail"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center space-y-4 py-4">
          <Avatar
            className={cn(
              "h-24 w-24 border-4 border-slate-100 shadow-sm dark:border-slate-800",
              user.avatarUrl ? "cursor-pointer transition-transform hover:scale-105" : ""
            )}
            onClick={() => {
              if (user.avatarUrl) {
                setViewerItems([
                  {
                    id: "user-avatar",
                    name: t("common.avatar"),
                    src: user.avatarUrl,
                    alt: user.name,
                    kind: "image",
                  },
                ]);
                setViewerOpen(true);
              }
            }}>
            <AvatarImage src={user.avatarUrl} alt={user.name} className="object-cover" />
            <AvatarFallback className="bg-blue-100 text-3xl text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              {user.name?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="text-center">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{user.name}</h3>
            <div className="mt-1 flex items-center justify-center gap-2">
              <Badge variant="default" className={`text-white ${getRoleBadgeClass(user.role)}`}>
                {user.role}
              </Badge>
              <Badge variant={user.isActive !== false ? "default" : "destructive"}>
                {user.isActive !== false ? t("common.active") : t("common.inactive")}
              </Badge>
            </div>
          </div>

          <div className="w-full space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
              <Hash className="h-5 w-5 text-slate-400" />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-500 uppercase dark:text-slate-400">
                  {t("common.id")}
                </span>
                <span className="font-medium">{user.id}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
              <Mail className="h-5 w-5 text-slate-400" />
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-medium text-slate-500 uppercase dark:text-slate-400">
                  {t("common.email")}
                </span>
                <span className="truncate font-medium">{user.email}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
              <Briefcase className="h-5 w-5 text-slate-400" />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-500 uppercase dark:text-slate-400">
                  {t("common.role")}
                </span>
                <span className="font-medium">{user.role}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
      <MediaLightboxDialog open={viewerOpen} onOpenChange={setViewerOpen} items={viewerItems} />
    </Dialog>
  );
}
