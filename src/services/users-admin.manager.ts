/**
 * Users Admin Manager
 * Handles user CRUD operations for admin management
 * Based on schema-from-be.d.ts API specification
 */

import type { ApiResponse, BaseManager, PaginatedResponse, PaginationParams, User } from "@/interfaces";

import { API_ENDPOINTS, MANAGER_MODE, apiConfig, buildEndpoint } from "@/constants/api.config";
import * as usersMock from "@/mocks/users-admin.mock";
import axios from "axios";

// Re-export User type for convenience
export type { User } from "@/interfaces";

/**
 * UserInfo type for create operations (matches backend schema)
 */
export interface UserInfo {
  id?: number;
  name?: string;
  email?: string;
  password?: string;
  bio?: string;
  university?: string;
  major?: string;
  targetPosition?: string;
  targetLevel?: string;
}

/**
 * Extended user data for creation with file uploads
 */
export interface CreateUserData extends UserInfo {
  avatar?: File;
  cvFile?: File;
}

export class UsersAdminManager implements BaseManager<User> {
  private mode = MANAGER_MODE;
  private api = axios.create(apiConfig);

  /**
   * Get all users
   * GET /api/users
   */
  async getAll(_params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<User> | User[]>> {
    if (this.mode === "mock") {
      const users = await usersMock.fetchUsers();
      return {
        success: true,
        data: users,
      };
    }

    try {
      const response = await this.api.get(API_ENDPOINTS.USERS.LIST, { params: _params });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch users",
      };
    }
  }

  /**
   * Get user by ID
   * GET /api/users/{id}
   */
  async getById(id: string | number): Promise<ApiResponse<User>> {
    if (this.mode === "mock") {
      const user = await usersMock.fetchUser(Number(id));
      if (!user) {
        return {
          success: false,
          error: "User not found",
        };
      }
      return {
        success: true,
        data: user,
      };
    }

    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.USERS.DETAIL, { id });
      const response = await this.api.get(endpoint);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch user",
      };
    }
  }

  /**
   * Create new user
   * POST /api/users (multipart/form-data)
   * According to schema: { data: UserInfo, avatar?: File, cvFile?: File }
   */
  async create(_data: Partial<User> | CreateUserData): Promise<ApiResponse<User>> {
    if (this.mode === "mock") {
      // In mock mode, simulate creating a user with robust ID generation
      const newId = Date.now() + Math.floor(Math.random() * 1000);
      const newUser: User = {
        id: newId,
        name: _data.name,
        email: _data.email,
        role: (_data as User).role || "USER",
        isActive: (_data as User).isActive !== false,
        bio: _data.bio,
        university: _data.university,
        major: _data.major,
        targetPosition: _data.targetPosition,
        targetLevel: _data.targetLevel,
      };
      usersMock.mockUsers.push(newUser);
      return {
        success: true,
        data: newUser,
      };
    }

    try {
      // According to schema, createUser uses multipart/form-data
      const formData = new FormData();
      
      // Prepare UserInfo data (JSON string)
      // Note: Password should be handled securely by the backend (e.g., hashing)
      // The frontend sends the password in plain text over HTTPS
      const userInfo: UserInfo = {
        name: _data.name,
        email: _data.email,
        password: _data.password,
        bio: _data.bio,
        university: _data.university,
        major: _data.major,
        targetPosition: _data.targetPosition,
        targetLevel: _data.targetLevel,
      };
      
      formData.append("data", JSON.stringify(userInfo));
      
      // Add optional file fields
      const createData = _data as CreateUserData;
      if (createData.avatar) {
        formData.append("avatar", createData.avatar);
      }
      if (createData.cvFile) {
        formData.append("cvFile", createData.cvFile);
      }
      
      const response = await this.api.post(API_ENDPOINTS.USERS.CREATE, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create user",
      };
    }
  }

  /**
   * Update user
   * PUT /api/users (query param: user)
   * According to schema: uses query parameter with User object
   */
  async update(_id: string | number, _data: Partial<User>): Promise<ApiResponse<User>> {
    if (this.mode === "mock") {
      // In mock mode, simulate updating a user
      const index = usersMock.mockUsers.findIndex((u) => u.id === Number(_id));
      if (index === -1) {
        return {
          success: false,
          error: "User not found",
        };
      }
      usersMock.mockUsers[index] = { ...usersMock.mockUsers[index], ..._data };
      return {
        success: true,
        data: usersMock.mockUsers[index],
      };
    }

    try {
      // According to schema, updateUser uses query parameter
      const userData: User = { ..._data, id: Number(_id) };
      const response = await this.api.put(API_ENDPOINTS.USERS.UPDATE, null, {
        params: { user: JSON.stringify(userData) },
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update user",
      };
    }
  }

  /**
   * Delete user
   * Note: Backend schema does not define DELETE for /api/users
   * This is a soft delete by setting isActive to false
   */
  async delete(_id: string | number): Promise<ApiResponse<void>> {
    if (this.mode === "mock") {
      // In mock mode, simulate deleting a user
      const index = usersMock.mockUsers.findIndex((u) => u.id === Number(_id));
      if (index === -1) {
        return {
          success: false,
          error: "User not found",
        };
      }
      usersMock.mockUsers.splice(index, 1);
      return {
        success: true,
      };
    }

    try {
      // Backend doesn't have DELETE endpoint, use soft delete via update
      const userData: User = { id: Number(_id), isActive: false };
      await this.api.put(API_ENDPOINTS.USERS.UPDATE, null, {
        params: { user: JSON.stringify(userData) },
      });
      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete user",
      };
    }
  }
}

// Export singleton instance
export const usersAdminManager = new UsersAdminManager();
