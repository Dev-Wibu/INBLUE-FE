/**
 * Mock data for users admin management
 */

import type { User } from "@/interfaces";

export const mockUsers: User[] = [
  {
    id: 1,
    name: "Alice Johnson",
    email: "alice.johnson@example.com",
    role: "USER",
    isActive: true,
    bio: "Software engineering student",
    university: "FPT University",
    major: "Software Engineering",
    targetPosition: "Backend Developer",
    targetLevel: "Junior",
  },
  {
    id: 2,
    name: "Bob Wilson",
    email: "bob.wilson@example.com",
    role: "USER",
    isActive: true,
    bio: "Recent graduate looking for opportunities",
    university: "HCMC University of Technology",
    major: "Computer Science",
    targetPosition: "Full-stack Developer",
    targetLevel: "Fresher",
  },
  {
    id: 3,
    name: "Admin User",
    email: "admin@example.com",
    role: "ADMIN",
    isActive: true,
    bio: "System administrator",
  },
  {
    id: 4,
    name: "Staff Member",
    email: "staff@example.com",
    role: "STAFF",
    isActive: true,
    bio: "Support staff member",
  },
];

/**
 * Fetch all users (mock)
 */
export const fetchUsers = async (): Promise<User[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return [...mockUsers];
};

/**
 * Fetch user by ID (mock)
 */
export const fetchUser = async (id: number): Promise<User | undefined> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockUsers.find((user) => user.id === id);
};
