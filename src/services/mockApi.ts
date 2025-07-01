
// Mock API service to simulate FastAPI backend responses
export interface MockRecord {
  id: number;
  name?: string;
  age?: number;
  email?: string;
  city?: string;
  [key: string]: any;
}

export interface MockLogEntry {
  id: number;
  method: string;
  path: string;
  status_code: number;
  timestamp: string;
  response_time?: number;
  user_agent?: string;
}

// Mock data storage - start with empty array so only uploaded data shows
let mockRecords: MockRecord[] = [];

let mockLogs: MockLogEntry[] = [
  {
    id: 1,
    method: "GET",
    path: "/api/records",
    status_code: 200,
    timestamp: new Date(Date.now() - 60000).toISOString(),
    response_time: 89,
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
  }
];

// Mock API functions
export const mockApi = {
  upload: async (file: File) => {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Add a log entry
    mockLogs.unshift({
      id: mockLogs.length + 1,
      method: "POST",
      path: "/api/upload",
      status_code: 200,
      timestamp: new Date().toISOString(),
      response_time: Math.floor(Math.random() * 500) + 100,
      user_agent: navigator.userAgent
    });

    // Parse CSV content and create realistic records
    const newRecords = await parseCSVFile(file);
    
    // Add to mock storage
    mockRecords.push(...newRecords);

    return {
      data: newRecords,
      records_count: newRecords.length,
      message: "File uploaded successfully"
    };
  },

  getRecords: async (page: number = 1, limit: number = 10, search: string = "") => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Add log entry
    mockLogs.unshift({
      id: mockLogs.length + 1,
      method: "GET",
      path: `/api/records?page=${page}&limit=${limit}${search ? `&search=${search}` : ''}`,
      status_code: 200,
      timestamp: new Date().toISOString(),
      response_time: Math.floor(Math.random() * 200) + 50,
      user_agent: navigator.userAgent
    });

    let filteredRecords = mockRecords;
    
    if (search) {
      filteredRecords = mockRecords.filter(record =>
        Object.values(record).some(value =>
          String(value).toLowerCase().includes(search.toLowerCase())
        )
      );
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

    return {
      records: paginatedRecords,
      total: filteredRecords.length,
      page,
      limit
    };
  },

  getRecordById: async (id: number) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const record = mockRecords.find(r => r.id === id);
    if (!record) {
      throw new Error('Record not found');
    }

    return record;
  },

  getLogs: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return {
      logs: mockLogs.slice(0, 50) // Return latest 50 logs
    };
  },

  askAI: async (question: string) => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Add log entry
    mockLogs.unshift({
      id: mockLogs.length + 1,
      method: "POST",
      path: "/api/ask",
      status_code: 200,
      timestamp: new Date().toISOString(),
      response_time: Math.floor(Math.random() * 1000) + 500,
      user_agent: navigator.userAgent
    });

    // Simple mock responses based on current data
    const responses: { [key: string]: string } = {
      "how many records": `There are currently ${mockRecords.length} records in the database.`,
      "average age": mockRecords.length > 0 && mockRecords.some(r => r.age) 
        ? `The average age is ${Math.round(mockRecords.reduce((sum, r) => sum + (r.age || 0), 0) / mockRecords.filter(r => r.age).length)} years.`
        : "No age data available in the current dataset.",
      "missing data": "Data quality analysis based on your uploaded dataset.",
      "data quality": `The dataset contains ${mockRecords.length} records with various fields.`
    };

    // Find matching response or provide default
    const matchedKey = Object.keys(responses).find(key => 
      question.toLowerCase().includes(key)
    );

    const answer = matchedKey 
      ? responses[matchedKey]
      : `I analyzed your question: "${question}". Based on the current dataset of ${mockRecords.length} records, I can help you with data analysis. Try asking about record counts, averages, or data quality.`;

    return { answer };
  }
};

// Helper function to parse CSV file
async function parseCSVFile(file: File): Promise<MockRecord[]> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const records: MockRecord[] = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',');
          const record: MockRecord = { id: mockRecords.length + i };
          
          headers.forEach((header, index) => {
            const value = values[index]?.trim();
            // Try to parse as number if it looks like one
            if (value && !isNaN(Number(value))) {
              record[header] = Number(value);
            } else {
              record[header] = value || '';
            }
          });
          
          records.push(record);
        }
      }
      resolve(records);
    };
    reader.readAsText(file);
  });
}
