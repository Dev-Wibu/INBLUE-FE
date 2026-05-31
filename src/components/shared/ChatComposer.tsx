import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import i18n from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Send, SmilePlus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
const t = i18n.t.bind(i18n);

interface ChatComposerProps {
  value: string;
  onChange: (_value: string) => void;
  onSend: () => void;
  placeholder: string;
  isMobile?: boolean;
  disabled?: boolean;
  onApplyQuickCommand?: (_command: string) => void;
}

const QUICK_EMOJIS = [
  "👍",
  "👎",
  "👌",
  "😊",
  "😋",
  "😘",
  "🤩",
  "😀",
  "😂",
  "😍",
  "🥺",
  "🤔",
  "🥰",
  "🤣",
  "😭",
  "🙏",
  "🔥",
  "💡",
  "🐧",
  "🗿",
  "🎉",
  "👏",
  "🤝",
  "🤡",
  "💀",
];

const QUICK_COMMANDS = [
  {
    command: "/camon",
    label: t("compShared.sendAQuickThankYou"),
    template: t("compShared.thankYouIHaveReceived"),
  },
  {
    command: "/xacnhan",
    label: t("compShared.confirmRead"),
    template: t("compShared.iHaveReadAndConfirmed"),
  },
  {
    command: "/hen",
    label: t("compShared.scheduleAFollowUpDiscussion"),
    template: t("compShared.iSuggestWeDiscussFurther"),
  },
  {
    command: "/tongket",
    label: t("compShared.shortSummaryOfTheConversation"),
    template: t("compShared.quickSummaryIHaveNoted"),
  },
];

const RECENT_EMOJI_STORAGE_KEY = "messenger_recent_emojis";
const MAX_RECENT_EMOJIS = 8;

export function ChatComposer({
  value,
  onChange,
  onSend,
  placeholder,
  isMobile = false,
  disabled = false,
  onApplyQuickCommand,
}: ChatComposerProps) {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(RECENT_EMOJI_STORAGE_KEY) || "[]");
      if (Array.isArray(stored)) {
        return stored
          .filter((item): item is string => typeof item === "string" && item.length > 0)
          .slice(0, MAX_RECENT_EMOJIS);
      }
    } catch {
      return [];
    }

    return [];
  });

  const commandQuery = value.trimStart();
  const isCommandMode = commandQuery.startsWith("/");

  const visibleCommands = useMemo(() => {
    if (!isCommandMode) {
      return [];
    }

    return QUICK_COMMANDS.filter((item) => item.command.includes(commandQuery.toLowerCase())).slice(
      0,
      4
    );
  }, [commandQuery, isCommandMode]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 132)}px`;
  }, [value]);

  const appendEmoji = (emoji: string) => {
    onChange(`${value}${emoji}`);
    setRecentEmojis((previous) => {
      const next = [emoji, ...previous.filter((item) => item !== emoji)].slice(
        0,
        MAX_RECENT_EMOJIS
      );
      try {
        localStorage.setItem(RECENT_EMOJI_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore localStorage errors to keep compose flow responsive.
      }
      return next;
    });
    textareaRef.current?.focus();
  };

  const applyQuickCommand = (command: (typeof QUICK_COMMANDS)[number]) => {
    const nextValue = value.trimStart().startsWith("/")
      ? `${command.template}\n`
      : `${value}${value.length > 0 ? "\n" : ""}${command.template}\n`;

    onChange(nextValue);
    onApplyQuickCommand?.(command.command);
    textareaRef.current?.focus();
  };

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isMobile || disabled) {
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  };

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className="mx-auto flex w-full max-w-5xl items-end gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-xl border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            title={t("compShared.insertEmojis")}
            aria-label={t("compShared.insertEmojis")}
            disabled={disabled}>
            <SmilePlus className="h-4.5 w-4.5" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-56 p-2">
          {recentEmojis.length > 0 && (
            <>
              <p className="px-2 pb-1 text-xs font-semibold text-slate-500">
                {t("compShared.usedRecently")}
              </p>
              <div className="mb-2 grid grid-cols-4 gap-1">
                {recentEmojis.map((emoji) => (
                  <DropdownMenuItem
                    key={`recent-${emoji}`}
                    className="justify-center text-lg"
                    onSelect={() => appendEmoji(emoji)}>
                    {emoji}
                  </DropdownMenuItem>
                ))}
              </div>
            </>
          )}

          <p className="px-2 pb-1 text-xs font-semibold text-slate-500">Emoji nhanh</p>
          <div className="grid grid-cols-5 gap-1">
            {QUICK_EMOJIS.map((emoji) => (
              <DropdownMenuItem
                key={emoji}
                className="justify-center text-lg"
                onSelect={() => appendEmoji(emoji)}>
                {emoji}
              </DropdownMenuItem>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1">
        {visibleCommands.length > 0 && (
          <div className="mb-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="px-1 pb-1 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
              {t("compShared.quickCommand")}
            </p>
            <div className="space-y-1">
              {visibleCommands.map((command) => (
                <button
                  key={command.command}
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs text-slate-600 transition hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-blue-900/20 dark:hover:text-blue-300"
                  onClick={() => applyQuickCommand(command)}>
                  <span className="font-semibold">{command.command}</span>
                  <span className="truncate pl-2 text-[11px] text-slate-400">{command.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <textarea
          data-messenger-composer="true"
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleComposerKeyDown}
          rows={1}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "max-h-[132px] min-h-11 w-full resize-none rounded-xl border bg-slate-50 px-3 py-2.5 text-sm leading-6 text-slate-900 transition outline-none dark:bg-slate-800 dark:text-slate-100",
            "focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:border-blue-700 dark:focus:ring-blue-900/40",
            "border-slate-200 dark:border-slate-700",
            disabled && "cursor-not-allowed opacity-60"
          )}
        />
      </div>

      <Button
        onClick={onSend}
        size="icon"
        className="h-11 w-11 shrink-0 rounded-xl bg-blue-600 hover:bg-blue-700"
        disabled={!canSend}
        title={t("compShared.sendAMessage")}
        aria-label={t("compShared.sendAMessage")}>
        <Send className="h-4.5 w-4.5" />
      </Button>
    </div>
  );
}
