import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { dismiss } from '@/store/notificationsSlice';

// Muestra la primera notificación de la cola global (Redux) como snackbar.
export function Notifier() {
  const actual = useAppSelector((state) => state.notifications.queue[0]);
  const dispatch = useAppDispatch();

  if (!actual) return null;

  const cerrar = () => dispatch(dismiss(actual.id));

  return (
    <Snackbar
      key={actual.id}
      open
      autoHideDuration={6000}
      onClose={(_evento, reason) => {
        if (reason !== 'clickaway') cerrar();
      }}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert severity={actual.severity} onClose={cerrar} sx={{ minWidth: 320 }}>
        {actual.message}
      </Alert>
    </Snackbar>
  );
}
