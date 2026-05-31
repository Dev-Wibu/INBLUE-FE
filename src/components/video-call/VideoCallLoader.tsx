import i18n from "@/lib/i18n";
const t = i18n.t.bind(i18n);
/**
 * VideoCallLoader.tsx
 * Loading state while joining call
 */

import { Loader2, Video } from "lucide-react";

import { cn } from "@/lib/utils";

interface VideoCallLoaderProps {
  message?: string;
  className?: string;
}

export function VideoCallLoader({
  message = t("compVideoCall.callConnecting"),
  className,
}: VideoCallLoaderProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 p-8", className)}>
      <div className="relative">
        <Video className="text-muted-foreground h-16 w-16" />
        <Loader2 className="text-primary absolute -right-2 -bottom-2 h-8 w-8 animate-spin" />
      </div>
      <p className="text-muted-foreground text-lg">{message}</p>
    </div>
  );
}
