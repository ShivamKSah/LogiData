import { useState, useEffect } from "react";
import { FileUpload } from "@/components/FileUpload";
import { RecordsTable } from "@/components/RecordsTable";
import { DataVisualization } from "@/components/DataVisualization";
import { ApiLogs } from "@/components/ApiLogs";
import { AiAssistant } from "@/components/AiAssistant";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mockApi } from "@/services/mockApi";
import { apiService } from "@/services/apiService";

const Index = () => {
  const [uploadedData, setUploadedData] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [latestUploadTimestamp, setLatestUploadTimestamp] = useState<string | null>(null);
  const [latestUploadId, setLatestUploadId] = useState<string | null>(null);
  const [hasUploaded, setHasUploaded] = useState(false);

  // Load latest upload timestamp from localStorage on mount
  useEffect(() => {
    const now = new Date().toISOString();
    setLatestUploadTimestamp(now);
    localStorage.setItem('latestUploadTimestamp', now);
    setLatestUploadId(null); // Start with no upload selected
  }, []);

  // Fetch the latest upload timestamp from the database
  const fetchLatestUploadTimestamp = async () => {
    try {
      const uploads = await apiService.getUploads?.();
      if (uploads && uploads.length > 0) {
        const latest = uploads[0];
        setLatestUploadTimestamp(latest.created_at);
        localStorage.setItem('latestUploadTimestamp', latest.created_at);
        setLatestUploadId(latest.id); // Set latest upload ID after upload
      }
    } catch (err) {
      console.error('Failed to fetch latest upload timestamp:', err);
    }
  };

  const handleUploadSuccess = async (data: any[]) => {
    console.log("Upload success, data received:", data);
    setUploadedData(data);
    setRefreshTrigger(prev => prev + 1);
    await fetchLatestUploadTimestamp();
    setHasUploaded(true);
  };

  useEffect(() => {
    // Delete all previous API logs on rerun
    apiService.deleteAllAPILogs?.().catch((err) => {
      console.error("Failed to delete previous API logs:", err);
    });
  }, [refreshTrigger]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Data Upload & Query Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Upload CSV files, view records, and analyze your data
          </p>
        </div>

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="records">Records</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="ai">AI Assistant</TabsTrigger>
            <TabsTrigger value="logs">API Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>CSV File Upload</CardTitle>
                <CardDescription>
                  Upload your CSV files for processing and validation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUpload onUploadSuccess={handleUploadSuccess} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="records" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Records</CardTitle>
                <CardDescription>
                  Browse and manage your uploaded data records
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hasUploaded ? (
                  <RecordsTable refreshTrigger={refreshTrigger} latestUploadId={latestUploadId} />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No records available yet. Upload a CSV file to see records here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Visualization</CardTitle>
                <CardDescription>
                  Visual insights from your uploaded data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataVisualization data={uploadedData} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Assistant</CardTitle>
                <CardDescription>
                  Ask questions about your data using natural language
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AiAssistant />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>API Request Logs</CardTitle>
                <CardDescription>
                  Monitor API requests and responses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ApiLogs refreshTrigger={refreshTrigger} minTimestamp={latestUploadTimestamp} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
