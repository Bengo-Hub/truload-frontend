'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import {
    notificationApi,
    type CreateScheduledReportRequest,
    type ScheduledReportDto,
    type WorkflowPreferencesDto,
    type WorkflowPreferenceItem,
} from '@/lib/api/notification';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    Loader2,
    Mail,
    Plus,
    RefreshCcw,
    Save,
    Smartphone,
    Trash2,
    XCircle,
} from 'lucide-react';

// ============================================================================
// Page wrapper
// ============================================================================

export default function NotificationsSetupPage() {
    return (
        <ProtectedRoute requiredPermissions={['config.read']}>
            <NotificationsSetupContent />
        </ProtectedRoute>
    );
}

// ============================================================================
// Main content
// ============================================================================

function NotificationsSetupContent() {
    const { isEnforcement, isCommercial } = useModuleAccess();

    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                    <Bell className="h-6 w-6 text-primary" />
                    Notifications
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Configure email provider, workflow triggers, scheduled reports, and push notifications
                </p>
            </header>

            <Tabs defaultValue="provider" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4 max-w-3xl">
                    <TabsTrigger value="provider" className="gap-1.5">
                        <Mail className="h-4 w-4" />
                        <span className="hidden sm:inline">Email</span>
                    </TabsTrigger>
                    <TabsTrigger value="workflows" className="gap-1.5">
                        <Bell className="h-4 w-4" />
                        <span className="hidden sm:inline">Workflows</span>
                    </TabsTrigger>
                    <TabsTrigger value="reports" className="gap-1.5">
                        <FileBarChart2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Scheduled Reports</span>
                    </TabsTrigger>
                    <TabsTrigger value="push" className="gap-1.5">
                        <Smartphone className="h-4 w-4" />
                        <span className="hidden sm:inline">Push</span>
                    </TabsTrigger>
                </TabsList>

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

// ============================================================================
// Tab 1 — Email Integration (status + test)
// ============================================================================

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
        <div className="max-w-2xl space-y-6">
            <Card>
                <CardHeader className="border-b bg-gray-50/50 py-4">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" />
                        Notifications Service Integration
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Email delivery is managed by the centralized <strong>notifications-api</strong> service.
                        SMTP provider configuration, API keys, and sender identity are configured there and shared across all platform services.
                    </p>

                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50">
                        {isLoading ? (
                            <Skeleton className="h-5 w-48" />
                        ) : activeEmail ? (
                            <>
                                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Email provider active</p>
                                    <p className="text-xs text-muted-foreground capitalize">
                                        Using <strong>{activeEmail.providerName}</strong> via notifications-api
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <XCircle className="h-5 w-5 text-amber-500 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">No active email provider</p>
                                    <p className="text-xs text-muted-foreground">
                                        Configure an email provider in the notifications-api admin panel.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="border-b bg-gray-50/50 py-4">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" />
                        Send Test Email
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                    <p className="text-xs text-muted-foreground">
                        Trigger a sample notification email to confirm the notifications-api integration is working correctly.
                    </p>
                    <div className="flex gap-2">
                        <Input
                            type="email"
                            placeholder="recipient@example.com"
                            value={testRecipient}
                            onChange={e => setTestRecipient(e.target.value)}
                        />
                        <Button
                            size="sm"
                            className="shrink-0 gap-1.5"
                            disabled={!testRecipient.trim() || testMutation.isPending}
                            onClick={() => testMutation.mutate()}
                        >
                            {testMutation.isPending
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Mail className="h-4 w-4" />}
                            Send Test
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// ============================================================================
// Tab 2 — Workflows
// ============================================================================

interface WorkflowConfig {
    key: keyof WorkflowPreferencesDto;
    label: string;
    description: string;
    enforcement?: boolean;
    commercial?: boolean;
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

function WorkflowToggle({
    label, description, value, onChange,
}: {
    label: string;
    description: string;
    value: WorkflowPreferenceItem;
    onChange: (v: WorkflowPreferenceItem) => void;
}) {
    return (
        <div className="flex items-start justify-between py-3 border-b last:border-b-0">
            <div className="flex-1 min-w-0 pr-4">
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
                <div className="flex items-center gap-1.5">
                    <Switch
                        checked={value.emailEnabled}
                        onCheckedChange={v => onChange({ ...value, emailEnabled: v })}
                    />
                    <span className="text-xs text-muted-foreground">Email</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Switch
                        checked={value.pushEnabled}
                        onCheckedChange={v => onChange({ ...value, pushEnabled: v })}
                    />
                    <span className="text-xs text-muted-foreground">Push</span>
                </div>
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
        return <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;
    }

    return (
        <div className="space-y-6">
            {isEnforcement && (
                <Card>
                    <CardHeader className="border-b bg-gray-50/50 py-4">
                        <CardTitle className="text-base flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            Enforcement Workflows
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        {ENFORCEMENT_WORKFLOWS.map(w => (
                            <WorkflowToggle
                                key={w.key}
                                label={w.label}
                                description={w.description}
                                value={active[w.key]}
                                onChange={v => update(w.key, v)}
                            />
                        ))}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader className="border-b bg-gray-50/50 py-4">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Bell className="h-4 w-4 text-primary" />
                        General Workflows
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    {SHARED_WORKFLOWS.map(w => (
                        <WorkflowToggle
                            key={w.key}
                            label={w.label}
                            description={w.description}
                            value={active[w.key]}
                            onChange={v => update(w.key, v)}
                        />
                    ))}
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button
                    size="sm"
                    className="gap-1.5"
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

// ============================================================================
// Tab 3 — Scheduled Reports
// ============================================================================

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
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    Automatically generate and email reports on a schedule. Reports are sent to configured recipients.
                </p>
                <Button size="sm" className="gap-1.5" onClick={() => { setEditing(null); setShowForm(true); }}>
                    <Plus className="h-4 w-4" />
                    New Schedule
                </Button>
            </div>

            {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
            ) : reports.length === 0 ? (
                <Card className="p-12 text-center border-dashed">
                    <CalendarClock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm font-medium text-gray-700">No scheduled reports</p>
                    <p className="text-xs text-muted-foreground mt-1">Click "New Schedule" to create your first automated report.</p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {reports.map(report => (
                        <Card key={report.id} className={`p-4 ${!report.isActive ? 'opacity-60' : ''}`}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-sm text-gray-900">{report.name}</span>
                                        <Badge variant="outline" className="text-[10px]">{report.format}</Badge>
                                        <Badge variant="outline" className="capitalize text-[10px]">{report.module}</Badge>
                                        {statusIcon(report.lastRunStatus)}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {report.scheduleDescription ?? report.cronSchedule} · {report.recipients.length} recipient(s)
                                    </p>
                                    {report.nextRunAt && (
                                        <p className="text-[11px] text-blue-600 mt-0.5">
                                            Next run: {new Date(report.nextRunAt).toLocaleString()}
                                        </p>
                                    )}
                                    {report.lastRunError && (
                                        <p className="text-[11px] text-red-500 mt-0.5 truncate">{report.lastRunError}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Switch
                                        checked={report.isActive}
                                        onCheckedChange={() => toggleMutation.mutate(report.id)}
                                    />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                        onClick={() => { setEditing(report); setShowForm(true); }}
                                    >
                                        <RefreshCcw className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        onClick={() => deleteMutation.mutate(report.id)}
                                        disabled={deleteMutation.isPending}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
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
        <Card className="border-primary/30 bg-primary/2">
            <CardHeader className="border-b py-4">
                <CardTitle className="text-base">{initial ? 'Edit Schedule' : 'New Scheduled Report'}</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs">Schedule Name *</Label>
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
                            <SelectTrigger><SelectValue placeholder="Select report type" /></SelectTrigger>
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
                            <Input value={cronSchedule} onChange={e => setCronSchedule(e.target.value)} className="font-mono text-xs" />
                            <Select value={cronSchedule} onValueChange={v => { setCronSchedule(v); setSchedDesc(CRON_PRESETS.find(p => p.value === v)?.label ?? ''); }}>
                                <SelectTrigger className="w-32 shrink-0"><SelectValue placeholder="Preset" /></SelectTrigger>
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
                        placeholder="admin@example.com&#10;manager@example.com"
                        rows={3}
                        className="font-mono text-xs"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t">
                    <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                    <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={saveMutation.isPending}>
                        {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {initial ? 'Update' : 'Create Schedule'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// ============================================================================
// Tab 4 — Push Notifications
// ============================================================================

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
        <div className="space-y-6 max-w-2xl">
            <Card>
                <CardHeader className="border-b bg-gray-50/50 py-4">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-primary" />
                        FCM Device Tokens
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                    <p className="text-xs text-muted-foreground">
                        Register Firebase Cloud Messaging (FCM) tokens to receive push notifications on this device.
                        The token is obtained from the Firebase SDK and tied to your account.
                    </p>

                    <div className="flex gap-2">
                        <Input
                            value={token}
                            onChange={e => setToken(e.target.value)}
                            placeholder="Paste FCM device token..."
                            className="font-mono text-xs"
                        />
                        <Button
                            size="sm"
                            className="shrink-0 gap-1.5"
                            disabled={!token.trim() || registerMutation.isPending}
                            onClick={() => registerMutation.mutate()}
                        >
                            {registerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            Register
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Registered Tokens ({tokens.length})
                        </h4>
                        {isLoading ? (
                            Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
                        ) : tokens.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-4 text-center">No registered tokens</p>
                        ) : (
                            <ScrollArea className="max-h-48">
                                <div className="space-y-2">
                                    {tokens.map(t => (
                                        <div key={t.id} className="flex items-center justify-between p-2 border rounded-lg bg-gray-50/50">
                                            <div>
                                                <span className="text-xs font-medium capitalize">{t.platform}</span>
                                                <span className="text-[10px] text-muted-foreground ml-2">
                                                    {new Date(t.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
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
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
