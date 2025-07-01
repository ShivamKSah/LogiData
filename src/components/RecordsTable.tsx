import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Eye, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";

interface Upload {
  id: string;
  filename: string;
  total_rows: number;
  valid_rows: number;
  duplicate_rows: number;
  error_rows: number;
  created_at: string;
  upload_status: string;
  column_names: string[];
  validation_summary: {
    totalRows: number;
    validRows: number;
    duplicateRows: number;
    errorRows: number;
    columnTypes: Record<string, string>;
    issues: string[];
  };
}

interface CSVData {
  id: string;
  row_data: Record<string, any>;
  original_row_number: number;
  validation_errors: string[];
}

export const RecordsTable = ({ refreshTrigger, latestUploadId }: { refreshTrigger: number, latestUploadId?: string | null }) => {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [selectedUpload, setSelectedUpload] = useState<Upload | null>(null);
  const [csvData, setCsvData] = useState<CSVData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [searchResults, setSearchResults] = useState<CSVData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const { toast } = useToast();

  const fetchUploads = async () => {
    setLoading(true);
    try {
      const uploadData = await apiService.getUploads();
      // Only keep the latest upload
      const latestUpload = uploadData.length > 0 ? [uploadData[0]] : [];
      const transformedUploads: Upload[] = latestUpload.map(upload => ({
        ...upload,
        validation_summary: {
          ...upload.validation_summary,
          issues: upload.validation_summary.validationErrors || []
        }
      }));
      setUploads(transformedUploads);
      // Do not auto-select upload on initial load
    } catch (error) {
      console.error("Error fetching uploads:", error);
      toast({
        title: "Failed to fetch uploads",
        description: "Could not load uploaded files",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUploadData = async (uploadId: string, page: number) => {
    setLoading(true);
    try {
      const { data, total } = await apiService.getUploadData(uploadId, page, rowsPerPage);
      setCsvData(data);
      setTotalRows(total);
    } catch (error) {
      console.error("Error fetching upload data:", error);
      toast({
        title: "Failed to fetch data",
        description: "Could not load CSV data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setLoading(true);
    setIsSearching(true);
    try {
      console.log('Starting search for:', searchQuery);
      const results = await apiService.searchData(searchQuery, selectedUpload?.id);
      console.log('Search results:', results);
      setSearchResults(results);
      toast({
        title: "Search completed",
        description: `Found ${results.length} matching records`,
      });
    } catch (error) {
      console.error("Error searching data:", error);
      toast({
        title: "Search failed",
        description: `Could not search data: ${error.message}`,
        variant: "destructive",
      });
      // Clear search results on error
      setSearchResults([]);
      setIsSearching(false);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
  };

  const downloadCSV = () => {
    if (!selectedUpload) return;

    const dataToDownload = isSearching ? searchResults : csvData;
    if (dataToDownload.length === 0) return;

    // Use the original column order from the upload
    const headers = selectedUpload.column_names || Object.keys(dataToDownload[0].row_data);
    const csvContent = [
      headers.join(','),
      ...dataToDownload.map(row => 
        headers.map(header => {
          const value = row.row_data[header];
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedUpload.filename}-data.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleRowsPerPageChange = (value: string) => {
    const newRowsPerPage = parseInt(value);
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  useEffect(() => {
    fetchUploads();
  }, [refreshTrigger]);

  // Select upload when latestUploadId changes
  useEffect(() => {
    if (!latestUploadId || uploads.length === 0) {
      setSelectedUpload(null);
      setCsvData([]);
      setTotalRows(0);
      return;
    }
    const found = uploads.find(u => u.id === latestUploadId);
    if (found) {
      setSelectedUpload(found);
    } else {
      setSelectedUpload(null);
      setCsvData([]);
      setTotalRows(0);
    }
  }, [latestUploadId, uploads]);

  useEffect(() => {
    if (!selectedUpload || isSearching) {
      return;
    }
    fetchUploadData(selectedUpload.id, currentPage);
  }, [selectedUpload, currentPage, isSearching, rowsPerPage]);

  const displayData = isSearching ? searchResults : csvData;
  const totalPages = Math.ceil(totalRows / rowsPerPage);

  // Get column headers in the original order from the upload
  const getOrderedHeaders = () => {
    if (!selectedUpload || displayData.length === 0) return [];
    
    // Use the original column order from the upload metadata
    if (selectedUpload.column_names && selectedUpload.column_names.length > 0) {
      return selectedUpload.column_names;
    }
    
    // Fallback to keys from the first row if column_names is not available
    return Object.keys(displayData[0].row_data);
  };

  // If no upload is selected, show blank state
  if (!selectedUpload) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No records available yet. Upload a CSV file to see records here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Only show upload info for the latest upload */}
      {uploads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Latest Upload</CardTitle>
            <CardDescription>Only the most recent uploaded file is shown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div
                key={uploads[0].id}
                className={`p-4 border rounded-lg border-primary bg-primary/5`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{uploads[0].filename}</h3>
                    <p className="text-sm text-gray-500">
                      {uploads[0].total_rows} total rows • {uploads[0].valid_rows} valid • {uploads[0].error_rows} errors
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={uploads[0].upload_status === 'completed' ? 'default' : 'secondary'}>
                      {uploads[0].upload_status}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {new Date(uploads[0].created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedUpload && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Data from {selectedUpload.filename}</CardTitle>
                <CardDescription>
                  {isSearching ? 
                    `Search results for "${searchQuery}" (${searchResults.length} found)` : 
                    `Showing ${displayData.length} of ${totalRows} rows`
                  }
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={downloadCSV} size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button onClick={() => selectedUpload && fetchUploadData(selectedUpload.id, currentPage)} size="sm" variant="outline">
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search data..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} disabled={loading}>
                Search
              </Button>
              {isSearching && (
                <Button onClick={clearSearch} variant="outline">
                  Clear
                </Button>
              )}
            </div>

            {/* Data Table */}
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : displayData.length > 0 ? (
              <>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Row #</TableHead>
                        {getOrderedHeaders().map((header) => (
                          <TableHead key={header}>{header}</TableHead>
                        ))}
                        <TableHead className="w-20">Errors</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayData.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-mono text-sm">
                            {row.original_row_number}
                          </TableCell>
                          {getOrderedHeaders().map((header) => (
                            <TableCell key={header} className="max-w-xs truncate">
                              {String(row.row_data[header] || '')}
                            </TableCell>
                          ))}
                          <TableCell>
                            {row.validation_errors.length > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {row.validation_errors.length}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination and Rows Per Page */}
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Rows per page:</span>
                    <Select value={rowsPerPage.toString()} onValueChange={handleRowsPerPageChange}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="500">500</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {!isSearching && totalPages > 1 && (
                    <div className="flex items-center gap-4">
                      <p className="text-sm text-gray-500">
                        Page {currentPage} of {totalPages}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          size="sm"
                          variant="outline"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          size="sm"
                          variant="outline"
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{isSearching ? "No matching records found" : "No data available"}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
