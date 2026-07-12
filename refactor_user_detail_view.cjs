const fs = require("fs");
const path = require("path");

const detailPath = path.join(
  __dirname,
  "src/pages/Admin/UserManagement/components/UserDetailView.tsx"
);
let content = fs.readFileSync(detailPath, "utf-8").replace(/\r\n/g, "\n");

// 1. Update imports
content = content.replace(
  /import \{ Tabs, TabsContent, TabsList, TabsTrigger \} from "@\/components\/ui\/tabs";\n/,
  ""
);
content = content.replace(
  /import type \{ User as UserType \} from "\.\.\/types";\n/,
  `import type { User as UserType } from "../types";
import { UserEditForm, type ExtendedUserFormData } from "./UserEditForm";\n`
);

// 2. Update interface
content = content.replace(
  /interface UserDetailViewProps \{\n  user: UserType;\n  profile: CandidateProfile \| null;\n  onBack: \(\) => void;\n\}/,
  `interface UserDetailViewProps {
  user: UserType;
  profile: CandidateProfile | null;
  onBack: () => void;
  formData: ExtendedUserFormData;
  onFormChange: (data: ExtendedUserFormData) => void;
  onSubmit: () => void;
}`
);

// 3. Update component signature
content = content.replace(
  /export function UserDetailView\(\{ user, profile, onBack \}: UserDetailViewProps\) \{/,
  `export function UserDetailView({ user, profile, onBack, formData, onFormChange, onSubmit }: UserDetailViewProps) {`
);

// 4. Remove activeTab state
content = content.replace(/  const \[activeTab, setActiveTab\] = useState\("profile"\);\n\n/, "");

// 5. Replace Tabs with UserEditForm and Profile data
const mainContentRegex =
  /<div className="mx-auto max-w-5xl">[\s\S]*?<\/TabsList>[\s\S]*?<TabsContent value="profile" className="mt-0">([\s\S]*?)<\/TabsContent>[\s\S]*?<\/Tabs>[\s\S]*?<\/div>/;

const replacement = `<div className="mx-auto max-w-5xl space-y-6">
          <UserEditForm
            isInline
            formData={formData}
            onFormChange={onFormChange}
            onSubmit={onSubmit}
            onCancel={onBack}
            title={t("adminUsermanagement.userEditing")}
            description={t("adminUsermanagement.updateUserInformation")}
            submitLabel={t("common.saveChanges")}
            selectedUser={user}
          />

          $1
        </div>`;

content = content.replace(mainContentRegex, replacement);

fs.writeFileSync(detailPath, content, "utf-8");
console.log("Successfully updated UserDetailView.tsx");
