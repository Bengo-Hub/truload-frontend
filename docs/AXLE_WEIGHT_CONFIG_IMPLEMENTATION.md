# Axle Weight Configuration Interface - Frontend Implementation

This document guides frontend developers implementing the AxleWeightConfig form shown in the Figma designs.

## Component Architecture

```
AxleConfigurationPage
├── AxleConfigurationForm (parent creation/edit)
│   └── AxleConfigurationFields
│
└── AxleWeightConfigGrid (child management)
    ├── AxleWeightConfigRow (each position: 1, 2, 3, etc.)
    │   ├── DeckPositionInput (1-N, auto-populated, read-only)
    │   ├── PermissibleGroupingSelect (A/B/C/D dropdown)
    │   ├── TyreTypeSelect (S, D, W, etc. dropdown from lookup)
    │   ├── AxleGroupSelect (SA4, SA6, TAG8, etc. dropdown from lookup)
    │   ├── PermissibleAxleWeightInput (kg value, validated)
    │   ├── PermissibleGVWDisplay (read-only, from parent config)
    │   └── ActionButtons (save, edit, delete)
    │
    └── AddWeightConfigRow (empty row for adding new)
```

## Form Fields Mapping

| Figma Form Label | Frontend Variable | Backend Field | Type | Validation |
|---|---|---|---|---|
| Deck Position | deckPosition | axlePosition | number | 1 to axleNumber (auto) |
| Permissible Grouping | permissibleGrouping | axleGrouping | select | A, B, C, D |
| Tyre Type | tyreType | tyreTypeId | select | Optional, must exist |
| Axle Group | axleGroup | axleGroupId | select | Required, must exist |
| Permissible Axle [KG] | permissibleAxleKg | axleLegalWeightKg | number | 1-15000, ≤ GVW |
| Permissible GVW [KG] | permissibleGvwKg | gvwPermissibleKg (parent) | number | Read-only display |

## State Management Flow

### Initial Load
```typescript
// 1. Select or create parent AxleConfiguration
const [config, setConfig] = useState<AxleConfiguration | null>(null);

// 2. Load configuration-specific master data
useEffect(() => {
  if (config?.id) {
    fetchConfigurationLookup(config.id).then(setLookupData);
  }
}, [config?.id]);

// 3. Load existing weight references for this config
useEffect(() => {
  if (config?.id) {
    fetchWeightReferences(config.id).then(setWeightReferences);
  }
}, [config?.id]);

// Result: lookup data (tyre types, axle groups, positions) + existing weight refs
```

### Form State for Single Weight Reference
```typescript
interface WeightReferenceFormState {
  axleConfigurationId: string;    // From parent config
  axlePosition: number;            // 1 to axleNumber
  axleLegalWeightKg: number;       // User input, 1-15000
  axleGrouping: "A" | "B" | "C" | "D";  // User selection
  axleGroupId: string;             // User selection from dropdown
  tyreTypeId?: string;             // Optional user selection
}

// Initialize for position 1
const emptyRow: WeightReferenceFormState = {
  axleConfigurationId: config.id,
  axlePosition: 1,
  axleLegalWeightKg: 0,
  axleGrouping: "A",
  axleGroupId: "",
  tyreTypeId: undefined
};
```

## Data Binding Implementation

### Populating Dropdowns

```typescript
// Grouping Dropdown (Static)
const groupingOptions = [
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
  { value: "D", label: "D" }
];

// Tyre Type Dropdown (Dynamic from lookup)
const tyreTypeOptions = lookupData.tyreTypes.map(t => ({
  value: t.id,
  label: `${t.code} - ${t.name}` // e.g., "S - Single Tyre"
}));

// Axle Group Dropdown (Dynamic from lookup)
const axleGroupOptions = lookupData.axleGroups.map(g => ({
  value: g.id,
  label: `${g.code} - ${g.name}` // e.g., "S1 - Single Axle Front"
}));

// Deck Position Dropdown (Dynamic based on axle count)
const positionOptions = Array.from({ length: config.axleNumber }, (_, i) => ({
  value: i + 1,
  label: `Position ${i + 1}`
}));
```

### Binding to Form Inputs

```tsx
<form>
  {/* Deck Position - Auto-populated or selected */}
  <select 
    value={formState.axlePosition}
    onChange={(e) => setFormState({...formState, axlePosition: Number(e.target.value)})}
    disabled={isEditingMode} // Cannot change position after creation
  >
    {positionOptions.map(opt => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>

  {/* Permissible Grouping */}
  <select
    value={formState.axleGrouping}
    onChange={(e) => setFormState({...formState, axleGrouping: e.target.value})}
    required
  >
    <option value="">-- Select Grouping --</option>
    {groupingOptions.map(opt => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>

  {/* Tyre Type */}
  <select
    value={formState.tyreTypeId || ""}
    onChange={(e) => setFormState({...formState, tyreTypeId: e.target.value || undefined})}
  >
    <option value="">-- No Selection (Optional) --</option>
    {tyreTypeOptions.map(opt => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>

  {/* Axle Group */}
  <select
    value={formState.axleGroupId}
    onChange={(e) => setFormState({...formState, axleGroupId: e.target.value})}
    required
  >
    <option value="">-- Select Axle Group --</option>
    {axleGroupOptions.map(opt => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>

  {/* Permissible Axle Weight */}
  <input
    type="number"
    min="1"
    max="15000"
    step="100"
    value={formState.axleLegalWeightKg}
    onChange={(e) => setFormState({...formState, axleLegalWeightKg: Number(e.target.value)})}
    placeholder="e.g., 6000"
    required
  />

  {/* Permissible GVW - Read-only Display */}
  <input
    type="number"
    value={config.gvwPermissibleKg}
    disabled
    readOnly
  />
</form>
```

## Client-Side Validation

```typescript
interface ValidationError {
  field: string;
  message: string;
}

function validateWeightReferenceForm(
  formState: WeightReferenceFormState,
  config: AxleConfiguration,
  existingReferences: AxleWeightReference[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  // 1. Position validation
  if (formState.axlePosition < 1 || formState.axlePosition > config.axleNumber) {
    errors.push({
      field: "axlePosition",
      message: `Position must be between 1 and ${config.axleNumber}`
    });
  }

  // 2. Position uniqueness (in unsaved rows)
  const positionExists = existingReferences.some(
    r => r.axlePosition === formState.axlePosition && r.id !== formState.id
  );
  if (positionExists) {
    errors.push({
      field: "axlePosition",
      message: `Position ${formState.axlePosition} already has a specification`
    });
  }

  // 3. Weight range validation
  if (formState.axleLegalWeightKg <= 0 || formState.axleLegalWeightKg > 15000) {
    errors.push({
      field: "axleLegalWeightKg",
      message: "Weight must be between 1 and 15,000 kg"
    });
  }

  // 4. Weight vs GVW validation
  if (formState.axleLegalWeightKg > config.gvwPermissibleKg) {
    errors.push({
      field: "axleLegalWeightKg",
      message: `Weight cannot exceed GVW limit of ${config.gvwPermissibleKg} kg`
    });
  }

  // 5. Grouping validation
  if (!["A", "B", "C", "D"].includes(formState.axleGrouping)) {
    errors.push({
      field: "axleGrouping",
      message: "Grouping must be A, B, C, or D"
    });
  }

  // 6. Required field validation
  if (!formState.axleGroupId) {
    errors.push({
      field: "axleGroupId",
      message: "Axle Group is required"
    });
  }

  return errors;
}
```

## API Integration

### Creating a New Weight Reference

```typescript
async function createWeightReference(
  formState: WeightReferenceFormState,
  token: string
): Promise<{ success: boolean; data?: AxleWeightReference; errors?: string[] }> {
  try {
    const response = await fetch("/api/v1/AxleWeightReferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formState)
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    }

    // Handle validation errors
    if (response.status === 400) {
      const errorData = await response.json();
      return { 
        success: false, 
        errors: errorData.errors || ["Validation failed"]
      };
    }

    // Handle conflict (position already exists)
    if (response.status === 409) {
      return { 
        success: false, 
        errors: ["Position already has a weight specification"]
      };
    }

    // Handle not found
    if (response.status === 404) {
      return { 
        success: false, 
        errors: ["Configuration not found"]
      };
    }

    throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "Unknown error"]
    };
  }
}
```

### Updating an Existing Weight Reference

```typescript
async function updateWeightReference(
  id: string,
  formState: WeightReferenceFormState,
  token: string
): Promise<{ success: boolean; data?: AxleWeightReference; errors?: string[] }> {
  try {
    const response = await fetch(`/api/v1/AxleWeightReferences/${id}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...formState,
        isActive: true  // Ensure record stays active
      })
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    }

    if (response.status === 400) {
      const errorData = await response.json();
      return { 
        success: false, 
        errors: errorData.errors || ["Validation failed"]
      };
    }

    if (response.status === 404) {
      return { 
        success: false, 
        errors: ["Weight reference not found"]
      };
    }

    throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "Unknown error"]
    };
  }
}
```

### Deleting a Weight Reference

```typescript
async function deleteWeightReference(
  id: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/v1/AxleWeightReferences/${id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (response.ok || response.status === 204) {
      return { success: true };
    }

    if (response.status === 404) {
      return { 
        success: false, 
        error: "Weight reference not found"
      };
    }

    throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
```

## Complete Workflow Example

```typescript
async function handleSaveWeightConfig(
  config: AxleConfiguration,
  formState: WeightReferenceFormState,
  isEditMode: boolean,
  token: string
) {
  // Step 1: Client-side validation
  const validationErrors = validateWeightReferenceForm(
    formState,
    config,
    weightReferences
  );

  if (validationErrors.length > 0) {
    displayValidationMessages(validationErrors);
    return;
  }

  // Step 2: API call (create or update)
  const result = isEditMode
    ? await updateWeightReference(formState.id!, formState, token)
    : await createWeightReference(formState, token);

  // Step 3: Handle response
  if (result.success && result.data) {
    // Update local state
    if (isEditMode) {
      setWeightReferences(prevRefs =>
        prevRefs.map(r => r.id === result.data!.id ? result.data! : r)
      );
    } else {
      setWeightReferences(prevRefs => [...prevRefs, result.data!]);
    }

    // Clear form
    resetForm();

    // Show success message
    showSuccessNotification(
      isEditMode 
        ? `Position ${result.data.axlePosition} updated` 
        : `Position ${result.data.axlePosition} added`
    );
  } else {
    // Display backend validation errors
    displayErrorMessages(result.errors || ["Save failed"]);
  }
}
```

## Tips for Frontend Developers

### Do's
- ✓ Validate position is not already used before showing add button for that position
- ✓ Disable position dropdown when editing existing weight reference
- ✓ Show GVW limit prominently to guide user on weight input
- ✓ Display validation errors next to each field
- ✓ Require user confirmation before deleting weight reference
- ✓ Show loading state during API calls
- ✓ Disable form inputs while saving
- ✓ Refresh weight references after each operation

### Don'ts
- ✗ Don't allow creating weight ref without parent config selected
- ✗ Don't allow position outside 1-to-AxleNumber range
- ✗ Don't skip validation—backend will reject invalid data anyway
- ✗ Don't modify read-only fields (GVW, AxleCode)
- ✗ Don't retry failed requests more than 3 times
- ✗ Don't expose raw error messages from API—format them for UX

### Performance
- Cache lookup data with 1-hour expiry
- Debounce weight input validation (250ms)
- Use virtualization if grid has > 50 weight references
- Lazy-load configuration details

### Accessibility
- Label all form inputs with `<label>`
- Use `aria-invalid` on fields with errors
- Provide keyboard navigation (Tab, Enter, Escape)
- Announce async operations with `aria-busy`
- Test with screen readers (NVDA, JAWS)

---

## References
- API Documentation: See AXLE_CONFIGURATION_API.md
- Figma Design: [Link to AxleWeightConfig component]
- Backend Validation: FluentValidation rules in AxleWeightReferenceValidator.cs
