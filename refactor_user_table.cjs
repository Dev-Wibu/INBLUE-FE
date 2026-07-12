const fs = require("fs");
const path = require("path");

const userTablePath = path.join(
  __dirname,
  "src/pages/Admin/UserManagement/components/UserTable.tsx"
);
let content = fs.readFileSync(userTablePath, "utf-8").replace(/\r\n/g, "\n");

// Remove DropdownMenu imports
content = content.replace(
  /import \{\n  DropdownMenu,\n  DropdownMenuContent,\n  DropdownMenuItem,\n  DropdownMenuTrigger,\n\} from "@\/components\/ui\/dropdown-menu";\n/,
  ""
);
// Remove unused icons
content = content.replace(
  /import \{ Edit, Eye, MoreHorizontal, Search \} from "lucide-react";/,
  `import { Search } from "lucide-react";`
);

// Remove onEdit from props interface
content = content.replace(/  onEdit: \(user: UserType\) => void;\n/, "");

// Remove onEdit from function signature
content = content.replace(
  /export function UserTable\(\{ users, onEdit, onDelete, onViewDetail, getSortProps \}: UserTableProps\) \{/,
  `export function UserTable({ users, onDelete, onViewDetail, getSortProps }: UserTableProps) {`
);

// Remove Actions column header
content = content.replace(
  /<TableHead className="w-\[60px\] text-center">\{t\("common\.actions"\)\}<\/TableHead>/,
  ""
);

// Remove Actions cell content completely by regex
const actionsCellRegex =
  /<TableCell className="text-center">[\s\S]*?<\/DropdownMenu>\n          <\/TableCell>/;
content = content.replace(actionsCellRegex, "");

// Make row clickable and style
content = content.replace(
  /<TableRow\n            key=\{user\.id\}\n            className="bg-white dark:bg-slate-950">/,
  `<TableRow
            key={user.id}
            onClick={() => onViewDetail(user)}
            className="cursor-pointer bg-white transition-colors hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-800/50">`
);

// Add stopPropagation to Switch
content = content.replace(
  /<Switch\n              checked=\{user\.isActive !== false\}\n              onCheckedChange=\{\(checked\) => onDelete\?\.\(user, checked\)\}\n            \/>/,
  `<Switch
              checked={user.isActive !== false}
              onCheckedChange={(checked) => onDelete?.(user, checked)}
              onClick={(e) => e.stopPropagation()}
            />`
);

fs.writeFileSync(userTablePath, content, "utf-8");
console.log("Successfully updated UserTable.tsx");
