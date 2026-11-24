/**
 * DATOS INICIALES (SEMILLA) — MOTOZUNI S.A.
 * Los IDs primarios numéricos se autoincrementan automáticamente en la base de datos.
 */

const DEFAULT_SUCURSALES = [
    { codigo: 0,  nombre: 'CENTRAL' },
    { codigo: 10, nombre: 'DOMINICO' },
    { codigo: 11, nombre: 'LANUS' },
    { codigo: 12, nombre: 'MONTE GRANDE' },
    { codigo: 13, nombre: 'SAN JUSTO' },
    { codigo: 14, nombre: 'LUIS GUILON' },
    { codigo: 15, nombre: 'CABA 1' },
    { codigo: 16, nombre: 'LOMAS DE ZAMORA' },
    { codigo: 17, nombre: 'QUILMES' },
    { codigo: 19, nombre: 'LANUS 2' },
    { codigo: 20, nombre: 'LUIS GUILLON 2' },
    { codigo: 21, nombre: 'CABA2' },
    { codigo: 22, nombre: 'SAN FERNANDO' },
    { codigo: 23, nombre: 'SAN MARTIN' },
    { codigo: 24, nombre: 'LA PLATA' },
    { codigo: 25, nombre: 'QUILMES 2' },
    { codigo: 27, nombre: 'VICENTE LOPEZ' },
    { codigo: 28, nombre: 'SARANDI' },
    { codigo: 29, nombre: 'BENAVIDEZ' },
    { codigo: 30, nombre: 'CAMPANA' },
    { codigo: 31, nombre: 'SAN MIGUEL' },
    { codigo: 32, nombre: 'MORON' },
    { codigo: 33, nombre: 'VARELA' }
];

const DEFAULT_SECTORES = [
    { nombre: 'Administración',            orden: 1 },
    { nombre: 'Comercial',                 orden: 2 },
    { nombre: 'Gerencia - Administración', orden: 3 },
    { nombre: 'Gerencia - Comercial',      orden: 4 },
    { nombre: 'Gerencia - Operaciones',    orden: 5 },
    { nombre: 'Gestoría',                  orden: 6 },
    { nombre: 'Logística',                 orden: 7 },
    { nombre: 'Operaciones',               orden: 8 },
    { nombre: 'Procesos',                  orden: 9 },
    { nombre: 'Recursos Humanos',          orden: 10 }
];

const DEFAULT_TIPOS_COMPONENTE = [
    { slug: 'computadora', nombre: 'Computadora',         tiene_codigo: true,  sigla: 'PC', es_sistema: true },
    { slug: 'monitor',     nombre: 'Monitor',             tiene_codigo: true,  sigla: 'MO', es_sistema: true },
    { slug: 'notebook',    nombre: 'Notebook',            tiene_codigo: true,  sigla: 'NB', es_sistema: true },
    { slug: 'celular',     nombre: 'Celular',             tiene_codigo: true,  sigla: 'CE', es_sistema: true },
    { slug: 'auricular',   nombre: 'Auricular',           tiene_codigo: true,  sigla: 'AU', es_sistema: true },
    { slug: 'mouse',       nombre: 'Mouse',               tiene_codigo: true,  sigla: 'MS', es_sistema: true },
    { slug: 'teclado',     nombre: 'Teclado',             tiene_codigo: true,  sigla: 'TC', es_sistema: true },
    { slug: 'wifi',        nombre: 'Adaptador Wi-Fi',     tiene_codigo: true,  sigla: 'WF', es_sistema: true },
    { slug: 'chip_sim',    nombre: 'Chip SIM / Línea',    tiene_codigo: false, sigla: '',   es_sistema: true },
    { slug: 'general',     nombre: 'Dispositivo General', tiene_codigo: true,  sigla: 'EQ', es_sistema: true }
];

const DEFAULT_PLANTILLAS = [
    {
        slug: 'pc_monitor',
        nombre: 'PC + Monitor',
        orden: 1,
        tipo_componente_slug: 'computadora',
        tipo_flujo: 'entrega',
        usar_como_remito: true,
        usar_como_adicional: false,
        tiene_codigo: true,
        sigla_codigo: 'PC',
        es_sistema: true,
        config: {
            bannerTitulo: 'RECIBO DE ENTREGA DE DISPOSITIVOS',
            colorTema: 'azul',
            subtituloHeader: 'Computadora + Monitor',
            prefijoPdf: 'Recibo',
            sincronizarCodigos: true,
            incluirDatosAsignacion: true,
            mostrarEmailAsignacion: true,
            incluirNotaAdicional: true,
            notaPlaceholder: 'Ejemplo: Incluye pad mouse, auricular, etc.',
            textoConformidad: 'Yo, <b>{{nombre}}</b>, con fecha <b>{{fecha}}</b>, declaro haber recibido <b>Computadora {{marca_pc}} {{mod_pc}}</b> (Cód: <b>{{cod_pc}}</b>) y <b>Monitor {{marca_mo}} {{mod_mo}}</b> (Cód: <b>{{cod_mo}}</b>), en las condiciones descritas, comprometiéndome a hacer un uso responsable del mismo.',
            secciones: [
                {
                    id: 'computadora',
                    titulo: 'COMPUTADORA',
                    tieneCodigo: true,
                    sigla: 'PC',
                    codigoFieldId: 'cod_pc',
                    codigoLabel: 'Código PC',
                    opcional: false,
                    campos: [
                        { id: 'marca_pc', label: 'Marca', labelForm: 'Marca PC', tipoControl: 'texto', placeholder: 'Ejemplo: MSI', enTabla: true },
                        { id: 'mod_pc',   label: 'Modelo', labelForm: 'Modelo PC', tipoControl: 'texto', placeholder: 'Ejemplo: A520M-A PRO', enTabla: true },
                        { id: 'sn_pc',    label: 'N° Serie', tipoControl: 'fijo', valorDefecto: 'N/A', enTabla: true },
                        { id: 'est_pc',   label: 'Estado', tipoControl: 'fijo', valorDefecto: 'Asignado', enTabla: true },
                        { id: 'so',       label: 'S.O.', tipoControl: 'texto', placeholder: 'Ejemplo: Windows 10 Pro', valorDefecto: '', fallbackTabla: 'Windows 10 Pro', enTabla: true },
                        { id: 'cpu',      label: 'CPU', tipoControl: 'texto', placeholder: 'Ejemplo: AMD RYZEN 5 3400G', enTabla: true },
                        { id: 'ram',      label: 'RAM (GB)', tipoControl: 'texto', placeholder: 'Ejemplo: 16', enTabla: true },
                        { id: 'disco',    label: 'Almacenamiento (GB)', tipoControl: 'texto', placeholder: 'Ejemplo: 240', enTabla: true },
                        { id: 'adapt',    label: 'Adaptador de Red', labelForm: 'Adaptador de red', tipoControl: 'texto', placeholder: 'Ejemplo: TP-Link TL-WN8200ND', enTabla: true },
                        { id: 'comp',     label: 'Componentes', tipoControl: 'texto', placeholder: 'Ejemplo: Teclado MK120, Mouse MK120', enTabla: true }
                    ]
                },
                {
                    id: 'monitor',
                    titulo: 'MONITOR',
                    tieneCodigo: true,
                    sigla: 'MO',
                    codigoFieldId: 'cod_mo',
                    codigoLabel: 'Código Monitor',
                    opcional: false,
                    campos: [
                        { id: 'marca_mo', label: 'Marca', labelForm: 'Marca Monitor', tipoControl: 'texto', placeholder: 'Ejemplo: Cooler Master', enTabla: true },
                        { id: 'mod_mo',   label: 'Modelo', labelForm: 'Modelo Monitor', tipoControl: 'texto', placeholder: 'Ejemplo: GA241', enTabla: true },
                        { id: 'sn_mo',    label: 'N° Serie', labelForm: 'S/N Monitor', tipoControl: 'texto', placeholder: 'Ejemplo: 68606/66P700091', enTabla: true },
                        { id: 'est_mo',   label: 'Estado', tipoControl: 'fijo', valorDefecto: 'Asignado', enTabla: true }
                    ]
                }
            ]
        }
    },
    {
        slug: 'notebook',
        nombre: 'Notebook',
        orden: 2,
        tipo_componente_slug: 'notebook',
        tipo_flujo: 'entrega',
        usar_como_remito: true,
        usar_como_adicional: true,
        tiene_codigo: true,
        sigla_codigo: 'NB',
        es_sistema: true,
        config: {
            bannerTitulo: 'RECIBO DE ENTREGA DE DISPOSITIVOS',
            colorTema: 'azul',
            subtituloHeader: 'Notebook {{marca}} {{modelo}}',
            prefijoPdf: 'Recibo',
            sincronizarCodigos: false,
            incluirDatosAsignacion: true,
            mostrarEmailAsignacion: true,
            incluirNotaAdicional: true,
            notaPlaceholder: 'Ejemplo: Incluye mochila protectora',
            textoConformidad: 'Yo, <b>{{nombre}}</b>, con fecha <b>{{fecha}}</b>, declaro haber recibido <b>Notebook {{marca}} {{modelo}}</b> (Cód: <b>{{cod}}</b>), en las condiciones descritas, comprometiéndome a hacer un uso responsable del mismo.',
            secciones: [
                {
                    id: 'principal',
                    titulo: 'NOTEBOOK',
                    tieneCodigo: true,
                    sigla: 'NB',
                    codigoFieldId: 'cod',
                    codigoLabel: 'Código NB',
                    opcional: false,
                    campos: [
                        { id: 'marca',    label: 'Marca', tipoControl: 'texto', placeholder: 'Ejemplo: Lenovo', enTabla: true },
                        { id: 'modelo',   label: 'Modelo', tipoControl: 'texto', placeholder: 'Ejemplo: ThinkPad E14', enTabla: true },
                        { id: 'sn',       label: 'N° Serie', tipoControl: 'texto', placeholder: 'Ejemplo: PF-2X89A1', enTabla: true },
                        { id: 'estado',   label: 'Estado', tipoControl: 'fijo', valorDefecto: 'Asignado', enTabla: true },
                        { id: 'so',       label: 'S.O.', tipoControl: 'texto', placeholder: 'Ejemplo: Windows 10 Pro', fallbackTabla: 'Windows 10 Pro', enTabla: true },
                        { id: 'cpu',      label: 'CPU', tipoControl: 'texto', placeholder: 'Ejemplo: Intel Core i5-1135G7', enTabla: true },
                        { id: 'ram',      label: 'RAM (GB)', tipoControl: 'texto', placeholder: 'Ejemplo: 16', enTabla: true },
                        { id: 'disco',    label: 'Almacenamiento (GB)', tipoControl: 'texto', placeholder: 'Ejemplo: 256', enTabla: true },
                        { id: 'cargador', label: 'Cargador', tipoControl: 'texto', placeholder: 'Ejemplo: Sí', fallbackTabla: 'Sí', enTabla: true }
                    ]
                }
            ]
        }
    },
    {
        slug: 'celular',
        nombre: 'Celular',
        orden: 3,
        tipo_componente_slug: 'celular',
        tipo_flujo: 'entrega',
        usar_como_remito: true,
        usar_como_adicional: true,
        tiene_codigo: true,
        sigla_codigo: 'CE',
        es_sistema: true,
        config: {
            bannerTitulo: 'RECIBO DE ENTREGA DE DISPOSITIVOS',
            colorTema: 'azul',
            subtituloHeader: 'Celular {{marca}} {{modelo}}',
            prefijoPdf: 'Recibo',
            sincronizarCodigos: false,
            incluirDatosAsignacion: true,
            mostrarEmailAsignacion: true,
            incluirNotaAdicional: false,
            notaPlaceholder: 'Ejemplo: Incluye funda y cargador',
            textoConformidad: 'Yo, <b>{{nombre}}</b>, con fecha <b>{{fecha}}</b>, declaro haber recibido <b>Celular {{marca}} {{modelo}}</b> (Cód: <b>{{cod}}</b>, S/N: <b>{{sn}}</b>), en las condiciones descritas, comprometiéndome a hacer un uso responsable del mismo.',
            secciones: [
                {
                    id: 'principal',
                    titulo: 'CELULAR',
                    tieneCodigo: true,
                    sigla: 'CE',
                    codigoFieldId: 'cod',
                    codigoLabel: 'Código CE',
                    opcional: false,
                    campos: [
                        { id: 'marca',  label: 'Marca', tipoControl: 'texto', placeholder: 'Ejemplo: Motorola', enTabla: true },
                        { id: 'modelo', label: 'Modelo', tipoControl: 'texto', placeholder: 'Ejemplo: Moto G54', enTabla: true },
                        { id: 'sn',     label: 'N° Serie', tipoControl: 'texto', placeholder: 'Ejemplo: 68606/66P700091', enTabla: true },
                        { id: 'estado', label: 'Estado', tipoControl: 'fijo', valorDefecto: 'Asignado', enTabla: true },
                        { id: 'so',     label: 'S.O.', tipoControl: 'fijo', valorDefecto: 'Android', enTabla: true },
                        { id: 'cpu',    label: 'CPU', tipoControl: 'texto', placeholder: 'Ejemplo: Snapdragon 685 4G Octa-core 2.80GHz', enTabla: true },
                        { id: 'ram',    label: 'RAM', labelForm: 'RAM (GB)', tipoControl: 'texto', placeholder: 'Ejemplo: 8', enTabla: true },
                        { id: 'disco',  label: 'Almacenamiento', labelForm: 'Almacenamiento (GB)', tipoControl: 'texto', placeholder: 'Ejemplo: 128', enTabla: true },
                        { id: 'imei',   label: 'IMEI', tipoControl: 'texto', placeholder: 'Ejemplo: 869286072510600', enTabla: true }
                    ]
                },
                {
                    id: 'chip_sim',
                    titulo: 'CHIP SIM',
                    tieneCodigo: false,
                    sigla: '',
                    opcional: true,
                    campos: [
                        { id: 'operadora', label: 'Operadora', tipoControl: 'fijo', valorDefecto: 'Claro', enTabla: true },
                        { id: 'chip',      label: 'Número', labelForm: 'Línea / Chip SIM', tipoControl: 'texto', placeholder: 'Ejemplo: 1123456789', enTabla: true },
                        { id: 'iccid',     label: 'ICCID', tipoControl: 'texto', placeholder: 'Ejemplo: 8954020000000000000', enTabla: true },
                        { id: 'est_sim',   label: 'Estado', tipoControl: 'fijo', valorDefecto: 'Asignado', enTabla: true }
                    ]
                }
            ]
        }
    },
    {
        slug: 'auricular',
        nombre: 'Auricular H151',
        orden: 4,
        tipo_componente_slug: 'auricular',
        tipo_flujo: 'entrega',
        usar_como_remito: true,
        usar_como_adicional: true,
        tiene_codigo: true,
        sigla_codigo: 'AU',
        es_sistema: true,
        config: {
            bannerTitulo: 'RECIBO DE ENTREGA DE DISPOSITIVOS',
            colorTema: 'azul',
            subtituloHeader: '{{tipo_name}} — {{marca}} {{modelo}}',
            prefijoPdf: 'Recibo',
            sincronizarCodigos: false,
            incluirDatosAsignacion: true,
            mostrarEmailAsignacion: false,
            incluirNotaAdicional: true,
            notaPlaceholder: 'Ejemplo: Conexión Jack 3.5mm con micrófono',
            textoConformidad: 'Yo, <b>{{nombre}}</b>, con fecha <b>{{fecha}}</b>, declaro haber recibido <b>{{tipo_name}} {{marca}} {{modelo}}</b> (Cód: <b>{{cod}}</b>), en las condiciones descritas, comprometiéndome a hacer un uso responsable del mismo.',
            secciones: [
                {
                    id: 'principal',
                    titulo: 'AURICULAR',
                    tieneCodigo: true,
                    sigla: 'AU',
                    codigoFieldId: 'cod',
                    codigoLabel: 'N° Serie / Código',
                    opcional: false,
                    campos: [
                        { id: 'tipo_name', label: 'Tipo', labelForm: 'Tipo Producto', tipoControl: 'texto', placeholder: 'Ejemplo: AURICULAR H151', fallbackTabla: 'AURICULAR', enTabla: true },
                        { id: 'marca',     label: 'Marca', tipoControl: 'texto', placeholder: 'Ejemplo: Logitech', enTabla: true },
                        { id: 'modelo',    label: 'Modelo', tipoControl: 'texto', placeholder: 'Ejemplo: H151', enTabla: true },
                        { id: 'estado',    label: 'Estado', tipoControl: 'fijo', valorDefecto: 'Asignado', enTabla: true }
                    ]
                }
            ]
        }
    },
    {
        slug: 'mouse',
        nombre: 'Mouse',
        orden: 5,
        tipo_componente_slug: 'mouse',
        tipo_flujo: 'entrega',
        usar_como_remito: true,
        usar_como_adicional: true,
        tiene_codigo: true,
        sigla_codigo: 'MS',
        es_sistema: true,
        config: {
            bannerTitulo: 'RECIBO DE ENTREGA DE DISPOSITIVOS',
            colorTema: 'azul',
            subtituloHeader: '{{tipo_name}} — {{marca}} {{modelo}}',
            prefijoPdf: 'Recibo',
            sincronizarCodigos: false,
            incluirDatosAsignacion: true,
            mostrarEmailAsignacion: false,
            incluirNotaAdicional: true,
            notaPlaceholder: 'Ejemplo: Conexión USB óptico',
            textoConformidad: 'Yo, <b>{{nombre}}</b>, con fecha <b>{{fecha}}</b>, declaro haber recibido <b>{{tipo_name}} {{marca}} {{modelo}}</b> (Cód: <b>{{cod}}</b>), en las condiciones descritas, comprometiéndome a hacer un uso responsable del mismo.',
            secciones: [
                {
                    id: 'principal',
                    titulo: 'MOUSE',
                    tieneCodigo: true,
                    sigla: 'MS',
                    codigoFieldId: 'cod',
                    codigoLabel: 'N° Serie / Código',
                    opcional: false,
                    campos: [
                        { id: 'tipo_name', label: 'Tipo', labelForm: 'Tipo Producto', tipoControl: 'texto', placeholder: 'Ejemplo: MOUSE', fallbackTabla: 'MOUSE', enTabla: true },
                        { id: 'marca',     label: 'Marca', tipoControl: 'texto', placeholder: 'Ejemplo: Logitech', enTabla: true },
                        { id: 'modelo',    label: 'Modelo', tipoControl: 'texto', placeholder: 'Ejemplo: M90', enTabla: true },
                        { id: 'estado',    label: 'Estado', tipoControl: 'fijo', valorDefecto: 'Asignado', enTabla: true }
                    ]
                }
            ]
        }
    },
    {
        slug: 'teclado',
        nombre: 'Teclado / Kit',
        orden: 6,
        tipo_componente_slug: 'teclado',
        tipo_flujo: 'entrega',
        usar_como_remito: true,
        usar_como_adicional: true,
        tiene_codigo: true,
        sigla_codigo: 'TC',
        es_sistema: true,
        config: {
            bannerTitulo: 'RECIBO DE ENTREGA DE DISPOSITIVOS',
            colorTema: 'azul',
            subtituloHeader: '{{tipo_name}} — {{marca}} {{modelo}}',
            prefijoPdf: 'Recibo',
            sincronizarCodigos: false,
            incluirDatosAsignacion: true,
            mostrarEmailAsignacion: false,
            incluirNotaAdicional: true,
            notaPlaceholder: 'Ejemplo: Distribución español latinoamericano',
            textoConformidad: 'Yo, <b>{{nombre}}</b>, con fecha <b>{{fecha}}</b>, declaro haber recibido <b>{{tipo_name}} {{marca}} {{modelo}}</b> (Cód: <b>{{cod}}</b>), en las condiciones descritas, comprometiéndome a hacer un uso responsable del mismo.',
            secciones: [
                {
                    id: 'principal',
                    titulo: 'TECLADO',
                    tieneCodigo: true,
                    sigla: 'TC',
                    codigoFieldId: 'cod',
                    codigoLabel: 'N° Serie / Código',
                    opcional: false,
                    campos: [
                        { id: 'tipo_name', label: 'Tipo', labelForm: 'Tipo Producto', tipoControl: 'texto', placeholder: 'Ejemplo: TECLADO', fallbackTabla: 'TECLADO', enTabla: true },
                        { id: 'marca',     label: 'Marca', tipoControl: 'texto', placeholder: 'Ejemplo: Logitech', enTabla: true },
                        { id: 'modelo',    label: 'Modelo', tipoControl: 'texto', placeholder: 'Ejemplo: K120', enTabla: true },
                        { id: 'estado',    label: 'Estado', tipoControl: 'fijo', valorDefecto: 'Asignado', enTabla: true }
                    ]
                }
            ]
        }
    },
    {
        slug: 'wifi',
        nombre: 'Adaptador Wi-Fi',
        orden: 7,
        tipo_componente_slug: 'wifi',
        tipo_flujo: 'entrega',
        usar_como_remito: true,
        usar_como_adicional: true,
        tiene_codigo: true,
        sigla_codigo: 'WF',
        es_sistema: true,
        config: {
            bannerTitulo: 'RECIBO DE ENTREGA DE DISPOSITIVOS',
            colorTema: 'azul',
            subtituloHeader: '{{tipo_name}} — {{marca}} {{modelo}}',
            prefijoPdf: 'Recibo',
            sincronizarCodigos: false,
            incluirDatosAsignacion: true,
            mostrarEmailAsignacion: false,
            incluirNotaAdicional: true,
            notaPlaceholder: 'Ejemplo: 300 Mbps High Power USB',
            textoConformidad: 'Yo, <b>{{nombre}}</b>, con fecha <b>{{fecha}}</b>, declaro haber recibido <b>{{tipo_name}} {{marca}} {{modelo}}</b> (Cód: <b>{{cod}}</b>), en las condiciones descritas, comprometiéndome a hacer un uso responsable del mismo.',
            secciones: [
                {
                    id: 'principal',
                    titulo: 'ADAPTADOR WI-FI',
                    tieneCodigo: true,
                    sigla: 'WF',
                    codigoFieldId: 'cod',
                    codigoLabel: 'N° Serie / Código',
                    opcional: false,
                    campos: [
                        { id: 'tipo_name', label: 'Tipo', labelForm: 'Tipo Producto', tipoControl: 'texto', placeholder: 'Ejemplo: ADAPTADOR WI-FI', fallbackTabla: 'ADAPTADOR WI-FI', enTabla: true },
                        { id: 'marca',     label: 'Marca', tipoControl: 'texto', placeholder: 'Ejemplo: TP-Link', enTabla: true },
                        { id: 'modelo',    label: 'Modelo', tipoControl: 'texto', placeholder: 'Ejemplo: TL-WN8200ND', enTabla: true },
                        { id: 'estado',    label: 'Estado', tipoControl: 'fijo', valorDefecto: 'Asignado', enTabla: true }
                    ]
                }
            ]
        }
    },
    {
        slug: 'monitor_solo',
        nombre: 'Monitor Solo',
        orden: 8,
        tipo_componente_slug: 'monitor',
        tipo_flujo: 'entrega',
        usar_como_remito: true,
        usar_como_adicional: true,
        tiene_codigo: true,
        sigla_codigo: 'MO',
        es_sistema: true,
        config: {
            bannerTitulo: 'RECIBO DE ENTREGA DE DISPOSITIVOS',
            colorTema: 'azul',
            subtituloHeader: '{{tipo_name}} — {{marca}} {{modelo}}',
            prefijoPdf: 'Recibo',
            sincronizarCodigos: false,
            incluirDatosAsignacion: true,
            mostrarEmailAsignacion: false,
            incluirNotaAdicional: true,
            notaPlaceholder: 'Ejemplo: Panel 23.8 pulgadas FHD 100Hz',
            textoConformidad: 'Yo, <b>{{nombre}}</b>, con fecha <b>{{fecha}}</b>, declaro haber recibido <b>{{tipo_name}} {{marca}} {{modelo}}</b> (Cód: <b>{{cod}}</b>), en las condiciones descritas, comprometiéndome a hacer un uso responsable del mismo.',
            secciones: [
                {
                    id: 'principal',
                    titulo: 'MONITOR',
                    tieneCodigo: true,
                    sigla: 'MO',
                    codigoFieldId: 'cod',
                    codigoLabel: 'N° Serie / Código',
                    opcional: false,
                    campos: [
                        { id: 'tipo_name', label: 'Tipo', labelForm: 'Tipo Producto', tipoControl: 'texto', placeholder: 'Ejemplo: MONITOR', fallbackTabla: 'MONITOR', enTabla: true },
                        { id: 'marca',     label: 'Marca', tipoControl: 'texto', placeholder: 'Ejemplo: Cooler Master', enTabla: true },
                        { id: 'modelo',    label: 'Modelo', tipoControl: 'texto', placeholder: 'Ejemplo: GA241', enTabla: true },
                        { id: 'estado',    label: 'Estado', tipoControl: 'fijo', valorDefecto: 'Asignado', enTabla: true }
                    ]
                }
            ]
        }
    },
    {
        slug: 'traslado',
        nombre: 'Traslado entre personas',
        orden: 9,
        tipo_componente_slug: 'general',
        tipo_flujo: 'traslado',
        usar_como_remito: true,
        usar_como_adicional: false,
        tiene_codigo: true,
        sigla_codigo: 'NB',
        es_sistema: true,
        config: {
            bannerTitulo: 'REMITO DE TRASLADO DE DISPOSITIVO',
            colorTema: 'naranja',
            subtituloHeader: '{{nombre1}} → {{nombre2}}',
            prefijoPdf: 'Recibo_Traslado',
            sincronizarCodigos: false,
            incluirDatosAsignacion: false,
            mostrarEmailAsignacion: false,
            incluirNotaAdicional: false,
            notaPlaceholder: '',
            textoConformidad: '',
            secciones: [
                {
                    id: 'principal',
                    titulo: 'DISPOSITIVO',
                    tieneCodigo: true,
                    sigla: 'NB',
                    codigoFieldId: 'cod',
                    codigoLabel: 'Código Dispositivo',
                    opcional: false,
                    campos: [
                        { id: 'tipo_disp', label: 'Tipo', labelForm: 'Tipo Dispositivo', tipoControl: 'texto', placeholder: 'Ejemplo: Notebook', fallbackTabla: 'Dispositivo', enTabla: true },
                        { id: 'marca',     label: 'Marca', tipoControl: 'texto', placeholder: 'Ejemplo: Lenovo', enTabla: true },
                        { id: 'modelo',    label: 'Modelo', tipoControl: 'texto', placeholder: 'Ejemplo: ThinkPad E14', enTabla: true },
                        { id: 'sn',        label: 'N° Serie', tipoControl: 'texto', placeholder: 'Ejemplo: N/A', enTabla: true }
                    ]
                }
            ]
        }
    },
    {
        slug: 'baja',
        nombre: 'Baja / Devolución',
        orden: 10,
        tipo_componente_slug: 'general',
        tipo_flujo: 'baja',
        usar_como_remito: true,
        usar_como_adicional: false,
        tiene_codigo: true,
        sigla_codigo: 'PC',
        es_sistema: true,
        config: {
            bannerTitulo: 'REMITO DE DEVOLUCIÓN / BAJA DE DISPOSITIVO',
            colorTema: 'rojo',
            subtituloHeader: 'BAJA / DEVOLUCIÓN',
            prefijoPdf: 'Recibo_Baja',
            sincronizarCodigos: false,
            incluirDatosAsignacion: false,
            mostrarEmailAsignacion: false,
            incluirNotaAdicional: false,
            notaPlaceholder: '',
            textoConformidad: 'Yo, <b>{{nombre}}</b>, con fecha <b>{{fecha}}</b>, declaro haber devuelto el dispositivo <b>{{tipo_disp}} {{marca}} {{modelo}}</b> (Cód: <b>{{cod}}</b>) en las condiciones indicadas.',
            secciones: [
                {
                    id: 'principal',
                    titulo: 'DISPOSITIVO',
                    tieneCodigo: true,
                    sigla: 'PC',
                    codigoFieldId: 'cod',
                    codigoLabel: 'Código Dispositivo',
                    opcional: false,
                    campos: [
                        { id: 'tipo_disp', label: 'Tipo', tipoControl: 'texto', placeholder: 'Ejemplo: Computadora', fallbackTabla: 'Dispositivo', enTabla: true },
                        { id: 'marca',     label: 'Marca', tipoControl: 'texto', placeholder: 'Ejemplo: MSI', enTabla: true },
                        { id: 'modelo',    label: 'Modelo', tipoControl: 'texto', placeholder: 'Ejemplo: A520M-A PRO', enTabla: true },
                        { id: 'sn',        label: 'N° Serie', tipoControl: 'texto', placeholder: 'Ejemplo: N/A', enTabla: true },
                        { id: 'estado',    label: 'Estado', tipoControl: 'fijo', valorDefecto: 'Dado de baja', enTabla: true },
                        { id: 'motivo',    label: 'Motivo', labelForm: 'Motivo Baja', tipoControl: 'texto', placeholder: 'Ejemplo: Fin de vida útil / Reemplazo', fallbackTabla: 'Fin de vida útil / Reemplazo', enTabla: true }
                    ]
                }
            ]
        }
    }
];
