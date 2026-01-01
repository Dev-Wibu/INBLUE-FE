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

import type { MentorFormData } from "../types";

interface MentorFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formData: Partial<MentorFormData>;
  onFormChange: (data: Partial<MentorFormData>) => void;
  onSubmit: () => void;
  title: string;
  description: string;
  submitLabel: string;
}

export function MentorFormDialog({
  isOpen,
  onOpenChange,
  formData,
  onFormChange,
  onSubmit,
  title,
  description,
  submitLabel,
}: MentorFormDialogProps) {
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
                placeholder="Enter mentor name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ""}
                onChange={(e) => onFormChange({ ...formData, email: e.target.value })}
                placeholder="mentor@example.com"
              />
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="expertise">Expertise</Label>
              <Input
                id="expertise"
                value={formData.expertise || ""}
                onChange={(e) => onFormChange({ ...formData, expertise: e.target.value })}
                placeholder="e.g., React, Node.js, AWS"
              />
            </div>
            <div>
              <Label htmlFor="yearsOfExperience">Years of Experience</Label>
              <Input
                id="yearsOfExperience"
                type="number"
                value={formData.yearsOfExperience || ""}
                onChange={(e) =>
                  onFormChange({
                    ...formData,
                    yearsOfExperience: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="0"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="currentCompany">Current Company</Label>
              <Input
                id="currentCompany"
                value={formData.currentCompany || ""}
                onChange={(e) => onFormChange({ ...formData, currentCompany: e.target.value })}
                placeholder="Company name"
              />
            </div>
            <div>
              <Label htmlFor="linkedInUrl">LinkedIn URL</Label>
              <Input
                id="linkedInUrl"
                value={formData.linkedInUrl || ""}
                onChange={(e) => onFormChange({ ...formData, linkedInUrl: e.target.value })}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
          </div>
          <div>
            <Label htmlFor="rate">Rate (VND per session)</Label>
            <Input
              id="rate"
              type="number"
              value={formData.rate || ""}
              onChange={(e) => onFormChange({ ...formData, rate: parseInt(e.target.value) || 0 })}
              placeholder="500000"
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
