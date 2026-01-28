import { getEffectiveTheme, useThemeStore } from "@/stores/themeStore";
import { getEffectiveTheme, useThemeStore } from "@/stores/themeStore";
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "ldtaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "light" } = useThemeStore();
  const effectiveTheme = getEffectiveTheme(theme);

  return (
    <Sonner
      theme={effectiveTheme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      richColors
      duration={4000}
      icons={{
        success: <CircleCheckIcon className="size-5" />, // slightly larger
        info: <InfoIcon className="size-5" />,
        warning: <TriangleAlertIcon className="size-5" />,
        error: <OctagonXIcon className="size-5" />,
        loading: <Loader2Icon className="size-5 animate-spin" />,
      }}
      style={
        {
          // Keep theme vars but enforce prominence
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          zIndex: 9999,
          maxWidth: "420px",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
