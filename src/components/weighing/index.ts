// Shared UI Components (from landing page)
export { SearchInput } from './SearchInput';
export { ComplianceBadge, StatusBadge, WeighingTypeBadge } from './StatusBadge';
export type { ComplianceStatus as StatusBadgeComplianceStatus, TagStatus, VehicleStatus, WeighingStatus } from './StatusBadge';
export { SummaryCard } from './SummaryCard';

// Weighing Workflow Components
export { ComplianceGrid } from './ComplianceGrid';
export { DecisionPanel } from './DecisionPanel';
export {
    AxleProgress, MobileWeightDisplay,
    MultideckWeightDisplay
} from './DigitalWeightDisplay';
export { VehicleDetailsCard } from './VehicleDetailsCard';
export { WeighingPageHeader } from './WeighingPageHeader';
export { WeighingStepper } from './WeighingStepper';
export { WeighingStepperNav } from './WeighingStepperNav';
export type { StepDef } from './WeighingStepperNav';

// Step 1: Capture Components
export { AxleGroupVisual, getDefaultAxleConfig } from './AxleGroupVisual';
export { LocationConfigCard } from './LocationConfigCard';
export { MiddlewarePrompt } from './MiddlewarePrompt';
export { VehiclePlaceholderImage } from './VehiclePlaceholderImage';

// Step 2: Axle Configuration & Weight Capture Components
export { AxleConfigurationCard } from './AxleConfigurationCard';
export { CompactMultideckWeights, MultideckWeightsCard } from './MultideckWeightsCard';
export { WeightCaptureCard } from './WeightCaptureCard';

// Compliance Components
export { AllowableExcessBanner, CompactComplianceBadge, ComplianceBanner } from './ComplianceBanner';
export { ComplianceTable } from './ComplianceTable';

// Scale & Weight Components
export { ScaleCard, ScaleHealthPanel } from './ScaleHealthPanel';
export type { ScaleCardProps, ScaleInfo } from './ScaleHealthPanel';
export {
  ScaleTestBanner,
  SCALE_TEST_SUCCESS_DESCRIPTION,
  SCALE_TEST_SUCCESS_MESSAGE,
} from './ScaleTestBanner';
export { ScaleTestHistoryTab } from './ScaleTestHistoryTab';
export { WeightConfirmationModal } from './WeightConfirmationModal';

// Image Capture Components
export { ImageCaptureCard } from './ImageCaptureCard';

// Modals (Entity CRUD)
export { CargoTypeModal } from './modals/CargoTypeModal';
export { DriverModal } from './modals/DriverModal';
export { EntityModal } from './modals/EntityModal';
export type { ModalMode } from './modals/EntityModal';
export { OriginDestinationModal } from './modals/OriginDestinationModal';
export { TransporterModal } from './modals/TransporterModal';
export { VehicleMakeModal } from './modals/VehicleMakeModal';
export { VehicleModelModal } from './modals/VehicleModelModal';

// Shared Step Components
export { WeighingCaptureStep } from './steps/WeighingCaptureStep';
export { WeighingDecisionStep } from './steps/WeighingDecisionStep';
export { WeighingVehicleStep } from './steps/WeighingVehicleStep';

// Commercial Weighing Components
export { CommercialWeighingStepper } from './CommercialWeighingStepper';
export { CommercialEntitySelectors } from './CommercialEntitySelectors';
export { CommercialNetWeightDisplay } from './CommercialNetWeightDisplay';
export { CommercialFirstWeightStep } from './steps/CommercialFirstWeightStep';
export { CommercialSecondWeightStep } from './steps/CommercialSecondWeightStep';
export { CommercialTicketStep } from './steps/CommercialTicketStep';

