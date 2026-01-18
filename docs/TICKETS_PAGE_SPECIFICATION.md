# Tickets Page Specification

## Overview
The Tickets page displays weighing transactions with multiple view modes (List, Grid/Images, Line) and comprehensive filtering capabilities. This document specifies the implementation requirements based on the design references.

## View Modes

### 1. List View (Default)
Displays tickets in a tabular format with all key information visible.

**Columns:**
- `#` - Row number
- `Ticket No.` - Link to ticket details (format: STATION-YYYYMMDDHHMMSS)
- `Ticket No` - Additional reference
- `Station` - Station code
- `Date Time` - Format: YYYY-MM-DD HH:mm:ss
- `Registration` - Vehicle registration number
- `ANPR/ic` - ANPR captured registration
- `ANPR` - ANPR match indicator
- `ANPR Check` - Number of ANPR verification attempts
- `Time Taken (Secs)` - Processing duration
- `Source/Dest.` - Origin and destination locations
- `User` - Operator name
- `Transporter` - Transport company
- `cargo` - Cargo type/description
- `Axle` - Axle configuration (e.g., 2A, 6G)
- `Deck A[KG]` - Deck A weight with permissible weight (highlighted)
- `Deck B[KG]` - Deck B weight with permissible weight (highlighted)
- `Deck C[KG]` - Deck C weight with permissible weight (highlighted)
- `Deck D[KG]` - Deck D weight with permissible weight (highlighted)
- `GVW [KG]` - Gross vehicle weight with permissible weight
- `Exceess [KG]` - Overload amount (highlighted if non-compliant)

**Status Indicators:**
- Multi-Deck badge: Shows deck type (A/B) for multi-deck vehicles
- Alert icon: Red triangle with exclamation mark for non-compliant vehicles
- Color-coded weight cells:
  - Green background: Compliant weights
  - Yellow/Orange background: Warning threshold
  - Red background: Overload

### 2. Grid/Images View
Displays tickets as cards with vehicle images prominently featured.

**Card Layout:**
- Large vehicle photo (thumbnail)
- Status indicator dot (green/red) - top left
- Key metrics displayed on card
- Multi-deck indicator if applicable
- Quick action buttons

**Card Information:**
- Ticket number
- Vehicle registration
- Station
- Date/Time
- GVW with compliance indicator
- Deck weights (if multi-deck)
- Status badge

### 3. Line View
Compact view showing minimal information with vehicle images in a horizontal strip.

**Display Fields:**
- Row number
- Vehicle thumbnail (small)
- Registration number
- Status indicators
- Key metrics
- Action buttons

## Filter Panel

### Date & Time Filters
```typescript
interface DateTimeFilters {
  dateFrom: Date;
  dateTo: Date;
  timeFrom: string; // HH:mm:ss format
  timeTo: string;   // HH:mm:ss format
}
```

### Status Filters
```typescript
interface StatusFilters {
  status: 'All' | 'Active' | 'Recent Tickets' | string;
  state: 'All' | 'Pending' | 'Passed' | 'Failed' | string;
  axleType: 'All' | string; // Specific axle configurations
}
```

### Station Filters
```typescript
interface StationFilters {
  station: 'All' | string; // Station code or ID
}
```

### Search Fields
```typescript
interface SearchFields {
  searchVehicleReg: string;
  searchTicketNo: string;
}
```

## API Integration

### Endpoint
```
GET /api/v1/weighing-transactions
```

### Request Parameters
```typescript
interface SearchWeighingParams {
  // Date & Time
  fromDate?: string;         // ISO 8601 format
  toDate?: string;           // ISO 8601 format
  fromTime?: string;         // HH:mm:ss
  toTime?: string;           // HH:mm:ss

  // Station & User
  stationId?: string;        // UUID
  stationCode?: string;
  operatorId?: string;       // UUID

  // Vehicle
  vehicleRegNo?: string;
  axleConfiguration?: string;
  transporterId?: string;    // UUID

  // Status
  controlStatus?: string;    // "All", "Pending", "Passed", etc.
  state?: string;            // "Active", "Recent Tickets"
  isCompliant?: boolean;

  // Search
  searchTicketNo?: string;
  searchVehicleReg?: string;

  // Cargo & Destination
  cargoType?: string;
  sourceLocation?: string;
  destinationLocation?: string;

  // Advanced
  hasPermit?: boolean;
  isSentToYard?: boolean;
  minOverloadKg?: number;
  maxOverloadKg?: number;

  // View & Pagination
  viewMode?: 'list' | 'images' | 'line';
  skip?: number;
  take?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

### Response Structure
```typescript
interface WeighingSearchResult {
  items: WeighingTransaction[];
  totalCount: number;
  skip: number;
  take: number;
}

interface WeighingTransaction {
  id: string;
  ticketNumber: string;

  // Vehicle
  vehicleId: string;
  vehicleRegNumber: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleType?: string;
  axleConfiguration?: string;
  isMultiDeck: boolean;
  deckType?: string; // "A", "B", "Multi-Deck (A)", "Multi-Deck (B)"

  // Driver & Transporter
  driverId?: string;
  driverName?: string;
  transporterId?: string;
  transporterName?: string;

  // Station & User
  stationId: string;
  stationName?: string;
  stationCode?: string;
  weighedByUserId: string;
  weighedByUserName?: string;

  // Weights
  gvwMeasuredKg: number;
  gvwPermissibleKg: number;
  overloadKg: number;
  excessKg: number;

  // Deck Weights
  deckAWeightKg?: number;
  deckBWeightKg?: number;
  deckCWeightKg?: number;
  deckDWeightKg?: number;

  // ANPR
  anprRegistration?: string;
  anprCheckCount?: number;
  anprMatch: boolean;

  // Location & Cargo
  sourceLocation?: string;
  destinationLocation?: string;
  cargoType?: string;
  cargoDescription?: string;

  // Status
  controlStatus: string;
  totalFeeUsd: number;
  isCompliant: boolean;
  isSentToYard: boolean;
  violationReason: string;

  // Timing
  weighedAt: string; // ISO 8601
  timeTakenSeconds?: number;

  // Sync & Reweigh
  isSync: boolean;
  reweighCycleNo: number;
  originalWeighingId?: string;

  // Permit
  hasPermit: boolean;
  permitNumber?: string;

  // Images
  vehicleThumbnailUrl?: string;
  vehicleImageUrls: string[];

  // Axles
  weighingAxles: WeighingAxle[];

  // Display Helpers
  statusBadgeColor: string; // "green" | "red" | "yellow" | "gray"
  complianceIcon: string;   // "tagged" | "warned" | "legal" | "overload"
}

interface WeighingAxle {
  id: string;
  axleNumber: number;
  measuredWeightKg: number;
  permissibleWeightKg: number;
  overloadKg: number;
  axleConfigurationId: string;
  axleWeightReferenceId?: string;
  capturedAt: string;
}
```

## UI Components

### Filter Panel Component
```tsx
interface FilterPanelProps {
  onSearch: (filters: SearchWeighingParams) => void;
  onClear: () => void;
}

// Component features:
// - Date range pickers
// - Time pickers
// - Dropdown for station selection
// - Dropdown for status/state
// - Text inputs for search fields
// - Clear button to reset all filters
// - Search button to apply filters
```

### View Mode Toggle
```tsx
interface ViewModeToggleProps {
  currentMode: 'list' | 'images' | 'line';
  onChange: (mode: 'list' | 'images' | 'line') => void;
}

// Radio buttons or toggle for selecting view mode
```

### Ticket Card (Grid View)
```tsx
interface TicketCardProps {
  ticket: WeighingTransaction;
  onClick: (id: string) => void;
}

// Features:
// - Large vehicle image
// - Status indicator dot
// - Key metrics overlay
// - Hover effects
// - Click to view details
```

### Ticket Row (List View)
```tsx
interface TicketRowProps {
  ticket: WeighingTransaction;
  rowNumber: number;
  onClick: (id: string) => void;
}

// Features:
// - Color-coded weight cells
// - Alert icons for non-compliance
// - Multi-deck badge
// - Clickable ticket number
```

## Status Badge Colors

```typescript
const getStatusBadgeColor = (ticket: WeighingTransaction): string => {
  if (!ticket.isCompliant && ticket.overloadKg > 0) return 'red';
  if (ticket.controlStatus === 'Pending') return 'yellow';
  if (ticket.isCompliant) return 'green';
  return 'gray';
};
```

## Compliance Icons

Icons should be loaded from `/public` folder in the frontend:

- `tagged.svg` / `tagged.png` - Vehicle tagged for prosecution
- `warned.svg` / `warned.png` - Warning issued
- `legal.svg` / `legal.png` - Compliant/Legal
- `overload.svg` / `overload.png` - Overload detected

**Note:** These icons already exist in `truload-frontend/public` and can be copied to `truload-backend/wwwroot` if needed for backend-generated documents.

## Weight Display Format

```typescript
const formatWeight = (measured: number, permissible: number): string => {
  return `${measured} (${permissible})`;
};

// Example: "6320 (8400)" means measured 6320kg, permissible 8400kg
// Display in colored box:
// - Green if measured <= permissible
// - Red if measured > permissible
```

## Auto-Refresh

Implement polling or WebSocket connection for real-time updates:

```typescript
const REFRESH_INTERVAL = 30000; // 30 seconds

useEffect(() => {
  const interval = setInterval(() => {
    refetchTickets();
  }, REFRESH_INTERVAL);

  return () => clearInterval(interval);
}, []);
```

## Pagination

```typescript
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

// Page size options: 10, 25, 50, 100
```

## Sorting

Allow sorting by clicking column headers:

```typescript
interface SortConfig {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// Sortable columns:
// - ticketNumber
// - weighedAt
// - vehicleRegNumber
// - gvwMeasuredKg
// - overloadKg
// - stationCode
```

## Implementation Notes

1. **Performance**: Use virtual scrolling for large datasets (>100 records)
2. **Responsive**: Grid view should adjust columns based on screen size
3. **Accessibility**: Ensure all status indicators have text alternatives
4. **Error Handling**: Display appropriate messages for failed API calls
5. **Loading States**: Show skeleton loaders while fetching data
6. **Empty State**: Display helpful message when no tickets found

## Sample Usage

```tsx
import { useState, useEffect } from 'react';
import { searchWeighingTransactions } from '@/api/weighing';

export function TicketsPage() {
  const [viewMode, setViewMode] = useState<'list' | 'images' | 'line'>('list');
  const [filters, setFilters] = useState<SearchWeighingParams>({});
  const [tickets, setTickets] = useState<WeighingSearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (newFilters: SearchWeighingParams) => {
    setLoading(true);
    try {
      const result = await searchWeighingTransactions({
        ...newFilters,
        viewMode,
      });
      setTickets(result);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tickets-page">
      <FilterPanel onSearch={handleSearch} onClear={() => setFilters({})} />
      <ViewModeToggle currentMode={viewMode} onChange={setViewMode} />

      {loading && <LoadingSkeleton />}

      {!loading && tickets && (
        <>
          {viewMode === 'list' && <TicketListView tickets={tickets.items} />}
          {viewMode === 'images' && <TicketGridView tickets={tickets.items} />}
          {viewMode === 'line' && <TicketLineView tickets={tickets.items} />}

          <Pagination
            currentPage={Math.floor(tickets.skip / tickets.take) + 1}
            totalPages={Math.ceil(tickets.totalCount / tickets.take)}
            totalRecords={tickets.totalCount}
            pageSize={tickets.take}
            onPageChange={(page) => handleSearch({ ...filters, skip: (page - 1) * tickets.take })}
            onPageSizeChange={(size) => handleSearch({ ...filters, take: size, skip: 0 })}
          />
        </>
      )}
    </div>
  );
}
```

## Testing Checklist

- [ ] Filter by date range works correctly
- [ ] Filter by time range works correctly
- [ ] Station filter shows correct stations
- [ ] Search by vehicle registration is case-insensitive
- [ ] Search by ticket number works
- [ ] View mode toggle persists user preference
- [ ] Pagination calculates pages correctly
- [ ] Sorting by columns works in both directions
- [ ] Status badges show correct colors
- [ ] Compliance icons display correctly
- [ ] Multi-deck indicator appears for appropriate vehicles
- [ ] Weight cells are color-coded based on compliance
- [ ] Vehicle images load and display correctly
- [ ] Auto-refresh updates data without user action
- [ ] Empty state displays when no results found
- [ ] Error state displays on API failure
- [ ] Loading skeleton shows during data fetch
- [ ] Responsive design works on mobile devices
