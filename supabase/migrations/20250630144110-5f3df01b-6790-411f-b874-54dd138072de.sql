
-- Create a table to store uploaded CSV data
CREATE TABLE public.csv_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_id UUID NOT NULL DEFAULT gen_random_uuid(),
  row_data JSONB NOT NULL,
  original_row_number INTEGER,
  is_duplicate BOOLEAN DEFAULT false,
  validation_errors TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create a table to store upload metadata
CREATE TABLE public.csv_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  total_rows INTEGER NOT NULL,
  valid_rows INTEGER NOT NULL,
  duplicate_rows INTEGER NOT NULL,
  error_rows INTEGER NOT NULL,
  column_names TEXT[] NOT NULL,
  upload_status TEXT NOT NULL DEFAULT 'processing',
  validation_summary JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create a table to log API activity
CREATE TABLE public.api_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  query_params JSONB,
  request_body JSONB,
  response_status INTEGER,
  response_time_ms INTEGER,
  user_agent TEXT,
  ip_address TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX idx_csv_data_upload_id ON public.csv_data(upload_id);
CREATE INDEX idx_csv_data_created_at ON public.csv_data(created_at);
CREATE INDEX idx_csv_uploads_created_at ON public.csv_uploads(created_at);
CREATE INDEX idx_api_logs_created_at ON public.api_logs(created_at);
CREATE INDEX idx_api_logs_path ON public.api_logs(path);

-- Enable Row Level Security (making tables publicly accessible for this demo)
ALTER TABLE public.csv_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csv_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for public access (you may want to restrict these later)
CREATE POLICY "Allow all operations on csv_data" ON public.csv_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on csv_uploads" ON public.csv_uploads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on api_logs" ON public.api_logs FOR ALL USING (true) WITH CHECK (true);
