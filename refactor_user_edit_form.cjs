const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "src/pages/Admin/UserManagement/components/UserEditForm.tsx");
let content = fs.readFileSync(file, "utf-8").replace(/\r\n/g, "\n");

// 1. Add isInline to Props
content = content.replace(
  /  onCancel: \(\) => void;\n}/,
  `  onCancel: () => void;
  isInline?: boolean;
}`
);

// 2. Destructure isInline
content = content.replace(
  /  onCancel,\n}: UserEditFormProps\) \{/,
  `  onCancel,
  isInline,
}: UserEditFormProps) {`
);

// 3. Wrap return with conditional rendering
const returnStatementRegex =
  /  return \(\n    <div className="-m-4 flex h-\[calc\(100%\+32px\)\] flex-col bg-slate-50 md:-m-6 md:h-\[calc\(100%\+48px\)\] lg:-m-8 lg:h-\[calc\(100%\+64px\)\] dark:bg-slate-950">[\s\S]*?\n  \);\n}/;

const returnMatch = content.match(returnStatementRegex);
if (returnMatch) {
  const originalReturn = returnMatch[0];

  // Extract the inner form container starting with <div className="mx-auto max-w-4xl...
  const innerContentStart = originalReturn.indexOf('<div className="mx-auto max-w-4xl');
  const innerContentEnd = originalReturn.lastIndexOf("</div>\n      </div>\n    </div>\n  );\n}");

  if (innerContentStart !== -1 && innerContentEnd !== -1) {
    const innerContent = originalReturn.substring(innerContentStart, innerContentEnd + 6); // +6 for </div>

    const newReturn = `  const innerForm = (
      ${innerContent}
  );

  if (isInline) {
    return innerForm;
  }

  return (
    <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
      {/* Toolbar */}
      <div className="flex flex-none items-center gap-4 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={onCancel}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        {innerForm}
      </div>
    </div>
  );
}`;
    content = content.replace(returnStatementRegex, newReturn);
  }
}

fs.writeFileSync(file, content, "utf-8");
console.log("Successfully updated UserEditForm.tsx");
