import type {
  ApiResponse,
  Company,
  CreateCompanyRequest,
  UpdateCompanyRequest,
} from "@/interfaces";

import { API_ENDPOINTS, buildEndpoint, createApiInstance } from "@/constants/api.config";

export interface CreateCompanyPayload {
  data: CreateCompanyRequest;
  logo?: File;
  banner?: File;
}

export interface UpdateCompanyPayload {
  data: UpdateCompanyRequest;
  logo?: File;
  banner?: File;
}

const buildCompanyFormData = (
  data: CreateCompanyRequest | UpdateCompanyRequest,
  logo?: File,
  banner?: File
): FormData => {
  const formData = new FormData();
  formData.append("data", new Blob([JSON.stringify(data)], { type: "application/json" }));

  if (logo) {
    formData.append("logo", logo);
  }

  if (banner) {
    formData.append("banner", banner);
  }

  return formData;
};

export class CompanyManager {
  private api = createApiInstance();

  async getAll(): Promise<ApiResponse<Company[]>> {
    try {
      const response = await this.api.get<Company[]>(API_ENDPOINTS.COMPANIES.LIST);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Khong the tai danh sach cong ty",
      };
    }
  }

  async getById(id: number | string): Promise<ApiResponse<Company>> {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.COMPANIES.DETAIL, { id });
      const response = await this.api.get<Company>(endpoint);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Khong the tai thong tin cong ty",
      };
    }
  }

  async create(payload: CreateCompanyPayload): Promise<ApiResponse<Company>> {
    try {
      const formData = buildCompanyFormData(payload.data, payload.logo, payload.banner);
      const response = await this.api.post<Company>(API_ENDPOINTS.COMPANIES.CREATE, formData, {
        headers: { "Content-Type": undefined },
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Khong the tao cong ty",
      };
    }
  }

  async update(payload: UpdateCompanyPayload): Promise<ApiResponse<Company>> {
    try {
      const formData = buildCompanyFormData(payload.data, payload.logo, payload.banner);
      const response = await this.api.put<Company>(API_ENDPOINTS.COMPANIES.UPDATE, formData, {
        headers: { "Content-Type": undefined },
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Khong the cap nhat cong ty",
      };
    }
  }

  async delete(id: number | string): Promise<ApiResponse<void>> {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.COMPANIES.DELETE, { id });
      await this.api.delete(endpoint);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Khong the xoa cong ty",
      };
    }
  }
}

export const companyManager = new CompanyManager();
