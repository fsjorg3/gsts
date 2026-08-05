import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// Estado de UI transversal (client state). El server state vive en React Query.
interface UiState {
  sidebarAbierto: boolean;
}

const initialState: UiState = { sidebarAbierto: true };

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSidebarAbierto(state, action: PayloadAction<boolean>) {
      state.sidebarAbierto = action.payload;
    },
  },
});

export const { setSidebarAbierto } = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
