'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useHasPermission } from '@/hooks/useAuth';
import type { WeightRefLookupData } from '@/lib/api/setup';
import {
	createAxleConfiguration,
	deleteAxleConfiguration,
	fetchAxleConfigurations,
	fetchAxleWeightReferencesByConfiguration,
	fetchWeightRefLookupData,
	updateAxleConfiguration,
} from '@/lib/api/setup';
import type {
	AxleConfigurationResponse,
	CreateAxleConfigurationRequest,
	UpdateAxleConfigurationRequest,
	UpdateAxleWeightReferenceInline,
	WeightReferenceInline,
} from '@/types/setup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Download, Edit3, FileBarChart, Plus, RefreshCcw, Scale, Search, Shield, Trash2, Truck, Weight, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

interface AxleFormValues {
	axleCode: string;
	axleName: string;
	description?: string;
	axleNumber: number;
	legalFramework?: string;
	visualDiagramUrl?: string;
	notes?: string;
}

interface WeightRefRow {
	id?: string;
	axlePosition: number;
	axleLegalWeightKg: number;
	axleGrouping: 'A' | 'B' | 'C' | 'D';
	axleGroupId: string;
	tyreTypeId?: string;
}

// Maximum legal GVW in Kenya (56 tonnes = 56,000 kg)
const MAX_LEGAL_GVW_KG = 56000;

export default function AxleConfigurationsPage() {
	return (
		<ProtectedRoute requiredPermissions={["config.manage_axle"]}>
			<AxleConfigurationsContent />
		</ProtectedRoute>
	);
}

function AxleConfigurationsContent() {
	const canEdit = useHasPermission('config.manage_axle');
	const queryClient = useQueryClient();

	// State
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editing, setEditing] = useState<AxleConfigurationResponse | null>(null);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [configToDelete, setConfigToDelete] = useState<AxleConfigurationResponse | null>(null);

	// Weight reference rows state (inline in form)
	const [weightRefRows, setWeightRefRows] = useState<WeightRefRow[]>([]);
	const [lookupData, setLookupData] = useState<WeightRefLookupData | null>(null);
	const [isLoadingLookup, setIsLoadingLookup] = useState(false);

	// Search and filter
	const [searchQuery, setSearchQuery] = useState('');
	const [frameworkFilter, setFrameworkFilter] = useState<string>('all');

	const { data: configs = [], isLoading } = useQuery({
		queryKey: ['axleConfigurations'],
		queryFn: () => fetchAxleConfigurations({ includeInactive: true }),
	});

	// Filtered configurations
	const filteredConfigs = useMemo(() => {
		return configs.filter(cfg => {
			const matchesSearch = searchQuery === '' ||
				cfg.axleCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
				cfg.axleName.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesFramework = frameworkFilter === 'all' || cfg.legalFramework === frameworkFilter;
			return matchesSearch && matchesFramework;
		});
	}, [configs, searchQuery, frameworkFilter]);

	// Statistics
	const stats = useMemo(() => {
		const total = configs.length;
		const eacCount = configs.filter(c => c.legalFramework === 'EAC').length;
		const trafficActCount = configs.filter(c => c.legalFramework === 'TrafficAct').length;
		const standardCount = configs.filter(c => c.isStandard).length;
		return { total, eacCount, trafficActCount, standardCount };
	}, [configs]);

	const createMutation = useMutation({
		mutationFn: (payload: CreateAxleConfigurationRequest) => createAxleConfiguration(payload),
		onSuccess: () => {
			toast.success('Axle configuration created successfully');
			queryClient.invalidateQueries({ queryKey: ['axleConfigurations'] });
			setDialogOpen(false);
		},
		onError: () => toast.error('Failed to create axle configuration'),
	});

	const updateMutation = useMutation({
		mutationFn: (input: { id: string; payload: UpdateAxleConfigurationRequest }) =>
			updateAxleConfiguration(input.id, input.payload),
		onSuccess: () => {
			toast.success('Axle configuration updated successfully');
			queryClient.invalidateQueries({ queryKey: ['axleConfigurations'] });
			setDialogOpen(false);
		},
		onError: () => toast.error('Failed to update axle configuration'),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteAxleConfiguration(id),
		onSuccess: () => {
			toast.success('Axle configuration deleted');
			queryClient.invalidateQueries({ queryKey: ['axleConfigurations'] });
			setDeleteDialogOpen(false);
			setConfigToDelete(null);
		},
		onError: () => toast.error('Failed to delete axle configuration'),
	});

	const { register, handleSubmit, control, reset, watch, formState: { errors } } = useForm<AxleFormValues>({
		defaultValues: {
			axleCode: '',
			axleName: '',
			description: '',
			axleNumber: 2,
			legalFramework: 'TrafficAct',
			visualDiagramUrl: '',
			notes: '',
		},
	});

	const watchedAxleNumber = watch('axleNumber');

	// Auto-calculated GVW from weight refs
	const calculatedGvw = useMemo(() =>
		weightRefRows.reduce((sum, row) => sum + (row.axleLegalWeightKg || 0), 0),
		[weightRefRows]
	);
	const isGvwOverLimit = calculatedGvw > MAX_LEGAL_GVW_KG;

	// Load lookup data when dialog opens
	const loadLookupData = useCallback(async () => {
		if (lookupData) return;
		setIsLoadingLookup(true);
		try {
			const data = await fetchWeightRefLookupData();
			setLookupData(data);
		} catch {
			toast.error('Failed to load lookup data');
		} finally {
			setIsLoadingLookup(false);
		}
	}, [lookupData]);

	// Initialize weight ref rows based on axle number
	const initWeightRefRows = useCallback((axleCount: number, existingRefs?: WeightRefRow[]) => {
		const rows: WeightRefRow[] = [];
		for (let i = 1; i <= axleCount; i++) {
			const existing = existingRefs?.find(r => r.axlePosition === i);
			rows.push(existing ?? {
				axlePosition: i,
				axleLegalWeightKg: 0,
				axleGrouping: i === 1 ? 'A' : 'B',
				axleGroupId: '',
			});
		}
		setWeightRefRows(rows);
	}, []);

	// Update rows when axle number changes (only in create mode)
	useEffect(() => {
		if (dialogOpen && !editing) {
			initWeightRefRows(watchedAxleNumber);
		}
	}, [watchedAxleNumber, dialogOpen, editing, initWeightRefRows]);

	useEffect(() => {
		if (editing) {
			reset({
				axleCode: editing.axleCode,
				axleName: editing.axleName,
				description: editing.description ?? '',
				axleNumber: editing.axleNumber,
				legalFramework: editing.legalFramework ?? 'TrafficAct',
				visualDiagramUrl: editing.visualDiagramUrl ?? '',
				notes: editing.notes ?? '',
			});
			// Load existing weight references
			fetchAxleWeightReferencesByConfiguration(editing.id)
				.then(refs => {
					const rows: WeightRefRow[] = refs.map(r => ({
						id: r.id,
						axlePosition: r.axlePosition,
						axleLegalWeightKg: r.axleLegalWeightKg,
						axleGrouping: r.axleGrouping as 'A' | 'B' | 'C' | 'D',
						axleGroupId: r.axleGroupId,
						tyreTypeId: r.tyreTypeId ?? undefined,
					}));
					initWeightRefRows(editing.axleNumber, rows);
				})
				.catch(() => initWeightRefRows(editing.axleNumber));
		} else {
			reset({
				axleCode: '',
				axleName: '',
				description: '',
				axleNumber: 2,
				legalFramework: 'TrafficAct',
				visualDiagramUrl: '',
				notes: '',
			});
			initWeightRefRows(2);
		}
	}, [editing, reset, initWeightRefRows]);

	const onSubmit = async (values: AxleFormValues) => {
		// Validate weight refs
		const hasEmptyGroup = weightRefRows.some(r => !r.axleGroupId);
		const hasZeroWeight = weightRefRows.some(r => r.axleLegalWeightKg <= 0);
		if (hasEmptyGroup) {
			toast.error('Please select an axle group for all weight references');
			return;
		}
		if (hasZeroWeight) {
			toast.error('All weight references must have a weight greater than 0');
			return;
		}

		if (editing) {
			const weightRefs: UpdateAxleWeightReferenceInline[] = weightRefRows.map(row => ({
				id: row.id,
				axlePosition: row.axlePosition,
				axleLegalWeightKg: row.axleLegalWeightKg,
				axleGrouping: row.axleGrouping,
				axleGroupId: row.axleGroupId,
				tyreTypeId: row.tyreTypeId,
			}));
			const payload: UpdateAxleConfigurationRequest = {
				axleName: values.axleName,
				description: values.description,
				legalFramework: values.legalFramework,
				visualDiagramUrl: values.visualDiagramUrl,
				notes: values.notes,
				isActive: true,
				weightReferences: weightRefs,
			};
			await updateMutation.mutateAsync({ id: editing.id, payload });
		} else {
			const weightRefs: WeightReferenceInline[] = weightRefRows.map(row => ({
				axlePosition: row.axlePosition,
				axleLegalWeightKg: row.axleLegalWeightKg,
				axleGrouping: row.axleGrouping,
				axleGroupId: row.axleGroupId,
				tyreTypeId: row.tyreTypeId,
			}));
			const payload: CreateAxleConfigurationRequest = {
				axleCode: values.axleCode,
				axleName: values.axleName,
				description: values.description,
				axleNumber: values.axleNumber,
				legalFramework: values.legalFramework,
				visualDiagramUrl: values.visualDiagramUrl,
				notes: values.notes,
				weightReferences: weightRefs,
			};
			await createMutation.mutateAsync(payload);
		}
	};

	const openCreate = () => {
		setEditing(null);
		setDialogOpen(true);
		loadLookupData();
	};

	const openEdit = (cfg: AxleConfigurationResponse) => {
		setEditing(cfg);
		setDialogOpen(true);
		loadLookupData();
	};

	const confirmDelete = (cfg: AxleConfigurationResponse) => {
		setConfigToDelete(cfg);
		setDeleteDialogOpen(true);
	};

	const handleDelete = () => {
		if (configToDelete) {
			deleteMutation.mutate(configToDelete.id);
		}
	};

	// Update a single weight ref row field
	const updateWeightRefRow = (index: number, field: keyof WeightRefRow, value: string | number | undefined) => {
		setWeightRefRows(prev => {
			const updated = [...prev];
			updated[index] = { ...updated[index], [field]: value };
			return updated;
		});
	};

	// Export to CSV
	const exportToCsv = () => {
		const headers = ['ID', 'Axle Code', 'Axle Name', 'Axle Number', 'GVW Permissible (kg)', 'Legal Framework', 'Standard'];
		const rows = filteredConfigs.map(cfg => [
			cfg.id,
			cfg.axleCode,
			cfg.axleName,
			cfg.axleNumber,
			cfg.gvwPermissibleKg,
			cfg.legalFramework,
			cfg.isStandard ? 'Yes' : 'No'
		]);

		const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.download = `axle_configurations_${new Date().toISOString().split('T')[0]}.csv`;
		link.click();
		toast.success('Exported to CSV');
	};

	return (
		<div className="w-full max-w-7xl mx-auto space-y-6">
			{/* Statistics Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card className="relative overflow-hidden">
					<div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full opacity-50" />
					<CardHeader className="pb-2">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
								<FileBarChart className="h-5 w-5 text-slate-600" />
							</div>
							<div className="space-y-1">
								<CardDescription className="text-xs">Total Configurations</CardDescription>
								<CardTitle className="text-2xl font-bold">{stats.total}</CardTitle>
							</div>
						</div>
					</CardHeader>
				</Card>
				<Card className="relative overflow-hidden">
					<div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full opacity-50" />
					<CardHeader className="pb-2">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
								<Shield className="h-5 w-5 text-blue-600" />
							</div>
							<div className="space-y-1">
								<CardDescription className="text-xs">EAC Act Configs</CardDescription>
								<CardTitle className="text-2xl font-bold text-blue-600">{stats.eacCount}</CardTitle>
							</div>
						</div>
					</CardHeader>
				</Card>
				<Card className="relative overflow-hidden">
					<div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full opacity-50" />
					<CardHeader className="pb-2">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
								<Truck className="h-5 w-5 text-orange-600" />
							</div>
							<div className="space-y-1">
								<CardDescription className="text-xs">Traffic Act Configs</CardDescription>
								<CardTitle className="text-2xl font-bold text-orange-600">{stats.trafficActCount}</CardTitle>
							</div>
						</div>
					</CardHeader>
				</Card>
				<Card className="relative overflow-hidden">
					<div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-gradient-to-br from-green-100 to-green-200 rounded-full opacity-50" />
					<CardHeader className="pb-2">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
								<Weight className="h-5 w-5 text-green-600" />
							</div>
							<div className="space-y-1">
								<CardDescription className="text-xs">Standard Configs</CardDescription>
								<CardTitle className="text-2xl font-bold text-green-600">{stats.standardCount}</CardTitle>
							</div>
						</div>
					</CardHeader>
				</Card>
			</div>

			{/* Main Content Card */}
			<Card className="flex-1">
				<CardHeader className="pb-4">
					<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
						{/* Search and Filter */}
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-1 max-w-2xl">
							<div className="relative flex-1">
								<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									placeholder="Search by code or name..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="pl-10 pr-10"
								/>
								{searchQuery && (
									<Button
										variant="ghost"
										size="sm"
										className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
										onClick={() => setSearchQuery('')}
									>
										<X className="h-4 w-4" />
									</Button>
								)}
							</div>
							<Select value={frameworkFilter} onValueChange={setFrameworkFilter}>
								<SelectTrigger className="w-full sm:w-44">
									<SelectValue placeholder="Framework" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Frameworks</SelectItem>
									<SelectItem value="EAC">EAC Act</SelectItem>
									<SelectItem value="TrafficAct">Traffic Act</SelectItem>
								</SelectContent>
							</Select>
						</div>
						{/* Action Buttons */}
						<div className="flex items-center gap-2 flex-shrink-0">
							<Button
								variant="outline"
								size="sm"
								onClick={() => queryClient.invalidateQueries({ queryKey: ['axleConfigurations'] })}
							>
								<RefreshCcw className="mr-2 h-4 w-4" />
								<span className="hidden sm:inline">Refresh</span>
							</Button>
							<Button variant="outline" size="sm" onClick={exportToCsv} disabled={filteredConfigs.length === 0}>
								<Download className="mr-2 h-4 w-4" />
								<span className="hidden sm:inline">Export</span>
							</Button>
							{canEdit && (
								<Button onClick={openCreate} size="sm">
									<Plus className="mr-2 h-4 w-4" />
									New Config
								</Button>
							)}
						</div>
					</div>
					{/* Results summary */}
					<div className="flex items-center gap-2 mt-2">
						<Badge variant="secondary" className="font-normal">
							{filteredConfigs.length} {filteredConfigs.length === 1 ? 'configuration' : 'configurations'}
						</Badge>
						{(searchQuery || frameworkFilter !== 'all') && (
							<Button
								variant="ghost"
								size="sm"
								className="h-6 text-xs"
								onClick={() => {
									setSearchQuery('');
									setFrameworkFilter('all');
								}}
							>
								Clear filters
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent className="p-0">
					<div className="border-t">
						<ScrollArea className="max-h-[calc(100vh-420px)] min-h-[300px]">
							<Table>
								<TableHeader>
									<TableRow className="bg-muted/30 hover:bg-muted/30">
										<TableHead className="font-semibold w-[100px]">Code</TableHead>
										<TableHead className="font-semibold min-w-[180px]">Name</TableHead>
										<TableHead className="font-semibold text-center w-[80px]">Axles</TableHead>
										<TableHead className="font-semibold text-right w-[120px]">GVW (kg)</TableHead>
										<TableHead className="font-semibold text-center w-[120px]">Framework</TableHead>
										<TableHead className="font-semibold text-center w-[90px]">Standard</TableHead>
										<TableHead className="font-semibold text-right w-[100px]">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{isLoading && (
										<>
											{[...Array(6)].map((_, i) => (
												<TableRow key={i}>
													<TableCell><Skeleton className="h-5 w-16" /></TableCell>
													<TableCell><Skeleton className="h-5 w-32" /></TableCell>
													<TableCell className="text-center"><Skeleton className="h-6 w-8 mx-auto" /></TableCell>
													<TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
													<TableCell className="text-center"><Skeleton className="h-6 w-20 mx-auto rounded-full" /></TableCell>
													<TableCell className="text-center"><Skeleton className="h-5 w-5 mx-auto rounded-full" /></TableCell>
													<TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
												</TableRow>
											))}
										</>
									)}
									{!isLoading && filteredConfigs.length === 0 && (
										<TableRow>
											<TableCell colSpan={7} className="h-48">
												<div className="flex flex-col items-center justify-center text-center py-8">
													<div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
														<Scale className="h-8 w-8 text-muted-foreground" />
													</div>
													<p className="text-base font-medium text-muted-foreground mb-1">
														{searchQuery || frameworkFilter !== 'all'
															? 'No configurations match your filters'
															: 'No axle configurations yet'}
													</p>
													<p className="text-sm text-muted-foreground/70 mb-4">
														{searchQuery || frameworkFilter !== 'all'
															? 'Try adjusting your search or filter criteria'
															: 'Get started by creating your first axle configuration'}
													</p>
													{canEdit && !searchQuery && frameworkFilter === 'all' && (
														<Button onClick={openCreate} size="sm">
															<Plus className="mr-2 h-4 w-4" />
															Create Configuration
														</Button>
													)}
												</div>
											</TableCell>
										</TableRow>
									)}
									{filteredConfigs.map((cfg) => (
										<TableRow key={cfg.id} className="group">
											<TableCell className="font-mono font-medium text-primary">{cfg.axleCode}</TableCell>
											<TableCell>
												<div className="flex flex-col">
													<span className="font-medium">{cfg.axleName}</span>
													{cfg.description && (
														<span className="text-xs text-muted-foreground truncate max-w-[200px]">{cfg.description}</span>
													)}
												</div>
											</TableCell>
											<TableCell className="text-center">
												<Badge variant="outline" className="font-mono">{cfg.axleNumber}</Badge>
											</TableCell>
											<TableCell className="text-right font-mono">
												<span className={cfg.gvwPermissibleKg > MAX_LEGAL_GVW_KG ? 'text-red-600 font-semibold' : ''}>
													{cfg.gvwPermissibleKg.toLocaleString()}
												</span>
											</TableCell>
											<TableCell className="text-center">
												<Badge
													variant={cfg.legalFramework === 'EAC' ? 'default' : 'secondary'}
													className={cfg.legalFramework === 'EAC' ? 'bg-blue-600' : ''}
												>
													{cfg.legalFramework === 'EAC' ? 'EAC Act' : 'Traffic Act'}
												</Badge>
											</TableCell>
											<TableCell className="text-center">
												{cfg.isStandard ? (
													<CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
												) : (
													<span className="text-muted-foreground">-</span>
												)}
											</TableCell>
											<TableCell className="text-right">
												<div className="flex items-center justify-end gap-1">
													{canEdit && (
														<>
															<Button
																variant="ghost"
																size="icon"
																onClick={() => openEdit(cfg)}
																title="Edit"
																className="h-8 w-8"
															>
																<Edit3 className="h-4 w-4" />
															</Button>
															<Button
																variant="ghost"
																size="icon"
																onClick={() => confirmDelete(cfg)}
																title="Delete"
																className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
															>
																<Trash2 className="h-4 w-4" />
															</Button>
														</>
													)}
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</ScrollArea>
					</div>
				</CardContent>
			</Card>

			{/* Create/Edit Configuration Dialog */}
			<Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) setDialogOpen(false); }}>
				<DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{editing ? 'Edit Configuration' : 'Create New Configuration'}</DialogTitle>
						<DialogDescription>
							{editing
								? 'Update the axle configuration details and weight references. Code cannot be changed.'
								: 'Define a new axle configuration with weight references per axle position.'}
						</DialogDescription>
					</DialogHeader>

					<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
						{/* Basic Information */}
						<div className="space-y-4">
							<h4 className="text-sm font-medium text-muted-foreground">Basic Information</h4>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="axleCode">
										Axle Code <span className="text-red-500">*</span>
									</Label>
									<Input
										id="axleCode"
										placeholder="e.g., 2A, 3A, 4A2D"
										{...register('axleCode', { required: 'Axle code is required' })}
										disabled={!!editing}
										className={editing ? 'bg-muted' : ''}
									/>
									{editing && (
										<p className="text-xs text-muted-foreground">Code cannot be changed after creation</p>
									)}
									{errors.axleCode && (
										<p className="text-sm text-red-600">{errors.axleCode.message}</p>
									)}
								</div>
								<div className="space-y-2">
									<Label htmlFor="axleName">
										Axle Name <span className="text-red-500">*</span>
									</Label>
									<Input
										id="axleName"
										placeholder="e.g., 2 Axle Truck"
										{...register('axleName', { required: 'Axle name is required' })}
									/>
									{errors.axleName && (
										<p className="text-sm text-red-600">{errors.axleName.message}</p>
									)}
								</div>
							</div>
						</div>

						<Separator />

						{/* Weight References */}
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<h4 className="text-sm font-medium text-muted-foreground">
									Weight References ({weightRefRows.length} axle{weightRefRows.length !== 1 ? 's' : ''})
								</h4>
							</div>

							{isLoadingLookup ? (
								<div className="space-y-2">
									{[...Array(3)].map((_, i) => (
										<Skeleton key={i} className="h-10 w-full" />
									))}
								</div>
							) : (
								<div className="border rounded-lg overflow-hidden">
									<Table>
										<TableHeader>
											<TableRow className="bg-muted/30">
												<TableHead className="w-[60px] text-center">Pos</TableHead>
												<TableHead className="w-[130px]">Weight (kg)</TableHead>
												<TableHead className="w-[90px]">Grouping</TableHead>
												<TableHead>Axle Group</TableHead>
												<TableHead>Tyre Type</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{weightRefRows.map((row, idx) => (
												<TableRow key={row.axlePosition}>
													<TableCell className="text-center font-mono font-medium">
														{row.axlePosition}
													</TableCell>
													<TableCell>
														<Input
															type="number"
															min={0}
															value={row.axleLegalWeightKg || ''}
															onChange={(e) => updateWeightRefRow(idx, 'axleLegalWeightKg', parseInt(e.target.value) || 0)}
															placeholder="e.g., 6000"
															className="h-8 font-mono"
														/>
													</TableCell>
													<TableCell>
														<Select
															value={row.axleGrouping}
															onValueChange={(v) => updateWeightRefRow(idx, 'axleGrouping', v)}
														>
															<SelectTrigger className="h-8">
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value="A">A</SelectItem>
																<SelectItem value="B">B</SelectItem>
																<SelectItem value="C">C</SelectItem>
																<SelectItem value="D">D</SelectItem>
															</SelectContent>
														</Select>
													</TableCell>
													<TableCell>
														<Select
															value={row.axleGroupId || 'none'}
															onValueChange={(v) => updateWeightRefRow(idx, 'axleGroupId', v === 'none' ? '' : v)}
														>
															<SelectTrigger className="h-8">
																<SelectValue placeholder="Select group" />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value="none">Select group...</SelectItem>
																{lookupData?.axleGroups.map(g => (
																	<SelectItem key={g.id} value={g.id}>
																		<span className="font-mono">{g.code}</span> - {g.name}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
													</TableCell>
													<TableCell>
														<Select
															value={row.tyreTypeId || 'none'}
															onValueChange={(v) => updateWeightRefRow(idx, 'tyreTypeId', v === 'none' ? undefined : v)}
														>
															<SelectTrigger className="h-8">
																<SelectValue placeholder="Optional" />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value="none">No selection</SelectItem>
																{lookupData?.tyreTypes.map(t => (
																	<SelectItem key={t.id} value={t.id}>
																		<span className="font-mono">{t.code}</span> - {t.name}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							)}
						</div>

						<Separator />

						{/* Configuration Details */}
						<div className="space-y-4">
							<h4 className="text-sm font-medium text-muted-foreground">Configuration Details</h4>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
								<div className="space-y-2">
									<Label htmlFor="legalFramework">Legal Framework</Label>
									<Controller
										name="legalFramework"
										control={control}
										render={({ field }) => (
											<Select value={field.value || undefined} onValueChange={field.onChange}>
												<SelectTrigger>
													<SelectValue placeholder="Select framework" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="TrafficAct">Traffic Act (Cap 403)</SelectItem>
													<SelectItem value="EAC">EAC Act (2016)</SelectItem>
												</SelectContent>
											</Select>
										)}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="axleNumber">Number of Axles</Label>
									<Controller
										name="axleNumber"
										control={control}
										render={({ field }) => (
											<Input
												id="axleNumber"
												type="number"
												min={2}
												max={8}
												value={field.value ?? 2}
												onChange={(e) => field.onChange(parseInt(e.target.value) || 2)}
												disabled={!!editing}
												className={editing ? 'bg-muted' : ''}
											/>
										)}
									/>
								</div>
								<div className="space-y-2">
									<Label>GVW Permissible (kg)</Label>
									<Input
										value={calculatedGvw.toLocaleString()}
										disabled
										className={`bg-muted font-mono ${isGvwOverLimit ? 'border-red-500 text-red-600' : ''}`}
									/>
									<p className="text-xs text-muted-foreground">Auto-calculated from weight references</p>
								</div>
							</div>

							{/* GVW Compliance Indicator */}
							<div className="p-3 rounded-lg border bg-muted/50">
								<div className="flex items-center justify-between mb-2">
									<span className="text-sm font-medium">GVW Compliance</span>
									{isGvwOverLimit ? (
										<div className="flex items-center gap-1 text-red-600">
											<AlertTriangle className="h-4 w-4" />
											<span className="text-sm font-medium">Exceeds 56T limit</span>
										</div>
									) : (
										<div className="flex items-center gap-1 text-green-600">
											<CheckCircle2 className="h-4 w-4" />
											<span className="text-sm font-medium">Within legal limit</span>
										</div>
									)}
								</div>
								<Progress
									value={Math.min((calculatedGvw / MAX_LEGAL_GVW_KG) * 100, 100)}
									className={`h-2 ${isGvwOverLimit ? '[&>div]:bg-red-500' : '[&>div]:bg-green-500'}`}
								/>
								<p className="text-xs text-muted-foreground mt-1">
									{calculatedGvw.toLocaleString()} kg / {MAX_LEGAL_GVW_KG.toLocaleString()} kg max
								</p>
							</div>
						</div>

						<Separator />

						{/* Additional Information */}
						<div className="space-y-4">
							<h4 className="text-sm font-medium text-muted-foreground">Additional Information</h4>
							<div className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="description">Description</Label>
									<Textarea
										id="description"
										placeholder="Brief description of this configuration..."
										{...register('description')}
										rows={2}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="visualDiagramUrl">Diagram URL (Optional)</Label>
									<Input
										id="visualDiagramUrl"
										placeholder="https://example.com/diagram.png"
										{...register('visualDiagramUrl')}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="notes">Notes (Optional)</Label>
									<Textarea
										id="notes"
										placeholder="Any additional notes..."
										{...register('notes')}
										rows={2}
									/>
								</div>
							</div>
						</div>

						<DialogFooter className="gap-2 sm:gap-0">
							<Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
								Cancel
							</Button>
							<Button type="submit" disabled={!canEdit || createMutation.isPending || updateMutation.isPending}>
								{createMutation.isPending || updateMutation.isPending ? 'Saving...' : editing ? 'Save Changes' : 'Create Configuration'}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Axle Configuration?</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete <strong>{configToDelete?.axleName}</strong> ({configToDelete?.axleCode})?
							This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleDelete}
							disabled={deleteMutation.isPending}
						>
							{deleteMutation.isPending ? 'Deleting...' : 'Delete'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
