"use client";

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OperationsTab from './modules/operations/OperationsTab';
import TicketsTab from './modules/tickets/TicketsTab';
import YardListTab from './modules/yard/YardListTab';
import TagsTab from './modules/tags/TagsTab';

/**
 * Weighing Module Landing Page
 *
 * Main entry point for all weighing operations. Implements a tabbed interface
 * with separate modular components for:
 * - Weighing Operations (Mobile & Multideck modes)
 * - Weight Tickets (transaction history)
 * - Yard List (vehicles in yard awaiting offload)
 * - Tags (tagged vehicles for tracking)
 *
 * @see WEIGHING_SCREEN_SPECIFICATION.md for detailed requirements
 */
export default function WeighingPage() {
  return (
    <AppShell
      title="Weighing"
      subtitle="KURAWeigh - Vehicle Weighing & Management System"
    >
      <ProtectedRoute requiredPermissions={['weighing.read']}>
        <div className="space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Weighing Module</h1>
            <p className="text-sm text-gray-500">Manage all weighing operations and tickets</p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="operations" className="w-full">
            <TabsList className="inline-flex h-11 items-center justify-center rounded-full bg-gray-100 p-1">
              <TabsTrigger
                value="operations"
                className="rounded-full px-6 py-2 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Weighing Operations
              </TabsTrigger>
              <TabsTrigger
                value="tickets"
                className="rounded-full px-6 py-2 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Weight Tickets
              </TabsTrigger>
              <TabsTrigger
                value="yard"
                className="rounded-full px-6 py-2 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Yard List
              </TabsTrigger>
              <TabsTrigger
                value="tags"
                className="rounded-full px-6 py-2 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Tags
              </TabsTrigger>
            </TabsList>

            <TabsContent value="operations" className="mt-6">
              <OperationsTab />
            </TabsContent>

            <TabsContent value="tickets" className="mt-6">
              <TicketsTab />
            </TabsContent>

            <TabsContent value="yard" className="mt-6">
              <YardListTab />
            </TabsContent>

            <TabsContent value="tags" className="mt-6">
              <TagsTab />
            </TabsContent>
          </Tabs>
        </div>
      </ProtectedRoute>
    </AppShell>
  );
}
