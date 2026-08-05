import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';

// Cola de notificaciones (snackbars) global. Los errores de API llegan aquí
// ya traducidos por el catálogo de códigos (src/api/errors.ts).
export type NotificationSeverity = 'success' | 'error' | 'warning' | 'info';

export interface AppNotification {
  id: string;
  severity: NotificationSeverity;
  message: string;
}

interface NotificationsState {
  queue: AppNotification[];
}

const initialState: NotificationsState = { queue: [] };

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    notify: {
      reducer(state, action: PayloadAction<AppNotification>) {
        state.queue.push(action.payload);
      },
      prepare(input: { severity: NotificationSeverity; message: string }) {
        return { payload: { id: nanoid(), ...input } };
      },
    },
    dismiss(state, action: PayloadAction<string>) {
      state.queue = state.queue.filter((n) => n.id !== action.payload);
    },
  },
});

export const { notify, dismiss } = notificationsSlice.actions;
export const notificationsReducer = notificationsSlice.reducer;
