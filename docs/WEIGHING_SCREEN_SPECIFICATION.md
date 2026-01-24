# Weighing Scale Interface Specification

## Overview
This document specifies the user interface and experience for the **Weighing Scale Screen** (Screen 3 in the application flow). This is the core operational screen where officers capture vehicle weights, verify compliance, and generate tickets.

The design prioritizes **Regulatory Compliance** (highlighting Axle Groups vs Individual Axles) while maintaining a modern, clean, and efficient "dark mode" aesthetic suitable for high-glare field environments.

## Design Goals
1.  **Dual Compliance Visibility**: Simultaneously show Individual Axle weights and Axle Group aggregates (Regulatory Requirement).
2.  **Clear Violation Hierarchy**: Instantly distinguish between "Legal", "Warning" (Traffic Act Tolerance), and "Overload".
3.  **Operational Efficiency**: Minimize clicks for common actions (Stable -> Capture -> Print).
4.  **Hardware Status Awareness**: Prominently display scale connection status and stability.

---

## Layout Structure

### 1. Header & Context Bar
*   **Station Info**: Station Name, Bound (A/B), Lane ID.
*   **Hardware Status**:
    *   **Scale**:🟢 Connected (Stable) / 🟡 Unstable / 🔴 Disconnected
    *   **ANPR**: 🟢 Active / 🔴 Offline
*   **Vehicle Context**: Registration Number (Large), Transporter, Cargo Type.

### 2. Main Workspace (Two-Column Layout)

#### Left Column: Real-Time Visualization (The "Digital Twin")
*   **Vehicle Diagram**: Dynamic SVG representation of the vehicle configuration (e.g., 2A, 6C).
*   **Live Weight Indicators**:
    *   Visual "pressure" indicators on each axle group.
    *   Color-coded real-time feedback (Green < 95%, Yellow > 95%, Red > 100%).
*   **Axle Stream**: Vertical timeline showing axles as they pass (WIM mode) or static diagram (Static mode).

#### Right Column: Compliance Data Grid (The "Legal View")
This section implements the **Superior Approach** to KenloadV2's tables. Instead of two separate disconnected tables, we use a **Unified Hierarchical Grid**.

**Columns:**
1.  **Group/Axle**: Hierarchical tree (Group A -> Axle 1).
2.  **Type**: (Steering, Drive, Tandem, Tridem).
3.  **Permissible**: Legal limit (e.g., 16,000 kg).
4.  **Tolerance**: +5% value (e.g., 16,800 kg) - *Only for Groups!*
5.  **Measured**: Real-time/Captured value.
6.  **Violation**:
    *   **% Over**: Percentage over limit.
    *   **Excess Kg**: Absolute mass over limit.
7.  **PDF**: Pavement Damage Factor (e.g., 1.25).

**Visual Hierarchy Rules:**
*   **Groups (Roots)**: Bold text, primary compliance indicators. IF GROUP IS RED, THE VEHICLE IS OVERLOADED.
*   **Axles (Children)**: Lighter text. Usage for diagnostics (which axle is heavy?).
*   **GVW (Footer)**: Massive summary row. 0% Tolerance applies here.

| Group/Axle | Type | Permissible (Kg) | Tolerance (+5%) | Measured (Kg) | Excess (Kg) | PDF | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Group A** | **Steering** | **7,000** | **7,350** | **6,800** | **-** | **0.88** | 🟢 **Legal** |
| └ Axle 1 | Single | 7,000 | - | 6,800 | - | | |
| **Group B** | **Tandem** | **16,000** | **16,800** | **17,500** | **+700** | **1.78** | 🔴 **Overload** |
| └ Axle 2 | Dual | - | - | 8,900 | - | | |
| └ Axle 3 | Dual | - | - | 8,600 | - | | |
| **GVW** | **Total** | **48,000** | **48,000** | **49,100** | **+1,100** | **-** | 🔴 **Overload** |

---

### 3. Action / Decision Panel (Bottom)
*   **Primary Status**: Large Badge (LEGAL / WARNING / PROHIBITED).
*   **Action Buttons**:
    *   `[Print Ticket]` (Enabled if Captured)
    *   `[Tag Vehicle]` (For violations)
    *   `[Send to Yard]` (Auto-selected if > Tolerance)
    *   `[Special Release]` (Requires Permission)

---

## Superior Approaches over KenloadV2

| Feature | KenloadV2 Approach | TruLoad Superior Approach |
| :--- | :--- | :--- |
| **Data Layout** | Split tables (Axle vs Group) causing eye-scanning fatigue. | **Unified Hierarchical Tree**: Groups are parents, Axles are children. Instant context. |
| **Tolerance Visibility** | Hidden calculation or confusing text. | **Explicit Column**: Shows exactly what the "Safe Limit" is (Permissible + 5%). |
| **PDF Calculation** | Often hidden or post-ticket. | **Real-time**: Drivers see damage factor impact immediately. |
| **Overload Feedback** | Basic text color. | **Smart Badges**: "Traffic Act Tolerance Applied" vs "Actual Violation". |
| **Responsiveness** | Fixed desktop view. | **Adaptive**: Collapses to card view on mobile tablets for roadside checks. |

## Implementation Notes
*   **State Management**: Use `Zustand` store `useWeighingStore` to manage temporary transaction state.
*   **Real-time Updates**: `useEffect` subscription to `TruConnect` service for weight stream.
*   **Calculation Engine**: Implement `ComplianceCalculator` utility that matches the Backend logic (C# `WeighingService.ProcessAxleGroupsAsync`) exactly to ensure frontend displays match backend tickets.

## Key Regulatory Checks (Frontend)
> **Crucial**: The UI must visually reinforce that **GROUPS** are the legal entity, not just the sum of axles.
*   Display **Group Tolerance (5%)** prominently.
*   Display **GVW Tolerance (0%)** explicitly.
*   Flag **Operational Tolerance (200kg)** as "Warning" (Yellow), not "Legal" (Green).

---

## Regulatory Compliance (Kenya Traffic Act Cap 403 & EAC Act 2016)

### Weight Limits Reference
| Axle Type | Limit (kg) | Tolerance |
|-----------|------------|-----------|
| Single Steering | 7,000 | 5% |
| Single Drive (Dual Tyres) | 10,000 | 5% |
| Tandem (2 axles) | 16,000 | 0% (strict) |
| Tridem (3 axles) | 24,000 | 0% (strict) |
| Maximum GVW | 56,000 | 0% (none) |

### Pavement Damage Factor (PDF)
The PDF is calculated using the **Fourth Power Law**:
```
PDF = (Actual Weight / Permissible Weight)^4
```
Example: 105% of limit = 1.05^4 = 1.2155 (21.55% increased road damage)

### Demerit Points Display (Future Sprint)
| Overload Range | Points | Consequence |
|----------------|--------|-------------|
| 0-2,000 kg | 1 | Warning |
| 2,001-5,000 kg | 2 | Vehicle inspection |
| 5,001-10,000 kg | 3 | License review |
| 10,001-20,000 kg | 5 | 30-day suspension |
| >20,000 kg | 10 | Court prosecution |

---

## KenloadV2 Reference Analysis

Based on the [system comparison audit](../../truload-backend/docs/KENLOAD_VS_TRULOAD_COMPARISON.md), key UI patterns from KenloadV2 to consider:

### Digital LCD Weight Display
KenloadV2 uses a distinctive black background with yellow/green LCD-style font (font-family: "digital-7"). This provides:
- High contrast for outdoor/bright environments
- Clear visual distinction for weight values
- Professional weighbridge aesthetic

**Recommendation:** Implement similar "digital display" component for weight values.

### Audio Alerts (Future Enhancement)
KenloadV2 supports multilingual audio alerts:
- Swahili/English voice selection
- Male/Female voice options
- Vehicle weight announcement
- Overload warnings

**Recommendation:** Consider for Sprint 15+ after core functionality is complete.

### Weight Ticket Format (PDF)
The weight ticket MUST include:
1. **Header:** Organization logo, station name, ticket number, date/time
2. **Section 1:** Individual Axle Load (if applicable)
3. **Section 2:** Axle Group Load (PRIMARY COMPLIANCE CHECK)
4. **Section 3:** Vehicle Load (GVW Summary)
5. **Section 4:** Legal Disclaimer about group vs individual checking
6. **Section 5:** Remedial Action (if overloaded)
7. **Footer:** Operator signature, date

**Critical Note:** Weight tickets must show BOTH individual axles AND group totals to comply with KeNHA/KURA standards.

---

## Component Architecture

### Zustand Store: `useWeighingStore`
```typescript
interface WeighingState {
  // Transaction
  transactionId: string | null;
  ticketNumber: string | null;
  status: 'idle' | 'weighing' | 'captured' | 'compliant' | 'overloaded';

  // Vehicle
  vehicleReg: string;
  axleConfigurationId: string;
  axleConfiguration: AxleConfiguration | null;

  // Weights (from TruConnect)
  liveWeights: number[];  // Real-time from scale
  capturedWeights: WeighingAxle[];  // Locked values

  // Compliance
  groupResults: AxleGroupResult[];
  gvwMeasured: number;
  gvwPermissible: number;
  gvwOverload: number;
  totalFee: number;
  overallStatus: 'LEGAL' | 'WARNING' | 'OVERLOAD';

  // Actions
  initTransaction: () => Promise<void>;
  captureWeights: () => Promise<void>;
  calculateCompliance: () => Promise<void>;
  resetTransaction: () => void;
}
```

### API Integration
```typescript
// POST /api/v1/weighing-transactions
const initTransaction = async (data: InitWeighingRequest) => {
  const response = await apiClient.post('/weighing-transactions', data);
  return response.data;
};

// POST /api/v1/weighing-transactions/{id}/capture-weights
const captureWeights = async (id: string, axles: WeighingAxleRequest[]) => {
  const response = await apiClient.post(`/weighing-transactions/${id}/capture-weights`, { weighingAxles: axles });
  return response.data;
};

// GET /api/v1/weighing-transactions/{id}/compliance
const getCompliance = async (id: string) => {
  const response = await apiClient.get(`/weighing-transactions/${id}/compliance`);
  return response.data;
};
```

---

## Acceptance Criteria

### Functional Requirements
- [ ] Display live weights from TruConnect in real-time
- [ ] Show hierarchical grid with groups and child axles
- [ ] Calculate and display PDF for each group
- [ ] Apply correct tolerance (5% single, 0% group, 0% GVW)
- [ ] Determine overall compliance status
- [ ] Enable/disable action buttons based on state
- [ ] Generate weight ticket PDF via backend API

### Non-Functional Requirements
- [ ] Responsive design (desktop, tablet, mobile)
- [ ] Accessibility (WCAG 2.1 AA compliance)
- [ ] Performance (< 100ms weight update latency)
- [ ] Offline capability (queue transactions when disconnected)

---

---

## Weighing Workflow Steps

The weighing workflow follows a 4-step process for both mobile and multideck modes:

### Step 1: Capture (Entry Point)
**Component:** `CaptureScreen.tsx`

This is the first screen where:
1. **Vehicle plate is entered** (auto via ANPR or manual entry)
2. **Weights are captured** (axle-by-axle for mobile, all-at-once for multideck)
3. **Vehicle images are captured** (front view from ANPR camera, overview camera)

**Key Features:**
- Scale status indicator (connected/disconnected/unstable)
- Auto-acquire mode toggle
- Plate input with ANPR scan button
- Edit plate button (logs audit event when plate is modified after ANPR detection)
- Vehicle placeholder images (SVG placeholders before camera capture)
- Real-time compliance preview grid

**Plate Detection Logic:**
- If ANPR camera is configured, plate is auto-detected and field is disabled
- Edit button enables the field and logs an audit event
- If vehicle exists in database, details are pre-filled on Step 2
- If vehicle is new, a record is created with just the plate number

### Step 2: Vehicle Details
**Component:** `VehicleDetailsCard.tsx` with `AxleGroupVisual.tsx`

Configure vehicle information:
1. **Axle configuration selection** (2A, 3A, 4A, 5A, 6C, 7A, etc.)
2. **Visual axle group configuration** with clickable axle images
3. **Transporter, driver, cargo, origin/destination selection**

**Axle Group Visual:**
- Uses actual axle images: `axle_single.png`, `axle_double.png`, `axle_wide.png`
- Groups shown with letters (A, B, C, D)
- Tyre types: S (Single), D (Double), W (Wide)
- Click to configure group tyre types
- Shows captured/current axle status

### Step 3: Compliance Review
**Component:** `ComplianceGrid.tsx`

Review calculated compliance:
- Full compliance grid with all groups
- PDF (Pavement Damage Factor) calculations
- Tolerance display (5% for single axles, 0% for groups)
- GVW summary with overall status

### Step 4: Decision
**Component:** `DecisionPanel.tsx`

Take action based on compliance:
- **LEGAL:** Print ticket, release vehicle
- **WARNING:** Special release option (within 200kg operational tolerance)
- **OVERLOAD:** Tag vehicle, send to yard, calculate fees

---

## New Component Reference

### VehiclePlaceholderImage
**Path:** `src/components/weighing/VehiclePlaceholderImage.tsx`

Displays placeholder SVG or actual captured image for:
- `frontView`: Vehicle front with license plate area (ANPR camera)
- `overView`: Full vehicle overview (overview camera)

**Props:**
```typescript
interface VehiclePlaceholderImageProps {
  type: 'frontView' | 'overView';
  imageUrl?: string;
  plateNumber?: string;
  isLoading?: boolean;
  className?: string;
  onCapture?: () => void;
}
```

### AxleGroupVisual
**Path:** `src/components/weighing/AxleGroupVisual.tsx`

Visual representation of axle groups using actual axle images.

**Props:**
```typescript
interface AxleGroupVisualProps {
  configCode: string;
  totalAxles: number;
  axleReferences: AxleWeightReference[];
  groupWeights?: Record<string, number>;
  capturedAxles?: number[];
  currentAxle?: number;
  onAxleClick?: (axleNumber: number) => void;
  onConfigureGroup?: (groupLabel: string, newRefs: AxleWeightReference[]) => void;
}
```

**Default Configurations:**
- `2A`: 2 axles (A: 1 axle, B: 1 axle)
- `3A`: 3 axles (A: 1 axle, B: 2 axles)
- `4A`: 4 axles (A: 1 axle, B: 1 axle, C: 2 axles)
- `5A`: 5 axles (A: 1 axle, B: 2 axles, C: 2 axles)
- `6C`: 6 axles (A: 1 axle, B: 2 axles, C: 3 axles)
- `7A`: 7 axles (A: 1 axle, B: 2 axles, C: 2 axles, D: 2 axles)

### CaptureScreen
**Path:** `src/components/weighing/CaptureScreen.tsx`

Main Step 1 component for both mobile and multideck modes.

**Props:**
```typescript
interface CaptureScreenProps {
  mode: 'mobile' | 'multideck';
  vehiclePlate: string;
  onVehiclePlateChange: (value: string) => void;
  isPlateDisabled?: boolean;
  onScanPlate?: () => void;
  onEditPlate?: () => void;
  autoAcquire?: boolean;
  onAutoAcquireChange?: (value: boolean) => void;
  // Mobile mode props
  currentWeight?: number;
  currentAxle?: number;
  totalAxles?: number;
  capturedAxles?: number[];
  onCaptureAxle?: () => void;
  onResetCapture?: () => void;
  onAxleSelect?: (axle: number) => void;
  // Multideck mode props
  deckWeights?: DeckWeight[];
  onCaptureAll?: () => void;
  // ... additional props
}
```

---

## Image Assets

Located in `public/images/weighiging/`:

| Image | Description | Usage |
|-------|-------------|-------|
| `axle_single.png` | Single tyre axle | Steering axles, light axles |
| `axle_double.png` | Double (dual) tyre axle | Drive axles, tandem groups |
| `axle_wide.png` | Wide tyre axle | Heavy-duty configurations |
| `truck_*.png` | Vehicle type illustrations | Config selection UI |

---

## Step Order Change (Jan 2026)

**Previous Order:** Vehicle Details → Capture → Compliance → Decision

**New Order:** Capture → Vehicle Details → Compliance → Decision

**Rationale:**
1. Vehicle plate is captured first (via ANPR or manual entry)
2. If vehicle exists, details are pre-filled automatically
3. If new vehicle, only plate is stored; details added on Step 2
4. This matches the real-world workflow where vehicles arrive and are identified first

**Code Reference:** `src/lib/weighing-utils.ts:WEIGHING_STEPS`

---

## FRD Alignment (Master-FRD-KURAWEIGH.md)

### Workflow Screens as per FRD

The FRD defines three main screens in the weighing process:

#### Screen A - Vehicle Details
- Vehicle registration/Number Plate (auto-captured by ANPR cameras if integrated)
- Relief truck linking (if weighing to relieve an overloaded truck)
- Auto-pull Vehicle Owner, Make, Model from vehicle search API
- Axle Configuration (auto-detected for consecutive weighing)
- Front View & Overview images from integrated cameras

#### Screen B - Weight Capture
- Weight captured axle by axle depending on axle configuration
- Assign weight button for each axle until completion
- Limits checked based on axle limits and GVW calculated
- Excess shown next to each axle or GVW value
- ACT or permit applied for compliance check
- Additional details: Permit, Transporter, Driver, Cargo, Origin, Destination, Route

#### Screen C - Exit/Send to Yard
- Compliant vehicles or within tolerance limits → Exit
- Non-compliant vehicles → Send to Yard (triggers case register entry)
- Tag pop-up shown if vehicle has open tag from KeNHA or KURA
- Special release option for auto-tags with valid reason
- Manual tags that bar vehicle → Send to Yard

### Key FRD Requirements Implementation

| FRD Requirement | TruLoad Implementation |
|-----------------|----------------------|
| ANPR auto-capture | `onScanPlate` prop on CaptureScreen triggers ANPR scan |
| Plate edit logging | `onEditPlate` prop logs audit event before enabling edit |
| First-time vehicle prefill | `useWeighing` hook checks if vehicle exists, prefills if found |
| New vehicle creation | API creates vehicle with just plate number on first weighing |
| Auto-detect for consecutive weighing | Backend stores and returns previous config for same vehicle |
| Permit compliance check | Permit lookup integrated in VehicleDetailsCard |
| Tag pop-up on exit | DecisionPanel shows tag alerts before exit |
| Scale test requirement | CaptureScreen shows `isScaleTestRequired` flag |
| Calibration certificate check | Backend validates calibration before allowing weighing |

### Available Image Assets

Located in `public/images/weighiging/`:

| Image | Description | Usage |
|-------|-------------|-------|
| `axle_single.png` | Single tyre axle | Steering axles, Group A typically |
| `axle_double.png` | Double (dual) tyre axle | Drive axles, tandem/tridem groups |
| `axle_wide.png` | Wide tyre axle | Heavy-duty super single configurations |
| `connected.png` | Scale connected status | Scale info panel when online |
| `onescaleoff.png` | One scale offline | Scale info panel partial connection |
| `mobile_scaleoff.png` | Mobile scale offline | Mobile mode scale status |
| `button.png` | Action button style | Weighing action buttons |
| `redbutton.jpg` | Alert/stop button | Stop/emergency actions |
| `tagged.png` | Tagged vehicle indicator | Tag status on vehicle |
| `truckcalledin.jpg` | Truck called in | Vehicle entry indicator |
| `truckpass.jpg` | Truck passing | Vehicle in motion indicator |

Located in `public/images/logos/`:

| Image | Description | Usage |
|-------|-------------|-------|
| `kuraweigh-logo.png` | KURAWEIGH logo | App branding, headers |
| `kura-logo.png` | KURA logo | Official headers, documents |
| `court-of-arms-kenya.png` | Kenya coat of arms | Official documents |
| `kenha-logo.png` | KeNHA logo | KeNHA integration UI |
| `eac-act-logo.png` | EAC Act logo | EAC compliance documents |
| `kenya-police-logo.png` | Kenya Police logo | Prosecution documents |
| `judiciallogo.png` | Judicial logo | Court documents |

### KenloadV2 Reference Points

From analysis of `KenloadV2UIUpgrade/src/components/widgets/weigh/vehicledetailsform.vue`:

1. **Axle Group Configuration Table**:
   - 4 groups (A, B, C, D) with up to 14 axle positions
   - Clickable axle images to change tyre type (S, D, W)
   - Shows axle group labels below each image
   - Dynamic update of permissible weights based on config

2. **Weight Display**:
   - Black background with yellow text for weight readings
   - Real-time weight streaming from scale
   - Separate displays for mobile (axle-by-axle) and multideck (all decks)

3. **Vehicle Details**:
   - Auto-detection from transit/NTSA API
   - Manual entry with add buttons for new entries
   - Linked transporter, driver, cargo, origin, destination

### API Endpoints (from lib/api/weighing.ts)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/Vehicle/reg/{regNo}` | GET | Lookup vehicle by plate |
| `/api/v1/Vehicle` | POST | Create new vehicle |
| `/api/v1/Vehicle/{id}` | PUT | Update vehicle details |
| `/api/v1/weighing-transactions` | POST | Create weighing transaction |
| `/api/v1/weighing-transactions/{id}/capture-weights` | POST | Capture axle weights |
| `/api/v1/weighing-transactions/reweigh` | POST | Initiate reweigh cycle |
| `/api/v1/Driver/search` | GET | Search drivers |
| `/api/v1/Transporter/search` | GET | Search transporters |
| `/api/v1/CargoTypes` | GET | Get cargo types |
| `/api/v1/OriginsDestinations` | GET | Get origins/destinations |

---

**Document Version:** 4.0
**Last Updated:** January 23, 2026
**Based On:**
- [KenloadV2 vs TruLoad Comparison](../../truload-backend/docs/KENLOAD_VS_TRULOAD_COMPARISON.md)
- [Master-FRD-KURAWEIGH.md](../../resources/Master-FRD-KURAWEIGH.md)
