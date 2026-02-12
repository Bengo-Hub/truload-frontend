/**
 * CSV Export Utility
 *
 * Converts arrays of data to CSV and triggers a browser download.
 */

interface ColumnDef<T> {
  header: string;
  accessor: keyof T | ((row: T) => string | number | null | undefined);
}

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Export data as a CSV file download
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: ColumnDef<T>[],
  filename: string
): void {
  if (!data.length) return;

  // Header row
  const headerRow = columns.map(col => escapeCsvValue(col.header)).join(',');

  // Data rows
  const dataRows = data.map(row =>
    columns.map(col => {
      const value = typeof col.accessor === 'function'
        ? col.accessor(row)
        : row[col.accessor];
      return escapeCsvValue(value);
    }).join(',')
  );

  const csvContent = [headerRow, ...dataRows].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export a simple array of objects to CSV using all keys as columns
 */
export function exportArrayToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string
): void {
  if (!data.length) return;

  const keys = Object.keys(data[0]) as (keyof T)[];
  const columns: ColumnDef<T>[] = keys.map(key => ({
    header: String(key).replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim(),
    accessor: key,
  }));

  exportToCSV(data, columns, filename);
}
