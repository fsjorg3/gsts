import type { ReactNode } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableFooter from '@mui/material/TableFooter';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

// Tabla del design system: plana, zebra en filas pares, hover gris.
// El estilo (zebra/hover/bordes) viene del tema; aquí sólo la mecánica.
export interface DataTableColumn<Row> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  width?: number | string;
  ocultarEnMovil?: boolean;
  render: (row: Row) => ReactNode;
}

// Paginación opcional. Los listados de la API van por cursor, así que sólo se
// puede avanzar de a una página y retroceder entre las ya cargadas: de ahí
// `showFirstButton` sin `showLastButton`. `total` en -1 significa desconocido
// (MUI lo muestra como «más de N») mientras llega la primera respuesta.
export interface DataTablePaginacion {
  pagina: number;
  total: number;
  filasPorPagina: number;
  onCambiarPagina: (pagina: number) => void;
  onCambiarFilasPorPagina: (filas: number) => void;
  opcionesFilasPorPagina?: number[];
}

export interface DataTableProps<Row> {
  columns: ReadonlyArray<DataTableColumn<Row>>;
  rows: ReadonlyArray<Row>;
  rowKey: (row: Row) => string;
  onRowClick?: (row: Row) => void;
  emptyMessage?: string;
  paginacion?: DataTablePaginacion;
}

function etiquetaFilas({ from, to, count }: { from: number; to: number; count: number }): string {
  const rango = `${from.toLocaleString('es-MX')}–${to.toLocaleString('es-MX')}`;
  return count === -1 ? `${rango} de más de ${to.toLocaleString('es-MX')}` : `${rango} de ${count.toLocaleString('es-MX')}`;
}

export function DataTable<Row>({ columns, rows, rowKey, onRowClick, emptyMessage = 'Sin registros', paginacion }: DataTableProps<Row>) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ '&:hover': { backgroundColor: 'transparent' } }}>
            {columns.map((col) => (
              <TableCell
                key={col.key}
                align={col.align ?? 'left'}
                sx={{ width: col.width, py: 1.5, ...(col.ocultarEnMovil ? { display: { xs: 'none', sm: 'table-cell' } } : {}) }}
              >
                {col.header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                  {emptyMessage}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                sx={onRowClick ? { cursor: 'pointer' } : undefined}
              >
                {columns.map((col) => (
                  <TableCell
                    key={col.key}
                    align={col.align ?? 'left'}
                    sx={{ py: 1.75, ...(col.ocultarEnMovil ? { display: { xs: 'none', sm: 'table-cell' } } : {}) }}
                  >
                    {col.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
        {paginacion ? (
          <TableFooter>
            <TableRow sx={{ '&:hover': { backgroundColor: 'transparent' } }}>
              <TablePagination
                colSpan={columns.length}
                count={paginacion.total}
                page={paginacion.pagina}
                rowsPerPage={paginacion.filasPorPagina}
                rowsPerPageOptions={paginacion.opcionesFilasPorPagina ?? [10, 25, 50, 100]}
                onPageChange={(_evento, pagina) => paginacion.onCambiarPagina(pagina)}
                onRowsPerPageChange={(evento) => paginacion.onCambiarFilasPorPagina(Number(evento.target.value))}
                labelRowsPerPage="Filas por página"
                labelDisplayedRows={etiquetaFilas}
                showFirstButton
                slotProps={{ select: { 'aria-label': 'Filas por página' } }}
                sx={{ borderBottom: 'none' }}
              />
            </TableRow>
          </TableFooter>
        ) : null}
      </Table>
    </TableContainer>
  );
}
