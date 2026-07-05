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

// 1. Change activeTab default state
detailContent = detailContent.replace(
  /const \[activeTab, setActiveTab\] = useState\("overview"\);/,
  `const [activeTab, setActiveTab] = useState("profile");`
);

// 2. Remove the overview tab trigger
detailContent = detailContent.replace(
  /<TabsTrigger value="overview">\{t\("common\.overview"\) \|\| "Overview"\}<\/TabsTrigger>/,
  ``
);

// 3. Remove the entire overview TabsContent (lines 65-132 roughly)
// It starts with <TabsContent value="overview" className="mt-0"> and ends before <TabsContent value="profile" className="mt-0">
const overviewRegex =
  /<TabsContent value="overview" className="mt-0">[\s\S]*?(?=<TabsContent value="profile" className="mt-0">)/;
detailContent = detailContent.replace(overviewRegex, "");

// 4. Replace the profile TabsContent body
const profileContentRegex =
  /<TabsContent value="profile" className="mt-0">[\s\S]*?(?=<\/Tabs>\n        <\/div>)/;
const newProfileContent = `<TabsContent value="profile" className="mt-0">
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
            `;
detailContent = detailContent.replace(profileContentRegex, newProfileContent);

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

// Remove the Avatar imports if they are no longer used (they were in overview)
detailContent = detailContent.replace(
  /import { Avatar, AvatarFallback, AvatarImage } from "@\/components\/ui\/avatar";\n/,
  ""
);

fs.writeFileSync(userDetailViewPath, detailContent, "utf-8");
console.log("Successfully updated UserDetailView.tsx");
