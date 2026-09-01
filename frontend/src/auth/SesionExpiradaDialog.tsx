import { useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import { iniciarSesion } from './oidc';
import { useSesionExpirada } from './sesion';

// Aviso de sesión vencida. Deliberadamente NO redirige solo a Keycloak: si la
// sesión expira a media captura de un trámite, irse sin avisar se llevaría el
// formulario. El usuario decide cuándo salir, y vuelve a la misma URL.
//
// No es descartable: sin `onClose` MUI ignora Escape y el clic en el fondo, y
// no hay botón de cerrar. Con la sesión vencida no queda nada útil que hacer
// detrás — cada petición respondería 401.
export function SesionExpiradaDialog() {
  const expirada = useSesionExpirada();
  const [saliendo, setSaliendo] = useState(false);

  if (!expirada) return null;

  return (
    <Dialog open aria-labelledby="sesion-expirada-titulo">
      <DialogTitle id="sesion-expirada-titulo" sx={{ fontWeight: 700 }}>
        Tu sesión expiró
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Por seguridad, la sesión se cerró por inactividad. Vuelve a iniciar sesión para continuar;
          regresarás a esta misma pantalla.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          disabled={saliendo}
          onClick={() => {
            setSaliendo(true);
            void iniciarSesion();
          }}
        >
          {saliendo ? 'Redirigiendo…' : 'Iniciar sesión'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
