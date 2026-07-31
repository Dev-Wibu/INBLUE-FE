const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const VIETNAMESE_REGEX =
  /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệđùúủũụưứừửữựìíỉĩịòóỏõọôốồổỗộơớờởỡợỳýỷỹỵđÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆĐÙÚỦŨỤƯỪỨỰỬỮỲÝỶỸỴĐ]/;

const JAPANESE_REGEX =
  /[\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\uFF00-\uFFEF\u4E00-\u9FAF\u3400-\u4DBF]/;

const ENGLISH_LETTERS = /[a-zA-Z]/;

const results = [];

function isInsideTCall(node) {
  let curr = node;
  while (curr && curr.kind !== ts.SyntaxKind.SourceFile) {
    if (ts.isCallExpression(curr)) {
      const expr = curr.expression;
      if (
        (ts.isIdentifier(expr) && expr.text === "t") ||
        (ts.isPropertyAccessExpression(expr) && expr.name.text === "t")
      ) {
        return true;
      }
    }
    if (ts.isVariableDeclaration(curr) && curr.name && ts.isIdentifier(curr.name)) {
      if (["STANDARD_ROUND_NAMES", "ROUND_TYPE_LABELS"].includes(curr.name.text)) {
        return true;
      }
    }
    curr = curr.parent;
  }
  return false;
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (
        file !== "node_modules" &&
        file !== ".git" &&
        file !== "dist" &&
        file !== ".nx" &&
        file !== "cypress" &&
        file !== "test"
      ) {
        walk(fullPath);
      }
    } else if (/\.(ts|tsx)$/.test(file)) {
      if (!file.endsWith(".test.ts") && !file.endsWith(".test.tsx")) {
        analyzeFile(fullPath);
      }
    }
  }
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  let sourceFile;
  try {
    sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  } catch (err) {
    console.error(`Error parsing ${filePath}:`, err);
    return;
  }

  function visit(node) {
    let text = null;
    let type = null;
    let category = null;

    // 1. Check JSX attribute values (like placeholder="Search")
    if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
      const attrName = node.name.text;
      const userFacingAttributes = [
        "placeholder",
        "label",
        "title",
        "alt",
        "description",
        "message",
        "text",
        "content",
        "heading",
      ];

      if (userFacingAttributes.includes(attrName)) {
        const val = node.initializer.text.trim();
        if (val && ENGLISH_LETTERS.test(val) && !isInsideTCall(node)) {
          text = val;
          type = `JsxAttribute[${attrName}]`;
          if (VIETNAMESE_REGEX.test(val)) {
            category = "vietnamese";
          } else if (JAPANESE_REGEX.test(val)) {
            category = "japanese";
          } else {
            category = "english";
          }
        }
      }
    }

    // 2. Check JSX Text children
    else if (node.kind === ts.SyntaxKind.JsxText) {
      const val = node.text.trim();
      if (val && ENGLISH_LETTERS.test(val) && !isInsideTCall(node)) {
        text = val;
        type = "JsxText";
        if (VIETNAMESE_REGEX.test(val)) {
          category = "vietnamese";
        } else if (JAPANESE_REGEX.test(val)) {
          category = "japanese";
        } else {
          category = "english";
        }
      }
    }

    // 3. Check StringLiterals / Template Literals that are NOT inside t()
    else if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      if (!isInsideTCall(node)) {
        const val = node.text.trim();
        if (val) {
          if (VIETNAMESE_REGEX.test(val)) {
            text = val;
            type = ts.isStringLiteral(node) ? "StringLiteral" : "TemplateLiteral";
            category = "vietnamese";
          } else if (JAPANESE_REGEX.test(val)) {
            text = val;
            type = ts.isStringLiteral(node) ? "StringLiteral" : "TemplateLiteral";
            category = "japanese";
          }
        }
      }
    }

    if (category) {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      results.push({
        file: path.relative(path.join(__dirname, "../.."), filePath).replace(/\\/g, "/"),
        line: line + 1,
        character: character + 1,
        type,
        category,
        text,
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

const srcDir = path.join(__dirname, "../../src");
console.log(`Starting i18n scan on: ${srcDir}\n`);
walk(srcDir);

const viResults = results.filter((r) => r.category === "vietnamese");
const jaResults = results.filter((r) => r.category === "japanese");
const enResults = results.filter((r) => r.category === "english");

fs.writeFileSync(
  path.join(__dirname, "vietnamese-report.json"),
  JSON.stringify(viResults, null, 2),
  "utf8"
);
fs.writeFileSync(
  path.join(__dirname, "japanese-report.json"),
  JSON.stringify(jaResults, null, 2),
  "utf8"
);
fs.writeFileSync(
  path.join(__dirname, "english-report.json"),
  JSON.stringify(enResults, null, 2),
  "utf8"
);

console.log("=== I18N AUDIT SUMMARY ===");
console.log(`Total Issues Found: ${results.length}`);
console.log(`  - Vietnamese (Hardcoded): ${viResults.length}`);
console.log(`  - Japanese (Hardcoded):   ${jaResults.length}`);
console.log(`  - English/JSX (Hardcoded): ${enResults.length}`);

if (viResults.length > 0) {
  console.warn(
    `\n⚠️ Warning: Found ${viResults.length} hardcoded Vietnamese strings across project history. Saved report to vietnamese-report.json.`
  );
} else {
  console.log("🎉 Outstanding! No hardcoded Vietnamese user-facing strings found in the codebase!");
}
