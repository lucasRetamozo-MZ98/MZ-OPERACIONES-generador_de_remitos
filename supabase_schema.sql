-- ============================================================================
-- ESQUEMA DE BASE DE DATOS SUPABASE (PostgreSQL) — MOTOZUNI S.A.
-- Generador de Remitos Dinámico (Sucursales, Sectores, Componentes, Plantillas)
--
-- Cómo usar:
--   1. Creá un proyecto gratuito en https://supabase.com
--   2. Entrá a "SQL Editor" → "New query"
--   3. Pegá todo este archivo y hacé clic en "Run"
--   4. Copiá tu Project URL y Anon/Publishable Key (Project Settings → API)
--      y pegalos en la app: botón "Gestionar" → pestaña "Base de Datos"
-- ============================================================================

-- 1. TABLA DE SUCURSALES
CREATE TABLE IF NOT EXISTS public.sucursales (
    id INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL,
    activa BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. TABLA DE SECTORES / ÁREAS
CREATE TABLE IF NOT EXISTS public.sectores (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    orden INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. TABLA DE TIPOS DE COMPONENTES
CREATE TABLE IF NOT EXISTS public.tipos_componente (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    tiene_codigo BOOLEAN NOT NULL DEFAULT true,
    sigla TEXT NOT NULL DEFAULT '',
    es_sistema BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. TABLA DE PLANTILLAS DE REMITOS
CREATE TABLE IF NOT EXISTS public.plantillas (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    orden INTEGER NOT NULL DEFAULT 100,
    tipo_componente_id TEXT REFERENCES public.tipos_componente(id) ON DELETE SET NULL,
    tipo_flujo TEXT NOT NULL DEFAULT 'entrega',
    usar_como_remito BOOLEAN NOT NULL DEFAULT true,
    usar_como_adicional BOOLEAN NOT NULL DEFAULT false,
    tiene_codigo BOOLEAN NOT NULL DEFAULT true,
    sigla_codigo TEXT NOT NULL DEFAULT '',
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    es_sistema BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice sobre FK
CREATE INDEX IF NOT EXISTS idx_plantillas_tipo_componente_id
    ON public.plantillas (tipo_componente_id);

-- Permisos explícitos para Data API
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
    public.sucursales,
    public.sectores,
    public.tipos_componente,
    public.plantillas
TO anon, authenticated;

-- ============================================================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- Habilita acceso de lectura/escritura desde la app web con la Anon Key.
-- (Para uso interno sin login; si luego agregás Supabase Auth, podés restringirlo a 'authenticated')
-- ============================================================================

ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sectores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_componente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plantillas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "acceso_total_sucursales" ON public.sucursales;
CREATE POLICY "acceso_total_sucursales" ON public.sucursales
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "acceso_total_sectores" ON public.sectores;
CREATE POLICY "acceso_total_sectores" ON public.sectores
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "acceso_total_tipos_componente" ON public.tipos_componente;
CREATE POLICY "acceso_total_tipos_componente" ON public.tipos_componente
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "acceso_total_plantillas" ON public.plantillas;
CREATE POLICY "acceso_total_plantillas" ON public.plantillas
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- CARGA INICIAL DE DATOS (SUCURSALES, SECTORES, TIPOS DE COMPONENTE)
-- Las 10 plantillas completas también se suben automáticamente desde la app
-- al presionar "Subir datos actuales a Supabase" (o en la primera sincronización).
-- ============================================================================

INSERT INTO public.sucursales (id, nombre) VALUES
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
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.sectores (id, nombre, orden) VALUES
    ('administracion',          'Administración',            1),
    ('comercial',               'Comercial',                 2),
    ('gerencia_administracion', 'Gerencia - Administración', 3),
    ('gerencia_comercial',      'Gerencia - Comercial',      4),
    ('gerencia_operaciones',    'Gerencia - Operaciones',    5),
    ('gestoria',                'Gestoría',                  6),
    ('logistica',               'Logística',                 7),
    ('operaciones',             'Operaciones',               8),
    ('procesos',                'Procesos',                  9),
    ('recursos_humanos',        'Recursos Humanos',          10)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tipos_componente (id, nombre, tiene_codigo, sigla, es_sistema) VALUES
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
ON CONFLICT (id) DO NOTHING;
