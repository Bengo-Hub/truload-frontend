// Shared UI Components (from landing page)
export { StatusBadge, ComplianceBadge, WeighingTypeBadge } from './StatusBadge';
export type { WeighingStatus, VehicleStatus, TagStatus, ComplianceStatus as StatusBadgeComplianceStatus } from './StatusBadge';
export { SummaryCard } from './SummaryCard';
export { SearchInput } from './SearchInput';

// Weighing Workflow Components
export { WeighingStepper } from './WeighingStepper';
export { ComplianceGrid } from './ComplianceGrid';
export { DecisionPanel } from './DecisionPanel';
export { VehicleDetailsCard } from './VehicleDetailsCard';
export { WeighingPageHeader } from './WeighingPageHeader';
export {
  MobileWeightDisplay,
  MultideckWeightDisplay,
  AxleProgress,
} from './DigitalWeightDisplay';

// Step 1: Capture Components
export { CaptureScreen } from './CaptureScreen';
export { VehiclePlaceholderImage } from './VehiclePlaceholderImage';
export { AxleGroupVisual, getDefaultAxleConfig } from './AxleGroupVisual';

// Step 2: Axle Configuration & Weight Capture Components
export { AxleConfigurationCard } from './AxleConfigurationCard';
export { WeightCaptureCard } from './WeightCaptureCard';
export { MultideckWeightsCard, CompactMultideckWeights } from './MultideckWeightsCard';

// Compliance Components
export { ComplianceTable } from './ComplianceTable';
export { ComplianceBanner, CompactComplianceBadge, AllowableExcessBanner } from './ComplianceBanner';

// Scale & Weight Components
export { ScaleHealthPanel } from './ScaleHealthPanel';
export type { ScaleInfo } from './ScaleHealthPanel';
export { ScaleTestBanner } from './ScaleTestBanner';
export { ScaleTestHistoryTab } from './ScaleTestHistoryTab';
export { WeightConfirmationModal } from './WeightConfirmationModal';

// Image Capture Components
export { ImageCaptureCard } from './ImageCaptureCard';

// Modals (Entity CRUD)
export { VehicleMakeModal } from './modals/VehicleMakeModal';
export { VehicleModelModal } from './modals/VehicleModelModal';
export { TransporterModal } from './modals/TransporterModal';
export { OriginDestinationModal } from './modals/OriginDestinationModal';
export { DriverModal } from './modals/DriverModal';
export { CargoTypeModal } from './modals/CargoTypeModal';
export { EntityModal } from './modals/EntityModal';
export type { ModalMode } from './modals/EntityModal';
