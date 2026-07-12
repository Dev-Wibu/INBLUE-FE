const fs = require("fs");
const path = require("path");

const editPath = path.join(__dirname, "src/pages/Admin/UserManagement/components/UserEditForm.tsx");
let content = fs.readFileSync(editPath, "utf-8").replace(/\r\n/g, "\n");

// 1. Change grid md:grid-cols-3 to flex flex-col gap-8
content = content.replace(
  /<div className="grid grid-cols-1 gap-8 md:grid-cols-3">/,
  '<div className="flex flex-col gap-6">'
);

// 2. Change Avatar size h-40 w-40 -> h-24 w-24
content = content.replace(/h-40 w-40/g, "h-24 w-24");

// 3. Fix translation keys
content = content.replace(
  /\{t\("adminUsermanagement\.resetPassword"\)\}/g,
  '{t("adminUsermanagement.resetPassword", "Reset Password")}'
);
content = content.replace(
  /\{t\("adminUsermanagement\.sendPasswordResetLinkToUser"\)\}/g,
  '{t("adminUsermanagement.sendPasswordResetLinkToUser", "Send password reset link to user")}'
);

// 4. Change Role Selection sm:grid-cols-4 to grid-cols-2
content = content.replace(/grid-cols-2 gap-3 sm:grid-cols-4/g, "grid-cols-2 gap-3");

// 5. Remove md:col-span-1 and md:col-span-2 since we changed to flex-col
content = content.replace(/ md:col-span-1/g, "");
content = content.replace(/ md:col-span-2/g, "");

fs.writeFileSync(editPath, content, "utf-8");
console.log("Successfully updated UserEditForm.tsx");
