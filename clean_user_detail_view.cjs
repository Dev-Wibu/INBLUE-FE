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

let content = fs.readFileSync(userDetailViewPath, "utf-8").replace(/\r\n/g, "\n");

// Remove MediaLightboxDialog import
content = content.replace(/import \{ MediaLightboxDialog, type MediaViewerItem \} from "@\/components\/shared";\n/, "");

// Remove cn import
content = content.replace(/import \{ cn \} from "@\/lib\/utils";\n/, "");

// Remove unused variables in UserDetailView
content = content.replace(/  const \[viewerOpen, setViewerOpen\] = useState\(false\);\n/, "");
content = content.replace(/  const \[viewerItems, setViewerItems\] = useState<MediaViewerItem\[\]>\(\[\]\);\n/, "");

// Remove MediaLightboxDialog usage at the bottom
content = content.replace(
  /      <MediaLightboxDialog\n        open={viewerOpen}\n        onOpenChange={setViewerOpen}\n        items={viewerItems}\n        initialIndex={0}\n      \/>\n/,
  ""
);

// Remove getRoleBadgeClass
const roleBadgeClassRegex = /const getRoleBadgeClass = \(role\?: UserRole\): string => {[\s\S]*?};\n\n/;
content = content.replace(roleBadgeClassRegex, "");

fs.writeFileSync(userDetailViewPath, content, "utf-8");
console.log("Successfully cleaned up UserDetailView.tsx");
