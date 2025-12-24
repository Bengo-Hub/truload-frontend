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
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { useState } from 'react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info';
  read: boolean;
  timestamp: Date;
}

const SAMPLE_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    title: 'Overloaded Vehicle Detected',
    message: 'Vehicle KKA 123A exceeds weight limit by 2.5 tons',
    type: 'warning',
    read: false,
    timestamp: new Date(Date.now() - 5 * 60000),
  },
  {
    id: '2',
    title: 'Scale Calibration Required',
    message: 'Scale 01 requires calibration. Last calibration was 30 days ago.',
    type: 'info',
    read: false,
    timestamp: new Date(Date.now() - 15 * 60000),
  },
  {
    id: '3',
    title: 'New Case Created',
    message: 'Case #2024-001234 has been created and assigned to you',
    type: 'success',
    read: true,
    timestamp: new Date(Date.now() - 2 * 3600000),
  },
  {
    id: '4',
    title: 'Document Uploaded',
    message: 'Prosecution documentation for vehicle KKA 456B uploaded successfully',
    type: 'success',
    read: true,
    timestamp: new Date(Date.now() - 1 * 86400000),
  },
  {
    id: '5',
    title: 'System Maintenance',
    message: 'Scheduled system maintenance on Dec 15 from 10 PM to 12 AM',
    type: 'info',
    read: true,
    timestamp: new Date(Date.now() - 2 * 86400000),
  },
];

interface NotificationsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationsDialog({ isOpen, onClose }: NotificationsDialogProps) {
  const [notifications, setNotifications] = useState<Notification[]>(SAMPLE_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const readNotifications = notifications.filter((n) => n.read);
  const unreadNotifications = notifications.filter((n) => !n.read);

  const handleDelete = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id));
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

  const formatTime = (date: Date) => {
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

  const NotificationItem = ({ notification }: { notification: Notification }) => (
    <div
      className={`flex gap-3 border-b border-gray-100 p-4 transition-colors hover:bg-gray-50 ${
        !notification.read ? 'bg-blue-50' : ''
      }`}
    >
      <div className="mt-1 flex-shrink-0">{getNotificationIcon(notification.type)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-gray-900">{notification.title}</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 flex-shrink-0"
            onClick={() => handleDelete(notification.id)}
          >
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </Button>
        </div>
        <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
        <p className="mt-2 text-xs text-gray-500">{formatTime(notification.timestamp)}</p>
      </div>
      {!notification.read && (
        <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Notifications</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="all" className="w-full">
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

          <TabsContent value="all" className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-gray-500">No notifications</div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
              ))
            )}
          </TabsContent>

          <TabsContent value="unread" className="max-h-96 overflow-y-auto">
            {unreadNotifications.length === 0 ? (
              <div className="py-8 text-center text-gray-500">No unread notifications</div>
            ) : (
              unreadNotifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
              ))
            )}
          </TabsContent>

          <TabsContent value="read" className="max-h-96 overflow-y-auto">
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
