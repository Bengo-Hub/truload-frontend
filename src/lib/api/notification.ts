import { api } from './index';

export interface NotificationTemplateDto {
    name: string;
    channel: string;
    description: string;
    variables: string[];
    defaultSubject?: string;
}

export const notificationApi = {
    getTemplates: async (channel?: string) => {
        const params = channel ? { channel } : {};
        const response = await api.get<NotificationTemplateDto[]>('/shared/notifications/templates', { params });
        return response.data;
    },
};
