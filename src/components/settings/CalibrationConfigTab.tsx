'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertCircle,
    Calendar,
    CheckCircle2,
    Download,
    Loader2,
    Save,
    Scale,
    Shield,
    Upload
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

import {
    fetchApiSettings,
    saveApiSettings,
    type ApiSettingsResponse,
    type KeyValueEntry,
} from '@/lib/api/setup';
import {
    getActiveAnnualCalibration
} from '@/lib/api/weighing';

// ============================================================================
// Constants
// ============================================================================

const SCALE_TEST_FREQUENCIES = [
    { value: 'daily', label: 'Daily', description: 'Every working day' },
    { value: 'weekly', label: 'Weekly', description: 'Once per week' },
    { value: 'biweekly', label: 'Bi-weekly', description: 'Every two weeks' },
    { value: 'monthly', label: 'Monthly', description: 'Once per month' },
];

const SETTINGS_KEYS = {
    SCALE_TEST_FREQUENCY: 'ScaleTest.Frequency',
    SCALE_TEST_TARGET_WEIGHT: 'ScaleTest.TargetWeightKg',
    SCALE_TEST_MAX_DEVIATION: 'ScaleTest.MaxDeviationKg',
    ANNUAL_CALIBRATION_REMINDER_DAYS: 'AnnualCalibration.ReminderDays',
};

// ============================================================================
// CalibrationConfigTab
// ============================================================================

export function CalibrationConfigTab({ canEdit }: { canEdit: boolean }) {
    const queryClient = useQueryClient();

    // Fetch existing settings
    const { data: settingsResponse, isLoading: isLoadingSettings } = useQuery<ApiSettingsResponse>({
        queryKey: ['api-settings', 'calibration'],
        queryFn: () => fetchApiSettings('calibration'),
        staleTime: 5 * 60 * 1000,
    });
    const settings = settingsResponse?.entries;

    // Fetch active annual calibration record
    const { data: activeCalibration, isLoading: isLoadingCalibration } = useQuery({
        queryKey: ['annual-calibration', 'active'],
        queryFn: getActiveAnnualCalibration,
        retry: false,
    });

    // Form state
    const [frequency, setFrequency] = useState('weekly');
    const [targetWeight, setTargetWeight] = useState('18000');
    const [maxDeviation, setMaxDeviation] = useState('50');
    const [reminderDays, setReminderDays] = useState('30');

    // Populate from existing settings
    useEffect(() => {
        if (!settings || settings.length === 0) return;
        const findVal = (key: string) =>
            settings.find((s) => s.key === key)?.value;

        setFrequency(findVal(SETTINGS_KEYS.SCALE_TEST_FREQUENCY) ?? 'weekly');
        setTargetWeight(findVal(SETTINGS_KEYS.SCALE_TEST_TARGET_WEIGHT) ?? '18000');
        setMaxDeviation(findVal(SETTINGS_KEYS.SCALE_TEST_MAX_DEVIATION) ?? '50');
        setReminderDays(findVal(SETTINGS_KEYS.ANNUAL_CALIBRATION_REMINDER_DAYS) ?? '30');
    }, [settings]);

    // Save mutation
    const saveMutation = useMutation({
        mutationFn: async () => {
            const entries: KeyValueEntry[] = [
                { key: SETTINGS_KEYS.SCALE_TEST_FREQUENCY, value: frequency },
                { key: SETTINGS_KEYS.SCALE_TEST_TARGET_WEIGHT, value: targetWeight },
                { key: SETTINGS_KEYS.SCALE_TEST_MAX_DEVIATION, value: maxDeviation },
                { key: SETTINGS_KEYS.ANNUAL_CALIBRATION_REMINDER_DAYS, value: reminderDays },
            ];
            return saveApiSettings('calibration', entries);
        },
        onSuccess: () => {
            toast.success('Calibration settings saved successfully.');
            queryClient.invalidateQueries({ queryKey: ['api-settings'] });
        },
        onError: () => {
            toast.error('Failed to save calibration settings.');
        },
    });

    const handleSave = useCallback(() => {
        // Validate
        const tw = parseFloat(targetWeight);
        const md = parseFloat(maxDeviation);
        if (isNaN(tw) || tw <= 0) {
            toast.error('Target weight must be a positive number.');
            return;
        }
        if (isNaN(md) || md <= 0) {
            toast.error('Max deviation must be a positive number.');
            return;
        }
        saveMutation.mutate();
    }, [targetWeight, maxDeviation, saveMutation]);

    if (isLoadingSettings) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    // Determine calibration status
    const isCalibrationExpired = activeCalibration?.expiryDate
        ? new Date(activeCalibration.expiryDate) < new Date()
        : true;
    const daysUntilExpiry = activeCalibration?.expiryDate
        ? Math.ceil(
            (new Date(activeCalibration.expiryDate).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
        : null;

    return (
        <div className="space-y-6">
            {/* Annual Calibration Status Card */}
            <Card className="p-6">
                <div className="flex items-start gap-4">
                    <div
                        className={`rounded-xl p-3 ${isCalibrationExpired
                            ? 'bg-red-100 text-red-600'
                            : 'bg-emerald-100 text-emerald-600'
                            }`}
                    >
                        <Shield className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Annual Calibration Certificate &mdash; Cap 513
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Required by the Weights &amp; Measures Act (Cap 513). The weighbridge must be
                            inspected and recalibrated annually by the Department of Weights &amp; Measures.
                        </p>

                        {isLoadingCalibration ? (
                            <Skeleton className="h-16 mt-4" />
                        ) : activeCalibration ? (
                            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <InfoTile
                                    label="Certificate No."
                                    value={activeCalibration.certificateNo || '—'}
                                />
                                <InfoTile
                                    label="Issue Date"
                                    value={
                                        activeCalibration.issueDate
                                            ? new Date(activeCalibration.issueDate).toLocaleDateString()
                                            : '—'
                                    }
                                />
                                <InfoTile
                                    label="Expiry Date"
                                    value={
                                        activeCalibration.expiryDate
                                            ? new Date(activeCalibration.expiryDate).toLocaleDateString()
                                            : '—'
                                    }
                                    alert={isCalibrationExpired}
                                />
                                <InfoTile
                                    label="Status"
                                    value={activeCalibration.status}
                                    badge
                                    badgeColor={
                                        activeCalibration.status === 'Active'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-red-100 text-red-700'
                                    }
                                />
                            </div>
                        ) : (
                            <div className="mt-4 flex items-center gap-2 text-amber-600 bg-amber-50 rounded-lg p-3">
                                <AlertCircle className="h-5 w-5 shrink-0" />
                                <p className="text-sm">
                                    No active annual calibration record found. Upload a calibration
                                    certificate to comply with Cap 513 requirements.
                                </p>
                            </div>
                        )}

                        {/* Expiry Warning */}
                        {daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 60 && (
                            <div className="mt-3 flex items-center gap-2 text-amber-600 bg-amber-50 rounded-lg p-3">
                                <Calendar className="h-5 w-5 shrink-0" />
                                <p className="text-sm">
                                    Calibration certificate expires in{' '}
                                    <strong>{daysUntilExpiry} days</strong>. Schedule recalibration soon.
                                </p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="mt-4 flex flex-wrap gap-2">
                            {activeCalibration?.certificateFileUrl && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        window.open(activeCalibration.certificateFileUrl, '_blank')
                                    }
                                >
                                    <Download className="h-4 w-4 mr-1.5" />
                                    View Certificate PDF
                                </Button>
                            )}
                            {canEdit && (
                                <Button variant="outline" size="sm" disabled>
                                    <Upload className="h-4 w-4 mr-1.5" />
                                    Upload New Certificate
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Scale Test Configuration */}
            <Card className="p-6">
                <div className="flex items-start gap-4">
                    <div className="rounded-xl p-3 bg-blue-100 text-blue-600">
                        <Scale className="h-6 w-6" />
                    </div>
                    <div className="flex-1 space-y-5">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                Scale Test Configuration
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Configure how often routine scale tests are performed and what thresholds
                                determine a pass or fail result. Scale tests reference the active annual
                                calibration record for baseline weights.
                            </p>
                        </div>

                        {/* Frequency */}
                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="test-frequency">Test Frequency</Label>
                                <Select value={frequency} onValueChange={setFrequency} disabled={!canEdit}>
                                    <SelectTrigger id="test-frequency">
                                        <SelectValue placeholder="Select frequency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SCALE_TEST_FREQUENCIES.map((f) => (
                                            <SelectItem key={f.value} value={f.value}>
                                                {f.label} — {f.description}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    How often operators must complete scale tests before weighing.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="reminder-days">Expiry Reminder (days before)</Label>
                                <Input
                                    id="reminder-days"
                                    type="number"
                                    min={1}
                                    max={90}
                                    value={reminderDays}
                                    onChange={(e) => setReminderDays(e.target.value)}
                                    disabled={!canEdit}
                                    placeholder="30"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Days before annual calibration expiry to begin showing warnings.
                                </p>
                            </div>
                        </div>

                        {/* Weight Parameters */}
                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="target-weight">Target Weight (kg)</Label>
                                <Input
                                    id="target-weight"
                                    type="number"
                                    min={1}
                                    value={targetWeight}
                                    onChange={(e) => setTargetWeight(e.target.value)}
                                    disabled={!canEdit}
                                    placeholder="18000"
                                />
                                <p className="text-xs text-muted-foreground">
                                    The known test weight used during scale verification (from annual calibration).
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="max-deviation">Max Deviation (kg)</Label>
                                <Input
                                    id="max-deviation"
                                    type="number"
                                    min={0}
                                    value={maxDeviation}
                                    onChange={(e) => setMaxDeviation(e.target.value)}
                                    disabled={!canEdit}
                                    placeholder="50"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Maximum acceptable deviation between expected and actual weight reading.
                                    Scale test fails if exceeded.
                                </p>
                            </div>
                        </div>

                        {/* Active Calibration Reference */}
                        {activeCalibration && (
                            <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50/50 p-4">
                                <p className="text-sm font-medium text-blue-800 flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Linked to Annual Calibration
                                </p>
                                <p className="text-xs text-blue-600 mt-1">
                                    Scale tests reference certificate <strong>{activeCalibration.certificateNo}</strong> —
                                    Target: {activeCalibration.targetWeightKg?.toLocaleString()} kg,
                                    Max deviation: ±{activeCalibration.maxDeviationKg} kg
                                </p>
                            </div>
                        )}

                        {/* Save */}
                        {canEdit && (
                            <div className="flex justify-end pt-2">
                                <Button
                                    onClick={handleSave}
                                    disabled={saveMutation.isPending}
                                    className="gap-2"
                                >
                                    {saveMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4" />
                                    )}
                                    Save Configuration
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
}

// ============================================================================
// Helper Components
// ============================================================================

function InfoTile({
    label,
    value,
    alert,
    badge,
    badgeColor,
}: {
    label: string;
    value: string;
    alert?: boolean;
    badge?: boolean;
    badgeColor?: string;
}) {
    return (
        <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {label}
            </p>
            {badge ? (
                <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeColor}`}
                >
                    {value}
                </span>
            ) : (
                <p className={`text-sm font-semibold ${alert ? 'text-red-600' : 'text-gray-900'}`}>
                    {value}
                </p>
            )}
        </div>
    );
}
