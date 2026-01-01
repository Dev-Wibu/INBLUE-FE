import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { UserFormData } from "../types";

interface UserFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formData: Partial<UserFormData>;
  onFormChange: (data: Partial<UserFormData>) => void;
  onSubmit: () => void;
  title: string;
  description: string;
  submitLabel: string;
}

export function UserFormDialog({
  isOpen,
  onOpenChange,
  formData,
  onFormChange,
  onSubmit,
  title,
  description,
  submitLabel,
}: UserFormDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
                placeholder="Enter user name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ""}
                onChange={(e) => onFormChange({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  onFormChange({ ...formData, role: value as UserFormData["role"] })
                }>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="MENTOR">Mentor</SelectItem>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="university">University</Label>
              <Input
                id="university"
                value={formData.university || ""}
                onChange={(e) => onFormChange({ ...formData, university: e.target.value })}
                placeholder="University name"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="major">Major</Label>
              <Input
                id="major"
                value={formData.major || ""}
                onChange={(e) => onFormChange({ ...formData, major: e.target.value })}
                placeholder="e.g., Computer Science"
              />
            </div>
            <div>
              <Label htmlFor="targetPosition">Target Position</Label>
              <Input
                id="targetPosition"
                value={formData.targetPosition || ""}
                onChange={(e) => onFormChange({ ...formData, targetPosition: e.target.value })}
                placeholder="e.g., Backend Developer"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="targetLevel">Target Level</Label>
              <Select
                value={formData.targetLevel}
                onValueChange={(value) => onFormChange({ ...formData, targetLevel: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Intern">Intern</SelectItem>
                  <SelectItem value="Fresher">Fresher</SelectItem>
                  <SelectItem value="Junior">Junior</SelectItem>
                  <SelectItem value="Middle">Middle</SelectItem>
                  <SelectItem value="Senior">Senior</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Input
              id="bio"
              value={formData.bio || ""}
              onChange={(e) => onFormChange({ ...formData, bio: e.target.value })}
              placeholder="Short biography"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit}>{submitLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
