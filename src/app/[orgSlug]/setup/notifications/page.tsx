'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useAuth } from '@/hooks/useAuth';
import {
    useRestoreCategoryDefaults,
    useSettingsByCategory,
    useUpdateSettingsBatch,
} from '@/hooks/queries/useSettingsQueries';
import {
    notificationApi,
    type CreateScheduledReportRequest,
    type ScheduledReportDto,
    type WorkflowPreferencesDto,
    type WorkflowPreferenceItem,
} from '@/lib/api/notification';
import type { ApplicationSettingDto, UpdateSettingsBatchRequest } from '@/lib/api/settings';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

import {
    AlertTriangle,
    Bell,
    CalendarClock,
    CheckCircle2,
    FileBarChart2,
    Info,
    Loader2,
    Mail,
    Plus,
    RefreshCcw,
    RotateCcw,
    Save,
    Send,
    SlidersHorizontal,
    Smartphone,
    Trash2,
    XCircle,
    Zap,
    Scale,
} from 'lucide-react';

export default function NotificationsSetupPage() {
    return (
        <ProtectedRoute requiredPermissions={['config.read']}>
            <NotificationsSetupContent />
        </ProtectedRoute>
    );
}

function NotificationsSetupContent() {
    const { isEnforcement, isCommercial } = useModuleAccess();
    const { user } = useAuth();
    const isPlatformOwner = user?.isSuperUser === true;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                    <Bell className="h-6 w-6 text-primary" />
                    Notifications
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage email delivery, workflow triggers, scheduled reports, and push notifications.
                </p>
            </div>

            <Tabs defaultValue={isPlatformOwner ? 'channels' : 'provider'} className="space-y-6">
                <TabsList className="h-10">
                    {isPlatformOwner && (
                        <TabsTrigger value="channels" className="gap-2 px-4">
                            <SlidersHorizontal className="h-4 w-4" />
                            <span className="hidden sm:inline">Channel Settings</span>
                        </TabsTrigger>
                    )}
                    <TabsTrigger value="provider" className="gap-2 px-4">
                        <Mail className="h-4 w-4" />
                        <span className="hidden sm:inline">Email</span>
                    </TabsTrigger>
                    <TabsTrigger value="workflows" className="gap-2 px-4">
                        <Zap className="h-4 w-4" />
                        <span className="hidden sm:inline">Workflows</span>
                    </TabsTrigger>
                    <TabsTrigger value="reports" className="gap-2 px-4">
                        <FileBarChart2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Reports</span>
                    </TabsTrigger>
                    <TabsTrigger value="push" className="gap-2 px-4">
                        <Smartphone className="h-4 w-4" />
                        <span className="hidden sm:inline">Push</span>
                    </TabsTrigger>
                </TabsList>

                {isPlatformOwner && (
                    <TabsContent value="channels">
                        <ChannelSettingsTab />
                    </TabsContent>
                )}
                <TabsContent value="provider">
                    <EmailProviderTab />
                </TabsContent>
                <TabsContent value="workflows">
                    <WorkflowsTab isEnforcement={isEnforcement} isCommercial={isCommercial} />
                </TabsContent>
                <TabsContent value="reports">
                    <ScheduledReportsTab />
                </TabsContent>
                <TabsContent value="push">
                    <PushNotificationsTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// ── Channel Settings Tab (platform owner only) ────────────────────────────────

function ChannelSettingsTab() {
    const { data: settings, isLoading, refetch } = useSettingsByCategory('Notifications');
    const updateBatch = useUpdateSettingsBatch();
    const restoreDefaults = useRestoreCategoryDefaults();
    const [editValues, setEditValues] = useState<Record<string, string>>({});
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (settings) {
            const values: Record<string, string> = {};
            settings.forEach((s: ApplicationSettingDto) => {
                values[s.settingKey] = s.settingValue;
            });
            setEditValues(values);
            setHasChanges(false);
        }
    }, [settings]);

    const handleChange = (key: string, value: string) => {
        setEditValues(prev => ({ ...prev, [key]: value }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!settings) return;
        const changed = settings
            .filter((s: ApplicationSettingDto) => editValues[s.settingKey] !== s.settingValue)
            .map((s: ApplicationSettingDto) => ({ settingKey: s.settingKey, settingValue: editValues[s.settingKey] }));
        if (changed.length === 0) { toast.info('No changes to save'); return; }
        try {
            await updateBatch.mutateAsync({ settings: changed } as UpdateSettingsBatchRequest);
            toast.success(`${changed.length} setting(s) updated`);
            setHasChanges(false);
            refetch();
        } catch { toast.error('Failed to save settings'); }
    };

    const handleRestoreDefaults = async () => {
        try {
            await restoreDefaults.mutateAsync('Notifications');
            toast.success('Notification settings restored to defaults');
            refetch();
        } catch { toast.error('Failed to restore defaults'); }
    };

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
        );
    }

    if (!settings || settings.length === 0) {
        return (
            <Card className="p-6">
                <p className="text-sm text-gray-500">No notification settings found. Run database seeding to initialize.</p>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3">
                <Info className="mt-0.5 h-4 w-4 text-blue-600 shrink-0" />
                <p className="text-sm text-blue-700">
                    Configure notification channels (email, SMS, push) and the centralized notifications service connection.
                </p>
            </div>

            <Card className="divide-y">
                {settings.map((setting: ApplicationSettingDto) => {
                    const isBoolean = setting.settingType === 'Boolean';
                    const currentValue = editValues[setting.settingKey] ?? setting.settingValue;

                    return (
                        <div key={setting.settingKey} className="flex items-center justify-between gap-4 p-4">
                            <div className="flex-1 min-w-0">
                                <Label className="text-sm font-medium text-gray-900">
                                    {setting.displayName || setting.settingKey}
                                </Label>
                                {setting.description && (
                                    <p className="text-xs text-gray-500 mt-0.5">{setting.description}</p>
                                )}
                                {!isBoolean && setting.defaultValue && currentValue !== setting.defaultValue && (
                                    <p className="text-xs text-amber-600 mt-0.5">Default: {setting.defaultValue}</p>
                                )}
                            </div>
                            <div className="shrink-0">
                                {isBoolean ? (
                                    <Switch
                                        checked={currentValue === 'true'}
                                        onCheckedChange={v => handleChange(setting.settingKey, v ? 'true' : 'false')}
                                        disabled={!setting.isEditable}
                                    />
                                ) : (
                                    <Input
                                        className="w-56 text-sm"
                                        value={currentValue}
                                        onChange={e => handleChange(setting.settingKey, e.target.value)}
                                        disabled={!setting.isEditable}
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}
            </Card>

            <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={handleRestoreDefaults} disabled={restoreDefaults.isPending}>
                    {restoreDefaults.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                    Restore Defaults
                </Button>
                <Button size="sm" onClick={handleSave} disabled={!hasChanges || updateBatch.isPending}>
                    {updateBatch.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                </Button>
            </div>
        </div>
    );
}

// ── Email Tab ──────────────────────────────────────────────────────────────────

function EmailProviderTab() {
    const [testRecipient, setTestRecipient] = useState('');

    const { data: selected = [], isLoading } = useQuery({
        queryKey: ['notif-providers-selected'],
        queryFn: () => notificationApi.getSelectedProviders(),
    });

    const testMutation = useMutation({
        mutationFn: () => notificationApi.sendTestEmail(testRecipient),
        onSuccess: () => toast.success('Test email sent — check your inbox'),
        onError: () => toast.error('Failed to send test email'),
    });

    const activeEmail = selected.find(s => s.providerType === 'email');

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            {/* Status card */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" />
                        Email Provider
                    </CardTitle>
                    <CardDescription>
                        Delivery is routed through the centralized notifications-api. Configure
                        SMTP credentials and sender identity in the notifications admin panel.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center gap-3 rounded-lg border p-4">
                            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                            <div className="space-y-1.5 flex-1">
                                <Skeleton className="h-4 w-36" />
                                <Skeleton className="h-3 w-52" />
                            </div>
                        </div>
                    ) : activeEmail ? (
                        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 shrink-0">
                                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">Email provider active</p>
                                <p className="text-xs text-muted-foreground capitalize">
                                    Using <strong>{activeEmail.providerName}</strong> via notifications-api
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 shrink-0">
                                <XCircle className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">No email provider configured</p>
                                <p className="text-xs text-muted-foreground">
                                    Add an SMTP provider in the notifications-api admin panel.
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Test email card */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Send className="h-4 w-4 text-primary" />
                        Send Test Email
                    </CardTitle>
                    <CardDescription>
                        Send a sample email to verify end-to-end delivery. The email will use
                        your tenant&apos;s brand colours and logo automatically.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="test-email" className="text-sm">Recipient address</Label>
                        <Input
                            id="test-email"
                            type="email"
                            placeholder="you@example.com"
                            value={testRecipient}
                            onChange={e => setTestRecipient(e.target.value)}
                        />
                    </div>
                    <Button
                        className="w-full gap-2"
                        disabled={!testRecipient.trim() || testMutation.isPending}
                        onClick={() => testMutation.mutate()}
                    >
                        {testMutation.isPending
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Send className="h-4 w-4" />}
                        Send Test Email
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

// ── Workflows Tab ──────────────────────────────────────────────────────────────

interface WorkflowConfig {
    key: keyof WorkflowPreferencesDto;
    label: string;
    description: string;
}

const ENFORCEMENT_WORKFLOWS: WorkflowConfig[] = [
    { key: 'overloadAlert', label: 'Overload Alert', description: 'Notify officer when a vehicle is detected overloaded' },
    { key: 'caseCreated', label: 'Case Created', description: 'Notify case manager when a new enforcement case is opened' },
    { key: 'caseEscalated', label: 'Case Escalated', description: 'Notify assignee when a case is escalated for prosecution' },
    { key: 'invoiceIssued', label: 'Invoice Issued', description: 'Notify transporter when an overload invoice is issued' },
    { key: 'invoiceOverdue', label: 'Invoice Overdue', description: 'Remind transporter when payment is overdue' },
];

const SHARED_WORKFLOWS: WorkflowConfig[] = [
    { key: 'weighingCompleted', label: 'Weighing Completed', description: 'Notify on every completed weighing transaction' },
    { key: 'userRegistered', label: 'User Registered', description: 'Welcome email when a new user account is created' },
    { key: 'passwordChanged', label: 'Password Changed', description: 'Confirmation email after a password change' },
];

const COMMERCIAL_WORKFLOWS: WorkflowConfig[] = [
    { key: 'weighingTicketReady', label: 'Ticket Ready', description: 'Notify transporter/driver when their weight ticket is complete and net weight is calculated' },
    { key: 'toleranceExceptionRaised', label: 'Tolerance Exception', description: 'Alert station manager when net weight discrepancy exceeds the configured tolerance band' },
    { key: 'staleWeighingAlert', label: 'Stale Weighing Alert', description: 'Warn manager when a first-weight transaction has been open beyond the pending threshold without a second weight' },
    { key: 'qualityDeductionApplied', label: 'Quality Deduction Applied', description: 'Notify transporter when a quality deduction (moisture, grade, etc.) is applied to their load' },
];

function WorkflowToggle({
    label, description, value, onChange,
}: {
    label: string;
    description: string;
    value: WorkflowPreferenceItem;
    onChange: (v: WorkflowPreferenceItem) => void;
}) {
    return (
        <div className="flex items-center justify-between py-3.5">
            <div className="flex-1 min-w-0 pr-6">
                <p className="text-sm font-medium leading-none">{label}</p>
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </div>
            <div className="flex items-center gap-5 shrink-0">
                <label className="flex items-center gap-2 cursor-pointer">
                    <Switch
                        checked={value.emailEnabled}
                        onCheckedChange={v => onChange({ ...value, emailEnabled: v })}
                    />
                    <span className="text-xs text-muted-foreground w-8">Email</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <Switch
                        checked={value.pushEnabled}
                        onCheckedChange={v => onChange({ ...value, pushEnabled: v })}
                    />
                    <span className="text-xs text-muted-foreground w-8">Push</span>
                </label>
            </div>
        </div>
    );
}

function WorkflowsTab({ isEnforcement, isCommercial }: { isEnforcement: boolean; isCommercial: boolean }) {
    const qc = useQueryClient();

    const { data: prefs, isLoading } = useQuery({
        queryKey: ['notif-workflow-prefs'],
        queryFn: () => notificationApi.getWorkflowPreferences(),
    });

    const [local, setLocal] = useState<WorkflowPreferencesDto | null>(null);
    const active = local ?? prefs;

    const saveMutation = useMutation({
        mutationFn: (p: WorkflowPreferencesDto) => notificationApi.saveWorkflowPreferences(p),
        onSuccess: () => {
            toast.success('Workflow preferences saved');
            qc.invalidateQueries({ queryKey: ['notif-workflow-prefs'] });
            setLocal(null);
        },
        onError: () => toast.error('Failed to save preferences'),
    });

    const update = (key: keyof WorkflowPreferencesDto, v: WorkflowPreferenceItem) => {
        setLocal(prev => ({ ...(prev ?? prefs!), [key]: v }));
    };

    if (isLoading || !active) {
        return (
            <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
                {isEnforcement && (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                Enforcement Workflows
                            </CardTitle>
                            <CardDescription>Axle load enforcement event notifications</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="divide-y">
                                {ENFORCEMENT_WORKFLOWS.map(w => (
                                    <WorkflowToggle
                                        key={w.key}
                                        label={w.label}
                                        description={w.description}
                                        value={active[w.key as keyof WorkflowPreferencesDto]}
                                        onChange={v => update(w.key as keyof WorkflowPreferencesDto, v)}
                                    />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {isCommercial && (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Scale className="h-4 w-4 text-blue-600" />
                                Commercial Weighing Workflows
                            </CardTitle>
                            <CardDescription>Two-pass commercial weighing event notifications</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="divide-y">
                                {COMMERCIAL_WORKFLOWS.map(w => (
                                    <WorkflowToggle
                                        key={w.key}
                                        label={w.label}
                                        description={w.description}
                                        value={active[w.key as keyof WorkflowPreferencesDto]}
                                        onChange={v => update(w.key as keyof WorkflowPreferencesDto, v)}
                                    />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card className={!isEnforcement && !isCommercial ? 'lg:col-span-2' : ''}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Bell className="h-4 w-4 text-primary" />
                            General Workflows
                        </CardTitle>
                        <CardDescription>Platform-wide event notifications for all tenants</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="divide-y">
                            {SHARED_WORKFLOWS.map(w => (
                                <WorkflowToggle
                                    key={w.key}
                                    label={w.label}
                                    description={w.description}
                                    value={active[w.key as keyof WorkflowPreferencesDto]}
                                    onChange={v => update(w.key as keyof WorkflowPreferencesDto, v)}
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end">
                <Button
                    className="gap-2"
                    disabled={!local || saveMutation.isPending}
                    onClick={() => local && saveMutation.mutate(local)}
                >
                    {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Preferences
                </Button>
            </div>
        </div>
    );
}

// ── Scheduled Reports Tab ──────────────────────────────────────────────────────

const CRON_PRESETS = [
    { label: 'Daily at 6 AM', value: '0 6 * * *' },
    { label: 'Daily at 8 AM', value: '0 8 * * *' },
    { label: 'Every Monday at 6 AM', value: '0 6 * * 1' },
    { label: 'Every Monday at 8 AM', value: '0 8 * * 1' },
    { label: 'First day of month at 7 AM', value: '0 7 1 * *' },
];

const DATE_RANGES = [
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'Last 7 Days', value: 'last_week' },
    { label: 'Last Month', value: 'last_month' },
    { label: 'Current Week', value: 'current_week' },
];

function ScheduledReportsTab() {
    const qc = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<ScheduledReportDto | null>(null);

    const { data: reports = [], isLoading } = useQuery({
        queryKey: ['scheduled-reports'],
        queryFn: () => notificationApi.getScheduledReports(),
    });

    const { data: reportTypes = [] } = useQuery({
        queryKey: ['scheduled-report-types'],
        queryFn: () => notificationApi.getReportTypes(),
    });

    const toggleMutation = useMutation({
        mutationFn: (id: string) => notificationApi.toggleScheduledReport(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['scheduled-reports'] }),
        onError: () => toast.error('Failed to toggle report'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => notificationApi.deleteScheduledReport(id),
        onSuccess: () => {
            toast.success('Scheduled report deleted');
            qc.invalidateQueries({ queryKey: ['scheduled-reports'] });
        },
        onError: () => toast.error('Failed to delete report'),
    });

    const statusIcon = (status?: string) => {
        if (status === 'success') return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />;
        if (status === 'failed') return <XCircle className="h-3.5 w-3.5 text-red-500" />;
        if (status === 'running') return <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />;
        return null;
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                    Automatically generate and email reports on a recurring schedule.
                </p>
                <Button size="sm" className="gap-2 shrink-0" onClick={() => { setEditing(null); setShowForm(true); }}>
                    <Plus className="h-4 w-4" />
                    New Schedule
                </Button>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                </div>
            ) : reports.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="rounded-full bg-muted p-3 mb-4">
                            <CalendarClock className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium">No scheduled reports</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Create an automated report schedule to get started.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {reports.map(report => (
                        <Card key={report.id} className={`transition-opacity ${!report.isActive ? 'opacity-55' : ''}`}>
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="font-semibold text-sm truncate">{report.name}</span>
                                        {statusIcon(report.lastRunStatus)}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                                            onClick={() => { setEditing(report); setShowForm(true); }}
                                        >
                                            <RefreshCcw className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                            onClick={() => deleteMutation.mutate(report.id)}
                                            disabled={deleteMutation.isPending}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    <Badge variant="secondary" className="text-[10px]">{report.format}</Badge>
                                    <Badge variant="outline" className="capitalize text-[10px]">{report.module}</Badge>
                                </div>

                                <p className="text-xs text-muted-foreground truncate">
                                    {report.scheduleDescription ?? report.cronSchedule} · {report.recipients.length} recipient{report.recipients.length !== 1 ? 's' : ''}
                                </p>

                                {report.nextRunAt && (
                                    <p className="text-[11px] text-blue-600 mt-1">
                                        Next: {new Date(report.nextRunAt).toLocaleString()}
                                    </p>
                                )}
                                {report.lastRunError && (
                                    <p className="text-[11px] text-red-500 mt-1 truncate">{report.lastRunError}</p>
                                )}

                                <Separator className="my-3" />

                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">{report.isActive ? 'Active' : 'Paused'}</span>
                                    <Switch
                                        checked={report.isActive}
                                        onCheckedChange={() => toggleMutation.mutate(report.id)}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {showForm && (
                <ScheduledReportForm
                    reportTypes={reportTypes}
                    initial={editing ?? undefined}
                    onClose={() => setShowForm(false)}
                    onSaved={() => {
                        setShowForm(false);
                        qc.invalidateQueries({ queryKey: ['scheduled-reports'] });
                    }}
                />
            )}
        </div>
    );
}

function ScheduledReportForm({
    reportTypes,
    initial,
    onClose,
    onSaved,
}: {
    reportTypes: { module: string; reportType: string; displayName: string; supportedFormats: string[] }[];
    initial?: ScheduledReportDto;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [name, setName] = useState(initial?.name ?? '');
    const [module, setModule] = useState(initial?.module ?? '');
    const [reportType, setReportType] = useState(initial?.reportType ?? '');
    const [format, setFormat] = useState(initial?.format ?? 'PDF');
    const [cronSchedule, setCronSchedule] = useState(initial?.cronSchedule ?? '0 6 * * *');
    const [schedDesc, setSchedDesc] = useState(initial?.scheduleDescription ?? '');
    const [recipients, setRecipients] = useState(initial?.recipients.join('\n') ?? '');
    const [dateRange, setDateRange] = useState('yesterday');

    const selectedTypeMeta = reportTypes.find(r => r.module === module && r.reportType === reportType);
    const moduleTypes = reportTypes.filter(r => r.module === module);
    const modules = [...new Set(reportTypes.map(r => r.module))];

    const saveMutation = useMutation({
        mutationFn: (req: CreateScheduledReportRequest & { id?: string; isActive?: boolean }) => {
            const { id, isActive, ...rest } = req;
            if (id) return notificationApi.updateScheduledReport(id, { ...rest, isActive: isActive ?? true });
            return notificationApi.createScheduledReport(rest);
        },
        onSuccess: () => {
            toast.success(initial ? 'Report schedule updated' : 'Report schedule created');
            onSaved();
        },
        onError: () => toast.error('Failed to save report schedule'),
    });

    const handleSave = () => {
        const recipientList = recipients.split('\n').map(r => r.trim()).filter(Boolean);
        if (!name || !module || !reportType || recipientList.length === 0) {
            toast.error('Fill in all required fields and add at least one recipient');
            return;
        }
        saveMutation.mutate({
            id: initial?.id,
            isActive: initial?.isActive ?? true,
            name,
            module,
            reportType,
            format,
            cronSchedule,
            scheduleDescription: schedDesc || undefined,
            recipients: recipientList,
            parametersJson: JSON.stringify({ date_range: dateRange }),
        });
    };

    return (
        <Card className="border-primary/20 bg-primary/[0.02]">
            <CardHeader className="pb-4">
                <CardTitle className="text-base">{initial ? 'Edit Schedule' : 'New Scheduled Report'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs">Name *</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Weekly Weighing Summary" />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">Module *</Label>
                        <Select value={module} onValueChange={v => { setModule(v); setReportType(''); }}>
                            <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
                            <SelectContent>
                                {modules.map(m => (
                                    <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">Report Type *</Label>
                        <Select value={reportType} onValueChange={setReportType} disabled={!module}>
                            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                            <SelectContent>
                                {moduleTypes.map(r => (
                                    <SelectItem key={r.reportType} value={r.reportType}>{r.displayName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">Format</Label>
                        <Select value={format} onValueChange={setFormat}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {(selectedTypeMeta?.supportedFormats ?? ['PDF', 'CSV', 'XLSX']).map(f => (
                                    <SelectItem key={f} value={f}>{f}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">Schedule (Cron)</Label>
                        <div className="flex gap-2">
                            <Input
                                value={cronSchedule}
                                onChange={e => setCronSchedule(e.target.value)}
                                className="font-mono text-xs flex-1"
                            />
                            <Select
                                value={cronSchedule}
                                onValueChange={v => {
                                    setCronSchedule(v);
                                    setSchedDesc(CRON_PRESETS.find(p => p.value === v)?.label ?? '');
                                }}
                            >
                                <SelectTrigger className="w-28 shrink-0"><SelectValue placeholder="Preset" /></SelectTrigger>
                                <SelectContent>
                                    {CRON_PRESETS.map(p => (
                                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">Data Period</Label>
                        <Select value={dateRange} onValueChange={setDateRange}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {DATE_RANGES.map(r => (
                                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs">Recipients * (one email per line)</Label>
                    <Textarea
                        value={recipients}
                        onChange={e => setRecipients(e.target.value)}
                        placeholder={"admin@example.com\nmanager@example.com"}
                        rows={3}
                        className="font-mono text-xs"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t">
                    <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                    <Button size="sm" className="gap-2" onClick={handleSave} disabled={saveMutation.isPending}>
                        {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {initial ? 'Update' : 'Create Schedule'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// ── Push Notifications Tab ─────────────────────────────────────────────────────

function PushNotificationsTab() {
    const qc = useQueryClient();
    const [token, setToken] = useState('');

    const { data: tokens = [], isLoading } = useQuery({
        queryKey: ['device-tokens'],
        queryFn: () => notificationApi.getDeviceTokens(),
    });

    const registerMutation = useMutation({
        mutationFn: () => notificationApi.registerDeviceToken(token, 'web', 'fcm'),
        onSuccess: () => {
            toast.success('Device token registered');
            setToken('');
            qc.invalidateQueries({ queryKey: ['device-tokens'] });
        },
        onError: () => toast.error('Failed to register device token'),
    });

    const deleteMutation = useMutation({
        mutationFn: (t: string) => notificationApi.deleteDeviceToken(t),
        onSuccess: () => {
            toast.success('Device token removed');
            qc.invalidateQueries({ queryKey: ['device-tokens'] });
        },
        onError: () => toast.error('Failed to remove device token'),
    });

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-primary" />
                        Register Device
                    </CardTitle>
                    <CardDescription>
                        Paste a Firebase Cloud Messaging (FCM) token to receive push notifications on this device.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs">FCM Device Token</Label>
                        <Input
                            value={token}
                            onChange={e => setToken(e.target.value)}
                            placeholder="Paste FCM token..."
                            className="font-mono text-xs"
                        />
                    </div>
                    <Button
                        className="w-full gap-2"
                        disabled={!token.trim() || registerMutation.isPending}
                        onClick={() => registerMutation.mutate()}
                    >
                        {registerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Register Token
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Bell className="h-4 w-4 text-primary" />
                        Registered Tokens
                        {tokens.length > 0 && (
                            <Badge variant="secondary" className="ml-auto">{tokens.length}</Badge>
                        )}
                    </CardTitle>
                    <CardDescription>Active FCM tokens tied to your account.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                    ) : tokens.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <Smartphone className="h-8 w-8 text-muted-foreground/50 mb-2" />
                            <p className="text-xs text-muted-foreground">No registered tokens</p>
                        </div>
                    ) : (
                        <ScrollArea className="max-h-60">
                            <div className="space-y-2">
                                {tokens.map(t => (
                                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                                        <div>
                                            <p className="text-xs font-medium capitalize">{t.platform}</p>
                                            <p className="text-[11px] text-muted-foreground">
                                                Added {new Date(t.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                                            onClick={() => deleteMutation.mutate(t.id)}
                                            disabled={deleteMutation.isPending}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
