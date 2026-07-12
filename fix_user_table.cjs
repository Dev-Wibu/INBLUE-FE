const fs = require("fs");
const path = require("path");

const userTablePath = path.join(
  __dirname,
  "src/pages/Admin/UserManagement/components/UserTable.tsx"
);
let content = fs.readFileSync(userTablePath, "utf-8").replace(/\r\n/g, "\n");

// Fix TableRow to add onClick
content = content.replace(
  /<TableRow key=\{user\.id\}>/,
  `<TableRow 
                key={user.id} 
                onClick={() => onViewDetail(user)}
                className="cursor-pointer bg-white transition-colors hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-800/50">`
);

// Remove the Operation column header
content = content.replace(
  /<TableHead className="w-32 text-right">\{t\("common\.operation"\)\}<\/TableHead>\n/,
  ""
);

// Remove unused Button import
content = content.replace(/import \{ Button \} from "@\/components\/ui\/button";\n/, "");

fs.writeFileSync(userTablePath, content, "utf-8");
console.log("Successfully updated UserTable.tsx");
