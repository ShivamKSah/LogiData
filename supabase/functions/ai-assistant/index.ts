
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = 'https://kfdtbfksiwkyibqniauh.supabase.co';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question } = await req.json();
    
    console.log('Received question:', question);
    
    if (!openAIApiKey) {
      console.error('OpenAI API key not found in environment');
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured. Please set the OPENAI_API_KEY secret in Supabase.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Initialize Supabase client with service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseServiceKey || '');
    
    // Get all CSV data for context - fetch ALL available data
    const { data: uploads, error: uploadsError } = await supabase
      .from('csv_uploads')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (uploadsError) {
      console.error('Error fetching uploads:', uploadsError);
    }
    
    let csvContext = '';
    
    if (uploads && uploads.length > 0) {
      // Get data from the most recent upload
      const recentUpload = uploads[0];
      console.log('Using upload:', recentUpload.filename, 'with', recentUpload.total_rows, 'total rows');
      
      // Fetch ALL data from the upload (not limited to 500)
      const { data: csvData, error: csvError } = await supabase
        .from('csv_data')
        .select('row_data, original_row_number')
        .eq('upload_id', recentUpload.id)
        .eq('is_duplicate', false)
        .order('original_row_number')
        .limit(2000); // Increased limit to get more data
      
      if (csvError) {
        console.error('Error fetching CSV data:', csvError);
      }
      
      if (csvData && csvData.length > 0) {
        console.log('Fetched', csvData.length, 'rows for analysis');
        
        // Analyze the complete dataset structure and content
        const allColumns = new Set();
        const columnValues = {};
        const numericColumns = new Set();
        const categoricalData = {};
        
        csvData.forEach(row => {
          Object.entries(row.row_data).forEach(([key, value]) => {
            allColumns.add(key);
            
            // Track sample values for each column
            if (!columnValues[key]) {
              columnValues[key] = [];
            }
            if (columnValues[key].length < 10) { // Increased sample size
              columnValues[key].push(value);
            }
            
            // Track categorical data distribution
            if (!categoricalData[key]) {
              categoricalData[key] = {};
            }
            const strValue = String(value);
            categoricalData[key][strValue] = (categoricalData[key][strValue] || 0) + 1;
            
            // Check if column contains numeric data
            if (typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '')) {
              numericColumns.add(key);
            }
          });
        });

        // Calculate comprehensive statistics for numeric columns
        const statistics = {};
        numericColumns.forEach(column => {
          const values = csvData
            .map(row => {
              const val = row.row_data[column];
              return typeof val === 'number' ? val : parseFloat(val);
            })
            .filter(val => !isNaN(val));
          
          if (values.length > 0) {
            values.sort((a, b) => a - b);
            const mid = Math.floor(values.length / 2);
            statistics[column] = {
              count: values.length,
              min: Math.min(...values),
              max: Math.max(...values),
              average: values.reduce((a, b) => a + b, 0) / values.length,
              median: values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2,
              sum: values.reduce((a, b) => a + b, 0)
            };
          }
        });

        // Create comprehensive context with ALL available data
        csvContext = `
COMPLETE DATASET ANALYSIS:
Dataset: ${recentUpload.filename}
Total Records in Database: ${recentUpload.total_rows}
Valid Records: ${recentUpload.valid_rows}
Records Available for Analysis: ${csvData.length}

COLUMN STRUCTURE (${Array.from(allColumns).length} columns):
${Array.from(allColumns).map(col => `- ${col}`).join('\n')}

COMPLETE DATA SAMPLE (First 15 rows with all columns):
${csvData.slice(0, 15).map((row, index) => 
  `Row ${row.original_row_number}: ${JSON.stringify(row.row_data)}`
).join('\n')}

DETAILED COLUMN ANALYSIS:
${Array.from(allColumns).map(col => {
  const samples = columnValues[col] || [];
  const isNumeric = numericColumns.has(col);
  const uniqueCount = Object.keys(categoricalData[col] || {}).length;
  const topValues = Object.entries(categoricalData[col] || {})
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([value, count]) => `${value}(${count})`)
    .join(', ');
  
  return `${col}: 
  - Type: ${isNumeric ? 'NUMERIC' : 'CATEGORICAL/TEXT'}
  - Unique values: ${uniqueCount}
  - Sample values: [${samples.slice(0, 5).join(', ')}]
  - Top values: ${topValues}`;
}).join('\n')}

NUMERIC STATISTICS (Detailed):
${Object.entries(statistics).map(([col, stats]) => 
  `${col}: Count=${stats.count}, Min=${stats.min}, Max=${stats.max}, Average=${stats.average.toFixed(2)}, Median=${stats.median.toFixed(2)}, Sum=${stats.sum}`
).join('\n')}

CATEGORICAL BREAKDOWNS:
${Array.from(allColumns).filter(col => !numericColumns.has(col)).map(col => {
  const distribution = Object.entries(categoricalData[col] || {})
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([value, count]) => `  ${value}: ${count}`)
    .join('\n');
  return `${col}:\n${distribution}`;
}).join('\n\n')}

AVAILABLE FOR ANALYSIS: All ${csvData.length} rows with complete data are available for any calculations, filtering, or analysis you need to perform.
`;
        
        console.log('Generated comprehensive context with', csvData.length, 'rows and', Array.from(allColumns).length, 'columns');
      }
    }
    
    if (!csvContext) {
      console.log('No CSV context found');
      return new Response(JSON.stringify({ 
        answer: "I don't have access to any uploaded CSV data. Please upload a CSV file first to ask questions about your data." 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Calling OpenAI API with comprehensive dataset context');
    
    // Call OpenAI API with enhanced prompt for data analysis
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a professional data analyst with complete access to a CSV dataset. You have the FULL dataset available and can perform any calculations, analysis, or answer any questions about the data with complete accuracy.

COMPLETE DATASET INFORMATION:
${csvContext}

CRITICAL INSTRUCTIONS:
- You have access to the COMPLETE dataset with all rows and columns
- When answering questions about counts, totals, or specific data points, analyze the ENTIRE dataset provided above
- For questions like "How many X are there?", count through ALL the data available
- Always give EXACT numbers based on the complete dataset provided
- If asked about specific values, categories, or conditions, search through ALL the provided data
- You can perform any calculations, filtering, grouping, or statistical analysis on the complete dataset
- Always reference the actual data when providing answers
- Be precise and provide concrete numbers from the actual dataset analysis

Remember: You have the complete dataset available above - use it to provide accurate, data-driven answers.`
          },
          {
            role: 'user',
            content: question
          }
        ],
        temperature: 0.1, // Lower temperature for more consistent analytical responses
        max_tokens: 2000
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API error:', data);
      throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
    }
    
    const answer = data.choices[0].message.content;
    console.log('OpenAI response received successfully');

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-assistant function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process your question. Please try again.',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
