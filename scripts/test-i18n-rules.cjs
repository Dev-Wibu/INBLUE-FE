const fs = require("fs");
const path = require("path");

const SRC_DIR = path.join(__dirname, "../src");
const LOCALES_DIR = path.join(SRC_DIR, "locales");
const LOCALES = ["en", "vi", "ja"];

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function (file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });

  return arrayOfFiles;
}

const files = getAllFiles(SRC_DIR);
let hasError = false;

files.forEach((file) => {
  if (file.endsWith(".tsx") && !file.endsWith(".test.tsx") && !file.endsWith(".spec.tsx")) {
    const content = fs.readFileSync(file, "utf8");
    if (content.includes("const t = i18n.t.bind(i18n)")) {
      console.error(
        `❌ AP-12 Violation: Found module-level "const t = i18n.t.bind(i18n)" in React component file: ${file}`
      );
      console.error(`   Please use the useTranslation() hook inside the component instead.`);
      hasError = true;
    }
  }
});

function flattenLocale(value, prefix = "", result = {}) {
  Object.entries(value).forEach(([key, child]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) {
      flattenLocale(child, fullKey, result);
    } else {
      result[fullKey] = child;
    }
  });
  return result;
}

function placeholderNames(value) {
  if (typeof value !== "string") return [];
  return [...value.matchAll(/{{\s*([\w.-]+)\s*}}/g)].map((match) => match[1]).sort();
}

const localeValues = Object.fromEntries(
  LOCALES.map((locale) => {
    const localePath = path.join(LOCALES_DIR, `${locale}.json`);
    return [locale, flattenLocale(JSON.parse(fs.readFileSync(localePath, "utf8")))];
  })
);
const allLocaleKeys = new Set(LOCALES.flatMap((locale) => Object.keys(localeValues[locale])));

LOCALES.forEach((locale) => {
  const missingKeys = [...allLocaleKeys].filter((key) => !(key in localeValues[locale]));
  if (missingKeys.length > 0) {
    console.error(`❌ ${locale}.json is missing ${missingKeys.length} locale key(s):`);
    missingKeys.forEach((key) => console.error(`   - ${key}`));
    hasError = true;
  }
});

allLocaleKeys.forEach((key) => {
  const placeholdersByLocale = LOCALES.map((locale) => [
    locale,
    placeholderNames(localeValues[locale][key]).join(","),
  ]);
  if (new Set(placeholdersByLocale.map(([, placeholders]) => placeholders)).size > 1) {
    console.error(
      `❌ Placeholder mismatch for "${key}": ${placeholdersByLocale
        .map(([locale, placeholders]) => `${locale}=[${placeholders}]`)
        .join(" ")}`
    );
    hasError = true;
  }
});

LOCALES.forEach((locale) => {
  Object.entries(localeValues[locale]).forEach(([key, value]) => {
    if (typeof value !== "string") return;
    if (/\[(?:VI|JA|EN)\]|<\/?tool_call>/.test(value)) {
      console.error(`❌ Unresolved locale marker in ${locale}.json at "${key}": ${value}`);
      hasError = true;
    }
    if (/(?<![%{]){([A-Za-z_][\w.-]*)}(?!})/.test(value)) {
      console.error(
        `❌ Use i18next double braces in ${locale}.json at "${key}" instead of: ${value}`
      );
      hasError = true;
    }
    if (
      locale === "ja" &&
      /[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(
        value
      )
    ) {
      console.error(`❌ Vietnamese text found in ja.json at "${key}": ${value}`);
      hasError = true;
    }
  });
});

if (hasError) {
  process.exit(1);
} else {
  console.log("✅ Passed AP-12, locale parity, placeholder, and locale-content checks.");
  process.exit(0);
}
