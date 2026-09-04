// Alternativa Node/pg a `psql -f prisma/verificacion_integridad.sql`, para
// entornos sin psql instalado. Todo el archivo corre en una transacción que
// termina en ROLLBACK: no deja cambios en la base.
//
// El archivo mezcla meta-comandos de psql (\pset, \echo) con SQL real. Se
// quitan las líneas \, se corta en el marcador "-- Veredicto" entre el setup
// (todos los casos, ejecutados como una sola llamada multi-statement) y el
// reporte final (tres SELECT, ejecutados uno por uno para poder imprimir sus
// filas con console.table).
import { readFileSync } from 'node:fs';
import { Client } from 'pg';

const connectionString = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Falta DIRECT_DATABASE_URL o DATABASE_URL en el entorno.');
  process.exit(1);
}

const contenido = readFileSync(new URL('./prisma/verificacion_integridad.sql', import.meta.url), 'utf8');
const sinMetaComandos = contenido
  .split('\n')
  .filter((linea) => !/^\s*\\/.test(linea))
  .join('\n');

const [setupSql, reporteYCierre] = sinMetaComandos.split(/--\s*Veredicto\s*\n/);

function limpiarComentarios(fragmento) {
  return fragmento
    .split('\n')
    .filter((linea) => !/^\s*--/.test(linea))
    .join('\n')
    .trim();
}

const consultasReporte = reporteYCierre
  .split(/;\s*\n/)
  .slice(0, -1) // el último trozo es sólo "ROLLBACK" (sin ';', ya se quitó al split)
  .map(limpiarComentarios)
  .filter((fragmento) => fragmento.length > 0);

const client = new Client({ connectionString });
await client.connect();
try {
  await client.query(setupSql);
  const titulos = ['=== Detalle ===', '=== Fallas ===', '=== Resumen ==='];
  for (let i = 0; i < consultasReporte.length; i++) {
    console.log('\n' + (titulos[i] ?? `Consulta ${i + 1}`));
    const resultado = await client.query(consultasReporte[i]);
    console.table(resultado.rows);
  }
} finally {
  await client.query('ROLLBACK');
  await client.end();
}
