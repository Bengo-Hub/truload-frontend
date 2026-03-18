"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Cpu, Download } from 'lucide-react';
import { ScaleInfo } from '@/hooks/useMiddleware';

interface MiddlewarePromptProps {
  isConnected: boolean;
  scales: ScaleInfo[];
}

/**
 * MiddlewarePrompt - Shows a helpful message if TruConnect is disconnected
 */
export function MiddlewarePrompt({ 
  isConnected, 
  scales 
}: MiddlewarePromptProps) {
  const isScaleDisconnected = scales.some(s => s.status === 'disconnected');
  
  if (isConnected && !isScaleDisconnected) return null;

  return (
    <Card className="border-blue-200 bg-blue-50 border-dashed">
      <CardContent className="p-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900">
                {!isConnected ? 'TruConnect Not Detected' : 'Scales Disconnected'}
              </p>
              <p className="text-xs text-blue-700">
                {!isConnected 
                  ? 'Ensure TruConnect is running to connect to your scales.' 
                  : 'Check your scale connections in TruConnect.'}
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="bg-white border-blue-200 text-blue-700 hover:bg-blue-100 gap-2 shrink-0">
            <a href="https://github.com/Bengo-Hub/TruConnect/releases/latest" target="_blank" rel="noopener noreferrer">
              <Download className="h-3.5 w-3.5" />
              Download Middleware
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default MiddlewarePrompt;
