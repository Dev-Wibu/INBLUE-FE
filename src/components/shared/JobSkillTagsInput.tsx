import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getJobSkillTags, parseJobSkillTags } from "@/lib/job-skills";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface JobSkillTagsInputProps {
  id?: string;
  value?: string[] | null;
  onChange: (_tags: string[]) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function JobSkillTagsInput({
  id = "job-skill-tags",
  value,
  onChange,
  disabled = false,
  compact = false,
}: JobSkillTagsInputProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const tags = getJobSkillTags({ skillTags: value });

  const addDraft = () => {
    const additions = parseJobSkillTags(draft);
    if (!additions.length) return;
    onChange(getJobSkillTags({ skillTags: [...tags, ...additions] }));
    setDraft("");
  };

  return (
    <div className="space-y-2">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label={t("jobSkillTags.currentTags")}>
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 text-xs font-semibold text-indigo-700 dark:border-indigo-500/25 dark:bg-indigo-500/10 dark:text-indigo-300">
              {tag}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(tags.filter((currentTag) => currentTag !== tag))}
                className="rounded-sm p-0.5 text-indigo-400 hover:bg-indigo-100 hover:text-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none dark:hover:bg-indigo-500/20 dark:hover:text-indigo-200"
                aria-label={t("jobSkillTags.remove", { skill: tag })}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          disabled={disabled}
          onChange={(event) => {
            const nextValue = event.target.value;
            if (/[,;\n]$/.test(nextValue)) {
              const additions = parseJobSkillTags(nextValue);
              if (additions.length) {
                onChange(getJobSkillTags({ skillTags: [...tags, ...additions] }));
                setDraft("");
                return;
              }
            }
            setDraft(nextValue);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addDraft();
            }
          }}
          onBlur={addDraft}
          placeholder={t("jobSkillTags.placeholder")}
          className={
            compact
              ? "h-8 min-w-0 border-slate-200 bg-slate-50/60 text-xs dark:border-slate-700 dark:bg-slate-800/50"
              : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
          }
        />
        <Button
          type="button"
          variant="outline"
          disabled={disabled || !draft.trim()}
          onMouseDown={(event) => event.preventDefault()}
          onClick={addDraft}
          className={compact ? "h-8 px-2.5" : "shrink-0"}
          aria-label={t("jobSkillTags.add")}>
          <Plus className="h-4 w-4" />
          {!compact && <span>{t("jobSkillTags.add")}</span>}
        </Button>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("jobSkillTags.hint")}</p>
    </div>
  );
}
