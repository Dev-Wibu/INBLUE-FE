const fs = require("fs");
const path = require("path");

const pagePath = path.join(__dirname, "src/pages/Admin/UserManagement/UserManagementPage.tsx");
let content = fs.readFileSync(pagePath, "utf-8").replace(/\r\n/g, "\n");

// 1. Update handleViewDetail to set formData
content = content.replace(
  /const handleViewDetail = async \(user: User\) => \{\n    setSelectedUser\(user\);/,
  `const handleViewDetail = async (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
    });`
);

// 2. Remove handleEdit entirely since it's merged
const handleEditRegex = /  const handleEdit = \(user: User\) => \{[\s\S]*?\n  \};\n\n/;
content = content.replace(handleEditRegex, "");

// 3. Remove edit mode block
const editModeRegex = /  if \(viewMode === "edit" && selectedUser\) \{[\s\S]*?\n  \}\n\n/;
content = content.replace(editModeRegex, "");

// 4. Update UserDetailView props in viewMode === "detail"
content = content.replace(
  /      <UserDetailView\n        user=\{selectedUser\}\n        profile=\{selectedProfileData\}\n        onBack=\{\(\) => \{/,
  `      <UserDetailView
        user={selectedUser}
        profile={selectedProfileData}
        formData={formData}
        onFormChange={setFormData}
        onSubmit={handleSubmitEdit}
        onBack={() => {`
);

// 5. Remove onEdit={handleEdit} from UserTable
content = content.replace(/                onEdit=\{handleEdit\}\n/, "");

fs.writeFileSync(pagePath, content, "utf-8");
console.log("Successfully updated UserManagementPage.tsx");
