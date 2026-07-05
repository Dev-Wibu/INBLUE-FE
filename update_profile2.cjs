const fs = require("fs");
const path = require("path");

const userDetailViewPath = path.join(
  __dirname,
  "src",
  "pages",
  "Admin",
  "UserManagement",
  "components",
  "UserDetailView.tsx"
);
const candidateProfileModalPath = path.join(
  __dirname,
  "src",
  "pages",
  "Admin",
  "UserManagement",
  "components",
  "CandidateProfileModal.tsx"
);

let detailContent = fs.readFileSync(userDetailViewPath, "utf-8").replace(/\r\n/g, "\n");
const modalContent = fs.readFileSync(candidateProfileModalPath, "utf-8").replace(/\r\n/g, "\n");

// Extract the sections from CandidateProfileModal
const startMarker = "{/* Basic Info Section */}\n          <section>";
const endMarker = "        </div>\n      </DialogContent>";

const startIndex = modalContent.indexOf(startMarker);
const endIndex = modalContent.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find sections in CandidateProfileModal");
  process.exit(1);
}

const profileSections = modalContent.substring(startIndex, endIndex);

// 1. Remove overview tab trigger, and change defaultValue to "profile"
detailContent = detailContent.replace(
  /<TabsList className="mb-4">[\s\S]*?<\/TabsList>/,
  `<TabsList className="mb-4">
            {profile && (
              <TabsTrigger value="profile">{t("common.candidateProfile")}</TabsTrigger>
            )}
            <TabsTrigger value="settings">{t("common.settings")}</TabsTrigger>
          </TabsList>`
);
detailContent = detailContent.replace(/defaultValue="overview"/, `defaultValue="profile"`);

// 2. Remove the overview TabsContent completely
detailContent = detailContent.replace(
  /            <TabsContent value="overview" className="mt-0">[\s\S]*?<\/TabsContent>\n\n            <TabsContent value="profile" className="mt-0">/,
  `            <TabsContent value="profile" className="mt-0">`
);

// 3. Replace the profile TabsContent body with the full profileSections
const profileTabContentRegex =
  /            <TabsContent value="profile" className="mt-0">[\s\S]*?<\/TabsContent>\n          <\/Tabs>/;
detailContent = detailContent.replace(
  profileTabContentRegex,
  `            <TabsContent value="profile" className="mt-0">
              {profile ? (
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="space-y-6">
                    ${profileSections}
                  </div>
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                  {t("adminUsermanagement.noInformationYet")}
                </div>
              )}
            </TabsContent>
          </Tabs>`
);

// Add missing imports
const extraLucideImports = [
  "Target",
  "BookOpen",
  "Wrench",
  "Briefcase",
  "FolderOpen",
  "GraduationCap",
  "Award",
  "Code",
];
for (const imp of extraLucideImports) {
  if (!detailContent.includes(imp)) {
    detailContent = detailContent.replace(
      /import {([\s\S]*?)} from "lucide-react";/,
      `import { $1, ${imp} } from "lucide-react";`
    );
  }
}

if (!detailContent.includes("formatDate")) {
  detailContent = detailContent.replace(
    /import \{ useTranslation \} from "react-i18next";/,
    `import { useTranslation } from "react-i18next";\nimport { formatDate } from "@/lib/formatting";`
  );
}

fs.writeFileSync(userDetailViewPath, detailContent, "utf-8");
console.log("Successfully updated UserDetailView.tsx");
