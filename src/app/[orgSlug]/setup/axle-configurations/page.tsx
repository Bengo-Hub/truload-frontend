'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useHasPermission } from '@/hooks/useAuth';
import { useCanDelete } from '@/hooks/useCanDelete';
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
import { Pagination, usePagination } from '@/components/ui/pagination';

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

// ── Regulatory weight limits per tyre type ──
// These are the legal max weights from Kenya Traffic Act Cap 403 & EAC Vehicle Load Control Act 2016
const TYRE_WEIGHT_LIMITS: Record<string, { steering: number; single: number; tandem: number; label: string }> = {
	S: { steering: 8000, single: 7500, tandem: 7500, label: 'Single Tyre (S)' },
	D: { steering: 10000, single: 10000, tandem: 9000, label: 'Dual Tyres (D)' },
	W: { steering: 8000, single: 8000, tandem: 8000, label: 'Wide Single (W)' },
};

// ── Common vehicle templates for quick setup ──
interface AxleTemplate {
	label: string;
	description: string;
	axleCount: number;
	code: string;
	positions: { grouping: 'A' | 'B' | 'C' | 'D'; tyreCode: string; groupCode: string }[];
}

const AXLE_TEMPLATES: AxleTemplate[] = [
	{
		label: '2A — Standard 2-Axle Truck',
		description: 'Steering (S) + Single Drive (D) — GVW ~18,000 kg',
		axleCount: 2, code: '2A',
		positions: [
			{ grouping: 'A', tyreCode: 'S', groupCode: 'S1' },
			{ grouping: 'B', tyreCode: 'D', groupCode: 'SA4' },
		],
	},
	{
		label: '3A — 3-Axle Truck (Tandem Rear)',
		description: 'Steering (S) + Tandem Drive (DD) — GVW ~26,000 kg',
		axleCount: 3, code: '3A',
		positions: [
			{ grouping: 'A', tyreCode: 'S', groupCode: 'S1' },
			{ grouping: 'B', tyreCode: 'D', groupCode: 'TAG8' },
			{ grouping: 'B', tyreCode: 'D', groupCode: 'TAG8' },
		],
	},
	{
		label: '4D — 4-Axle Semi-Trailer',
		description: 'Steering (S) + Drive (D) + Tandem Trailer (DD) — GVW ~36,000 kg',
		axleCount: 4, code: '4D',
		positions: [
			{ grouping: 'A', tyreCode: 'S', groupCode: 'S1' },
			{ grouping: 'B', tyreCode: 'D', groupCode: 'SA4' },
			{ grouping: 'C', tyreCode: 'D', groupCode: 'TAG8' },
			{ grouping: 'C', tyreCode: 'D', groupCode: 'TAG8' },
		],
	},
	{
		label: '5D — 5-Axle Articulated Truck',
		description: 'Steering + Tandem Drive + Tandem Trailer — GVW ~44,000 kg',
		axleCount: 5, code: '5D',
		positions: [
			{ grouping: 'A', tyreCode: 'S', groupCode: 'S1' },
			{ grouping: 'B', tyreCode: 'D', groupCode: 'TAG8' },
			{ grouping: 'B', tyreCode: 'D', groupCode: 'TAG8' },
			{ grouping: 'C', tyreCode: 'D', groupCode: 'TAG8' },
			{ grouping: 'C', tyreCode: 'D', groupCode: 'TAG8' },
		],
	},
	{
		label: '6A — 6-Axle Heavy Transport',
		description: 'Steering + Tandem Drive + Tridem Trailer — GVW ~50,000 kg',
		axleCount: 6, code: '6A',
		positions: [
			{ grouping: 'A', tyreCode: 'S', groupCode: 'S1' },
			{ grouping: 'B', tyreCode: 'D', groupCode: 'TAG8' },
			{ grouping: 'B', tyreCode: 'D', groupCode: 'TAG8' },
			{ grouping: 'C', tyreCode: 'D', groupCode: 'TAG12' },
			{ grouping: 'C', tyreCode: 'D', groupCode: 'TAG12' },
			{ grouping: 'C', tyreCode: 'D', groupCode: 'TAG12' },
		],
	},
	{
		label: '7C — 7-Axle B-Double',
		description: 'Steering + Tandem + Tandem + Tandem — GVW ~56,000 kg',
		axleCount: 7, code: '7C',
		positions: [
			{ grouping: 'A', tyreCode: 'S', groupCode: 'S1' },
			{ grouping: 'B', tyreCode: 'D', groupCode: 'TAG8' },
			{ grouping: 'B', tyreCode: 'D', groupCode: 'TAG8' },
			{ grouping: 'C', tyreCode: 'D', groupCode: 'TAG8' },
			{ grouping: 'C', tyreCode: 'D', groupCode: 'TAG8' },
			{ grouping: 'D', tyreCode: 'D', groupCode: 'TAG8' },
			{ grouping: 'D', tyreCode: 'D', groupCode: 'TAG8' },
		],
	},
];

/**
 * Calculates the legal permissible weight for an axle based on its position,
 * tyre type, and whether it's in a multi-axle group (tandem/tridem).
 */
function calculateLegalWeight(
	tyreCode: string,
	position: number,
	grouping: string,
	isMultiAxleGroup: boolean
): number {
	const limits = TYRE_WEIGHT_LIMITS[tyreCode];
	if (!limits) return 8000;
	if (position === 1 && grouping === 'A') return limits.steering;
	if (isMultiAxleGroup) return limits.tandem;
	return limits.single;
}

/**
 * Generates a pipe-notation axle code from weight reference rows.
 * e.g., rows with groups A:S, B:DD, C:DD → "5*S|DD|DD|"
 */
function generateAxleCode(rows: WeightRefRow[], lookupData: WeightRefLookupData | null): string {
	if (!lookupData || rows.length === 0) return '';
	const groups: Record<string, string[]> = {};
	for (const row of rows) {
		const tyreType = lookupData.tyreTypes.find(t => t.id === row.tyreTypeId);
		const code = tyreType?.code || '?';
		if (!groups[row.axleGrouping]) groups[row.axleGrouping] = [];
		groups[row.axleGrouping].push(code);
	}
	const parts = ['A', 'B', 'C', 'D'].map(g => (groups[g] || []).join(''));
	return `${rows.length}*${parts.join('|')}`;
}

export default function AxleConfigurationsPage() {
	return (
		<ProtectedRoute requiredPermissions={["config.manage_axle"]}>
			<AxleConfigurationsContent />
		</ProtectedRoute>
	);
}

function AxleConfigurationsContent() {
	const canEdit = useHasPermission('config.manage_axle');
	const canDelete = useCanDelete();
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
	const [axleCountFilter, setAxleCountFilter] = useState<string>('all');
	const [typeFilter, setTypeFilter] = useState<string>('all'); // all, standard, derived

	const { data: configs = [], isLoading } = useQuery({
		queryKey: ['axleConfigurations'],
		queryFn: () => fetchAxleConfigurations({ includeInactive: true }),
	});

	// Pagination
	const { pageNumber, pageSize, setPage, setPageSize } = usePagination(25);

	// Filtered configurations
	const filteredConfigs = useMemo(() => {
		return configs.filter(cfg => {
			const matchesSearch = searchQuery === '' ||
				cfg.axleCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
				cfg.axleName.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesFramework = frameworkFilter === 'all' || cfg.legalFramework === frameworkFilter;
			const matchesAxleCount = axleCountFilter === 'all' || cfg.axleNumber === parseInt(axleCountFilter);
			const matchesType = typeFilter === 'all' ||
				(typeFilter === 'standard' && cfg.isStandard) ||
				(typeFilter === 'derived' && !cfg.isStandard);
			return matchesSearch && matchesFramework && matchesAxleCount && matchesType;
		});
	}, [configs, searchQuery, frameworkFilter, axleCountFilter, typeFilter]);

	// Paginated configurations
	const paginatedConfigs = useMemo(() => {
		const start = (pageNumber - 1) * pageSize;
		return filteredConfigs.slice(start, start + pageSize);
	}, [filteredConfigs, pageNumber, pageSize]);

	// Reset to page 1 when filters change
	useEffect(() => {
		setPage(1);
	}, [searchQuery, frameworkFilter, setPage]);

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

			// Auto-fill weight when tyre type changes
			if (field === 'tyreTypeId' && value && lookupData) {
				const tyreType = lookupData.tyreTypes.find(t => t.id === value);
				if (tyreType?.code) {
					const row = updated[index];
					// Determine if this axle is in a multi-axle group (tandem/tridem)
					const sameGroupCount = updated.filter(r => r.axleGrouping === row.axleGrouping).length;
					const isMultiAxle = sameGroupCount >= 2;
					const suggestedWeight = calculateLegalWeight(
						tyreType.code, row.axlePosition, row.axleGrouping, isMultiAxle
					);
					// Only auto-fill if weight is 0 (not yet set)
					if (row.axleLegalWeightKg === 0) {
						updated[index].axleLegalWeightKg = suggestedWeight;
					}
				}
			}

			// Auto-suggest axle group when grouping changes
			if (field === 'axleGrouping' && lookupData) {
				const row = updated[index];
				const sameGroupCount = updated.filter(r => r.axleGrouping === value).length;
				const tyreType = lookupData.tyreTypes.find(t => t.id === row.tyreTypeId);
				const tyreCode = tyreType?.code || '';

				let suggestedGroupCode = '';
				if (sameGroupCount >= 4) suggestedGroupCode = 'QAG16';
				else if (sameGroupCount >= 3) suggestedGroupCode = 'TAG12';
				else if (sameGroupCount >= 2) suggestedGroupCode = 'TAG8';
				else if (tyreCode === 'D') suggestedGroupCode = 'SA4';
				else if (tyreCode === 'W') suggestedGroupCode = 'WWW';
				else suggestedGroupCode = 'S1';

				const matchingGroup = lookupData.axleGroups.find(g => g.code === suggestedGroupCode);
				if (matchingGroup && !row.axleGroupId) {
					updated[index].axleGroupId = matchingGroup.id;
				}
			}

			return updated;
		});
	};

	// Apply a template preset to quickly set up a common configuration
	const applyTemplate = useCallback((template: AxleTemplate) => {
		if (!lookupData) return;

		const rows: WeightRefRow[] = template.positions.map((pos, idx) => {
			const tyreType = lookupData.tyreTypes.find(t => t.code === pos.tyreCode);
			const axleGroup = lookupData.axleGroups.find(g => g.code === pos.groupCode);
			const isMultiAxle = template.positions.filter(p => p.grouping === pos.grouping).length >= 2;
			const weight = calculateLegalWeight(pos.tyreCode, idx + 1, pos.grouping, isMultiAxle);

			return {
				axlePosition: idx + 1,
				axleLegalWeightKg: weight,
				axleGrouping: pos.grouping,
				axleGroupId: axleGroup?.id || '',
				tyreTypeId: tyreType?.id,
			};
		});

		setWeightRefRows(rows);
		// Also update form fields
		reset(prev => ({
			...prev,
			axleCode: template.code,
			axleName: template.label,
			axleNumber: template.axleCount,
		}));
	}, [lookupData, reset]);

	// Auto-fill all weights based on tyre types (for when user has set tyre types but not weights)
	const autoFillWeights = useCallback(() => {
		if (!lookupData) return;
		setWeightRefRows(prev => {
			return prev.map((row, idx) => {
				const tyreType = lookupData.tyreTypes.find(t => t.id === row.tyreTypeId);
				if (!tyreType?.code) return row;
				const sameGroupCount = prev.filter(r => r.axleGrouping === row.axleGrouping).length;
				const isMultiAxle = sameGroupCount >= 2;
				const weight = calculateLegalWeight(tyreType.code, row.axlePosition, row.axleGrouping, isMultiAxle);
				return { ...row, axleLegalWeightKg: weight };
			});
		});
		toast.success('Weights auto-filled based on tyre types and legal limits');
	}, [lookupData]);

	// Auto-generate axle code from current weight ref pattern
	const autoGenerateCode = useCallback(() => {
		const code = generateAxleCode(weightRefRows, lookupData);
		if (code && !editing) {
			reset(prev => ({ ...prev, axleCode: code }));
			toast.success(`Code generated: ${code}`);
		}
	}, [weightRefRows, lookupData, editing, reset]);

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
								<SelectTrigger className="w-full sm:w-40">
									<SelectValue placeholder="Framework" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Frameworks</SelectItem>
									<SelectItem value="EAC">EAC Act</SelectItem>
									<SelectItem value="TrafficAct">Traffic Act</SelectItem>
									<SelectItem value="BOTH">Both Acts</SelectItem>
								</SelectContent>
							</Select>
							<Select value={axleCountFilter} onValueChange={setAxleCountFilter}>
								<SelectTrigger className="w-full sm:w-32">
									<SelectValue placeholder="Axles" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Axles</SelectItem>
									<SelectItem value="2">2-Axle</SelectItem>
									<SelectItem value="3">3-Axle</SelectItem>
									<SelectItem value="4">4-Axle</SelectItem>
									<SelectItem value="5">5-Axle</SelectItem>
									<SelectItem value="6">6-Axle</SelectItem>
									<SelectItem value="7">7-Axle</SelectItem>
									<SelectItem value="8">8-Axle</SelectItem>
									<SelectItem value="9">9-Axle</SelectItem>
									<SelectItem value="10">10-Axle</SelectItem>
									<SelectItem value="11">11-Axle</SelectItem>
								</SelectContent>
							</Select>
							<Select value={typeFilter} onValueChange={setTypeFilter}>
								<SelectTrigger className="w-full sm:w-32">
									<SelectValue placeholder="Type" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Types</SelectItem>
									<SelectItem value="standard">Standard</SelectItem>
									<SelectItem value="derived">Derived</SelectItem>
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
									{paginatedConfigs.map((cfg) => (
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
													<Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px]">Standard</Badge>
												) : (
													<Badge variant="outline" className="text-[10px]">Derived</Badge>
												)}
											</TableCell>
											<TableCell className="text-right">
												<div className="flex items-center justify-end gap-1">
													{canEdit && (<Button
																variant="ghost"
																size="icon"
																onClick={() => openEdit(cfg)}
																title="Edit"
																className="h-8 w-8"
															>
																<Edit3 className="h-4 w-4" />
															</Button>)}
													{canDelete && (<Button
																variant="ghost"
																size="icon"
																onClick={() => confirmDelete(cfg)}
																title="Delete"
																className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
															>
																<Trash2 className="h-4 w-4" />
															</Button>)}
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</ScrollArea>
					</div>
					{filteredConfigs.length > 0 && (
						<div className="border-t px-4 py-3">
							<Pagination
								page={pageNumber}
								pageSize={pageSize}
								totalItems={filteredConfigs.length}
								onPageChange={setPage}
								onPageSizeChange={setPageSize}
								pageSizeOptions={[10, 25, 50, 100]}
								isLoading={isLoading}
							/>
						</div>
					)}
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

						{/* Quick Setup Templates (only in create mode) */}
						{!editing && (
							<div className="space-y-3">
								<h4 className="text-sm font-medium text-muted-foreground">Quick Setup — Start from a Template</h4>
								<p className="text-xs text-muted-foreground">
									Select a common vehicle configuration below to auto-fill all weight references with legal limits.
									You can customize any values after applying.
								</p>
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
									{AXLE_TEMPLATES.map((tpl) => (
										<button
											key={tpl.code}
											type="button"
											onClick={() => applyTemplate(tpl)}
											className="text-left p-3 rounded-lg border border-dashed hover:border-primary hover:bg-primary/5 transition-colors group"
										>
											<div className="flex items-center gap-2">
												<Truck className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
												<span className="text-sm font-medium group-hover:text-primary">{tpl.label}</span>
											</div>
											<p className="text-xs text-muted-foreground mt-1">{tpl.description}</p>
										</button>
									))}
								</div>
							</div>
						)}

						<Separator />

						{/* Weight References */}
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<h4 className="text-sm font-medium text-muted-foreground">
									Weight References ({weightRefRows.length} axle{weightRefRows.length !== 1 ? 's' : ''})
								</h4>
								<div className="flex items-center gap-2">
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={autoFillWeights}
										disabled={!lookupData || weightRefRows.every(r => !r.tyreTypeId)}
										title="Auto-fill weights based on selected tyre types and legal limits"
									>
										<Scale className="mr-1 h-3 w-3" />
										Auto-fill Weights
									</Button>
									{!editing && (
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={autoGenerateCode}
											disabled={!lookupData || weightRefRows.every(r => !r.tyreTypeId)}
											title="Generate axle code from the current tyre type pattern"
										>
											Generate Code
										</Button>
									)}
								</div>
							</div>

							{isLoadingLookup ? (
								<div className="space-y-2">
									{[...Array(3)].map((_, i) => (
										<Skeleton key={i} className="h-10 w-full" />
									))}
								</div>
							) : (
								<>
								{/* Help text for weight reference setup */}
								<div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 space-y-2">
									<p className="font-medium">How to set up axle weight references:</p>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
										<div>
											<p className="font-semibold text-blue-800 mb-0.5">Tyre Types & Legal Limits</p>
											<ul className="list-disc list-inside space-y-0.5 text-blue-600">
												<li><strong>S</strong> (Single): Steering = 8,000 kg / Other = 7,500 kg</li>
												<li><strong>D</strong> (Dual/Twin): Steering = 10,000 kg / Single = 10,000 kg / Tandem = 9,000 kg</li>
												<li><strong>W</strong> (Wide Single): 8,000 kg (all positions)</li>
											</ul>
										</div>
										<div>
											<p className="font-semibold text-blue-800 mb-0.5">Axle Group Limits</p>
											<ul className="list-disc list-inside space-y-0.5 text-blue-600">
												<li><strong>Steering</strong> (Group A, 1 axle): up to 10,000 kg</li>
												<li><strong>Single Drive</strong> (1 axle): up to 10,000 kg</li>
												<li><strong>Tandem</strong> (TAG8, 2 axles): up to 18,000 kg combined</li>
												<li><strong>Tridem</strong> (TAG12, 3 axles): up to 24,000 kg combined</li>
												<li><strong>Quad</strong> (QAG16, 4 axles): up to 32,000 kg combined</li>
											</ul>
										</div>
									</div>
									<div className="border-t border-blue-200 pt-1.5 mt-1">
										<p className="font-semibold text-blue-800 mb-0.5">Quick Tips</p>
										<ul className="list-disc list-inside space-y-0.5 text-blue-600">
											<li>Select a <strong>Tyre Configuration</strong> first — weights auto-fill based on legal limits</li>
											<li>Axles in the same <strong>Deck Group</strong> form a group (e.g., two axles both in B = Tandem)</li>
											<li><strong>GVW</strong> is auto-calculated as the sum of all axle weights — max 56,000 kg in Kenya</li>
											<li>Use <strong>Auto-fill Weights</strong> button to recalculate all weights from tyre types</li>
										</ul>
									</div>
								</div>

								<div className="border rounded-lg overflow-hidden">
									<Table>
										<TableHeader>
											<TableRow className="bg-muted/30">
												<TableHead className="w-[50px] text-center">Pos</TableHead>
												<TableHead className="w-[140px]">Permissible Weight (kg)</TableHead>
												<TableHead className="w-[110px]">Deck Group</TableHead>
												<TableHead>Axle Group (classification)</TableHead>
												<TableHead>Tyre Configuration</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{weightRefRows.map((row, idx) => {
												const selectedGroup = lookupData?.axleGroups.find(g => g.id === row.axleGroupId);
												const selectedTyre = lookupData?.tyreTypes.find(t => t.id === row.tyreTypeId);
												return (
												<TableRow key={row.axlePosition}>
													<TableCell className="text-center font-mono font-bold text-lg">
														{row.axlePosition}
													</TableCell>
													<TableCell>
														<Input
															type="number"
															min={0}
															max={12000}
															value={row.axleLegalWeightKg || ''}
															onChange={(e) => updateWeightRefRow(idx, 'axleLegalWeightKg', parseInt(e.target.value) || 0)}
															placeholder="6000-10000"
															className="h-8 font-mono"
														/>
														{selectedTyre?.code && (() => {
															const sameGroupCount = weightRefRows.filter(r => r.axleGrouping === row.axleGrouping).length;
															const isMulti = sameGroupCount >= 2;
															const recommended = calculateLegalWeight(selectedTyre.code, row.axlePosition, row.axleGrouping, isMulti);
															const isMatch = row.axleLegalWeightKg === recommended;
															return (
																<p className={`text-[10px] mt-0.5 ${isMatch ? 'text-green-600' : 'text-amber-600'}`}>
																	{isMatch ? '✓' : '⚠'} Legal limit: {recommended.toLocaleString()} kg
																	{!isMatch && row.axleLegalWeightKg > 0 && (
																		<button
																			type="button"
																			className="ml-1 underline hover:text-primary"
																			onClick={() => updateWeightRefRow(idx, 'axleLegalWeightKg', recommended)}
																		>
																			use this
																		</button>
																	)}
																</p>
															);
														})()}
														{!selectedTyre?.code && selectedGroup && (
															<p className="text-[10px] text-muted-foreground mt-0.5">
																Typical: {selectedGroup.typicalWeightKg?.toLocaleString() || '?'} kg
															</p>
														)}
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
																<SelectItem value="A">A — Front/Steering</SelectItem>
																<SelectItem value="B">B — Trailer coupling</SelectItem>
																<SelectItem value="C">C — Mid-section</SelectItem>
																<SelectItem value="D">D — Rear</SelectItem>
															</SelectContent>
														</Select>
													</TableCell>
													<TableCell>
														<Select
															value={row.axleGroupId || 'none'}
															onValueChange={(v) => updateWeightRefRow(idx, 'axleGroupId', v === 'none' ? '' : v)}
														>
															<SelectTrigger className="h-8">
																<SelectValue placeholder="Select..." />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value="none">— Select axle group —</SelectItem>
																{lookupData?.axleGroups.map(g => (
																	<SelectItem key={g.id} value={g.id}>
																		<span className="font-mono font-bold">{g.code}</span>
																		<span className="text-muted-foreground ml-1">
																			{g.name} (~{g.typicalWeightKg?.toLocaleString()}kg)
																		</span>
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
																<SelectValue placeholder="Select tyre..." />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value="none">— No tyre type —</SelectItem>
																{lookupData?.tyreTypes.map(t => (
																	<SelectItem key={t.id} value={t.id}>
																		<span className="font-mono font-bold">{t.code}</span>
																		<span className="text-muted-foreground ml-1">
																			{t.name} (max {t.typicalMaxWeightKg?.toLocaleString()}kg)
																		</span>
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
														{selectedTyre && (
															<p className="text-[10px] text-muted-foreground mt-0.5">
																{selectedTyre.description}
															</p>
														)}
													</TableCell>
												</TableRow>
												);
											})}
										</TableBody>
									</Table>
								</div>

								{/* GVW summary */}
								<div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2">
									<span className="text-sm font-medium text-muted-foreground">
										Calculated GVW (sum of all axle weights)
									</span>
									<span className="text-lg font-bold font-mono">
										{weightRefRows.reduce((sum, r) => sum + (r.axleLegalWeightKg || 0), 0).toLocaleString()} kg
									</span>
								</div>
								</>
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
												max={11}
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
