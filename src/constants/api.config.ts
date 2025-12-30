/**
 * API Configuration and Constants
 * Based on schema-from-be.d.ts API specification
 */

import type { ApiConfig, ManagerMode } from "@/interfaces";

// Determine manager mode from environment variable or default to mock
const envMode = import.meta.env.VITE_MANAGER_MODE as string;
export const MANAGER_MODE: ManagerMode = envMode === "api" || envMode === "mock" ? envMode : "mock";

// API Base URL from environment or default (use localhost for development)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// API Configuration
export const apiConfig: ApiConfig = {
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
};

// API Endpoints - Aligned with backend schema (schema-from-be.d.ts)
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: "/auth/login",
    SIGNUP: "/auth/signup",
    LOGOUT: "/auth/logout",
    REFRESH: "/auth/refresh",
    MENTOR_REGISTER: "/auth/mentor-register",
    CHECK_STATUS: "/auth/mentor-status",
  },

  // User endpoints (for current user)
  USER: {
    PROFILE: "/api/users/me",
    UPDATE_PROFILE: "/api/users/me",
    UPDATE_PASSWORD: "/api/users/password",
    SETTINGS: "/api/users/settings",
    WALLET: "/api/users/wallet",
    DEPOSIT: "/api/users/wallet/deposit",
  },

  // Users management endpoints (for admin) - Based on schema-from-be.d.ts
  // GET /api/users - getUsers
  // POST /api/users - createUser (multipart/form-data)
  // PUT /api/users - updateUser (query param: user)
  // GET /api/users/{id} - getUserById
  USERS: {
    LIST: "/api/users",
    DETAIL: "/api/users/:id",
    CREATE: "/api/users",
    UPDATE: "/api/users",
  },

  // Mentor endpoints - Based on schema-from-be.d.ts
  // GET /api/mentors - getAllMentors
  // POST /api/mentors - createMentor (multipart/form-data)
  // PUT /api/mentors - updateMentor (JSON body)
  // GET /api/mentors/{id} - getMentorById
  MENTOR: {
    LIST: "/api/mentors",
    DETAIL: "/api/mentors/:id",
    CREATE: "/api/mentors",
    UPDATE: "/api/mentors",
  },

  // AI Interview endpoints
  AI_INTERVIEW: {
    LIST: "/api/ai-interviews",
    DETAIL: "/api/ai-interviews/:id",
    CREATE: "/api/ai-interviews",
    RESULT: "/api/ai-interviews/:id/result",
    PAYMENT: "/api/ai-interviews/payment",
  },

  // Mock Interview endpoints
  MOCK_INTERVIEW: {
    LIST: "/api/mock-interviews",
    DETAIL: "/api/mock-interviews/:id",
    CREATE: "/api/mock-interviews",
    TYPES: "/api/mock-interviews/types",
    PAYMENT: "/api/mock-interviews/payment",
  },

  // Chat endpoints
  CHAT: {
    SESSIONS: "/api/chat/sessions",
    SESSION_DETAIL: "/api/chat/sessions/:id",
    MESSAGES: "/api/chat/sessions/:id/messages",
    SEND_MESSAGE: "/api/chat/sessions/:id/messages",
    AI_RESPONSE: "/api/chat/sessions/:id/messages/ai-response",
    CREATE_SESSION: "/api/chat/sessions",
  },

  // Question endpoints - Based on schema-from-be.d.ts
  // GET /api/questions - getAllQuestions
  // POST /api/questions - createQuestion (JSON body)
  // PUT /api/questions - updateQuestion (JSON body)
  // GET /api/questions/{id} - getQuestionById
  // DELETE /api/questions/{id} - deleteQuestion
  QUESTION: {
    LIST: "/api/questions",
    DETAIL: "/api/questions/:id",
    CREATE: "/api/questions",
    UPDATE: "/api/questions",
    DELETE: "/api/questions/:id",
  },

  // Session endpoints (for admin management) - Based on schema-from-be.d.ts
  // GET /api/sessions - getSessions
  // PUT /api/sessions - updateSession (JSON body)
  // POST /api/sessions/create-session - createSession (JSON body with SessionCreationRequest)
  // GET /api/sessions/{id} - getSession
  // GET /api/sessions/{userId}/by-user - getSessionsByUserId
  SESSIONS: {
    LIST: "/api/sessions",
    DETAIL: "/api/sessions/:id",
    CREATE: "/api/sessions/create-session",
    UPDATE: "/api/sessions",
    BY_USER: "/api/sessions/:userId/by-user",
  },

  // Question Sets endpoints - Based on schema-from-be.d.ts
  QUESTION_SETS: {
    LIST: "/api/question-sets",
    DETAIL: "/api/question-sets/:id",
    CREATE: "/api/question-sets",
    UPDATE: "/api/question-sets",
    DELETE: "/api/question-sets/:id",
  },

  // Question Categories endpoints - Based on schema-from-be.d.ts
  QUESTION_CATEGORIES: {
    LIST: "/api/question-categories",
    DETAIL: "/api/question-categories/:id",
    CREATE: "/api/question-categories",
    UPDATE: "/api/question-categories",
    DELETE: "/api/question-categories/:id",
  },

  // Question Majors endpoints - Based on schema-from-be.d.ts
  QUESTION_MAJORS: {
    LIST: "/api/question-majors",
    DETAIL: "/api/question-majors/:id",
    CREATE: "/api/question-majors",
    UPDATE: "/api/question-majors",
    DELETE: "/api/question-majors/:id",
  },

  // Notifications endpoints - Based on schema-from-be.d.ts
  NOTIFICATIONS: {
    LIST: "/api/notifications/:id",
    CREATE: "/api/notifications",
    CHECK_READ: "/api/notifications/check-read/:notificationId",
  },

  // Mentor Reviews endpoints - Based on schema-from-be.d.ts
  MENTOR_REVIEWS: {
    LIST: "/api/mentor-reviews",
    DETAIL: "/api/mentor-reviews/:id",
    CREATE: "/api/mentor-reviews",
    UPDATE: "/api/mentor-reviews",
  },
} as const;

/**
 * Helper function to replace path parameters in endpoints
 * @param endpoint - The endpoint path with parameters (e.g., "/users/:id")
 * @param params - Object with parameter values (e.g., { id: "123" })
 * @returns The endpoint with replaced parameters (e.g., "/users/123")
 */
export function buildEndpoint(endpoint: string, params?: Record<string, string | number>): string {
  if (!params) return endpoint;

  return Object.entries(params).reduce((path, [key, value]) => {
    return path.replace(`:${key}`, String(value));
  }, endpoint);
}
