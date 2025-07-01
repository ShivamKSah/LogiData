
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  cleanedValue: any;
  type: 'string' | 'number' | 'date' | 'boolean' | 'email';
}

export interface RowValidationResult {
  rowNumber: number;
  data: Record<string, any>;
  errors: string[];
  isDuplicate: boolean;
  isValid: boolean;
}

export interface CSVValidationSummary {
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  errorRows: number;
  columnTypes: Record<string, string>;
  validationErrors: string[];
  issues?: string[];
}

export class CSVValidator {
  private columns: string[] = [];
  private seenRows: Set<string> = new Set();
  private columnTypes: Record<string, string> = {};

  constructor(columns: string[]) {
    this.columns = columns;
    this.detectColumnTypes();
  }

  private detectColumnTypes(): void {
    // Simple heuristic for column type detection
    this.columns.forEach(col => {
      const lowerCol = col.toLowerCase();
      if (lowerCol.includes('email')) {
        this.columnTypes[col] = 'email';
      } else if (lowerCol.includes('date') || lowerCol.includes('time')) {
        this.columnTypes[col] = 'date';
      } else if (lowerCol.includes('price') || lowerCol.includes('amount') || lowerCol.includes('cost')) {
        this.columnTypes[col] = 'number';
      } else if (lowerCol.includes('active') || lowerCol.includes('enabled')) {
        this.columnTypes[col] = 'boolean';
      } else {
        this.columnTypes[col] = 'string';
      }
    });
  }

  validateValue(value: string, expectedType: string): ValidationResult {
    const errors: string[] = [];
    let cleanedValue: any = value?.toString().trim() || '';
    let isValid = true;

    // Check for missing values
    if (!cleanedValue) {
      errors.push('Missing value');
      isValid = false;
      return { isValid, errors, cleanedValue: null, type: expectedType as any };
    }

    switch (expectedType) {
      case 'number':
        const numValue = parseFloat(cleanedValue);
        if (isNaN(numValue)) {
          errors.push('Invalid number format');
          isValid = false;
        } else {
          cleanedValue = numValue;
        }
        break;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanedValue)) {
          errors.push('Invalid email format');
          isValid = false;
        }
        break;

      case 'date':
        const dateValue = new Date(cleanedValue);
        if (isNaN(dateValue.getTime())) {
          errors.push('Invalid date format');
          isValid = false;
        } else {
          cleanedValue = dateValue.toISOString();
        }
        break;

      case 'boolean':
        const lowerValue = cleanedValue.toLowerCase();
        if (['true', '1', 'yes', 'on'].includes(lowerValue)) {
          cleanedValue = true;
        } else if (['false', '0', 'no', 'off'].includes(lowerValue)) {
          cleanedValue = false;
        } else {
          errors.push('Invalid boolean value');
          isValid = false;
        }
        break;

      case 'string':
        // String validation - check for reasonable length
        if (cleanedValue.length > 1000) {
          errors.push('String too long (max 1000 characters)');
          isValid = false;
        }
        break;
    }

    return { isValid, errors, cleanedValue, type: expectedType as any };
  }

  validateRow(rowData: Record<string, any>, rowNumber: number): RowValidationResult {
    const errors: string[] = [];
    const cleanedData: Record<string, any> = {};
    let isValid = true;

    // Validate each column
    this.columns.forEach(col => {
      const value = rowData[col];
      const expectedType = this.columnTypes[col];
      const validation = this.validateValue(value, expectedType);
      
      cleanedData[col] = validation.cleanedValue;
      
      if (!validation.isValid) {
        errors.push(`${col}: ${validation.errors.join(', ')}`);
        isValid = false;
      }
    });

    // Check for duplicates
    const rowKey = JSON.stringify(cleanedData);
    const isDuplicate = this.seenRows.has(rowKey);
    if (!isDuplicate) {
      this.seenRows.add(rowKey);
    }

    return {
      rowNumber,
      data: cleanedData,
      errors,
      isDuplicate,
      isValid: isValid && !isDuplicate
    };
  }

  getValidationSummary(results: RowValidationResult[]): CSVValidationSummary {
    const validRows = results.filter(r => r.isValid).length;
    const duplicateRows = results.filter(r => r.isDuplicate).length;
    const errorRows = results.filter(r => !r.isValid && !r.isDuplicate).length;
    
    const allErrors: string[] = [];
    results.forEach(result => {
      if (result.errors.length > 0) {
        allErrors.push(`Row ${result.rowNumber}: ${result.errors.join(', ')}`);
      }
    });

    return {
      totalRows: results.length,
      validRows,
      duplicateRows,
      errorRows,
      columnTypes: this.columnTypes,
      validationErrors: allErrors,
      issues: allErrors
    };
  }
}

// Main validation function
export const validateCSV = async (file: File): Promise<{
  results: RowValidationResult[];
  summary: CSVValidationSummary;
}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          reject(new Error('Empty CSV file'));
          return;
        }

        // Parse headers
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const validator = new CSVValidator(headers);
        
        // Parse and validate data rows
        const results: RowValidationResult[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const rowData: Record<string, any> = {};
          
          headers.forEach((header, index) => {
            rowData[header] = values[index] || '';
          });
          
          const result = validator.validateRow(rowData, i);
          results.push(result);
        }
        
        const summary = validator.getValidationSummary(results);
        resolve({ results, summary });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};
