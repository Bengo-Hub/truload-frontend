import { api } from './api';

export interface UserNotification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'info' | 'error';
    isRead: boolean;
    timestamp: string;
    linkUrl?: string;
    metadataJson?: string;
}

export const notificationApi = {
    getInbox: async (isRead?: boolean, limit: number = 50) => {
        const params = new URLSearchParams();
        if (isRead !== undefined) params.append('isRead', isRead.toString());
        params.append('limit', limit.toString());

        const response = await api.get<UserNotification[]>(`/shared/notifications/inbox?${params.toString()}`);
        return response.data;
    },

    markAsRead: async (id: string) => {
        await api.post(`/shared/notifications/inbox/${id}/read`);
    },

    delete: async (id: string) => {
        await api.delete(`/shared/notifications/inbox/${id}`);
    },

    updatePushSubscription: async (subscription: any) => {
        await api.post('/shared/notifications/push-subscription', subscription);
    }
};
