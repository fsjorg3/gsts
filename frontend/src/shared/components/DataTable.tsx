import type { ReactNode } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
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

export interface DataTableProps<Row> {
  columns: ReadonlyArray<DataTableColumn<Row>>;
  rows: ReadonlyArray<Row>;
  rowKey: (row: Row) => string;
  onRowClick?: (row: Row) => void;
  emptyMessage?: string;
}

export function DataTable<Row>({ columns, rows, rowKey, onRowClick, emptyMessage = 'Sin registros' }: DataTableProps<Row>) {
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
      </Table>
    </TableContainer>
  );
}
