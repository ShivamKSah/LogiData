
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, AlertCircle, CheckCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { validateCSV } from "@/services/csvValidation";
import { apiService } from "@/services/apiService";

interface FileUploadProps {
  onUploadSuccess: (data: any[]) => void;
}

export const FileUpload = ({ onUploadSuccess }: FileUploadProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [validationResults, setValidationResults] = useState<any[]>([]);
  const [validationSummary, setValidationSummary] = useState<any>(null);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const csvFiles = acceptedFiles.filter(file => 
      file.type === 'text/csv' || file.name.endsWith('.csv')
    );
    
    if (csvFiles.length === 0) {
      toast({
        title: "Invalid file type",
        description: "Please upload CSV files only",
        variant: "destructive",
      });
      return;
    }

    setFiles(csvFiles);
    setValidationResults([]);
    setValidationSummary(null);
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress((i / files.length) * 100);

        console.log(`Processing file: ${file.name}`);
        
        // Validate CSV
        const validation = await validateCSV(file);
        setValidationResults(validation.results);
        setValidationSummary(validation.summary);

        console.log("Validation completed:", validation.summary);

        // Store in database using API service
        await apiService.storeUpload(file.name, validation.results, validation.summary);

        toast({
          title: "File processed successfully",
          description: `${file.name} has been validated and stored`,
        });

        // Notify parent component
        onUploadSuccess(validation.results.map(r => r.data));
      }

      setProgress(100);
    } catch (error) {
      console.error("Error processing files:", error);
      toast({
        title: "Upload failed",
        description: "There was an error processing your files",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* File Drop Zone */}
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV Files</CardTitle>
          <CardDescription>
            Drag and drop your CSV files here or click to select files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            {isDragActive ? (
              <p className="text-lg">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-lg mb-2">Click to upload or drag and drop</p>
                <p className="text-sm text-gray-500">CSV files only</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Files</CardTitle>
            <CardDescription>
              {files.length} file{files.length > 1 ? 's' : ''} ready for processing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => removeFile(index)}
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button onClick={processFiles} disabled={uploading}>
                {uploading ? "Processing..." : "Process Files"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Progress */}
      {uploading && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Files</CardTitle>
            <CardDescription>Please wait while we validate and store your data</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-gray-500 mt-2">{Math.round(progress)}% complete</p>
          </CardContent>
        </Card>
      )}

      {/* Validation Summary */}
      {validationSummary && (
        <Card>
          <CardHeader>
            <CardTitle>Validation Results</CardTitle>
            <CardDescription>Summary of data validation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {validationSummary.totalRows}
                </div>
                <div className="text-sm text-gray-500">Total Rows</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {validationSummary.validRows}
                </div>
                <div className="text-sm text-gray-500">Valid Rows</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {validationSummary.duplicateRows}
                </div>
                <div className="text-sm text-gray-500">Duplicates</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {validationSummary.errorRows}
                </div>
                <div className="text-sm text-gray-500">Errors</div>
              </div>
            </div>

            {validationSummary.issues && validationSummary.issues.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Issues Found:</h4>
                <div className="space-y-1">
                  {validationSummary.issues.map((issue: string, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                      <span>{issue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm text-green-600">
                Data has been successfully validated and stored
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
