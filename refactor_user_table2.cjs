const fs = require("fs");
const path = require("path");

const userTablePath = path.join(
  __dirname,
  "src/pages/Admin/UserManagement/components/UserTable.tsx"
);
let content = fs.readFileSync(userTablePath, "utf-8").replace(/\r\n/g, "\n");

// Fix Actions cell removal
const actionsCellRegex =
  /<TableCell className="text-right">[\s\S]*?<\/DropdownMenu>\n\s*<\/TableCell>/;
content = content.replace(actionsCellRegex, "");

// Remove remaining DropdownMenu imports if any
content = content.replace(
  /import \{\n\s*DropdownMenu,\n\s*DropdownMenuContent,\n\s*DropdownMenuItem,\n\s*DropdownMenuTrigger,\n\} from "@\/components\/ui\/dropdown-menu";\n/,
  ""
);

// Add stopPropagation to Switch (if not already there)
if (!content.includes("onClick={(e) => e.stopPropagation()}")) {
  content = content.replace(
    /<Switch\n\s*checked=\{user\.isActive !== false\}\n\s*onCheckedChange=\{[^}]*\}\n\s*aria-label="Toggle user status"\n\s*\/>/,
    `<Switch
                      checked={user.isActive !== false}
                      onCheckedChange={() => onDelete(user)}
                      aria-label="Toggle user status"
                      onClick={(e) => e.stopPropagation()}
                    />`
  );
}

// Make TableRow clickable (if not already there)
if (!content.includes("onClick={() => onViewDetail(user)}")) {
  content = content.replace(
    /<TableRow\n\s*key=\{user\.id\}\n\s*className="bg-white dark:bg-slate-950">/,
    `<TableRow
                key={user.id}
                onClick={() => onViewDetail(user)}
                className="cursor-pointer bg-white transition-colors hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-800/50">`
  );
}

fs.writeFileSync(userTablePath, content, "utf-8");
console.log("Successfully updated UserTable.tsx");
