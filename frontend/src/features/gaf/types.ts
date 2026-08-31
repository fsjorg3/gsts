// Tipos del contrato de GAF que consume este formulario. Viven a mano, no
// generados: GAF es un repo y un despliegue aparte, y acoplar el build de GSTS
// a su OpenAPI haría que un cambio ahí rompiera la compilación de aquí. Sólo
// se declaran los campos que la UI realmente usa, no el contrato completo.

export interface SatValue {
  id: string;
  catalogo: string;
  clave: string;
  descripcion: string;
  version: string;
}

export interface OrigenCaptura {
  clave: string;
  nombre: string;
  descripcion: string | null;
}

export interface CatalogosSatCaptura {
  moneda: SatValue[];
  regimenFiscal: SatValue[];
  usoCfdi: SatValue[];
  formaPago: SatValue[];
  // Clave de régimen fiscal -> claves de Uso CFDI que ese régimen admite. El SAT
  // no permite cualquier par: sin este cruce el formulario ofrecería combinaciones
  // que GAF rechaza al insertar.
  usosPorRegimenFiscal: Record<string, string[]>;
}

export interface SolicitudDetail {
  id: string;
  numeroSolicitud: string;
  origenClave: string;
  referenciaOrigen: string;
  canalCaptura: string;
  estado: string;
  rfcReceptor: string;
  nombreReceptor: string;
  monto: string;
  fechaPago: string;
  consultaPublicaId: string;
  creadoAt: string;
}
