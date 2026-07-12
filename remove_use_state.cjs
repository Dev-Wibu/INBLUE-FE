const fs = require("fs");
const path = require("path");

const detailPath = path.join(
  __dirname,
  "src/pages/Admin/UserManagement/components/UserDetailView.tsx"
);
let content = fs.readFileSync(detailPath, "utf-8").replace(/\r\n/g, "\n");

content = content.replace(/import \{ useState \} from "react";\n/, "");

fs.writeFileSync(detailPath, content, "utf-8");
console.log("Successfully updated UserDetailView.tsx");
