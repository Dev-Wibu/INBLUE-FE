/**
 * Base Manager Interface
 * All managers should extend this interface to provide consistent CRUD operations
 */

import type { ApiResponse, PaginatedResponse, PaginationParams } from "./api.types";

export interface BaseManager<T, CreateDTO = Partial<T>, UpdateDTO = Partial<T>> {
  /**
   * Get all items with optional pagination
   */
  getAll(params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<T> | T[]>>;

  /**
   * Get a single item by ID
   */
  getById(id: string | number): Promise<ApiResponse<T>>;

  /**
   * Create a new item
   */
  create(data: CreateDTO): Promise<ApiResponse<T>>;

  /**
   * Update an existing item
   */
  update(id: string | number, data: UpdateDTO): Promise<ApiResponse<T>>;

  /**
   * Delete an item
   */
  delete(id: string | number): Promise<ApiResponse<void>>;
}

/**
 * Manager mode configuration
 */
export type ManagerMode = "mock" | "api";

export interface ManagerConfig {
  mode: ManagerMode;
  apiBaseURL?: string;
}
