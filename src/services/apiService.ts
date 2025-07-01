import { databaseService } from "./databaseService";

class APIService {
  private async logRequest(
    method: string,
    path: string,
    options: RequestInit = {},
    startTime: number,
    response?: Response,
    error?: Error
  ) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    const queryParams = path.includes('?') ? 
      Object.fromEntries(new URLSearchParams(path.split('?')[1])) : {};

    await databaseService.logAPICall(
      method,
      path,
      queryParams,
      options.body ? JSON.parse(options.body as string) : null,
      response?.status || 0,
      responseTime,
      navigator.userAgent,
      '', // IP address not available in browser
      error?.message || ''
    );
  }

  async getUploads() {
    const startTime = Date.now();
    const method = 'GET';
    const path = '/api/uploads';

    try {
      const result = await databaseService.getUploads();
      await this.logRequest(method, path, {}, startTime, new Response('', { status: 200 }));
      return result;
    } catch (error) {
      await this.logRequest(method, path, {}, startTime, undefined, error as Error);
      throw error;
    }
  }

  async getUploadData(uploadId: string, page: number = 1, limit: number = 10) {
    const startTime = Date.now();
    const method = 'GET';
    const path = `/api/uploads/${uploadId}/data?page=${page}&limit=${limit}`;

    try {
      const result = await databaseService.getUploadData(uploadId, page, limit);
      await this.logRequest(method, path, {}, startTime, new Response('', { status: 200 }));
      return result;
    } catch (error) {
      await this.logRequest(method, path, {}, startTime, undefined, error as Error);
      throw error;
    }
  }

  async searchData(query: string, uploadId?: string) {
    const startTime = Date.now();
    const method = 'GET';
    const path = `/api/search?q=${encodeURIComponent(query)}${uploadId ? `&uploadId=${uploadId}` : ''}`;

    try {
      const result = await databaseService.searchData(query, uploadId);
      await this.logRequest(method, path, {}, startTime, new Response('', { status: 200 }));
      return result;
    } catch (error) {
      await this.logRequest(method, path, {}, startTime, undefined, error as Error);
      throw error;
    }
  }

  async storeUpload(filename: string, validationResults: any[], summary: any) {
    const startTime = Date.now();
    const method = 'POST';
    const path = '/api/uploads';

    try {
      const result = await databaseService.storeUpload(filename, validationResults, summary);
      await this.logRequest(method, path, { 
        method: 'POST', 
        body: JSON.stringify({ filename, summary }) 
      }, startTime, new Response('', { status: 201 }));
      return result;
    } catch (error) {
      await this.logRequest(method, path, { 
        method: 'POST', 
        body: JSON.stringify({ filename, summary }) 
      }, startTime, undefined, error as Error);
      throw error;
    }
  }

  async deleteAllAPILogs() {
    return databaseService.deleteAllAPILogs();
  }
}

export const apiService = new APIService();
