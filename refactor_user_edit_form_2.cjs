const fs = require("fs");
const path = require("path");

const editPath = path.join(__dirname, "src/pages/Admin/UserManagement/components/UserEditForm.tsx");
let content = fs.readFileSync(editPath, "utf-8").replace(/\r\n/g, "\n");

// Replace password input with "Reset Password" button
const passwordSectionRegex =
  /<div className="space-y-1\.5">\n\s*<Label htmlFor="password">\{t\("adminUsermanagement\.passwordLeaveBlankIfNot"\)\}<\/Label>\n\s*<div className="relative">[\s\S]*?<\/div>\n\s*<\/div>/;

const replacement = `<div className="space-y-1.5 pt-2">
            <Label>{t("common.password")}</Label>
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("adminUsermanagement.resetPassword")}
                </p>
                <p className="text-xs text-slate-500">
                  {t("adminUsermanagement.sendPasswordResetLinkToUser")}
                </p>
              </div>
              <Button variant="outline" size="sm" type="button">
                {t("common.sendLink")}
              </Button>
            </div>
          </div>`;

content = content.replace(passwordSectionRegex, replacement);

fs.writeFileSync(editPath, content, "utf-8");
console.log("Successfully updated UserEditForm.tsx");
