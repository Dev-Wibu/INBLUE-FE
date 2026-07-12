const fs = require("fs");
const path = require("path");

const pagePath = path.join(__dirname, "src/pages/Admin/UserManagement/UserManagementPage.tsx");
let content = fs.readFileSync(pagePath, "utf-8").replace(/\r\n/g, "\n");

content = content.replace(/                onEdit=\{handleEdit\}\n/, "");

fs.writeFileSync(pagePath, content, "utf-8");
console.log("Successfully updated UserManagementPage.tsx");
