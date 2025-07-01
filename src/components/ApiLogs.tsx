import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { databaseService } from "@/services/databaseService";

interface LogEntry {
  id: string;
  method: string;
  path: string;
  query_params: Record<string, any>;
  request_body: any;
  response_status: number;
  response_time_ms: number;
  user_agent: string;
  ip_address: string;
  error_message: string;
  created_at: string;
}

interface ApiLogsProps {
  refreshTrigger: number;
  minTimestamp?: string | null;
}

export const ApiLogs = ({ refreshTrigger, minTimestamp }: ApiLogsProps) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalLogs, setTotalLogs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  const fetchLogs = async (page: number = 1) => {
    setLoading(true);
    try {
      const { logs: logData, total } = await databaseService.getAPILogs(page, 50);
      // Filter logs by minTimestamp if provided
      let filteredLogs = logData;
      if (minTimestamp) {
        filteredLogs = logData.filter((log: LogEntry) => new Date(log.created_at) >= new Date(minTimestamp));
      }
      setLogs(filteredLogs);
      setTotalLogs(filteredLogs.length);
    } catch (error) {
      console.error("Error fetching logs:", error);
      toast({
        title: "Failed to fetch logs",
        description: "Could not load API logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadLogs = async () => {
    try {
      const { logs: allLogs } = await databaseService.getAPILogs(1, 1000);

      const csvContent = [
        'ID,Method,Path,Status,Response Time (ms),User Agent,IP Address,Error Message,Created At',
        ...allLogs.map(log =>
          `${log.id},${log.method},${log.path},${log.response_status},${log.response_time_ms || ''},"${log.user_agent || ''}","${log.ip_address || ''}","${log.error_message || ''}",${log.created_at}`
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `api-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download successful",
        description: "API logs downloaded",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not download logs",
        variant: "destructive",
      });
    }
  };

  // ✅ Refreshed fetch logic – clears and refetches logs
  useEffect(() => {
    const refreshLogs = async () => {
      setLogs([]);
      setTotalLogs(0);
      await fetchLogs(currentPage);
    };
    refreshLogs();
  }, [refreshTrigger, currentPage]);

  const getStatusBadgeVariant = (status: number) => {
    if (status >= 200 && status < 300) return "default";
    if (status >= 400 && status < 600) return "destructive";
    return "secondary";
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'text-green-600';
      case 'POST': return 'text-blue-600';
      case 'PUT': return 'text-yellow-600';
      case 'DELETE': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-600">
            Showing {logs.length} of {totalLogs} total requests
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Only the latest logs are shown. Logs are refreshed when the app is rerun or a new upload occurs.
          </p>
        </div>
        <div className="space-x-2">
          <Button onClick={downloadLogs} size="sm" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button onClick={() => fetchLogs(currentPage)} size="sm" variant="outline">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Method</TableHead>
                <TableHead>Path</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Response Time</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead className="hidden md:table-cell">Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <span className={`font-mono font-bold ${getMethodColor(log.method)}`}>
                      {log.method}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono max-w-xs truncate">
                    {log.path}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(log.response_status)}>
                      {log.response_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {log.response_time_ms ? `${log.response_time_ms}ms` : '-'}
                  </TableCell>
                  <TableCell>
                    {new Date(log.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-red-600 max-w-xs truncate">
                    {log.error_message || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {logs.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          <p>No API logs available yet. Logs will appear here once you start using the API.</p>
        </div>
      )}
    </div>
  );
};
