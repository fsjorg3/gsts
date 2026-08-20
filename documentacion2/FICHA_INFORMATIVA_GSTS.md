# GSTS — Gerencia de Supervisión Técnica de los Servicios

GSTS es el sistema que administra, de principio a fin, el trámite de las constancias que SOAPAP
entrega a la ciudadanía para certificar que un predio no tiene adeudos o que un domicilio no cuenta
con registro de agua.

## ¿Qué problema resuelve?

Antes de este sistema, un trámite de este tipo dependía de que cada persona involucrada llevara su
propio control: quién recibió la solicitud, qué documentos entregó el ciudadano, si ya se validó la
información, si ya se cobró y si el documento final ya fue entregado. Cuando ese seguimiento vive en
papeles o archivos sueltos, es fácil perder el hilo de un trámite, repetir trabajo o no poder
comprobar después qué pasó con una solicitud en particular.

GSTS resuelve esto ordenando el trámite en un solo lugar: cada solicitud avanza por pasos definidos,
ninguno se puede saltar, y queda un registro permanente de cada acción. Así, en cualquier momento se
puede saber exactamente en qué etapa está un trámite y quién hizo qué.

## ¿Qué son las constancias de no adeudo y no registro?

Son dos documentos oficiales que un ciudadano puede solicitar a SOAPAP:

- **Constancia de no adeudo**: certifica que un predio, identificado por su número de suministro de
  agua, no tiene pagos pendientes. Se pide comúnmente para trámites donde es necesario comprobar que
  se está al corriente, como una venta de inmueble o un trámite notarial.
- **Constancia de no registro**: certifica que un domicilio específico no cuenta con una toma de agua
  registrada a su nombre ante SOAPAP.

Ambas constancias se entregan firmadas y con un código QR impreso, que permite a cualquier persona
verificar en línea que el documento es auténtico y conocer su vigencia.

## ¿Cómo funciona el trámite?

El recorrido de una solicitud dentro de GSTS sigue siempre la misma secuencia:

1. El ciudadano se presenta en ventanilla y solicita su constancia.
2. Ventanilla registra la solicitud y adjunta los documentos que el ciudadano presenta.
3. Se valida la información (por ejemplo, si el predio tiene o no adeudo).
4. La solicitud se aprueba o se rechaza según el resultado de la validación.
5. Se registra el cobro correspondiente, adjuntando el comprobante de pago.
6. El sistema genera la constancia en PDF, ya firmada y con su código QR, lista para entregarse.

Ninguno de estos pasos puede omitirse ni alterarse una vez completado: el sistema exige que cada
requisito se cumpla antes de dejar avanzar la solicitud al siguiente paso.

## ¿Quién lo usa día a día?

- **Personal de ventanilla**: es quien atiende directamente al ciudadano. Recibe la solicitud, adjunta
  los documentos, realiza la validación, registra el cobro y entrega la constancia impresa.
- **Área de TI / administración**: mantiene configurado lo que ventanilla necesita para operar —
  qué documentos se piden para cada tipo de constancia, las tarifas vigentes y los plazos de pago.
  También puede consultar el historial completo de lo que ha ocurrido en el sistema.
- **Dirección**: consulta indicadores generales del área, como cuántas constancias se han emitido o
  en qué etapa se encuentran los trámites en curso, sin necesidad de pedir reportes manuales.

## ¿Qué mejora con GSTS?

- **Trazabilidad total**: cada acción sobre un trámite queda registrada de forma permanente y no puede
  modificarse ni borrarse después, lo que da certeza sobre qué ocurrió con cada solicitud.
- **Verificación pública de autenticidad**: cualquier persona puede escanear el código QR de una
  constancia para confirmar que es válida y conocer su vigencia, sin tener que llamar a la oficina.
- **Menos papeleo disperso**: el comprobante de pago y la constancia quedan digitalizados dentro del
  mismo expediente, en vez de repartidos entre distintos archivos físicos.
- **Consistencia en tarifas y requisitos**: cuando cambian las tarifas o los documentos que se piden,
  la configuración anterior no se pierde, así que un trámite siempre se evalúa con las reglas que
  estaban vigentes cuando se inició.
- **Información para la toma de decisiones**: dirección cuenta con indicadores del área siempre
  disponibles, sin depender de reportes armados manualmente.

## ¿Cómo se relaciona con el sistema de facturación (Finanzas)?

GSTS controla el trámite y el cobro que permite entregar la constancia, pero no emite facturas
fiscales. Esa función corresponde a un sistema aparte, llamado Finanzas, dedicado a la facturación de
SOAPAP en general. Puede pensarse de esta forma: **GSTS es la ventanilla y el expediente del trámite**,
mientras que **Finanzas es el área de facturación**, que únicamente consulta los datos del cobro ya
registrado en GSTS para no tener que capturarlos de nuevo.
