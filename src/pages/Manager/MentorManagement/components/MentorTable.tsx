import { Edit, Power, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { Mentor } from "../types";

interface MentorTableProps {
  mentors: Mentor[];
  onEdit: (mentor: Mentor) => void;
  onDelete: (mentor: Mentor) => void;
}

export function MentorTable({ mentors, onEdit, onDelete }: MentorTableProps) {
  if (mentors.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <Search className="h-12 w-12 text-gray-400" />
        <p className="font-['Inter'] text-lg text-gray-500">No mentors found</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Expertise</TableHead>
          <TableHead className="w-24">Experience</TableHead>
          <TableHead>Company</TableHead>
          <TableHead className="w-20">Sessions</TableHead>
          <TableHead className="w-24">Status</TableHead>
          <TableHead className="w-24 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {mentors.map((mentor) => (
          <TableRow key={mentor.id}>
            <TableCell className="font-medium">{mentor.id}</TableCell>
            <TableCell className="font-medium">{mentor.name}</TableCell>
            <TableCell className="text-muted-foreground">{mentor.email}</TableCell>
            <TableCell className="max-w-xs truncate">{mentor.expertise || "-"}</TableCell>
            <TableCell>
              <Badge variant="outline">{mentor.yearsOfExperience || 0} years</Badge>
            </TableCell>
            <TableCell>{mentor.currentCompany || "-"}</TableCell>
            <TableCell>
              <Badge variant="secondary">{mentor.totalSession || 0}</Badge>
            </TableCell>
            <TableCell>
              <Badge variant={mentor.active !== false ? "default" : "destructive"}>
                {mentor.active !== false ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(mentor)}
                  className="h-8 w-8 p-0 hover:bg-blue-50"
                  title="Edit mentor">
                  <Edit className="h-4 w-4 text-blue-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(mentor)}
                  className={`h-8 w-8 p-0 ${mentor.active !== false ? "hover:bg-red-50" : "hover:bg-green-50"}`}
                  title={mentor.active !== false ? "Deactivate mentor" : "Activate mentor"}>
                  <Power
                    className={`h-4 w-4 ${mentor.active !== false ? "text-red-600" : "text-green-600"}`}
                  />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
