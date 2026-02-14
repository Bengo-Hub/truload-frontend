"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AxleConfiguration,
} from '@/types/weighing';
import {
  CargoType,
  Driver,
  OriginDestination,
  Transporter,
  Vehicle,
} from '@/lib/api/weighing';
import { cn } from '@/lib/utils';
import { Eye, Locate, MapPin, Package, Pencil, Plus, RefreshCw, Scan, Truck, User, Building2, FileText, Car } from 'lucide-react';

// Vehicle makes list
const VEHICLE_MAKES = [
  'ISUZU', 'HINO', 'SCANIA', 'VOLVO', 'MAN', 'MERCEDES', 'DAF', 'RENAULT',
  'IVECO', 'FUSO', 'UD TRUCKS', 'TATA', 'ASHOK LEYLAND', 'EICHER', 'OTHER',
];

interface SelectFieldWithCrudProps {
  label: string;
  icon?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string; sublabel?: string }[];
  placeholder: string;
  isReadOnly?: boolean;
  onAdd?: () => void;
  onEdit?: () => void;
  onView?: () => void;
  onRefresh?: () => void;
  required?: boolean;
}

/**
 * SelectFieldWithCrud - Reusable select field with Add/Edit/View buttons
 */
function SelectFieldWithCrud({
  label,
  icon,
  value,
  onChange,
  options,
  placeholder,
  isReadOnly = false,
  onAdd,
  onEdit,
  onView,
  onRefresh,
  required = false,
}: SelectFieldWithCrudProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
        {icon}
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="flex gap-2">
        <Select value={value} onValueChange={onChange} disabled={isReadOnly}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                <span className="font-medium">{option.label}</span>
                {option.sublabel && (
                  <span className="text-gray-500 ml-2 text-xs">- {option.sublabel}</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!isReadOnly && (
          <div className="flex gap-1">
            {onRefresh && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onRefresh}
                title={`Refresh ${label.toLowerCase()} list`}
                className="h-10 w-10"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            {onAdd && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onAdd}
                title={`Add new ${label.toLowerCase()}`}
                className="h-10 w-10"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
            {onEdit && value && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onEdit}
                title={`Edit selected ${label.toLowerCase()}`}
                className="h-10 w-10"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {onView && value && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onView}
                title={`View selected ${label.toLowerCase()}`}
                className="h-10 w-10"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface VehicleDetailsCardProps {
  // Vehicle
  vehiclePlate: string;
  onVehiclePlateChange: (value: string) => void;
  selectedVehicleId?: string;
  onVehicleIdChange?: (value: string) => void;
  vehicles?: Vehicle[];

  // Axle Configuration
  selectedConfig: string;
  onConfigChange: (value: string) => void;
  axleConfigurations?: AxleConfiguration[];

  // Driver
  selectedDriverId?: string;
  onDriverIdChange?: (value: string) => void;
  drivers?: Driver[];
  driverName?: string;
  onDriverNameChange?: (value: string) => void;

  // Transporter
  selectedTransporterId?: string;
  onTransporterIdChange?: (value: string) => void;
  transporters?: Transporter[];

  // Cargo
  selectedCargoId?: string;
  onCargoIdChange?: (value: string) => void;
  cargoTypes?: CargoType[];

  // Origin/Destination
  selectedOriginId?: string;
  onOriginIdChange?: (value: string) => void;
  selectedDestinationId?: string;
  onDestinationIdChange?: (value: string) => void;
  locations?: OriginDestination[];
  /** Suggested origin based on geolocation */
  suggestedOriginId?: string;
  /** Callback to request geolocation */
  onRequestGeolocation?: () => void;
  /** Whether geolocation is loading */
  isGeoLoading?: boolean;
  /** Distance text for suggested origin */
  suggestedOriginDistance?: string;

  // Permit & Additional Fields
  permitNo?: string;
  onPermitNoChange?: (value: string) => void;
  onViewPermit?: () => void;
  trailerNo?: string;
  onTrailerNoChange?: (value: string) => void;
  vehicleMake?: string;
  onVehicleMakeChange?: (value: string) => void;
  reliefVehicleReg?: string;
  onReliefVehicleRegChange?: (value: string) => void;
  comment?: string;
  onCommentChange?: (value: string) => void;

  // Modal handlers
  onAddVehicle?: () => void;
  onEditVehicle?: () => void;
  onViewVehicle?: () => void;
  onAddDriver?: () => void;
  onEditDriver?: () => void;
  onViewDriver?: () => void;
  onAddTransporter?: () => void;
  onEditTransporter?: () => void;
  onViewTransporter?: () => void;
  onAddCargoType?: () => void;
  onEditCargoType?: () => void;
  onViewCargoType?: () => void;
  onAddLocation?: () => void;
  onAddOriginLocation?: () => void;
  onAddDestinationLocation?: () => void;
  onEditOrigin?: () => void;
  onViewOrigin?: () => void;
  onEditDestination?: () => void;
  onViewDestination?: () => void;
  onAddVehicleMake?: () => void;
  // Refresh handlers for manual refetch
  onRefreshDrivers?: () => void;
  onRefreshTransporters?: () => void;
  onRefreshCargoTypes?: () => void;
  onRefreshLocations?: () => void;

  // Other
  onScanANPR?: () => void;
  showExtendedDetails?: boolean;
  showPermitSection?: boolean;
  isReadOnly?: boolean;
  className?: string;
  compact?: boolean;
}

/**
 * VehicleDetailsCard - Vehicle information capture with CRUD buttons
 *
 * Captures all fields from WeighingTransaction that relate to vehicle details:
 * - Vehicle (RegNo, Make, Model from selected vehicle)
 * - Driver
 * - Transporter
 * - Cargo Type
 * - Origin / Destination
 * - Axle Configuration
 *
 * Each select field has Add/Edit/View buttons for inline CRUD via modals.
 * Used in Step 1 of the weighing workflow.
 */
export function VehicleDetailsCard({
  vehiclePlate,
  onVehiclePlateChange,
  selectedVehicleId,
  onVehicleIdChange,
  vehicles = [],
  selectedConfig,
  onConfigChange,
  axleConfigurations = [],
  selectedDriverId,
  onDriverIdChange,
  drivers = [],
  driverName,
  onDriverNameChange,
  selectedTransporterId,
  onTransporterIdChange,
  transporters = [],
  selectedCargoId,
  onCargoIdChange,
  cargoTypes = [],
  selectedOriginId,
  onOriginIdChange,
  selectedDestinationId,
  onDestinationIdChange,
  locations = [],
  suggestedOriginId,
  onRequestGeolocation,
  isGeoLoading = false,
  suggestedOriginDistance,
  permitNo,
  onPermitNoChange,
  onViewPermit,
  trailerNo,
  onTrailerNoChange,
  vehicleMake,
  onVehicleMakeChange,
  reliefVehicleReg,
  onReliefVehicleRegChange,
  comment,
  onCommentChange,
  onAddVehicle,
  onEditVehicle,
  onViewVehicle,
  onAddDriver,
  onEditDriver,
  onViewDriver,
  onAddTransporter,
  onEditTransporter,
  onViewTransporter,
  onAddCargoType,
  onEditCargoType,
  onViewCargoType,
  onAddLocation,
  onAddOriginLocation,
  onAddDestinationLocation,
  onEditOrigin,
  onViewOrigin,
  onEditDestination,
  onViewDestination,
  onAddVehicleMake,
  onRefreshDrivers,
  onRefreshTransporters,
  onRefreshCargoTypes,
  onRefreshLocations,
  onScanANPR,
  showExtendedDetails = true,
  showPermitSection = false,
  isReadOnly = false,
  className,
  _compact = false,
}: VehicleDetailsCardProps) {
  // Default axle configs if not provided (matching backend AxleConfigurationResponseDto)
  const configs = axleConfigurations.length > 0
    ? axleConfigurations
    : [
        { id: '6c', axleCode: '6C', axleName: '6C', description: '6 Axles Semi-Trailer', axleNumber: 6, gvwPermissibleKg: 48000, isStandard: true, legalFramework: 'BOTH', isActive: true, createdAt: '', updatedAt: '', weightReferenceCount: 0 },
        { id: '5a', axleCode: '5A', axleName: '5A', description: '5 Axles', axleNumber: 5, gvwPermissibleKg: 44000, isStandard: true, legalFramework: 'BOTH', isActive: true, createdAt: '', updatedAt: '', weightReferenceCount: 0 },
        { id: '4a', axleCode: '4A', axleName: '4A', description: '4 Axles', axleNumber: 4, gvwPermissibleKg: 35000, isStandard: true, legalFramework: 'BOTH', isActive: true, createdAt: '', updatedAt: '', weightReferenceCount: 0 },
        { id: '3a', axleCode: '3A', axleName: '3A', description: '3 Axles', axleNumber: 3, gvwPermissibleKg: 28000, isStandard: true, legalFramework: 'BOTH', isActive: true, createdAt: '', updatedAt: '', weightReferenceCount: 0 },
        { id: '2a', axleCode: '2A', axleName: '2A', description: '2 Axles', axleNumber: 2, gvwPermissibleKg: 18000, isStandard: true, legalFramework: 'BOTH', isActive: true, createdAt: '', updatedAt: '', weightReferenceCount: 0 },
      ] as AxleConfiguration[];

  // Get selected vehicle details for display
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  return (
    <Card className={cn('border border-gray-200 rounded-xl', className)}>
      <CardHeader className="pb-3 pt-5 px-6">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Truck className="h-5 w-5 text-gray-500" />
          Vehicle Details
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 space-y-4">
        {/* Registration Number Section */}
        <div className="space-y-2">
          <Label htmlFor="vehiclePlate" className="text-sm font-medium text-gray-700">
            Registration Number <span className="text-red-500">*</span>
          </Label>
          <div className="flex gap-2">
            <Input
              id="vehiclePlate"
              placeholder="KAA 123A"
              value={vehiclePlate}
              onChange={(e) => onVehiclePlateChange(e.target.value.toUpperCase())}
              className="font-mono text-lg uppercase tracking-wider flex-1"
              disabled={isReadOnly}
            />
            {onScanANPR && !isReadOnly && (
              <Button variant="outline" size="icon" onClick={onScanANPR} title="Scan with ANPR">
                <Scan className="h-4 w-4" />
              </Button>
            )}
            {onAddVehicle && !isReadOnly && (
              <Button variant="outline" size="icon" onClick={onAddVehicle} title="Add new vehicle">
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Vehicle Selection (if vehicles are provided) */}
        {vehicles.length > 0 && onVehicleIdChange && (
          <SelectFieldWithCrud
            label="Select Vehicle"
            icon={<Truck className="h-4 w-4 text-gray-400" />}
            value={selectedVehicleId || ''}
            onChange={onVehicleIdChange}
            options={vehicles.map(v => ({
              id: v.id,
              label: v.regNo,
              sublabel: v.makeModel || undefined,
            }))}
            placeholder="Search existing vehicle"
            isReadOnly={isReadOnly}
            onEdit={selectedVehicleId ? onEditVehicle : undefined}
            onView={selectedVehicleId ? onViewVehicle : undefined}
          />
        )}

        {/* Selected Vehicle Details Display */}
        {selectedVehicle && (
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <div className="grid grid-cols-2 gap-2 text-gray-600">
              {selectedVehicle.makeModel && (
                <div>
                  <span className="text-gray-400">Make/Model:</span>{' '}
                  <span className="font-medium text-gray-900">{selectedVehicle.makeModel}</span>
                </div>
              )}
              {selectedVehicle.vehicleType && (
                <div>
                  <span className="text-gray-400">Type:</span>{' '}
                  <span className="font-medium text-gray-900">{selectedVehicle.vehicleType}</span>
                </div>
              )}
              {selectedVehicle.tareWeight && (
                <div>
                  <span className="text-gray-400">Tare Weight:</span>{' '}
                  <span className="font-medium text-gray-900">{selectedVehicle.tareWeight} kg</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Permit Section */}
        {showPermitSection && onPermitNoChange && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-red-600 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Permit No:
            </Label>
            <div className="flex gap-2">
              <Input
                value={permitNo || ''}
                onChange={(e) => onPermitNoChange(e.target.value)}
                placeholder="-"
                className="flex-1"
                disabled={isReadOnly}
              />
              {onViewPermit && (
                <Button
                  variant="secondary"
                  onClick={onViewPermit}
                  className="font-semibold"
                >
                  VIEW PERMIT
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Trailer Number */}
        {showPermitSection && onTrailerNoChange && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Trailer No:</Label>
            <Input
              value={trailerNo || ''}
              onChange={(e) => onTrailerNoChange(e.target.value.toUpperCase())}
              placeholder="N/A"
              disabled={isReadOnly}
            />
          </div>
        )}

        {/* Driver Name (simple input) */}
        {showPermitSection && onDriverNameChange && !onDriverIdChange && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Driver Name:</Label>
            <Input
              value={driverName || ''}
              onChange={(e) => onDriverNameChange(e.target.value)}
              placeholder="-"
              disabled={isReadOnly}
            />
          </div>
        )}

        {/* Vehicle Make */}
        {showPermitSection && onVehicleMakeChange && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Car className="h-4 w-4 text-gray-400" />
              Vehicle Make:
            </Label>
            <div className="flex gap-2">
              <Select value={vehicleMake || ''} onValueChange={onVehicleMakeChange} disabled={isReadOnly}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_MAKES.map((make) => (
                    <SelectItem key={make} value={make}>
                      {make}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {onAddVehicleMake && !isReadOnly && (
                <Button variant="outline" size="icon" onClick={onAddVehicleMake} className="bg-green-600 hover:bg-green-700 text-white">
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Axle Configuration */}
        <SelectFieldWithCrud
          label="Axle Configuration"
          value={selectedConfig}
          onChange={onConfigChange}
          options={configs.map(c => ({
            id: c.axleCode,
            label: c.axleCode,
            sublabel: c.description || c.axleName,
          }))}
          placeholder="Select configuration"
          isReadOnly={isReadOnly}
          required
        />

        {showExtendedDetails && (
          <div className="pt-4 border-t border-gray-100 space-y-4">
            {/* Driver */}
            {onDriverIdChange && (
              <SelectFieldWithCrud
                label="Driver"
                icon={<User className="h-4 w-4 text-gray-400" />}
                value={selectedDriverId || ''}
                onChange={onDriverIdChange}
                options={drivers.map(d => ({
                  id: d.id,
                  label: `${d.fullNames || ''} ${d.surname || ''}`.trim() || d.idNumber,
                  sublabel: d.drivingLicenseNo || d.idNumber,
                }))}
                placeholder="Select driver"
                isReadOnly={isReadOnly}
                onAdd={onAddDriver}
                onRefresh={onRefreshDrivers}
                onEdit={selectedDriverId ? onEditDriver : undefined}
                onView={selectedDriverId ? onViewDriver : undefined}
              />
            )}

            {/* Transporter */}
            {onTransporterIdChange && (
              <SelectFieldWithCrud
                label="Transporter"
                icon={<Building2 className="h-4 w-4 text-gray-400" />}
                value={selectedTransporterId || ''}
                onChange={onTransporterIdChange}
                options={transporters.map(t => ({
                  id: t.id,
                  label: t.name,
                  sublabel: t.code,
                }))}
                placeholder="Select transporter"
                isReadOnly={isReadOnly}
                onAdd={onAddTransporter}
                onRefresh={onRefreshTransporters}
                onEdit={selectedTransporterId ? onEditTransporter : undefined}
                onView={selectedTransporterId ? onViewTransporter : undefined}
              />
            )}

            {/* Cargo Type */}
            {onCargoIdChange && (
              <SelectFieldWithCrud
                label="Cargo Type"
                icon={<Package className="h-4 w-4 text-gray-400" />}
                value={selectedCargoId || ''}
                onChange={onCargoIdChange}
                options={cargoTypes.map(c => ({
                  id: c.id,
                  label: c.name,
                  sublabel: c.code,
                }))}
                placeholder="Select cargo type"
                isReadOnly={isReadOnly}
                onAdd={onAddCargoType}
                onRefresh={onRefreshCargoTypes}
                onEdit={selectedCargoId ? onEditCargoType : undefined}
                onView={selectedCargoId ? onViewCargoType : undefined}
              />
            )}

            {/* Origin */}
            {onOriginIdChange && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-gray-700">Origin</Label>
                  {onRequestGeolocation && !isReadOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onRequestGeolocation}
                      disabled={isGeoLoading}
                      className="h-6 text-xs text-blue-600 hover:text-blue-800 px-2"
                    >
                      <Locate className={cn("h-3 w-3 mr-1", isGeoLoading && "animate-pulse")} />
                      {isGeoLoading ? 'Locating...' : 'Use Current Location'}
                    </Button>
                  )}
                </div>
                {suggestedOriginId && !selectedOriginId && suggestedOriginDistance && (
                  <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-xs text-blue-700 font-medium">
                        Suggested: {locations.find(l => l.id === suggestedOriginId)?.name}
                      </p>
                      <p className="text-xs text-blue-500">{suggestedOriginDistance}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onOriginIdChange(suggestedOriginId)}
                      className="h-6 text-xs border-blue-300 text-blue-700"
                    >
                      Use
                    </Button>
                  </div>
                )}
                <SelectFieldWithCrud
                  label=""
                  icon={<MapPin className="h-4 w-4 text-gray-400" />}
                  value={selectedOriginId || ''}
                  onChange={onOriginIdChange}
                  options={locations.map(l => ({
                    id: l.id,
                    label: l.name,
                    sublabel: [l.country, l.region].filter(Boolean).join(' - ') || undefined,
                  }))}
                  placeholder="Select origin"
                  isReadOnly={isReadOnly}
                  onAdd={onAddOriginLocation || onAddLocation}
                  onRefresh={onRefreshLocations}
                  onEdit={selectedOriginId ? onEditOrigin : undefined}
                  onView={selectedOriginId ? onViewOrigin : undefined}
                />
              </div>
            )}

            {/* Destination */}
            {onDestinationIdChange && (
              <SelectFieldWithCrud
                label="Destination"
                icon={<MapPin className="h-4 w-4 text-gray-400" />}
                value={selectedDestinationId || ''}
                onChange={onDestinationIdChange}
                options={locations.map(l => ({
                  id: l.id,
                  label: l.name,
                  sublabel: [l.country, l.region].filter(Boolean).join(' - ') || undefined,
                }))}
                placeholder="Select destination"
                isReadOnly={isReadOnly}
                onAdd={onAddDestinationLocation || onAddLocation}
                onRefresh={onRefreshLocations}
                onEdit={selectedDestinationId ? onEditDestination : undefined}
                onView={selectedDestinationId ? onViewDestination : undefined}
              />
            )}

            {/* Relief Vehicle Reg */}
            {onReliefVehicleRegChange && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Relief Vehicle Reg:</Label>
                <Select value={reliefVehicleReg || ''} onValueChange={onReliefVehicleRegChange} disabled={isReadOnly}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.regNo}>
                        {v.regNo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Comment */}
            {onCommentChange && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Comment:</Label>
                <Input
                  value={comment || ''}
                  onChange={(e) => onCommentChange(e.target.value)}
                  placeholder=""
                  disabled={isReadOnly}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
