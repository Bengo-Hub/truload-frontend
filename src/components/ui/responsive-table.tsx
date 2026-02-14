'use client';

import { cn } from '@/lib/utils';

interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  /** Hide on mobile (<640px) */
  hideMobile?: boolean;
  /** Hide on tablet (<1024px) */
  hideTablet?: boolean;
  /** Show as primary field in mobile card view */
  primary?: boolean;
  /** Alignment */
  align?: 'left' | 'center' | 'right';
  /** Fixed width */
  width?: string;
}

interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  /** Custom mobile card renderer (optional - uses default card layout if not provided) */
  mobileCardRenderer?: (item: T) => React.ReactNode;
  /** Actions column renderer */
  actionsRenderer?: (item: T) => React.ReactNode;
  /** Empty state message */
  emptyMessage?: string;
  /** Additional table class */
  className?: string;
  /** Enable horizontal scroll on tablet (640-1024px) with sticky first column */
  stickyFirstColumn?: boolean;
}

export function ResponsiveTable<T>({
  columns,
  data,
  keyExtractor,
  mobileCardRenderer,
  actionsRenderer,
  emptyMessage = 'No data available.',
  className,
  stickyFirstColumn = true,
}: ResponsiveTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card Layout (<640px) */}
      <div className="sm:hidden space-y-3">
        {data.map((item) => {
          if (mobileCardRenderer) {
            return (
              <div key={keyExtractor(item)}>
                {mobileCardRenderer(item)}
              </div>
            );
          }

          const primaryCol = columns.find((c) => c.primary) ?? columns[0];
          const visibleCols = columns.filter((c) => c.key !== primaryCol.key);

          return (
            <div
              key={keyExtractor(item)}
              className="rounded-lg border bg-card p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">
                  {primaryCol.render(item)}
                </div>
                {actionsRenderer && (
                  <div className="flex items-center gap-1">
                    {actionsRenderer(item)}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {visibleCols.map((col) => (
                  <div key={col.key}>
                    <span className="text-muted-foreground">{col.header}: </span>
                    <span className="font-medium">{col.render(item)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tablet/Desktop Table Layout (>=640px) */}
      <div className={cn('hidden sm:block overflow-x-auto rounded-md border', className)}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {columns.map((col, i) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap',
                    col.hideMobile && 'hidden sm:table-cell',
                    col.hideTablet && 'hidden lg:table-cell',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    stickyFirstColumn && i === 0 && 'sticky left-0 bg-muted/50 z-10',
                    col.width
                  )}
                >
                  {col.header}
                </th>
              ))}
              {actionsRenderer && (
                <th className="px-3 py-2 text-right font-medium text-muted-foreground w-[80px]">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr
                key={keyExtractor(item)}
                className="border-b hover:bg-muted/25 transition-colors"
              >
                {columns.map((col, i) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-3 py-2',
                      col.hideMobile && 'hidden sm:table-cell',
                      col.hideTablet && 'hidden lg:table-cell',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      stickyFirstColumn && i === 0 && 'sticky left-0 bg-card z-10'
                    )}
                  >
                    {col.render(item)}
                  </td>
                ))}
                {actionsRenderer && (
                  <td className="px-3 py-2 text-right">
                    {actionsRenderer(item)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
