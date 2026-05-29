import { apiClient } from './client';

// ── Template DTOs ────────────────────────────────────────────────────────────

export interface NotificationTemplateDto {
    name: string;
    channel: string;
    description: string;
    variables: string[];
    defaultSubject?: string;
}

// ── Provider DTOs ────────────────────────────────────────────────────────────

export interface NotificationProviderDto {
    providerType: string;
    providerName: string;
    environment: string;
    isActive: boolean;
}

export interface ProviderSettingsDto {
    providerType: string;
    providerName: string;
    settings: Record<string, string>;
}

export interface SaveProviderSettingsRequest {
    providerType: string;
    providerName: string;
    settings: Record<string, string>;
}

export interface SelectProviderRequest {
    providerType: string;
    providerName: string;
    environment?: string;
}

// ── Workflow preferences ─────────────────────────────────────────────────────

export interface WorkflowPreferenceItem {
    emailEnabled: boolean;
    pushEnabled: boolean;
    smsEnabled: boolean;
    /** Additional CC addresses for this specific workflow. */
    ccRecipients: string[];
}

/** Pool/group-level default recipients shared across all workflows in the group. */
export interface WorkflowGroupPreferences {
    /** Email addresses that always receive every notification in this workflow group. */
    defaultRecipients: string[];
}

export interface WorkflowPreferencesDto {
    // Per-workflow toggles
    overloadAlert: WorkflowPreferenceItem;
    caseCreated: WorkflowPreferenceItem;
    caseEscalated: WorkflowPreferenceItem;
    invoiceIssued: WorkflowPreferenceItem;
    invoiceOverdue: WorkflowPreferenceItem;
    weighingCompleted: WorkflowPreferenceItem;
    scheduledReport: WorkflowPreferenceItem;
    userRegistered: WorkflowPreferenceItem;
    passwordChanged: WorkflowPreferenceItem;
    // Commercial weighing events
    toleranceExceptionRaised: WorkflowPreferenceItem;
    weighingTicketReady: WorkflowPreferenceItem;
    staleWeighingAlert: WorkflowPreferenceItem;
    qualityDeductionApplied: WorkflowPreferenceItem;
    // Group-level default recipients
    weighingGroup: WorkflowGroupPreferences;
    casesGroup: WorkflowGroupPreferences;
    invoicesGroup: WorkflowGroupPreferences;
    receiptsGroup: WorkflowGroupPreferences;
}

// ── Scheduled report DTOs ────────────────────────────────────────────────────

export interface ScheduledReportDto {
    id: string;
    name: string;
    module: string;
    reportType: string;
    format: string;
    cronSchedule: string;
    scheduleDescription?: string;
    recipients: string[];
    parametersJson?: string;
    nextRunAt?: string;
    lastRunAt?: string;
    lastRunStatus?: string;
    lastRunError?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateScheduledReportRequest {
    name: string;
    module: string;
    reportType: string;
    format: string;
    cronSchedule: string;
    scheduleDescription?: string;
    recipients: string[];
    parametersJson?: string;
}

export interface ReportTypeMetaDto {
    module: string;
    reportType: string;
    displayName: string;
    supportedFormats: string[];
}

// ── Device token DTO ─────────────────────────────────────────────────────────

export interface DeviceTokenItemDto {
    id: string;
    platform: string;
    provider: string;
    createdAt: string;
}

// ── API ──────────────────────────────────────────────────────────────────────

export const notificationApi = {
    // Templates
    getTemplates: async (channel?: string) => {
        const params = channel ? { channel } : {};
        const response = await apiClient.get<NotificationTemplateDto[]>('/shared/notifications/templates', { params });
        return response.data;
    },

    // Providers
    getAvailableProviders: async () => {
        const res = await apiClient.get<{ providers: NotificationProviderDto[] }>('/shared/notifications/providers/available');
        return res.data.providers;
    },

    getSelectedProviders: async () => {
        const res = await apiClient.get<{ selected: NotificationProviderDto[] }>('/shared/notifications/providers/selected');
        return res.data.selected;
    },

    selectProvider: async (request: SelectProviderRequest) => {
        await apiClient.post('/shared/notifications/providers/select', request);
    },

    getProviderSettings: async (providerType: string, providerName: string) => {
        const res = await apiClient.get<ProviderSettingsDto>('/shared/notifications/providers/settings', {
            params: { providerType, providerName },
        });
        return res.data;
    },

    saveProviderSettings: async (request: SaveProviderSettingsRequest) => {
        await apiClient.post('/shared/notifications/providers/settings', request);
    },

    sendTestEmail: async (recipient: string) => {
        await apiClient.post('/shared/notifications/test-email', { recipient });
    },

    // Workflow preferences
    getWorkflowPreferences: async () => {
        const res = await apiClient.get<WorkflowPreferencesDto>('/shared/notifications/workflow-preferences');
        return res.data;
    },

    saveWorkflowPreferences: async (prefs: WorkflowPreferencesDto) => {
        await apiClient.put('/shared/notifications/workflow-preferences', prefs);
    },

    // Scheduled reports
    getScheduledReports: async () => {
        const res = await apiClient.get<ScheduledReportDto[]>('/shared/scheduled-reports');
        return res.data;
    },

    getReportTypes: async () => {
        const res = await apiClient.get<ReportTypeMetaDto[]>('/shared/scheduled-reports/report-types');
        return res.data;
    },

    createScheduledReport: async (request: CreateScheduledReportRequest) => {
        const res = await apiClient.post<ScheduledReportDto>('/shared/scheduled-reports', request);
        return res.data;
    },

    updateScheduledReport: async (id: string, request: CreateScheduledReportRequest & { isActive: boolean }) => {
        const res = await apiClient.put<ScheduledReportDto>(`/shared/scheduled-reports/${id}`, request);
        return res.data;
    },

    toggleScheduledReport: async (id: string) => {
        const res = await apiClient.patch<{ isActive: boolean }>(`/shared/scheduled-reports/${id}/toggle`);
        return res.data;
    },

    deleteScheduledReport: async (id: string) => {
        await apiClient.delete(`/shared/scheduled-reports/${id}`);
    },

    // Device tokens (FCM push)
    getDeviceTokens: async () => {
        const res = await apiClient.get<{ tokens: DeviceTokenItemDto[] }>('/shared/notifications/push/tokens');
        return res.data.tokens;
    },

    registerDeviceToken: async (token: string, platform: string = 'web', provider: string = 'fcm') => {
        await apiClient.post('/shared/notifications/push/tokens', { token, platform, provider });
    },

    deleteDeviceToken: async (token: string) => {
        await apiClient.delete('/shared/notifications/push/tokens', { data: { token } });
    },
};
