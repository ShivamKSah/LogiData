import { supabase } from "@/integrations/supabase/client";
import { RowValidationResult, CSVValidationSummary } from "./csvValidation";

export interface StoredUpload {
  id: string;
  filename: string;
  total_rows: number;
  valid_rows: number;
  duplicate_rows: number;
  error_rows: number;
  column_names: string[];
  upload_status: string;
  validation_summary: CSVValidationSummary;
  created_at: string;
}

export interface StoredCSVData {
  id: string;
  upload_id: string;
  row_data: Record<string, any>;
  original_row_number: number;
  is_duplicate: boolean;
  validation_errors: string[];
  created_at: string;
}

export class DatabaseService {
  async storeUpload(
    filename: string,
    validationResults: RowValidationResult[],
    summary: CSVValidationSummary
  ): Promise<string> {
    console.log("Storing upload:", filename, summary);

    // Store upload metadata
    const { data: uploadData, error: uploadError } = await supabase
      .from('csv_uploads')
      .insert({
        filename,
        total_rows: summary.totalRows,
        valid_rows: summary.validRows,
        duplicate_rows: summary.duplicateRows,
        error_rows: summary.errorRows,
        column_names: Object.keys(summary.columnTypes),
        upload_status: 'completed',
        validation_summary: summary as any
      })
      .select('id')
      .single();

    if (uploadError) {
      console.error("Error storing upload:", uploadError);
      throw new Error(`Failed to store upload: ${uploadError.message}`);
    }

    const uploadId = uploadData.id;

    // Store individual rows
    const rowsToInsert = validationResults.map(result => ({
      upload_id: uploadId,
      row_data: result.data as any,
      original_row_number: result.rowNumber,
      is_duplicate: result.isDuplicate,
      validation_errors: result.errors
    }));

    const { error: rowsError } = await supabase
      .from('csv_data')
      .insert(rowsToInsert);

    if (rowsError) {
      console.error("Error storing CSV data:", rowsError);
      throw new Error(`Failed to store CSV data: ${rowsError.message}`);
    }

    return uploadId;
  }

  async getUploads(): Promise<StoredUpload[]> {
    const { data, error } = await supabase
      .from('csv_uploads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching uploads:", error);
      throw new Error(`Failed to fetch uploads: ${error.message}`);
    }

    return (data || []).map(upload => ({
      ...upload,
      validation_summary: upload.validation_summary as unknown as CSVValidationSummary
    }));
  }

  async getUploadData(uploadId: string, page: number = 1, limit: number = 10): Promise<{
    data: StoredCSVData[];
    total: number;
  }> {
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('csv_data')
      .select('*', { count: 'exact' })
      .eq('upload_id', uploadId)
      .eq('is_duplicate', false)
      .order('original_row_number')
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching upload data:", error);
      throw new Error(`Failed to fetch upload data: ${error.message}`);
    }

    return {
      data: (data || []).map(row => ({
        ...row,
        row_data: row.row_data as Record<string, any>
      })),
      total: count || 0
    };
  }

  async searchData(query: string, uploadId?: string): Promise<StoredCSVData[]> {
    console.log('Searching for:', query, 'in upload:', uploadId);
    
    if (!query.trim()) {
      return [];
    }

    let queryBuilder = supabase
      .from('csv_data')
      .select('*')
      .eq('is_duplicate', false);

    if (uploadId) {
      queryBuilder = queryBuilder.eq('upload_id', uploadId);
    }

    try {
      // Get all relevant data first
      const { data: allData, error } = await queryBuilder.limit(1000);
      
      if (error) {
        console.error("Error fetching data for search:", error);
        throw new Error(`Failed to fetch data for search: ${error.message}`);
      }

      if (!allData || allData.length === 0) {
        console.log('No data found to search');
        return [];
      }

      // Filter data in JavaScript for better compatibility
      const searchTerm = query.toLowerCase();
      const filteredData = allData.filter(row => {
        // Search in all values of the row_data object
        const rowDataString = JSON.stringify(row.row_data).toLowerCase();
        return rowDataString.includes(searchTerm) ||
               // Also search in individual fields
               Object.values(row.row_data).some(value => 
                 String(value).toLowerCase().includes(searchTerm)
               );
      });

      console.log(`Search completed: ${filteredData.length} results found out of ${allData.length} total rows`);

      return filteredData.slice(0, 100).map(row => ({
        ...row,
        row_data: row.row_data as Record<string, any>
      }));

    } catch (error) {
      console.error("Search error:", error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  async logAPICall(
    method: string,
    path: string,
    queryParams: Record<string, any> = {},
    requestBody: any = null,
    responseStatus: number,
    responseTimeMs: number,
    userAgent: string = '',
    ipAddress: string = '',
    errorMessage: string = ''
  ): Promise<void> {
    const { error } = await supabase
      .from('api_logs')
      .insert({
        method,
        path,
        query_params: queryParams,
        request_body: requestBody,
        response_status: responseStatus,
        response_time_ms: responseTimeMs,
        user_agent: userAgent,
        ip_address: ipAddress,
        error_message: errorMessage
      });

    if (error) {
      console.error("Error logging API call:", error);
      // Don't throw here to avoid breaking the main functionality
    }
  }

  async getAPILogs(page: number = 1, limit: number = 50): Promise<{
    logs: any[];
    total: number;
  }> {
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('api_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching API logs:", error);
      throw new Error(`Failed to fetch API logs: ${error.message}`);
    }

    return {
      logs: data || [],
      total: count || 0
    };
  }

  async deleteAllAPILogs(): Promise<void> {
    const { error } = await supabase
      .from('api_logs')
      .delete()
      .neq('id', ''); // Delete all rows
    if (error) {
      console.error('Error deleting all API logs:', error);
      throw new Error(`Failed to delete API logs: ${error.message}`);
    }
    // After deletion, disable logging by making logAPICall a no-op
    this.logAPICall = async () => {};
  }
}

export const databaseService = new DatabaseService();
