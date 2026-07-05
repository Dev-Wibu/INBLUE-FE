const fs = require("fs");
const path = require("path");

const filePath = path.join(
  __dirname,
  "src",
  "pages",
  "Admin",
  "UserManagement",
  "UserManagementPage.tsx"
);
let content = fs.readFileSync(filePath, "utf-8");

// Remove the unused table props and fix onViewDetail
content = content.replace(
  /                onUploadCV={handleUploadCV}\n                onViewProfile={handleViewProfile}\n                onViewDetail={\(user\) => {\n                  setSelectedUser\(user\);\n                  setIsDetailModalOpen\(true\);\n                }}/g,
  `                onViewDetail={handleViewDetail}`
);

// Remove the Modals from the bottom of the file
const modalsRegex =
  /      \{\/\* Create Dialog \*\/\}[\s\S]*?\{\/\* User Detail Modal \*\/\}[\s\S]*?<\/div>/;
content = content.replace(modalsRegex, `    </div>`);

fs.writeFileSync(filePath, content, "utf-8");
