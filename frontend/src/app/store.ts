import { configureStore } from '@reduxjs/toolkit';
import { notificationsReducer } from '@/store/notificationsSlice';
import { uiReducer } from '@/store/uiSlice';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    notifications: notificationsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
