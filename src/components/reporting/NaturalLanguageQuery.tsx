'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { submitAsyncQuery } from '@/lib/api/analytics';
import type { NaturalLanguageQueryResponse } from '@/lib/api/analytics';
import {
  getAnalyticsConnection,
  startAnalyticsConnection,
  stopAnalyticsConnection,
  onConnectionStateChange,
} from '@/lib/signalr/analyticsHub';
import { Brain, Code2, Loader2, Search, AlertTriangle, Wifi, WifiOff } from 'lucide-react';

/** Client-side timeout for async queries (90 seconds). */
const QUERY_TIMEOUT_MS = 90_000;

const EXAMPLE_QUERIES = [
  'Show me top 10 overloaded vehicles this month',
  'Total revenue collected per station this year',
  'How many cases are pending prosecution?',
  'Average GVW overload by vehicle type',
  'Compliance rate trend for the last 6 months',
];

export function NaturalLanguageQuery() {
  const [query, setQuery] = useState('');
  const [showSql, setShowSql] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [results, setResults] = useState<NaturalLanguageQueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingJobRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Connect to SignalR on mount, disconnect on unmount
  useEffect(() => {
    let mounted = true;

    async function connect() {
      try {
        await startAnalyticsConnection();
        if (mounted) setIsConnected(true);
      } catch (err) {
        console.warn('SignalR connection failed, will use sync fallback:', err);
        if (mounted) setIsConnected(false);
      }
    }

    connect();

    // Track reconnection state changes
    const unsubscribe = onConnectionStateChange((state) => {
      if (!mounted) return;
      setIsConnected(state === 'connected');

      // If we disconnect while a query is pending, abort the wait
      if (state === 'disconnected' && pendingJobRef.current) {
        pendingJobRef.current = null;
        setIsProcessing(false);
        setError('Connection lost. Please try again.');
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
    });

    // Listen for query results
    const conn = getAnalyticsConnection();
    const handler = (data: { jobId: string; result: NaturalLanguageQueryResponse }) => {
      if (pendingJobRef.current === data.jobId) {
        pendingJobRef.current = null;
        setResults(data.result);
        setIsProcessing(false);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
    };
    conn.on('QueryResult', handler);

    return () => {
      mounted = false;
      unsubscribe();
      conn.off('QueryResult', handler);
      stopAnalyticsConnection();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleSubmit = useCallback(async (question: string) => {
    if (!question.trim()) return;

    setResults(null);
    setError(null);
    setIsProcessing(true);

    // Clear any previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const conn = getAnalyticsConnection();
    const connectionId = conn.connectionId;

    if (connectionId && isConnected) {
      // Async path: submit via HTTP, receive result via SignalR
      try {
        const { jobId } = await submitAsyncQuery({
          question: question.trim(),
          connectionId,
        });
        pendingJobRef.current = jobId;

        // Client-side timeout guard
        timeoutRef.current = setTimeout(() => {
          if (pendingJobRef.current === jobId) {
            pendingJobRef.current = null;
            setIsProcessing(false);
            setError('Query timed out. The AI may be under heavy load — try again or simplify your question.');
          }
        }, QUERY_TIMEOUT_MS);
      } catch {
        setError('Failed to submit query. Please try again.');
        setIsProcessing(false);
      }
    } else {
      // Fallback: sync HTTP request (may timeout for complex queries)
      try {
        const { executeNaturalLanguageQuery } = await import('@/lib/api/analytics');
        const result = await executeNaturalLanguageQuery({ question: question.trim() });
        setResults(result);
      } catch {
        setError('Query timed out or failed. Please try a simpler question.');
      } finally {
        setIsProcessing(false);
      }
    }
  }, [isConnected]);

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(query);
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
    handleSubmit(example);
  };

  const resultColumns = results?.results?.[0]
    ? Object.keys(results.results[0])
    : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              AI-Powered Query
            </CardTitle>
            <CardDescription>
              Ask questions in plain English — AI converts them to SQL queries
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground" title={isConnected ? 'Real-time connection active' : 'Using fallback mode'}>
            {isConnected ? (
              <Wifi className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-gray-400" />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Query Input */}
        <form onSubmit={onFormSubmit} className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., Show me top 10 overloaded vehicles this month"
            className="flex-1"
          />
          <Button type="submit" disabled={isProcessing || !query.trim()}>
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </form>

        {/* Example Queries */}
        {!results && !isProcessing && !error && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Try an example:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUERIES.map((ex) => (
                <Badge
                  key={ex}
                  variant="outline"
                  className="cursor-pointer hover:bg-purple-50 hover:border-purple-300 transition-colors"
                  onClick={() => handleExampleClick(ex)}
                >
                  {ex}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Processing indicator */}
        {isProcessing && (
          <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
            <span className="text-sm text-purple-700">
              AI is generating your query{isConnected ? ' — results will appear in real-time' : ''}...
            </span>
          </div>
        )}

        {/* Submission Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Query Failure */}
        {results && !results.success && (
          <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Query Failed</p>
              <p className="text-sm text-red-600">{results.error || 'An unknown error occurred'}</p>
            </div>
          </div>
        )}

        {/* Generated SQL */}
        {results?.generatedSql && (
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSql(!showSql)}
              className="text-xs text-muted-foreground"
            >
              <Code2 className="h-3 w-3 mr-1" />
              {showSql ? 'Hide' : 'Show'} Generated SQL
            </Button>
            {showSql && (
              <pre className="p-3 bg-gray-900 text-green-400 rounded-lg text-xs overflow-x-auto font-mono">
                {results.generatedSql}
              </pre>
            )}
          </div>
        )}

        {/* Results Table */}
        {results?.success && results.results && results.results.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {resultColumns.map((col) => (
                      <TableHead key={col} className="whitespace-nowrap bg-gray-50">
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.results.map((row, idx) => (
                    <TableRow key={idx}>
                      {resultColumns.map((col) => (
                        <TableCell key={col} className="whitespace-nowrap font-mono text-sm">
                          {String(row[col] ?? '-')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="px-3 py-2 bg-gray-50 border-t text-xs text-muted-foreground">
              {results.results.length} row(s) returned
            </div>
          </div>
        )}

        {/* Empty results */}
        {results?.success && (!results.results || results.results.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No results found for your query</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
