const fs = require("fs");
const path = require("path");

const detailPath = path.join(
  __dirname,
  "src/pages/Admin/UserManagement/components/UserDetailView.tsx"
);
let content = fs.readFileSync(detailPath, "utf-8").replace(/\r\n/g, "\n");

// Add imports
content = content.replace(
  /import \{ Badge \} from "@\/components\/ui\/badge";\n/,
  `import { Badge } from "@/components/ui/badge";\nimport { Button } from "@/components/ui/button";\nimport { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";\n`
);

content = content.replace(
  /Wrench,\n\} from "lucide-react";\n/,
  `Wrench,\n  Edit3,\n  ExternalLink,\n  FileText,\n} from "lucide-react";\n`
);

// Replace UserEditForm inline rendering with Sheet
const userEditFormRegex =
  /<UserEditForm\n\s*isInline\n\s*formData=\{formData\}\n\s*onFormChange=\{onFormChange\}\n\s*onSubmit=\{onSubmit\}\n\s*onCancel=\{onBack\}\n\s*title=\{t\("adminUsermanagement\.userEditing"\)\}\n\s*description=\{t\("adminUsermanagement\.updateUserInformation"\)\}\n\s*submitLabel=\{t\("common\.saveChanges"\)\}\n\s*selectedUser=\{user\}\n\s*\/>/;
content = content.replace(userEditFormRegex, "");

// Add Sheet Trigger to Header
const headerRegex =
  /<h2 className="text-xl font-bold text-slate-900 dark:text-white">\n\s*\{t\("common\.userDetail"\) \|\| "User Details"\}\n\s*<\/h2>\n\s*<\/div>\n\s*<\/div>/;
const headerReplacement = `<h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {t("common.userDetail") || "User Details"}
          </h2>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit3 className="mr-2 h-4 w-4" />
                {t("general.edit")}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0">
              <UserEditForm
                isInline
                formData={formData}
                onFormChange={onFormChange}
                onSubmit={onSubmit}
                onCancel={() => {}}
                title={t("adminUsermanagement.userEditing")}
                description={t("adminUsermanagement.updateUserInformation")}
                submitLabel={t("common.saveChanges")}
                selectedUser={user}
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>`;
content = content.replace(headerRegex, headerReplacement);

// Fix Skills badges
const technicalSkillsRegex =
  /<div className="flex flex-wrap gap-2">\n\s*\{\(profile\.technicalSkills \?\? \[\]\)\.length > 0 \? \(\n\s*profile\.technicalSkills!\.map\(\(s\) => \(\n\s*<Badge key=\{s\} variant="secondary" className="px-3 py-1">\n\s*\{s\}\n\s*<\/Badge>\n\s*\)\)\n\s*\) : \([\s\S]*?<\/div>/;
const technicalSkillsReplacement = `<div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {(profile.technicalSkills ?? []).length > 0 ? (
                      profile.technicalSkills!.join(", ")
                    ) : (
                      <span className="text-gray-400">
                        {t("adminUsermanagement.noInformationYet")}
                      </span>
                    )}
                  </div>`;
content = content.replace(technicalSkillsRegex, technicalSkillsReplacement);

const softSkillsRegex =
  /<div className="flex flex-wrap gap-2">\n\s*\{\(profile\.softSkills \?\? \[\]\)\.length > 0 \? \(\n\s*profile\.softSkills!\.map\(\(s\) => \(\n\s*<Badge key=\{s\} variant="outline" className="px-3 py-1">\n\s*\{s\}\n\s*<\/Badge>\n\s*\)\)\n\s*\) : \([\s\S]*?<\/div>/;
const softSkillsReplacement = `<div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {(profile.softSkills ?? []).length > 0 ? (
                      profile.softSkills!.join(", ")
                    ) : (
                      <span className="text-gray-400">
                        {t("adminUsermanagement.noInformationYet")}
                      </span>
                    )}
                  </div>`;
content = content.replace(softSkillsRegex, softSkillsReplacement);

const toolsRegex =
  /<div className="flex flex-wrap gap-2">\n\s*\{\(profile\.tools \?\? \[\]\)\.length > 0 \? \(\n\s*profile\.tools!\.map\(\(t\) => \(\n\s*<Badge key=\{t\} variant="secondary" className="px-3 py-1">\n\s*\{t\}\n\s*<\/Badge>\n\s*\)\)\n\s*\) : \([\s\S]*?<\/div>/;
const toolsReplacement = `<div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {(profile.tools ?? []).length > 0 ? (
                      profile.tools!.join(", ")
                    ) : (
                      <span className="text-gray-400">
                        {t("adminUsermanagement.noInformationYet")}
                      </span>
                    )}
                  </div>`;
content = content.replace(toolsRegex, toolsReplacement);

// Fix Work Experiences box-in-box
const workExpRegex =
  /<div className="space-y-3">\n\s*\{profile\.workExperiences!\.map\(\(w, i\) => \(\n\s*<div\n\s*key=\{i\}\n\s*className="rounded-lg border p-4 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800\/50">/g;
const workExpReplacement = `<div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {profile.workExperiences!.map((w, i) => (
                        <div
                          key={i}
                          className="py-4 first:pt-0 last:pb-0">`;
content = content.replace(workExpRegex, workExpReplacement);

// Fix Projects box-in-box
const projectsRegex =
  /<div className="space-y-3">\n\s*\{profile\.projects!\.map\(\(p, i\) => \(\n\s*<div\n\s*key=\{i\}\n\s*className="rounded-lg border p-4 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800\/50">/g;
const projectsReplacement = `<div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {profile.projects!.map((p, i) => (
                        <div
                          key={i}
                          className="py-4 first:pt-0 last:pb-0">`;
content = content.replace(projectsRegex, projectsReplacement);

// Fix Education box-in-box
const eduRegex =
  /<div className="space-y-3">\n\s*\{profile\.educations!\.map\(\(e, i\) => \(\n\s*<div\n\s*key=\{i\}\n\s*className="rounded-lg border p-4 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800\/50">/g;
const eduReplacement = `<div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {profile.educations!.map((e, i) => (
                        <div
                          key={i}
                          className="py-4 first:pt-0 last:pb-0">`;
content = content.replace(eduRegex, eduReplacement);

// Add CV URL section if cvUrl exists
const introSectionRegex =
  /<div className="mt-3 rounded-lg border p-4 dark:border-slate-700">\n\s*<span className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-slate-400">\n\s*\{t\("common\.introduce"\)\}\n\s*<\/span>\n\s*<p className="mt-1 text-sm leading-relaxed">\{profile\.introduction\}<\/p>\n\s*<\/div>\n\s*\)\}/;
const cvSection = `<div className="mt-3 rounded-lg border p-4 dark:border-slate-700">
                      <span className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-slate-400">
                        {t("common.introduce")}
                      </span>
                      <p className="mt-1 text-sm leading-relaxed">{profile.introduction}</p>
                    </div>
                  )}
                  {profile.cvUrl && (
                    <div className="mt-3">
                      <a
                        href={profile.cvUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40"
                      >
                        <FileText className="h-4 w-4" />
                        Xem CV
                        <ExternalLink className="h-3 w-3 opacity-50" />
                      </a>
                    </div>
                  )}`;
content = content.replace(introSectionRegex, cvSection);

fs.writeFileSync(detailPath, content, "utf-8");
console.log("Successfully updated UserDetailView.tsx");
