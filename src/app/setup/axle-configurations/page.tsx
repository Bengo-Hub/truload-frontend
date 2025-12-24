'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { useHasPermission } from '@/hooks/useAuth';
import {
  createAxleConfiguration,
  deleteAxleConfiguration,
  fetchAxleConfigurations,
  updateAxleConfiguration,
} from '@/lib/api/setup';
import type { AxleConfigurationResponse, CreateAxleConfigurationRequest, UpdateAxleConfigurationRequest } from '@/types/setup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type AxleFormValues = CreateAxleConfigurationRequest;

export default function AxleConfigurationsPage() {
	return (
		<AppShell title="Axle Configurations" subtitle="Manage axle types and their GVW limits">
			<ProtectedRoute requiredPermissions={["configuration.view_axles"]}>
				<AxleConfigurationsContent />
			</ProtectedRoute>
		</AppShell>
	);
}

function AxleConfigurationsContent() {
	const canEdit = useHasPermission(['configuration.tolerances', 'configuration.permits'], 'any');
	const queryClient = useQueryClient();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editing, setEditing] = useState<AxleConfigurationResponse | null>(null);

	const { data: configs = [], isLoading } = useQuery({
		queryKey: ['axleConfigurations'],
		queryFn: () => fetchAxleConfigurations({ includeInactive: true }),
	});

	const createMutation = useMutation({
		mutationFn: (payload: CreateAxleConfigurationRequest) => createAxleConfiguration(payload),
		onSuccess: () => {
			toast.success('Axle configuration created');
			queryClient.invalidateQueries({ queryKey: ['axleConfigurations'] });
			setDialogOpen(false);
		},
		onError: () => toast.error('Failed to create axle configuration'),
	});

	const updateMutation = useMutation({
		mutationFn: (input: { id: string; payload: UpdateAxleConfigurationRequest }) =>
			updateAxleConfiguration(input.id, input.payload),
		onSuccess: () => {
			toast.success('Axle configuration updated');
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
		},
		onError: () => toast.error('Failed to delete axle configuration'),
	});

	const { register, handleSubmit, control, reset } = useForm<AxleFormValues>({
		defaultValues: {
			axleCode: '',
			axleName: '',
			description: '',
			axleNumber: 1,
			gvwPermissibleKg: 0,
			legalFramework: 'TrafficAct',
			visualDiagramUrl: '',
			notes: '',
		},
	});

	useEffect(() => {
		if (editing) {
			reset({
				axleCode: editing.axleCode,
				axleName: editing.axleName,
				description: editing.description ?? '',
				axleNumber: editing.axleNumber,
				gvwPermissibleKg: editing.gvwPermissibleKg,
				legalFramework: editing.legalFramework ?? 'TrafficAct',
				visualDiagramUrl: editing.visualDiagramUrl ?? '',
				notes: editing.notes ?? '',
			});
		} else {
			reset({
				axleCode: '',
				axleName: '',
				description: '',
				axleNumber: 1,
				gvwPermissibleKg: 0,
				legalFramework: 'TrafficAct',
				visualDiagramUrl: '',
				notes: '',
			});
		}
	}, [editing, reset]);

	const onSubmit = async (values: AxleFormValues) => {
		if (editing) {
			const payload: UpdateAxleConfigurationRequest = {
				axleName: values.axleName,
				description: values.description,
				gvwPermissibleKg: values.gvwPermissibleKg,
				legalFramework: values.legalFramework,
				visualDiagramUrl: values.visualDiagramUrl,
				notes: values.notes,
				isActive: true,
			};
			await updateMutation.mutateAsync({ id: editing.id, payload });
		} else {
			const payload: CreateAxleConfigurationRequest = { ...values };
			await createMutation.mutateAsync(payload);
		}
	};

	const openCreate = () => {
		setEditing(null);
		setDialogOpen(true);
	};

	const openEdit = (cfg: AxleConfigurationResponse) => {
		setEditing(cfg);
		setDialogOpen(true);
	};

	const handleDelete = (cfg: AxleConfigurationResponse) => {
		if (!canEdit) return;
		if (window.confirm(`Delete ${cfg.axleName}?`)) {
			deleteMutation.mutate(cfg.id);
		}
	};

	return (
		<div className="space-y-6">
			<header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-lg font-semibold text-gray-900">Axle Configurations</h2>
					<p className="text-sm text-gray-500">Define axle limits and legal tolerances.</p>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" size="icon" onClick={() => queryClient.invalidateQueries({ queryKey: ['axleConfigurations'] })}>
						<RefreshCcw className="h-4 w-4" />
					</Button>
					{canEdit && (
						<Button onClick={openCreate}>
							<Plus className="mr-2 h-4 w-4" />
							New Configuration
						</Button>
					)}
				</div>
			</header>

			<div className="rounded-xl border border-gray-200 bg-white shadow-sm">
				<div className="border-b border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 flex items-center justify-between">
					<span>Configurations</span>
					<span className="text-xs text-gray-500">{configs.length} entries</span>
				</div>
				<ScrollArea className="max-h-[70vh]">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Axle Code</TableHead>
								<TableHead>Axle Name</TableHead>
								<TableHead>Axle Number</TableHead>
								<TableHead>GVW Permissible (kg)</TableHead>
								<TableHead>Standard</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading && (
								<TableRow>
									<TableCell colSpan={6} className="text-center text-sm text-gray-500">
										Loading configurations...
									</TableCell>
								</TableRow>
							)}
							{!isLoading && configs.length === 0 && (
								<TableRow>
									<TableCell colSpan={6} className="text-center text-sm text-gray-500">
										No axle configurations.
									</TableCell>
								</TableRow>
							)}
							{configs.map((cfg) => (
								<TableRow key={cfg.id}>
									  <TableCell className="font-medium">{cfg.axleCode}</TableCell>
									  <TableCell>{cfg.axleName}</TableCell>
									  <TableCell>{cfg.axleNumber}</TableCell>
									  <TableCell>{cfg.gvwPermissibleKg}</TableCell>
									<TableCell>
										<span className={`rounded-full px-2 py-1 text-xs ${cfg.isStandard ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
											{cfg.isStandard ? 'Yes' : 'No'}
										</span>
									</TableCell>
									<TableCell className="text-right space-x-2">
										{canEdit && (
											<Button variant="ghost" size="sm" onClick={() => openEdit(cfg)}>
												Edit
											</Button>
										)}
										{canEdit && (
											<Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(cfg)}>
												Delete
											</Button>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</ScrollArea>
			</div>

			<Dialog open={dialogOpen} onOpenChange={(v) => (!v ? setDialogOpen(false) : null)}>
				<DialogContent className="sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>{editing ? 'Edit configuration' : 'Create configuration'}</DialogTitle>
						<DialogDescription>Define axle constraints and weights.</DialogDescription>
					</DialogHeader>

					<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="axleCode">Axle code</Label>
								<Input id="axleCode" placeholder="AX-001" {...register('axleCode', { required: true })} />
							</div>
							<div className="space-y-2">
								<Label htmlFor="axleName">Axle name</Label>
								<Input id="axleName" placeholder="Standard Truck" {...register('axleName', { required: true })} />
							</div>
							<div className="space-y-2">
								<Label htmlFor="legalFramework">Legal framework</Label>
								<Controller
									name="legalFramework"
									control={control}
									render={({ field }) => (
										<Select value={field.value ?? ''} onValueChange={field.onChange}>
											<SelectTrigger>
												<SelectValue placeholder="Select framework" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="TrafficAct">Traffic Act</SelectItem>
												<SelectItem value="EAC">EAC</SelectItem>
											</SelectContent>
										</Select>
									)}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="axleNumber">Axle number</Label>
								<Controller
									name="axleNumber"
									control={control}
									render={({ field }) => (
										<Input id="axleNumber" type="number" min={1} max={10} value={field.value ?? 1} onChange={(e) => field.onChange(parseInt(e.target.value))} />
									)}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="gvwPermissibleKg">GVW permissible (kg)</Label>
								<Controller
									name="gvwPermissibleKg"
									control={control}
									render={({ field }) => (
										<Input id="gvwPermissibleKg" type="number" min={0} value={field.value ?? 0} onChange={(e) => field.onChange(parseInt(e.target.value))} />
									)}
								/>
							</div>
							<div className="space-y-2 md:col-span-2">
								<Label htmlFor="description">Description</Label>
								<Input id="description" placeholder="Notes" {...register('description')} />
							</div>
							<div className="space-y-2 md:col-span-2">
								<Label htmlFor="visualDiagramUrl">Visual diagram URL</Label>
								<Input id="visualDiagramUrl" placeholder="https://..." {...register('visualDiagramUrl')} />
							</div>
							<div className="space-y-2 md:col-span-2">
								<Label htmlFor="notes">Notes</Label>
								<Input id="notes" placeholder="Additional notes" {...register('notes')} />
							</div>
						</div>

						<DialogFooter className="justify-between">
							<Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
								Cancel
							</Button>
							<Button type="submit" disabled={!canEdit}>
								{editing ? 'Save changes' : 'Create configuration'}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}