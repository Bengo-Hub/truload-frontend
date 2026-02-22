/**
 * Notifications dialog showing user notifications with tabs and deletion.
 * Matches Figma design with All/Unread/Read tabs and notification icons.
 */

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { notificationApi, UserNotification } from '@/lib/api/notificationApi';
import { AlertTriangle, CheckCircle, ExternalLink, Info, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface NotificationsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationsDialog({ isOpen, onClose }: NotificationsDialogProps) {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = { toast: (p: any) => console.log(p) }; // Mock toast if missing

  const fetchNotifications = async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const data = await notificationApi.getInbox();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const readNotifications = notifications.filter((n) => n.isRead);
  const unreadNotifications = notifications.filter((n) => !n.isRead);

  const handleDelete = async (id: string) => {
    try {
      await notificationApi.delete(id);
      setNotifications(notifications.filter((n) => n.id !== id));
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete notification',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-400" />;
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const NotificationItem = ({ notification }: { notification: UserNotification }) => (
    <div
      className={`flex gap-3 border-b border-gray-100 p-4 transition-colors hover:bg-gray-50 cursor-pointer ${!notification.isRead ? 'bg-blue-50/50' : ''
        }`}
      onClick={() => handleMarkAsRead(notification.id)}
    >
      <div className="mt-1 flex-shrink-0">{getNotificationIcon(notification.type)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className={`font-medium text-gray-900 ${!notification.isRead ? 'font-semibold' : ''}`}>
            {notification.title}
          </h3>
          <div className="flex items-center gap-1">
            {notification.linkUrl && (
              <a
                href={notification.linkUrl}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-4 w-4 text-blue-500" />
              </a>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(notification.id);
              }}
            >
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </Button>
          </div>
        </div>
        <p className="mt-1 text-sm text-gray-600 line-clamp-2">{notification.message}</p>
        <p className="mt-2 text-xs text-gray-500">{formatTime(notification.timestamp)}</p>
      </div>
      {!notification.isRead && (
        <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Notifications</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="all" className="flex-1 overflow-hidden flex flex-col min-h-0 w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">
              Unread
              {unreadCount > 0 && (
                <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="read">Read</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="py-8 text-center text-gray-500">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-gray-500">No notifications</div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
              ))
            )}
          </TabsContent>

          <TabsContent value="unread" className="flex-1 overflow-y-auto min-h-0">
            {unreadNotifications.length === 0 ? (
              <div className="py-8 text-center text-gray-500">No unread notifications</div>
            ) : (
              unreadNotifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
              ))
            )}
          </TabsContent>

          <TabsContent value="read" className="flex-1 overflow-y-auto min-h-0">
            {readNotifications.length === 0 ? (
              <div className="py-8 text-center text-gray-500">No read notifications</div>
            ) : (
              readNotifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
