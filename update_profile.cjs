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
  console.error("Start index:", startIndex, "End index:", endIndex);
  process.exit(1);
}

const profileSections = modalContent.substring(startIndex, endIndex);

// Now in UserDetailView.tsx, replace the overview tab trigger and the profile content
let newDetailContent = detailContent.replace(
  /<TabsList className="mb-4">[\s\S]*?<\/TabsList>/,
  `<TabsList className="mb-4">
            {profile && (
              <TabsTrigger value="profile">{t("common.candidateProfile")}</TabsTrigger>
            )}
            <TabsTrigger value="settings">{t("common.settings")}</TabsTrigger>
          </TabsList>`
);

newDetailContent = newDetailContent.replace(/defaultValue="overview"/, `defaultValue="profile"`);

// Remove the overview content entirely
newDetailContent = newDetailContent.replace(
  /            <TabsContent value="overview">[\s\S]*?<\/TabsContent>\n\n            <TabsContent value="profile">/,
  `            <TabsContent value="profile">`
);

// Replace the profile content
newDetailContent = newDetailContent.replace(
  /            <TabsContent value="profile">[\s\S]*?<\/TabsContent>\n\n            <TabsContent value="settings">/,
  `            <TabsContent value="profile">\n              {profile ? (\n                <div className="space-y-6 pt-2">\n                  ${profileSections}\n                </div>\n              ) : (\n                <div className="flex h-40 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-900">\n                  {t("adminUsermanagement.noInformationYet")}\n                </div>\n              )}\n            </TabsContent>\n\n            <TabsContent value="settings">`
);

// We also need to add missing imports to UserDetailView.tsx
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
  if (!newDetailContent.includes(imp)) {
    newDetailContent = newDetailContent.replace(
      /import {([\s\S]*?)} from "lucide-react";/,
      `import { $1, ${imp} } from "lucide-react";`
    );
  }
}

// Add formatDate import
if (!newDetailContent.includes("formatDate")) {
  newDetailContent = newDetailContent.replace(
    /import \{ useTranslation \} from "react-i18next";/,
    `import { useTranslation } from "react-i18next";\nimport { formatDate } from "@/lib/formatting";`
  );
}

fs.writeFileSync(userDetailViewPath, newDetailContent, "utf-8");
console.log("Successfully updated UserDetailView.tsx");
