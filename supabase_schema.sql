-- ============================================================================
-- ESQUEMA DE BASE DE DATOS SUPABASE (PostgreSQL) — MOTOZUNI S.A.
-- Claves primarias numéricas autoincrementales (BIGINT GENERATED ALWAYS AS IDENTITY)
-- en TODAS las tablas, siguiendo buenas prácticas de diseño relacional.
-- ============================================================================

DROP TABLE IF EXISTS public.plantillas;
DROP TABLE IF EXISTS public.tipos_componente;
DROP TABLE IF EXISTS public.sectores;
DROP TABLE IF EXISTS public.sucursales;

-- 1. TABLA DE SUCURSALES
CREATE TABLE public.sucursales (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo INTEGER NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    activa BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. TABLA DE SECTORES / ÁREAS
CREATE TABLE public.sectores (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    orden INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. TABLA DE TIPOS DE COMPONENTES
CREATE TABLE public.tipos_componente (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL UNIQUE,
    tiene_codigo BOOLEAN NOT NULL DEFAULT true,
    sigla TEXT NOT NULL DEFAULT '',
    es_sistema BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. TABLA DE PLANTILLAS DE REMITOS
CREATE TABLE public.plantillas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    orden INTEGER NOT NULL DEFAULT 100,
    tipo_componente_id BIGINT REFERENCES public.tipos_componente(id) ON DELETE SET NULL,
    tipo_flujo TEXT NOT NULL DEFAULT 'entrega',
    usar_como_remito BOOLEAN NOT NULL DEFAULT true,
    usar_como_adicional BOOLEAN NOT NULL DEFAULT false,
    tiene_codigo BOOLEAN NOT NULL DEFAULT true,
    sigla_codigo TEXT NOT NULL DEFAULT '',
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    es_sistema BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice sobre la clave foránea
CREATE INDEX idx_plantillas_tipo_componente_id
    ON public.plantillas (tipo_componente_id);

-- Permisos explícitos para Data API y secuencias IDENTITY
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
    public.sucursales,
    public.sectores,
    public.tipos_componente,
    public.plantillas
TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- RLS habilitado en todas las tablas expuestas
ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sectores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_componente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plantillas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acceso_total_sucursales" ON public.sucursales
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "acceso_total_sectores" ON public.sectores
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "acceso_total_tipos_componente" ON public.tipos_componente
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "acceso_total_plantillas" ON public.plantillas
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- CARGA INICIAL DE DATOS (los IDs se autoincrementan automáticamente: 1, 2, 3...)
-- ============================================================================

INSERT INTO public.sucursales (codigo, nombre) VALUES
    (0,  'CENTRAL'),
    (10, 'DOMINICO'),
    (11, 'LANUS'),
    (12, 'MONTE GRANDE'),
    (13, 'SAN JUSTO'),
    (14, 'LUIS GUILON'),
    (15, 'CABA 1'),
    (16, 'LOMAS DE ZAMORA'),
    (17, 'QUILMES'),
    (19, 'LANUS 2'),
    (20, 'LUIS GUILLON 2'),
    (21, 'CABA2'),
    (22, 'SAN FERNANDO'),
    (23, 'SAN MARTIN'),
    (24, 'LA PLATA'),
    (25, 'QUILMES 2'),
    (27, 'VICENTE LOPEZ'),
    (28, 'SARANDI'),
    (29, 'BENAVIDEZ'),
    (30, 'CAMPANA'),
    (31, 'SAN MIGUEL'),
    (32, 'MORON'),
    (33, 'VARELA')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.sectores (nombre, orden) VALUES
    ('Administración',            1),
    ('Comercial',                 2),
    ('Gerencia - Administración', 3),
    ('Gerencia - Comercial',      4),
    ('Gerencia - Operaciones',    5),
    ('Gestoría',                  6),
    ('Logística',                 7),
    ('Operaciones',               8),
    ('Procesos',                  9),
    ('Recursos Humanos',          10)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO public.tipos_componente (slug, nombre, tiene_codigo, sigla, es_sistema) VALUES
    ('computadora', 'Computadora',         true,  'PC', true),
    ('monitor',     'Monitor',             true,  'MO', true),
    ('notebook',    'Notebook',            true,  'NB', true),
    ('celular',     'Celular',             true,  'CE', true),
    ('auricular',   'Auricular',           true,  'AU', true),
    ('mouse',       'Mouse',               true,  'MS', true),
    ('teclado',     'Teclado',             true,  'TC', true),
    ('wifi',        'Adaptador Wi-Fi',     true,  'WF', true),
    ('chip_sim',    'Chip SIM / Línea',    false, '',   true),
    ('general',     'Dispositivo General', true,  'EQ', true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.plantillas (slug, nombre, orden, tipo_componente_id, tipo_flujo, usar_como_remito, usar_como_adicional, tiene_codigo, sigla_codigo, es_sistema, config) VALUES
(
    'pc_monitor', 'PC + Monitor', 1, (SELECT id FROM public.tipos_componente WHERE slug = 'computadora'), 'entrega', true, false, true, 'PC', true,
    $json${
      "bannerTitulo": "RECIBO DE ENTREGA DE DISPOSITIVOS",
      "colorTema": "azul",
      "subtituloHeader": "Computadora + Monitor",
      "prefijoPdf": "Recibo",
      "sincronizarCodigos": true,
      "incluirDatosAsignacion": true,
      "mostrarEmailAsignacion": true,
      "incluirNotaAdicional": true,
      "notaPlaceholder": "Ejemplo: Incluye pad mouse, auricular, etc.",
      "textoConformidad": "Yo, <b>{{nombre}}</b>, con fecha <b>{{fecha}}</b>, declaro haber recibido <b>Computadora {{marca_pc}} {{mod_pc}}</b> (Cód: <b>{{cod_pc}}</b>) y <b>Monitor {{marca_mo}} {{mod_mo}}</b> (Cód: <b>{{cod_mo}}</b>), en las condiciones descritas, comprometiéndome a hacer un uso responsable del mismo.",
      "secciones": [
        {
          "id": "computadora", "titulo": "COMPUTADORA", "tieneCodigo": true, "sigla": "PC", "codigoFieldId": "cod_pc", "codigoLabel": "Código PC", "opcional": false,
          "campos": [
            {"id":"marca_pc","label":"Marca","labelForm":"Marca PC","tipoControl":"texto","placeholder":"Ejemplo: MSI","enTabla":true},
            {"id":"mod_pc","label":"Modelo","labelForm":"Modelo PC","tipoControl":"texto","placeholder":"Ejemplo: A520M-A PRO","enTabla":true},
            {"id":"sn_pc","label":"N° Serie","tipoControl":"fijo","valorDefecto":"N/A","enTabla":true},
            {"id":"est_pc","label":"Estado","tipoControl":"fijo","valorDefecto":"Asignado","enTabla":true},
            {"id":"so","label":"S.O.","tipoControl":"texto","placeholder":"Ejemplo: Windows 10 Pro","valorDefecto":"","fallbackTabla":"Windows 10 Pro","enTabla":true},
            {"id":"cpu","label":"CPU","tipoControl":"texto","placeholder":"Ejemplo: AMD RYZEN 5 3400G","enTabla":true},
            {"id":"ram","label":"RAM (GB)","tipoControl":"texto","placeholder":"Ejemplo: 16","enTabla":true},
            {"id":"disco","label":"Almacenamiento (GB)","tipoControl":"texto","placeholder":"Ejemplo: 240","enTabla":true},
            {"id":"adapt","label":"Adaptador de Red","labelForm":"Adaptador de red","tipoControl":"texto","placeholder":"Ejemplo: TP-Link TL-WN8200ND","enTabla":true},
            {"id":"comp","label":"Componentes","tipoControl":"texto","placeholder":"Ejemplo: Teclado MK120, Mouse MK120","enTabla":true}
          ]
        },
        {
          "id": "monitor", "titulo": "MONITOR", "tieneCodigo": true, "sigla": "MO", "codigoFieldId": "cod_mo", "codigoLabel": "Código Monitor", "opcional": false,
          "campos": [
            {"id":"marca_mo","label":"Marca","labelForm":"Marca Monitor","tipoControl":"texto","placeholder":"Ejemplo: Cooler Master","enTabla":true},
            {"id":"mod_mo","label":"Modelo","labelForm":"Modelo Monitor","tipoControl":"texto","placeholder":"Ejemplo: GA241","enTabla":true},
            {"id":"sn_mo","label":"N° Serie","labelForm":"S/N Monitor","tipoControl":"texto","placeholder":"Ejemplo: 68606/66P700091","enTabla":true},
            {"id":"est_mo","label":"Estado","tipoControl":"fijo","valorDefecto":"Asignado","enTabla":true}
          ]
        }
      ]
    }$json$::jsonb
),
(
    'notebook', 'Notebook', 2, (SELECT id FROM public.tipos_componente WHERE slug = 'notebook'), 'entrega', true, true, true, 'NB', true,
    $json${
      "bannerTitulo": "RECIBO DE ENTREGA DE DISPOSITIVOS",
      "colorTema": "azul",
      "subtituloHeader": "Notebook {{marca}} {{modelo}}",
      "prefijoPdf": "Recibo",
      "sincronizarCodigos": false,
      "incluirDatosAsignacion": true,
      "mostrarEmailAsignacion": true,
      "incluirNotaAdicional": true,
      "notaPlaceholder": "Ejemplo: Incluye mochila protectora",
      "textoConformidad": "Yo, <b>{{nombre}}</b>, con fecha <b>{{fecha}}</b>, declaro haber recibido <b>Notebook {{marca}} {{modelo}}</b> (Cód: <b>{{cod}}</b>), en las condiciones descritas, comprometiéndome a hacer un uso responsable del mismo.",
      "secciones": [
        {
          "id": "principal", "titulo": "NOTEBOOK", "tieneCodigo": true, "sigla": "NB", "codigoFieldId": "cod", "codigoLabel": "Código NB", "opcional": false,
          "campos": [
            {"id":"marca","label":"Marca","tipoControl":"texto","placeholder":"Ejemplo: Lenovo","enTabla":true},
            {"id":"modelo","label":"Modelo","tipoControl":"texto","placeholder":"Ejemplo: ThinkPad E14","enTabla":true},
            {"id":"sn","label":"N° Serie","tipoControl":"texto","placeholder":"Ejemplo: PF-2X89A1","enTabla":true},
            {"id":"estado","label":"Estado","tipoControl":"fijo","valorDefecto":"Asignado","enTabla":true},
            {"id":"so","label":"S.O.","tipoControl":"texto","placeholder":"Ejemplo: Windows 10 Pro","fallbackTabla":"Windows 10 Pro","enTabla":true},
            {"id":"cpu","label":"CPU","tipoControl":"texto","placeholder":"Ejemplo: Intel Core i5-1135G7","enTabla":true},
            {"id":"ram","label":"RAM (GB)","tipoControl":"texto","placeholder":"Ejemplo: 16","enTabla":true},
            {"id":"disco","label":"Almacenamiento (GB)","tipoControl":"texto","placeholder":"Ejemplo: 256","enTabla":true},
            {"id":"cargador","label":"Cargador","tipoControl":"texto","placeholder":"Ejemplo: Sí","fallbackTabla":"Sí","enTabla":true}
          ]
        }
      ]
    }$json$::jsonb
),
(
    'celular', 'Celular', 3, (SELECT id FROM public.tipos_componente WHERE slug = 'celular'), 'entrega', true, true, true, 'CE', true,
    $json${
      "bannerTitulo": "RECIBO DE ENTREGA DE DISPOSITIVOS",
      "colorTema": "azul",
      "subtituloHeader": "Celular {{marca}} {{modelo}}",
      "prefijoPdf": "Recibo",
      "sincronizarCodigos": false,
      "incluirDatosAsignacion": true,
      "mostrarEmailAsignacion": true,
      "incluirNotaAdicional": false,
      "notaPlaceholder": "Ejemplo: Incluye funda y cargador",
      "textoConformidad": "Yo, <b>{{nombre}}</b>, con fecha <b>{{fecha}}</b>, declaro haber recibido <b>Celular {{marca}} {{modelo}}</b> (Cód: <b>{{cod}}</b>, S/N: <b>{{sn}}</b>), en las condiciones descritas, comprometiéndome a hacer un uso responsable del mismo.",
      "secciones": [
        {
          "id": "principal", "titulo": "CELULAR", "tieneCodigo": true, "sigla": "CE", "codigoFieldId": "cod", "codigoLabel": "Código CE", "opcional": false,
          "campos": [
            {"id":"marca","label":"Marca","tipoControl":"texto","placeholder":"Ejemplo: Motorola","enTabla":true},
            {"id":"modelo","label":"Modelo","tipoControl":"texto","placeholder":"Ejemplo: Moto G54","enTabla":true},
            {"id":"sn","label":"N° Serie","tipoControl":"texto","placeholder":"Ejemplo: 68606/66P700091","enTabla":true},
            {"id":"estado","label":"Estado","tipoControl":"fijo","valorDefecto":"Asignado","enTabla":true},
            {"id":"so","label":"S.O.","tipoControl":"fijo","valorDefecto":"Android","enTabla":true},
            {"id":"cpu","label":"CPU","tipoControl":"texto","placeholder":"Ejemplo: Snapdragon 685 4G Octa-core 2.80GHz","enTabla":true},
            {"id":"ram","label":"RAM","labelForm":"RAM (GB)","tipoControl":"texto","placeholder":"Ejemplo: 8","enTabla":true},
            {"id":"disco","label":"Almacenamiento","labelForm":"Almacenamiento (GB)","tipoControl":"texto","placeholder":"Ejemplo: 128","enTabla":true},
            {"id":"imei","label":"IMEI","tipoControl":"texto","placeholder":"Ejemplo: 869286072510600","enTabla":true}
          ]
        },
        {
          "id": "chip_sim", "titulo": "CHIP SIM", "tieneCodigo": false, "sigla": "", "opcional": true,
          "campos": [
            {"id":"operadora","label":"Operadora","tipoControl":"fijo","valorDefecto":"Claro","enTabla":true},
            {"id":"chip","label":"Número","labelForm":"Línea / Chip SIM","tipoControl":"texto","placeholder":"Ejemplo: 1123456789","enTabla":true},
            {"id":"iccid","label":"ICCID","tipoControl":"texto","placeholder":"Ejemplo: 8954020000000000000","enTabla":true},
            {"id":"est_sim","label":"Estado","tipoControl":"fijo","valorDefecto":"Asignado","enTabla":true}
          ]
        }
      ]
    }$json$::jsonb
),
(
    'auricular', 'Auricular H151', 4, (SELECT id FROM public.tipos_componente WHERE slug = 'auricular'), 'entrega', true, true, true, 'AU', true,
    $json${
      "bannerTitulo": "RECIBO DE ENTREGA DE DISPOSITIVOS",
      "colorTema": "azul",
      "subtituloHeader": "{{tipo_name}} — {{marca}} {{modelo}}",
      "prefijoPdf": "Recibo",
      "sincronizarCodigos": false,
      "incluirDatosAsignacion": true,
      "mostrarEmailAsignacion": false,
      "incluirNotaAdicional": true,
      "notaPlaceholder": "Ejemplo: Conexión Jack 3.5mm con micrófono",
      "textoConformidad": "Yo, <b>{{nombre}}</b>, con fecha <b>{{fecha}}</b>, declaro haber recibido <b>{{tipo_name}} {{marca}} {{modelo}}</b> (Cód: <b>{{cod}}</b>), en las condiciones descritas, comprometiéndome a hacer un uso responsable del mismo.",
      "secciones": [
        {
          "id": "principal", "titulo": "AURICULAR", "tieneCodigo": true, "sigla": "AU", "codigoFieldId": "cod", "codigoLabel": "N° Serie / Código", "opcional": false,
          "campos": [
            {"id":"tipo_name","label":"Tipo","labelForm":"Tipo Producto","tipoControl":"texto","placeholder":"Ejemplo: AURICULAR H151","fallbackTabla":"AURICULAR","enTabla":true},
            {"id":"marca","label":"Marca","tipoControl":"texto","placeholder":"Ejemplo: Logitech","enTabla":true},
            {"id":"modelo","label":"Modelo","tipoControl":"texto","placeholder":"Ejemplo: H151","enTabla":true},
            {"id":"estado","label":"Estado","tipoControl":"fijo","valorDefecto":"Asignado","enTabla":true}
          ]
        }
      ]
    }$json$::jsonb
),
(
    'mouse', 'Mouse', 5, (SELECT id FROM public.tipos_componente WHERE slug = 'mouse'), 'entrega', true, true, true, 'MS', true,
    $json${
      "bannerTitulo": "RECIBO DE ENTREGA DE DISPOSITIVOS",
      "colorTema": "azul",
      "subtituloHeader": "{{tipo_name}} — {{marca}} {{modelo}}",
      "prefijoPdf": "Recibo",
      "sincronizarCodigos": false,
      "incluirDatosAsignacion": true,
      "mostrarEmailAsignacion": false,
      "incluirNotaAdicional": true,
      "notaPlaceholder": "Ejemplo: Conexión USB óptico",
      "textoConformidad": "Yo, <b>{{nombre}}</b>, con fecha <b>{{fecha}}</b>, declaro haber recibido <b>{{tipo_name}} {{marca}} {{modelo}}</b> (Cód: <b>{{cod}}</b>), en las condiciones descritas, comprometiéndome a hacer un uso responsable del mismo.",
      "secciones": [
        {
          "id": "principal", "titulo": "MOUSE", "tieneCodigo": true, "sigla": "MS", "codigoFieldId": "cod", "codigoLabel": "N° Serie / Código", "opcional": false,
          "campos": [
            {"id":"tipo_name","label":"Tipo","labelForm":"Tipo Producto","tipoControl":"texto","placeholder":"Ejemplo: MOUSE","fallbackTabla":"MOUSE","enTabla":true},
            {"id":"marca","label":"Marca","tipoControl":"texto","placeholder":"Ejemplo: Logitech","enTabla":true},
            {"id":"modelo","label":"Modelo","tipoControl":"texto","placeholder":"Ejemplo: M90","enTabla":true},
            {"id":"estado","label":"Estado","tipoControl":"fijo","valorDefecto":"Asignado","enTabla":true}
          ]
        }
      ]
    }$json$::jsonb
),
(
    'teclado', 'Teclado / Kit', 6, (SELECT id FROM public.tipos_componente WHERE slug = 'teclado'), 'entrega', true, true, true, 'TC', true,
    $json${
      "bannerTitulo": "RECIBO DE ENTREGA DE DISPOSITIVOS",
      "colorTema": "azul",
      "subtituloHeader": "{{tipo_name}} — {{marca}} {{modelo}}",
      "prefijoPdf": "Recibo",
      "sincronizarCodigos": false,
      "incluirDatosAsignacion": true,
      "mostrarEmailAsignacion": false,
      "incluirNotaAdicional": true,
      "notaPlaceholder": "Ejemplo: Distribución español latinoamericano",
      "textoConformidad": "Yo, <b>{{nombre}}</b>, con fecha <b>{{fecha}}</b>, declaro haber recibido <b>{{tipo_name}} {{marca}} {{modelo}}</b> (Cód: <b>{{cod}}</b>), en las condiciones descritas, comprometiéndome a hacer un uso responsable del mismo.",
      "secciones": [
        {
          "id": "principal", "titulo": "TECLADO", "tieneCodigo": true, "sigla": "TC", "codigoFieldId": "cod", "codigoLabel": "N° Serie / Código", "opcional": false,
          "campos": [
            {"id":"tipo_name","label":"Tipo","labelForm":"Tipo Producto","tipoControl":"texto","placeholder":"Ejemplo: TECLADO","fallbackTabla":"TECLADO","enTabla":true},
            {"id":"marca","label":"Marca","tipoControl":"texto","placeholder":"Ejemplo: Logitech","enTabla":true},
            {"id":"modelo","label":"Modelo","tipoControl":"texto","placeholder":"Ejemplo: K120","enTabla":true},
            {"id":"estado","label":"Estado","tipoControl":"fijo","valorDefecto":"Asignado","enTabla":true}
          ]
        }
      ]
    }$json$::jsonb
),
(
    'wifi', 'Adaptador Wi-Fi', 7, (SELECT id FROM public.tipos_componente WHERE slug = 'wifi'), 'entrega', true, true, true, 'WF', true,
    $json${
      "bannerTitulo": "RECIBO DE ENTREGA DE DISPOSITIVOS",
      "colorTema": "azul",
      "subtituloHeader": "{{tipo_name}} — {{marca}} {{modelo}}",
      "prefijoPdf": "Recibo",
      "sincronizarCodigos": false,
      "incluirDatosAsignacion": true,
      "mostrarEmailAsignacion": false,
      "incluirNotaAdicional": true,
      "notaPlaceholder": "Ejemplo: 300 Mbps High Power USB",
      "textoConformidad": "Yo, <b>{{nombre}}</b>, con fecha <b>{{fecha}}</b>, declaro haber recibido <b>{{tipo_name}} {{marca}} {{modelo}}</b> (Cód: <b>{{cod}}</b>), en las condiciones descritas, comprometiéndome a hacer un uso responsable del mismo.",
      "secciones": [
        {
          "id": "principal", "titulo": "ADAPTADOR WI-FI", "tieneCodigo": true, "sigla": "WF", "codigoFieldId": "cod", "codigoLabel": "N° Serie / Código", "opcional": false,
          "campos": [
            {"id":"tipo_name","label":"Tipo","labelForm":"Tipo Producto","tipoControl":"texto","placeholder":"Ejemplo: ADAPTADOR WI-FI","fallbackTabla":"ADAPTADOR WI-FI","enTabla":true},
            {"id":"marca","label":"Marca","tipoControl":"texto","placeholder":"Ejemplo: TP-Link","enTabla":true},
            {"id":"modelo","label":"Modelo","tipoControl":"texto","placeholder":"Ejemplo: TL-WN8200ND","enTabla":true},
            {"id":"estado","label":"Estado","tipoControl":"fijo","valorDefecto":"Asignado","enTabla":true}
          ]
        }
      ]
    }$json$::jsonb
),
(
    'monitor_solo', 'Monitor Solo', 8, (SELECT id FROM public.tipos_componente WHERE slug = 'monitor'), 'entrega', true, true, true, 'MO', true,
    $json${
      "bannerTitulo": "RECIBO DE ENTREGA DE DISPOSITIVOS",
      "colorTema": "azul",
      "subtituloHeader": "{{tipo_name}} — {{marca}} {{modelo}}",
      "prefijoPdf": "Recibo",
      "sincronizarCodigos": false,
      "incluirDatosAsignacion": true,
      "mostrarEmailAsignacion": false,
      "incluirNotaAdicional": true,
      "notaPlaceholder": "Ejemplo: Panel 23.8 pulgadas FHD 100Hz",
      "textoConformidad": "Yo, <b>{{nombre}}</b>, con fecha <b>{{fecha}}</b>, declaro haber recibido <b>{{tipo_name}} {{marca}} {{modelo}}</b> (Cód: <b>{{cod}}</b>), en las condiciones descritas, comprometiéndome a hacer un uso responsable del mismo.",
      "secciones": [
        {
          "id": "principal", "titulo": "MONITOR", "tieneCodigo": true, "sigla": "MO", "codigoFieldId": "cod", "codigoLabel": "N° Serie / Código", "opcional": false,
          "campos": [
            {"id":"tipo_name","label":"Tipo","labelForm":"Tipo Producto","tipoControl":"texto","placeholder":"Ejemplo: MONITOR","fallbackTabla":"MONITOR","enTabla":true},
            {"id":"marca","label":"Marca","tipoControl":"texto","placeholder":"Ejemplo: Cooler Master","enTabla":true},
            {"id":"modelo","label":"Modelo","tipoControl":"texto","placeholder":"Ejemplo: GA241","enTabla":true},
            {"id":"estado","label":"Estado","tipoControl":"fijo","valorDefecto":"Asignado","enTabla":true}
          ]
        }
      ]
    }$json$::jsonb
),
(
    'traslado', 'Traslado entre personas', 9, (SELECT id FROM public.tipos_componente WHERE slug = 'general'), 'traslado', true, false, true, 'NB', true,
    $json${
      "bannerTitulo": "REMITO DE TRASLADO DE DISPOSITIVO",
      "colorTema": "naranja",
      "subtituloHeader": "{{nombre1}} → {{nombre2}}",
      "prefijoPdf": "Recibo_Traslado",
      "sincronizarCodigos": false,
      "incluirDatosAsignacion": false,
      "mostrarEmailAsignacion": false,
      "incluirNotaAdicional": false,
      "notaPlaceholder": "",
      "textoConformidad": "",
      "secciones": [
        {
          "id": "principal", "titulo": "DISPOSITIVO", "tieneCodigo": true, "sigla": "NB", "codigoFieldId": "cod", "codigoLabel": "Código Dispositivo", "opcional": false,
          "campos": [
            {"id":"tipo_disp","label":"Tipo","labelForm":"Tipo Dispositivo","tipoControl":"texto","placeholder":"Ejemplo: Notebook","fallbackTabla":"Dispositivo","enTabla":true},
            {"id":"marca","label":"Marca","tipoControl":"texto","placeholder":"Ejemplo: Lenovo","enTabla":true},
            {"id":"modelo","label":"Modelo","tipoControl":"texto","placeholder":"Ejemplo: ThinkPad E14","enTabla":true},
            {"id":"sn","label":"N° Serie","tipoControl":"texto","placeholder":"Ejemplo: N/A","enTabla":true}
          ]
        }
      ]
    }$json$::jsonb
),
(
    'baja', 'Baja / Devolución', 10, (SELECT id FROM public.tipos_componente WHERE slug = 'general'), 'baja', true, false, true, 'PC', true,
    $json${
      "bannerTitulo": "REMITO DE DEVOLUCIÓN / BAJA DE DISPOSITIVO",
      "colorTema": "rojo",
      "subtituloHeader": "BAJA / DEVOLUCIÓN",
      "prefijoPdf": "Recibo_Baja",
      "sincronizarCodigos": false,
      "incluirDatosAsignacion": false,
      "mostrarEmailAsignacion": false,
      "incluirNotaAdicional": false,
      "notaPlaceholder": "",
      "textoConformidad": "Yo, <b>{{nombre}}</b>, con fecha <b>{{fecha}}</b>, declaro haber devuelto el dispositivo <b>{{tipo_disp}} {{marca}} {{modelo}}</b> (Cód: <b>{{cod}}</b>) en las condiciones indicadas.",
      "secciones": [
        {
          "id": "principal", "titulo": "DISPOSITIVO", "tieneCodigo": true, "sigla": "PC", "codigoFieldId": "cod", "codigoLabel": "Código Dispositivo", "opcional": false,
          "campos": [
            {"id":"tipo_disp","label":"Tipo","tipoControl":"texto","placeholder":"Ejemplo: Computadora","fallbackTabla":"Dispositivo","enTabla":true},
            {"id":"marca","label":"Marca","tipoControl":"texto","placeholder":"Ejemplo: MSI","enTabla":true},
            {"id":"modelo","label":"Modelo","tipoControl":"texto","placeholder":"Ejemplo: A520M-A PRO","enTabla":true},
            {"id":"sn","label":"N° Serie","tipoControl":"texto","placeholder":"Ejemplo: N/A","enTabla":true},
            {"id":"estado","label":"Estado","tipoControl":"fijo","valorDefecto":"Dado de baja","enTabla":true},
            {"id":"motivo","label":"Motivo","labelForm":"Motivo Baja","tipoControl":"texto","placeholder":"Ejemplo: Fin de vida útil / Reemplazo","fallbackTabla":"Fin de vida útil / Reemplazo","enTabla":true}
          ]
        }
      ]
    }$json$::jsonb
)
ON CONFLICT (slug) DO NOTHING;
