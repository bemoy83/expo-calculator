'use client';

import { useEffect } from 'react';
import { NotificationToastCard } from '@/components/shared/NotificationToast';
import { useNotificationsStore, type AppNotification } from '@/lib/stores/notifications-store';

// Renders messages raised via notify(); mounted once in Layout. The live region is always
// present so screen readers announce messages as they are added.
export function NotificationHost() {
  const notifications = useNotificationsStore((state) => state.notifications);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-24 right-4 z-50 flex max-w-sm flex-col items-end gap-2 pointer-events-none"
    >
      {notifications.map((notification) => (
        <HostedNotification key={notification.id} notification={notification} />
      ))}
    </div>
  );
}

function HostedNotification({ notification }: { notification: AppNotification }) {
  const dismiss = useNotificationsStore((state) => state.dismiss);
  const { id, autoHideDuration } = notification;

  useEffect(() => {
    if (autoHideDuration <= 0) return;
    const timer = setTimeout(() => dismiss(id), autoHideDuration);
    return () => clearTimeout(timer);
  }, [id, autoHideDuration, dismiss]);

  return (
    <div className="pointer-events-auto">
      <NotificationToastCard
        message={notification.message}
        variant={notification.variant}
        onDismiss={() => dismiss(id)}
        showDismissButton
      />
    </div>
  );
}
