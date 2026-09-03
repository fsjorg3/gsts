import Typography from '@mui/material/Typography';
import { Card } from '@/shared/components';
import { FormularioConstancia } from './FormularioConstancia';

export function PanelConstancias() {
  return (
    <Card titulo="Constancias emitidas">
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 2.5 }}>
        El sistema genera el PDF de la constancia con estos datos: la vigencia se cuenta en días naturales desde la
        emisión y se imprime en el cuerpo del documento; el nombre y el cargo aparecen en el bloque de firma. Cambiarlos
        no altera constancias ya emitidas.
      </Typography>
      <FormularioConstancia tipo="NO_REGISTRO" etiqueta="No Registro" />
      <FormularioConstancia tipo="NO_ADEUDO" etiqueta="No Adeudo" />
    </Card>
  );
}
