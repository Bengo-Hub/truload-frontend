"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
    useCargoTypes,
    useCounties,
    useCreateCargoType,
    useCreateDriver,
    useCreateOriginDestination,
    useCreateTransporter,
    useCreateVehicleMake,
    useDrivers,
    useOriginsDestinations,
    useRoadsByCounty,
    useRoadsBySubcounty,
    useSubcounties,
    useTransporters,
    useVehicleMakes,
} from '@/hooks/queries';
import { CargoType, Driver, OriginDestination, Station, Transporter } from '@/lib/api/weighing';
import { QUERY_KEYS } from '@/lib/query/config';
import { CreateDriverRequest, CreateOriginDestinationRequest, CreateTransporterRequest, CreateVehicleMakeRequest } from '@/types/weighing';
import { useQueryClient } from '@tanstack/react-query';

export interface UseWeighingUIOptions {
  stationId?: string;
  currentStation?: Station | null;
}

export function useWeighingUI(options: UseWeighingUIOptions = {}) {
  const { stationId, currentStation } = options;
  const queryClient = useQueryClient();



  // 1. Core Selections & UI State
  const [selectedDriverId, setSelectedDriverId] = useState<string | undefined>();
  const [selectedTransporterIdState, setSelectedTransporterIdState] = useState<string | undefined>();
  const [selectedCargoId, setSelectedCargoId] = useState<string | undefined>();
  const [selectedOriginId, setSelectedOriginId] = useState<string | undefined>();
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | undefined>();
  const [vehicleMake, setVehicleMake] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>();
  const [comment, setComment] = useState('');
  const [permitNo, setPermitNo] = useState('');
  const [trailerNo, setTrailerNo] = useState('');
  const [reliefVehicleReg, setReliefVehicleReg] = useState('');

  // 2. Location & Geographic State
  const [selectedCountyId, setSelectedCountyId] = useState<string>('');
  const [selectedSubcountyId, setSelectedSubcountyId] = useState<string>('');
  const [selectedRoadId, setSelectedRoadId] = useState<string>('');

  // Initialize defaults from station
  useEffect(() => {
    if (currentStation) {
      if (!selectedCountyId && currentStation.countyId) setSelectedCountyId(currentStation.countyId);
      if (!selectedSubcountyId && currentStation.subcountyId) setSelectedSubcountyId(currentStation.subcountyId);
      if (!selectedRoadId && currentStation.roadId) setSelectedRoadId(currentStation.roadId);
    }
  }, [currentStation, selectedCountyId, selectedSubcountyId, selectedRoadId]);

  // 3. Image & Media State
  const [frontViewImage, setFrontViewImage] = useState<string | undefined>();
  const [overviewImage, setOverviewImage] = useState<string | undefined>();

  // 4. Plate & Registration State
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [debouncedPlate, setDebouncedPlate] = useState('');
  const [isPlateDisabled, setIsPlateDisabled] = useState(false);

  // 5. Configuration State
  const [selectedConfig, setSelectedConfig] = useState<string>('');

  // 6. Modal & Loading States
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [isTransporterModalOpen, setIsTransporterModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locationModalTarget, setLocationModalTarget] = useState<'origin' | 'destination'>('origin');
  const [isVehicleMakeModalOpen, setIsVehicleMakeModalOpen] = useState(false);
  const [isCargoTypeModalOpen, setIsCargoTypeModalOpen] = useState(false);
  const [isSavingEntity, setIsSavingEntity] = useState(false);
  const [isScaleTestModalOpen, setIsScaleTestModalOpen] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isMissingFieldsModalOpen, setIsMissingFieldsModalOpen] = useState(false);

  // 7. Data Queries (Master Data)
  const { data: counties = [] } = useCounties();
  const { data: drivers = [], refetch: refetchDrivers } = useDrivers();
  const { data: transporters = [], refetch: refetchTransporters } = useTransporters();
  const { data: locations = [], refetch: refetchLocations } = useOriginsDestinations();
  const { data: cargoTypes = [], refetch: refetchCargoTypes } = useCargoTypes();
  const { data: vehicleMakesData = [], refetch: refetchVehicleMakes } = useVehicleMakes();

  // 8. Dependent Queries
  const { data: subcounties = [] } = useSubcounties(selectedCountyId);
  const { data: roadsByCounty = [] } = useRoadsByCounty(selectedCountyId);
  const { data: roadsBySubcounty = [] } = useRoadsBySubcounty(selectedSubcountyId);
  const roads = selectedSubcountyId ? roadsBySubcounty : roadsByCounty;

  // 9. Mutations
  const createDriverMutation = useCreateDriver();
  const createTransporterMutation = useCreateTransporter();
  const createCargoTypeMutation = useCreateCargoType();
  const createOriginDestinationMutation = useCreateOriginDestination();
  const createVehicleMakeMutation = useCreateVehicleMake();

  // 10. Effects
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPlate(vehiclePlate);
    }, 500);
    return () => clearTimeout(timer);
  }, [vehiclePlate]);

  // Clear subcounty and road when county *changes* (user picked a different county), not on initial set
  const prevCountyRef = useRef<string>('');
  useEffect(() => {
    if (prevCountyRef.current !== '' && prevCountyRef.current !== selectedCountyId) {
      setSelectedSubcountyId('');
      setSelectedRoadId('');
    }
    prevCountyRef.current = selectedCountyId;
  }, [selectedCountyId]);

  // 11. Handlers
  const handleCaptureFront = useCallback(() => {
    setFrontViewImage('/images/weighing/truckpass.jpg');
    toast.success('Front view captured');
  }, []);

  const handleCaptureOverview = useCallback(() => {
    setOverviewImage('/images/weighing/truckcalledin.jpg');
    toast.success('Overview captured');
  }, []);

  const handleScanPlate = useCallback(() => {
    toast.info('Scanning plate via ANPR...');
    setTimeout(() => {
      toast.success('Plate scanned: KAA 123A');
    }, 1500);
  }, []);

  // Entity save handlers
  const handleSaveDriver = useCallback(async (data: CreateDriverRequest) => {
    setIsSavingEntity(true);
    try {
      const newDriver = await createDriverMutation.mutateAsync({
        ...data,
        transporterId: selectedTransporterIdState,
      });

      queryClient.setQueryData([...QUERY_KEYS.DRIVERS, ''], (old: Driver[] | undefined) =>
        old ? [...old, newDriver] : [newDriver]
      );
      setSelectedDriverId(newDriver.id);
      setIsDriverModalOpen(false);
      toast.success('Driver added successfully');
    } catch (error) {
      toast.error('Failed to add driver');
      throw error;
    } finally {
      setIsSavingEntity(false);
    }
  }, [createDriverMutation, selectedTransporterIdState, queryClient]);

  const handleSaveTransporter = useCallback(async (data: CreateTransporterRequest) => {
    setIsSavingEntity(true);
    try {
      const newTransporter = await createTransporterMutation.mutateAsync(data);
      queryClient.setQueryData([...QUERY_KEYS.TRANSPORTERS, ''], (old: Transporter[] | undefined) =>
        old ? [...old, newTransporter] : [newTransporter]
      );
      setSelectedTransporterIdState(newTransporter.id);
      setIsTransporterModalOpen(false);
      toast.success('Transporter added successfully');
    } catch (error) {
      toast.error('Failed to add transporter');
      throw error;
    } finally {
      setIsSavingEntity(false);
    }
  }, [createTransporterMutation, queryClient]);

  const handleSaveLocation = useCallback(async (data: CreateOriginDestinationRequest) => {
    setIsSavingEntity(true);
    try {
      const newLocation = await createOriginDestinationMutation.mutateAsync(data);
      queryClient.setQueryData(QUERY_KEYS.ORIGINS_DESTINATIONS, (old: OriginDestination[] | undefined) =>
        old ? [...old, newLocation] : [newLocation]
      );
      if (locationModalTarget === 'origin') {
        setSelectedOriginId(newLocation.id);
      } else {
        setSelectedDestinationId(newLocation.id);
      }
      setIsLocationModalOpen(false);
      toast.success('Location added successfully');
    } catch (error) {
      toast.error('Failed to add location');
      throw error;
    } finally {
      setIsSavingEntity(false);
    }
  }, [createOriginDestinationMutation, queryClient, locationModalTarget]);

  const handleSaveCargoType = useCallback(async (data: { code: string; name: string; category?: string }) => {
    setIsSavingEntity(true);
    try {
      const newCargoType = await createCargoTypeMutation.mutateAsync({
        ...data,
        category: (data.category as 'General' | 'Hazardous' | 'Perishable') || 'General',
      });
      queryClient.setQueryData(QUERY_KEYS.CARGO_TYPES, (old: CargoType[] | undefined) =>
        old ? [...old, newCargoType] : [newCargoType]
      );
      setSelectedCargoId(newCargoType.id);
      setIsCargoTypeModalOpen(false);
      toast.success('Cargo type added successfully');
    } catch (error) {
      toast.error('Failed to add cargo type');
      throw error;
    } finally {
      setIsSavingEntity(false);
    }
  }, [createCargoTypeMutation, queryClient]);

  const handleSaveVehicleMake = useCallback(async (data: CreateVehicleMakeRequest) => {
    setIsSavingEntity(true);
    try {
      const created = await createVehicleMakeMutation.mutateAsync(data);
      setVehicleMake(created.name);
      setIsVehicleMakeModalOpen(false);
      toast.success('Vehicle make added successfully');
    } catch (error) {
      const axiosErr = error as import('axios').AxiosError<string>;
      const status = axiosErr?.response?.status;
      if (status === 409) {
        toast.error('A vehicle make with this code already exists. Please use a different name.');
      } else if (status === 400 && axiosErr.response?.data && typeof axiosErr.response.data === 'string') {
        toast.error(axiosErr.response.data);
      } else {
        toast.error('Failed to add vehicle make');
      }
      throw error;
    } finally {
      setIsSavingEntity(false);
    }
  }, [createVehicleMakeMutation]);

  return {
    // Media
    frontViewImage,
    setFrontViewImage,
    overviewImage,
    setOverviewImage,
    handleCaptureFront,
    handleCaptureOverview,

    // Controls
    isPlateDisabled,
    setIsPlateDisabled,
    handleScanPlate,

    // Plate
    vehiclePlate,
    setVehiclePlate,
    debouncedPlate,

    // Config
    selectedConfig,
    setSelectedConfig,

    // Location
    selectedCountyId,
    setSelectedCountyId,
    selectedSubcountyId,
    setSelectedSubcountyId,
    selectedRoadId,
    setSelectedRoadId,

    // Modals
    isDriverModalOpen,
    setIsDriverModalOpen,
    isTransporterModalOpen,
    setIsTransporterModalOpen,
    isLocationModalOpen,
    setIsLocationModalOpen,
    locationModalTarget,
    setLocationModalTarget,
    isVehicleMakeModalOpen,
    setIsVehicleMakeModalOpen,
    isCargoTypeModalOpen,
    setIsCargoTypeModalOpen,
    isSavingEntity,
    setIsSavingEntity,
    isScaleTestModalOpen,
    setIsScaleTestModalOpen,
    showCancelConfirm,
    setShowCancelConfirm,
    isConfirmModalOpen,
    setIsConfirmModalOpen,
    isMissingFieldsModalOpen,
    setIsMissingFieldsModalOpen,

    // Master Data
    counties,
    subcounties,
    roads,
    drivers,
    transporters,
    locations,
    cargoTypes,
    vehicleMakesData,

    // Selections
    selectedDriverId,
    setSelectedDriverId,
    selectedTransporterId: selectedTransporterIdState,
    setSelectedTransporterId: setSelectedTransporterIdState,
    selectedCargoId,
    setSelectedCargoId,
    selectedOriginId,
    setSelectedOriginId,
    selectedDestinationId,
    setSelectedDestinationId,
    vehicleMake,
    setVehicleMake,
    selectedVehicleId,
    setSelectedVehicleId,
    comment,
    setComment,
    permitNo,
    setPermitNo,
    trailerNo,
    setTrailerNo,
    reliefVehicleReg,
    setReliefVehicleReg,

    // Handlers
    handleSaveDriver,
    handleSaveTransporter,
    handleSaveLocation,
    handleSaveCargoType,
    handleSaveVehicleMake,

    // Refetch Functions
    refetchDrivers,
    refetchTransporters,
    refetchLocations,
    refetchCargoTypes,
    refetchVehicleMakes,
  };
}