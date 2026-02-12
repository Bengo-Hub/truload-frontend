'use client';

import { useState } from 'react';
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
import { useNaturalLanguageQuery } from '@/hooks/queries/useAnalyticsQueries';
import { Brain, Code2, Loader2, Search, AlertTriangle } from 'lucide-react';

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
  const nlqMutation = useNaturalLanguageQuery();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    nlqMutation.mutate({ question: query.trim() });
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
    nlqMutation.mutate({ question: example });
  };

  const results = nlqMutation.data;
  const resultColumns = results?.results?.[0]
    ? Object.keys(results.results[0])
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          AI-Powered Query
        </CardTitle>
        <CardDescription>
          Ask questions in plain English — AI converts them to SQL queries
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Query Input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., Show me top 10 overloaded vehicles this month"
            className="flex-1"
          />
          <Button type="submit" disabled={nlqMutation.isPending || !query.trim()}>
            {nlqMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </form>

        {/* Example Queries */}
        {!results && !nlqMutation.isPending && (
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

        {/* Error */}
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
