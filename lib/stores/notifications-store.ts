import { create } from 'zustand';
import { generateId } from '../utils';

export type NotificationVariant = 'success' | 'error' | 'warning' | 'info';

export interface AppNotification {
  id: string;
  message: string;
  variant: NotificationVariant;
  /** Milliseconds before auto-dismiss; 0 keeps it until dismissed. */
  autoHideDuration: number;
  /** A button on the message, such as Undo; using it dismisses the message. */
  action?: NotificationAction;
}

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

interface NotifyInput {
  message: string;
  variant?: NotificationVariant;
  autoHideDuration?: number;
  action?: NotificationAction;
}

interface NotificationsStore {
  notifications: AppNotification[];
  notify: (input: NotifyInput) => string;
  dismiss: (id: string) => void;
}

const DEFAULT_DURATION: Record<NotificationVariant, number> = {
  success: 4000,
  info: 5000,
  warning: 8000,
  error: 8000,
};

const MAX_VISIBLE = 4;

export const useNotificationsStore = create<NotificationsStore>()((set) => ({
  notifications: [],
  notify: ({ message, variant = 'info', autoHideDuration, action }) => {
    const id = generateId();
    set((state) => ({
      notifications: [
        ...state.notifications,
        { id, message, variant, autoHideDuration: autoHideDuration ?? DEFAULT_DURATION[variant], action },
      ].slice(-MAX_VISIBLE),
    }));
    return id;
  },
  dismiss: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((notification) => notification.id !== id),
    })),
}));

// In-app replacement for window.alert, callable from stores and hooks as well as components.
export function notify(input: NotifyInput): string {
  return useNotificationsStore.getState().notify(input);
}
