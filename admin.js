/**
 * PANEL DE GESTIÓN Y EDITOR DE PLANTILLAS — MOTOZUNI S.A.
 * Administra Plantillas (desde cero o basadas en existentes), Sucursales,
 * Sectores/Áreas, Tipos de Componentes y conexión con Supabase.
 */

const SUPABASE_SETUP_SQL = `-- Copiar y ejecutar en Supabase -> SQL Editor -> New query
CREATE TABLE IF NOT EXISTS public.sucursales (
    id INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL,
    activa BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sectores (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    orden INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tipos_componente (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    tiene_codigo BOOLEAN NOT NULL DEFAULT true,
    sigla TEXT NOT NULL DEFAULT '',
    es_sistema BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sectores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_componente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plantillas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "acceso_total_sucursales" ON public.sucursales;
CREATE POLICY "acceso_total_sucursales" ON public.sucursales FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "acceso_total_sectores" ON public.sectores;
CREATE POLICY "acceso_total_sectores" ON public.sectores FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "acceso_total_tipos_componente" ON public.tipos_componente;
CREATE POLICY "acceso_total_tipos_componente" ON public.tipos_componente FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "acceso_total_plantillas" ON public.plantillas;
CREATE POLICY "acceso_total_plantillas" ON public.plantillas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`;

class AdminPanelController {
    #store;
    #onDataChanged;
    #tabActual = 'plantillas';
    #plantillaDraft = null;
    #esNuevaPlantilla = false;
    #editandoSucursalId = null;
    #editandoSectorId = null;
    #editandoTipoId = null;

    constructor(store, onDataChanged) {
        this.#store = store;
        this.#onDataChanged = onDataChanged;
    }

    abrir(tab = 'plantillas') {
        this.#tabActual = tab;
        this.#plantillaDraft = null;
        const modal = document.getElementById('admin-modal');
        if (modal) {
            modal.classList.add('open');
            this.render();
        }
    }

    cerrar() {
        const modal = document.getElementById('admin-modal');
        if (modal) modal.classList.remove('open');
        this.#plantillaDraft = null;
    }

    cambiarTab(tab) {
        this.#tabActual = tab;
        this.#plantillaDraft = null;
        this.#editandoSucursalId = null;
        this.#editandoSectorId = null;
        this.#editandoTipoId = null;
        this.render();
    }

    mostrarMensaje(texto, tipo = 'ok') {
        const box = document.getElementById('admin-toast');
        if (!box) return;
        box.textContent = texto;
        box.className = `admin-toast show ${tipo}`;
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => {
            box.classList.remove('show');
        }, 4000);
    }

    #notificarCambio() {
        if (typeof this.#onDataChanged === 'function') {
            this.#onDataChanged();
        }
    }

    render() {
        // Actualizar estado activo de tabs
        document.querySelectorAll('.admin-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === this.#tabActual);
        });

        const body = document.getElementById('admin-modal-body');
        if (!body) return;

        switch (this.#tabActual) {
            case 'plantillas':
                body.innerHTML = this.#plantillaDraft
                    ? this.#renderEditorPlantilla()
                    : this.#renderListaPlantillas();
                break;
            case 'sucursales':
                body.innerHTML = this.#renderTabSucursales();
                break;
            case 'sectores':
                body.innerHTML = this.#renderTabSectores();
                break;
            case 'componentes':
                body.innerHTML = this.#renderTabComponentes();
                break;
            case 'database':
                body.innerHTML = this.#renderTabDatabase();
                break;
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TAB 1: PLANTILLAS (LISTA + EDITOR VISUAL)
    // ══════════════════════════════════════════════════════════════════════════

    #renderListaPlantillas() {
        const plantillas = this.#store.obtenerPlantillas();
        const tipos = this.#store.obtenerTiposComponente();
        const tipoMap = Object.fromEntries(tipos.map(t => [t.id, t]));

        const opcionesBase = plantillas.map(p =>
            `<option value="${escapeHtml(p.id)}">${escapeHtml(p.nombre)}</option>`
        ).join('');

        const filas = plantillas.map(p => {
            const tipoObj = p.tipo_componente_id ? tipoMap[p.tipo_componente_id] : null;
            const tipoNombre = tipoObj ? tipoObj.nombre : 'Personalizado';
            const badgeCodigo = p.tiene_codigo
                ? `<span class="tag tag-code">Código: ${escapeHtml(p.sigla_codigo || 'EQ')}-SUC-####</span>`
                : `<span class="tag tag-nocode">Sin código</span>`;
            const badgeRemito = p.usar_como_remito ? `<span class="tag tag-blue">Remito</span>` : '';
            const badgeAdic = p.usar_como_adicional ? `<span class="tag tag-green">Adicional</span>` : '';
            const totalCampos = (p.config.secciones || []).reduce((acc, s) => acc + (s.campos ? s.campos.length : 0), 0);

            return `
                <div class="admin-card-row">
                    <div class="admin-card-info">
                        <div class="admin-card-title">
                            <strong>${escapeHtml(p.nombre)}</strong>
                            <span class="tag tag-gray">${escapeHtml(tipoNombre)}</span>
                            ${badgeCodigo}
                            ${badgeRemito}
                            ${badgeAdic}
                        </div>
                        <div class="admin-card-meta">
                            Flujo: <b>${escapeHtml(p.tipo_flujo)}</b> ·
                            Secciones: <b>${p.config.secciones.length}</b> ·
                            Campos: <b>${totalCampos}</b>
                        </div>
                    </div>
                    <div class="admin-card-actions">
                        <button type="button" class="btn-adm btn-adm-secondary" onclick="adminPanel.editarPlantilla('${escapeHtml(p.id)}')">✏️ Editar</button>
                        <button type="button" class="btn-adm btn-adm-outline" onclick="adminPanel.crearPlantillaDesdeBase('${escapeHtml(p.id)}')" title="Crear nueva plantilla copiando esta como base">📋 Usar como base</button>
                        <button type="button" class="btn-adm btn-adm-danger" onclick="adminPanel.eliminarPlantilla('${escapeHtml(p.id)}')" title="Eliminar plantilla">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="admin-toolbar">
                <div class="admin-toolbar-left">
                    <button type="button" class="btn-adm btn-adm-primary" onclick="adminPanel.nuevaPlantillaDesdeCero()">+ Nueva Plantilla desde Cero</button>
                    <div class="admin-clone-inline">
                        <select id="select_base_clonar" class="adm-input-sm">
                            <option value="">Crear basada en...</option>
                            ${opcionesBase}
                        </select>
                        <button type="button" class="btn-adm btn-adm-secondary" onclick="adminPanel.clonarDesdeSelector()">📋 Crear desde base</button>
                    </div>
                </div>
                <button type="button" class="btn-adm btn-adm-outline" onclick="adminPanel.restaurarPlantillasOriginales()">↺ Restaurar originales</button>
            </div>
            <p class="admin-help">
                Editá cualquier remito existente para quitar o agregar campos, o creá nuevas plantillas (por ejemplo <b>Chip de Celular</b> sin código) desde cero o copiando otra plantilla.
            </p>
            <div class="admin-list">
                ${filas || '<div class="admin-empty">No hay plantillas cargadas.</div>'}
            </div>
        `;
    }

    nuevaPlantillaDesdeCero() {
        const tipos = this.#store.obtenerTiposComponente();
        const primerTipo = tipos[0] || null;
        this.#esNuevaPlantilla = true;
        this.#plantillaDraft = {
            id: '',
            nombre: '',
            orden: this.#store.obtenerPlantillas().length + 1,
            tipo_componente_id: primerTipo ? primerTipo.id : '',
            tipo_flujo: 'entrega',
            usar_como_remito: true,
            usar_como_adicional: true,
            tiene_codigo: primerTipo ? primerTipo.tiene_codigo : true,
            sigla_codigo: primerTipo && primerTipo.tiene_codigo ? primerTipo.sigla : '',
            es_sistema: false,
            config: {
                bannerTitulo: 'RECIBO DE ENTREGA DE DISPOSITIVOS',
                colorTema: 'azul',
                subtituloHeader: '',
                prefijoPdf: 'Recibo',
                sincronizarCodigos: false,
                incluirDatosAsignacion: true,
                mostrarEmailAsignacion: false,
                incluirNotaAdicional: true,
                notaPlaceholder: 'Ejemplo: Observaciones adicionales...',
                textoConformidad: '',
                secciones: [
                    {
                        id: 'principal',
                        titulo: primerTipo ? primerTipo.nombre.toUpperCase() : 'DISPOSITIVO',
                        tieneCodigo: primerTipo ? primerTipo.tiene_codigo : true,
                        sigla: primerTipo && primerTipo.tiene_codigo ? primerTipo.sigla : '',
                        codigoFieldId: 'cod',
                        codigoLabel: 'Código',
                        opcional: false,
                        campos: [
                            { id: 'marca', label: 'Marca', labelForm: '', tipoControl: 'texto', placeholder: 'Ejemplo: Marca', valorDefecto: '', fallbackTabla: '', opciones: [], enTabla: true },
                            { id: 'modelo', label: 'Modelo', labelForm: '', tipoControl: 'texto', placeholder: 'Ejemplo: Modelo', valorDefecto: '', fallbackTabla: '', opciones: [], enTabla: true },
                            { id: 'estado', label: 'Estado', labelForm: '', tipoControl: 'fijo', placeholder: '', valorDefecto: 'Asignado', fallbackTabla: '', opciones: [], enTabla: true }
                        ]
                    }
                ]
            }
        };
        this.render();
    }

    clonarDesdeSelector() {
        const sel = document.getElementById('select_base_clonar');
        if (!sel || !sel.value) {
            this.mostrarMensaje('Elegí una plantilla base del desplegable.', 'error');
            return;
        }
        this.crearPlantillaDesdeBase(sel.value);
    }

    crearPlantillaDesdeBase(baseId) {
        const base = this.#store.buscarPlantillaPorId(baseId);
        if (!base) return;
        const copia = clonarProfundo(base.toJSON());
        copia.id = '';
        copia.nombre = `${base.nombre} (Copia)`;
        copia.es_sistema = false;
        copia.orden = this.#store.obtenerPlantillas().length + 1;
        this.#esNuevaPlantilla = true;
        this.#plantillaDraft = copia;
        this.render();
    }

    editarPlantilla(id) {
        const orig = this.#store.buscarPlantillaPorId(id);
        if (!orig) return;
        this.#esNuevaPlantilla = false;
        this.#plantillaDraft = clonarProfundo(orig.toJSON());
        this.render();
    }

    cancelarEdicionPlantilla() {
        this.#plantillaDraft = null;
        this.render();
    }

    #capturarDraftDesdeDOM() {
        if (!this.#plantillaDraft) return;
        const d = this.#plantillaDraft;

        const val = id => {
            const el = document.getElementById(id);
            return el ? el.value : '';
        };
        const chk = id => {
            const el = document.getElementById(id);
            return el ? el.checked : false;
        };

        d.nombre = val('tpl_nombre').trim();
        d.tipo_componente_id = val('tpl_tipo_comp') || null;
        d.tipo_flujo = val('tpl_flujo') || 'entrega';
        d.usar_como_remito = chk('tpl_usar_remito');
        d.usar_como_adicional = chk('tpl_usar_adicional');
        d.tiene_codigo = chk('tpl_tiene_codigo');
        d.sigla_codigo = d.tiene_codigo ? val('tpl_sigla_codigo').trim().toUpperCase() : '';

        d.config.colorTema = val('tpl_color') || 'azul';
        d.config.bannerTitulo = val('tpl_banner').trim();
        d.config.subtituloHeader = val('tpl_subtitulo').trim();
        d.config.sincronizarCodigos = chk('tpl_sinc_codigos');
        d.config.incluirDatosAsignacion = chk('tpl_inc_asig');
        d.config.mostrarEmailAsignacion = chk('tpl_inc_email');
        d.config.incluirNotaAdicional = chk('tpl_inc_nota');
        d.config.notaPlaceholder = val('tpl_nota_ph').trim();
        d.config.textoConformidad = val('tpl_conformidad').trim();

        // Capturar secciones y sus campos
        d.config.secciones.forEach((sec, sIdx) => {
            sec.titulo = val(`sec_titulo_${sIdx}`).trim() || `SECCIÓN ${sIdx + 1}`;
            sec.tieneCodigo = chk(`sec_tiene_cod_${sIdx}`);
            sec.sigla = sec.tieneCodigo ? val(`sec_sigla_${sIdx}`).trim().toUpperCase() : '';
            sec.codigoLabel = val(`sec_cod_lbl_${sIdx}`).trim() || 'Código';
            sec.opcional = chk(`sec_opc_${sIdx}`);

            sec.campos.forEach((campo, cIdx) => {
                const label = val(`cmp_lbl_${sIdx}_${cIdx}`).trim();
                campo.label = label || `Campo ${cIdx + 1}`;
                campo.labelForm = '';
                campo.tipoControl = val(`cmp_tipo_${sIdx}_${cIdx}`) || 'texto';
                const extra = val(`cmp_extra_${sIdx}_${cIdx}`).trim();
                if (campo.tipoControl === 'fijo') {
                    campo.valorDefecto = extra || '—';
                    campo.placeholder = '';
                    campo.opciones = [];
                } else if (campo.tipoControl === 'select') {
                    campo.opciones = extra.split(',').map(x => x.trim()).filter(Boolean);
                    campo.placeholder = '';
                    campo.valorDefecto = '';
                } else {
                    campo.placeholder = extra;
                    campo.valorDefecto = '';
                    campo.opciones = [];
                }
                campo.enTabla = chk(`cmp_tabla_${sIdx}_${cIdx}`);
                if (!campo.id || campo.id.startsWith('campo_nuevo_')) {
                    campo.id = generarSlug(campo.label, `campo_${sIdx}_${cIdx}`);
                }
            });
        });

        // Sincronizar la configuración principal de código con la primera sección
        if (d.config.secciones.length > 0) {
            d.tiene_codigo = Boolean(d.config.secciones[0].tieneCodigo);
            d.sigla_codigo = d.tiene_codigo ? d.config.secciones[0].sigla : '';
        }
    }

    onCambioTipoComponenteEnEditor() {
        this.#capturarDraftDesdeDOM();
        const d = this.#plantillaDraft;
        if (!d) return;
        const tipo = this.#store.buscarTipoComponentePorId(d.tipo_componente_id);
        if (tipo && this.#esNuevaPlantilla) {
            d.tiene_codigo = tipo.tiene_codigo;
            d.sigla_codigo = tipo.sigla;
            if (d.config.secciones[0]) {
                d.config.secciones[0].tieneCodigo = tipo.tiene_codigo;
                d.config.secciones[0].sigla = tipo.sigla;
                if (!d.nombre) d.config.secciones[0].titulo = tipo.nombre.toUpperCase();
            }
        }
        this.render();
    }

    onToggleCodigoPrincipal() {
        this.#capturarDraftDesdeDOM();
        const d = this.#plantillaDraft;
        if (!d) return;
        const chk = document.getElementById('tpl_tiene_codigo');
        const activo = chk ? chk.checked : false;
        d.tiene_codigo = activo;
        if (d.config.secciones[0]) {
            d.config.secciones[0].tieneCodigo = activo;
            if (activo && !d.config.secciones[0].sigla) {
                d.config.secciones[0].sigla = d.sigla_codigo || 'EQ';
                d.sigla_codigo = d.config.secciones[0].sigla;
            }
        }
        this.render();
    }

    onSiglaPrincipalInput(valor) {
        if (!this.#plantillaDraft) return;
        const clean = String(valor || '').trim().toUpperCase();
        this.#plantillaDraft.sigla_codigo = clean;
        if (this.#plantillaDraft.config.secciones[0]) {
            this.#plantillaDraft.config.secciones[0].sigla = clean;
            const secSiglaEl = document.getElementById('sec_sigla_0');
            if (secSiglaEl) secSiglaEl.value = clean;
        }
    }

    onToggleCodigoSeccion(sIdx) {
        this.#capturarDraftDesdeDOM();
        const d = this.#plantillaDraft;
        if (!d || !d.config.secciones[sIdx]) return;
        if (sIdx === 0) {
            d.tiene_codigo = d.config.secciones[0].tieneCodigo;
            d.sigla_codigo = d.config.secciones[0].sigla;
        }
        this.render();
    }

    onCambioFlujoEditor() {
        this.#capturarDraftDesdeDOM();
        const d = this.#plantillaDraft;
        if (!d) return;
        if (d.tipo_flujo === 'traslado') {
            d.config.colorTema = 'naranja';
            d.config.bannerTitulo = 'REMITO DE TRASLADO DE DISPOSITIVO';
            d.config.incluirDatosAsignacion = false;
        } else if (d.tipo_flujo === 'baja') {
            d.config.colorTema = 'rojo';
            d.config.bannerTitulo = 'REMITO DE DEVOLUCIÓN / BAJA DE DISPOSITIVO';
            d.config.incluirDatosAsignacion = false;
        } else {
            d.config.colorTema = 'azul';
            d.config.bannerTitulo = 'RECIBO DE ENTREGA DE DISPOSITIVOS';
            d.config.incluirDatosAsignacion = true;
        }
        this.render();
    }

    agregarSeccionDraft() {
        this.#capturarDraftDesdeDOM();
        const d = this.#plantillaDraft;
        const idx = d.config.secciones.length + 1;
        d.config.secciones.push({
            id: `sec_${idx}`,
            titulo: `SECCIÓN ${idx}`,
            tieneCodigo: false,
            sigla: '',
            codigoFieldId: `cod_${idx}`,
            codigoLabel: `Código ${idx}`,
            opcional: false,
            campos: [
                { id: `campo_nuevo_${Date.now()}`, label: 'Detalle', labelForm: '', tipoControl: 'texto', placeholder: 'Ejemplo: Valor', valorDefecto: '', fallbackTabla: '', opciones: [], enTabla: true }
            ]
        });
        this.render();
    }

    eliminarSeccionDraft(sIdx) {
        this.#capturarDraftDesdeDOM();
        if (this.#plantillaDraft.config.secciones.length <= 1) {
            this.mostrarMensaje('La plantilla debe tener al menos una sección.', 'error');
            return;
        }
        this.#plantillaDraft.config.secciones.splice(sIdx, 1);
        this.render();
    }

    agregarCampoDraft(sIdx) {
        this.#capturarDraftDesdeDOM();
        const sec = this.#plantillaDraft.config.secciones[sIdx];
        if (!sec) return;
        sec.campos.push({
            id: `campo_nuevo_${Date.now()}_${Math.floor(Math.random() * 100)}`,
            label: '',
            labelForm: '',
            tipoControl: 'texto',
            placeholder: '',
            valorDefecto: '',
            fallbackTabla: '',
            opciones: [],
            enTabla: true
        });
        this.render();
    }

    eliminarCampoDraft(sIdx, cIdx) {
        this.#capturarDraftDesdeDOM();
        const sec = this.#plantillaDraft.config.secciones[sIdx];
        if (!sec) return;
        sec.campos.splice(cIdx, 1);
        this.render();
    }

    moverCampoDraft(sIdx, cIdx, dir) {
        this.#capturarDraftDesdeDOM();
        const sec = this.#plantillaDraft.config.secciones[sIdx];
        if (!sec) return;
        const nuevoIdx = cIdx + dir;
        if (nuevoIdx < 0 || nuevoIdx >= sec.campos.length) return;
        const [item] = sec.campos.splice(cIdx, 1);
        sec.campos.splice(nuevoIdx, 0, item);
        this.render();
    }

    onCambioTipoCampoDraft() {
        this.#capturarDraftDesdeDOM();
        this.render();
    }

    insertarVariableConformidad(varName) {
        const ta = document.getElementById('tpl_conformidad');
        if (!ta) return;
        const token = `<b>{{${varName}}}</b>`;
        const start = ta.selectionStart ?? ta.value.length;
        const end = ta.selectionEnd ?? ta.value.length;
        ta.value = ta.value.slice(0, start) + token + ta.value.slice(end);
        ta.focus();
    }

    async crearTipoRapidoDesdeEditor() {
        const nombre = prompt('Nombre del nuevo tipo de componente (ej: Chip de Celular, Impresora):');
        if (!nombre || !nombre.trim()) return;
        const tieneCodigo = confirm('¿Este componente lleva código automático [SIGLA]-[SUC]-[NUM]?\n\nAceptar = Sí lleva código\nCancelar = No lleva código');
        let sigla = '';
        if (tieneCodigo) {
            sigla = (prompt('Sigla de 2 a 4 letras para el código (ej: CH, IM, RT):', nombre.trim().slice(0, 2).toUpperCase()) || '').trim().toUpperCase();
            if (!sigla) return;
        }
        try {
            this.#capturarDraftDesdeDOM();
            const nuevo = await this.#store.guardarTipoComponente({
                nombre: nombre.trim(),
                tiene_codigo: tieneCodigo,
                sigla
            });
            this.#plantillaDraft.tipo_componente_id = nuevo.id;
            this.#plantillaDraft.tiene_codigo = nuevo.tiene_codigo;
            this.#plantillaDraft.sigla_codigo = nuevo.sigla;
            if (this.#plantillaDraft.config.secciones[0]) {
                this.#plantillaDraft.config.secciones[0].tieneCodigo = nuevo.tiene_codigo;
                this.#plantillaDraft.config.secciones[0].sigla = nuevo.sigla;
                if (!this.#plantillaDraft.nombre) {
                    this.#plantillaDraft.nombre = nuevo.nombre;
                    this.#plantillaDraft.config.secciones[0].titulo = nuevo.nombre.toUpperCase();
                }
            }
            this.mostrarMensaje(`Tipo "${nuevo.nombre}" creado y seleccionado.`, 'ok');
            this.#notificarCambio();
            this.render();
        } catch (err) {
            this.mostrarMensaje(err.message, 'error');
        }
    }

    async guardarPlantillaDraft() {
        this.#capturarDraftDesdeDOM();
        const d = this.#plantillaDraft;

        // Asegurar IDs únicos de campos en toda la plantilla
        const usados = new Set(['nombre', 'area', 'email', 'fecha', 'nota', 'nombre1', 'nombre2', 'rol1', 'rol2']);
        d.config.secciones.forEach((sec, sIdx) => {
            if (sec.tieneCodigo) {
                sec.codigoFieldId = sec.codigoFieldId || (sIdx === 0 ? 'cod' : `cod_${sIdx + 1}`);
                usados.add(sec.codigoFieldId);
            }
            sec.campos.forEach((c, cIdx) => {
                let baseId = generarSlug(c.id || c.label, `campo_${sIdx}_${cIdx}`);
                if (!c.id || c.id.startsWith('campo_nuevo_')) {
                    baseId = generarSlug(c.label, `campo_${sIdx}_${cIdx}`);
                }
                let finalId = baseId;
                let n = 2;
                while (usados.has(finalId)) {
                    finalId = `${baseId}_${n++}`;
                }
                c.id = finalId;
                usados.add(finalId);
            });
        });

        try {
            const guardada = await this.#store.guardarPlantilla(d);
            this.#plantillaDraft = null;
            this.mostrarMensaje(`Plantilla "${guardada.nombre}" guardada correctamente.`, 'ok');
            this.#notificarCambio();
            this.render();
        } catch (err) {
            this.mostrarMensaje(err.message, 'error');
        }
    }

    async eliminarPlantilla(id) {
        const p = this.#store.buscarPlantillaPorId(id);
        if (!p) return;
        if (!confirm(`¿Seguro que querés eliminar la plantilla "${p.nombre}"?`)) return;
        try {
            await this.#store.eliminarPlantilla(id);
            this.mostrarMensaje(`Plantilla "${p.nombre}" eliminada.`, 'ok');
            this.#notificarCambio();
            this.render();
        } catch (err) {
            this.mostrarMensaje(err.message, 'error');
        }
    }

    async restaurarPlantillasOriginales() {
        if (!confirm('¿Restaurar las 10 plantillas originales? Esto reemplazará tus plantillas actuales por las de fábrica.')) return;
        try {
            await this.#store.restaurarDefaults(true);
            this.mostrarMensaje('Plantillas originales restauradas.', 'ok');
            this.#notificarCambio();
            this.render();
        } catch (err) {
            this.mostrarMensaje(err.message, 'error');
        }
    }

    #renderEditorPlantilla() {
        const d = this.#plantillaDraft;
        const tipos = this.#store.obtenerTiposComponente();
        const tiposOpts = tipos.map(t =>
            `<option value="${escapeHtml(t.id)}" ${t.id === d.tipo_componente_id ? 'selected' : ''}>${escapeHtml(t.nombre)} ${t.tiene_codigo ? `(${t.sigla})` : '(Sin código)'}</option>`
        ).join('');

        const secPrincipal = d.config.secciones[0];
        const tieneCodPrincipal = secPrincipal ? secPrincipal.tieneCodigo : d.tiene_codigo;
        const siglaPrincipal = secPrincipal ? secPrincipal.sigla : d.sigla_codigo;

        // Variables disponibles para botones rápidos en conformidad
        const varsDisponibles = ['nombre', 'fecha', 'componente', 'sucursal'];
        d.config.secciones.forEach(s => {
            if (s.tieneCodigo && s.codigoFieldId) varsDisponibles.push(s.codigoFieldId);
            s.campos.forEach(c => {
                if (c.id && !c.id.startsWith('campo_nuevo_')) varsDisponibles.push(c.id);
            });
        });

        const seccionesHtml = d.config.secciones.map((sec, sIdx) => {
            const camposHtml = sec.campos.map((c, cIdx) => {
                let extraVal = c.placeholder || '';
                let extraPh = 'Ejemplo / Placeholder (opcional)';
                if (c.tipoControl === 'fijo') {
                    extraVal = c.valorDefecto || '';
                    extraPh = 'Valor fijo en tabla (ej: Asignado)';
                } else if (c.tipoControl === 'select') {
                    extraVal = (c.opciones || []).join(', ');
                    extraPh = 'Opciones separadas por coma (ej: Claro, Personal, Movistar)';
                }

                return `
                    <div class="editor-campo-row">
                        <input type="text" id="cmp_lbl_${sIdx}_${cIdx}" value="${escapeHtml(c.label)}" placeholder="Nombre del campo (ej: Operadora)">
                        <select id="cmp_tipo_${sIdx}_${cIdx}" onchange="adminPanel.onCambioTipoCampoDraft()">
                            <option value="texto" ${c.tipoControl === 'texto' ? 'selected' : ''}>Texto</option>
                            <option value="select" ${c.tipoControl === 'select' ? 'selected' : ''}>Lista opciones</option>
                            <option value="area" ${c.tipoControl === 'area' ? 'selected' : ''}>Selector de Área</option>
                            <option value="fecha" ${c.tipoControl === 'fecha' ? 'selected' : ''}>Fecha</option>
                            <option value="fijo" ${c.tipoControl === 'fijo' ? 'selected' : ''}>Valor fijo (solo tabla)</option>
                        </select>
                        <input type="text" id="cmp_extra_${sIdx}_${cIdx}" value="${escapeHtml(extraVal)}" placeholder="${escapeHtml(extraPh)}">
                        <label class="chk-inline" title="Mostrar este campo en la tabla del remito">
                            <input type="checkbox" id="cmp_tabla_${sIdx}_${cIdx}" ${c.enTabla !== false ? 'checked' : ''}> Tabla
                        </label>
                        <div class="campo-move-btns">
                            <button type="button" class="btn-icon" onclick="adminPanel.moverCampoDraft(${sIdx}, ${cIdx}, -1)" title="Subir">↑</button>
                            <button type="button" class="btn-icon" onclick="adminPanel.moverCampoDraft(${sIdx}, ${cIdx}, 1)" title="Bajar">↓</button>
                            <button type="button" class="btn-icon btn-icon-danger" onclick="adminPanel.eliminarCampoDraft(${sIdx}, ${cIdx})" title="Quitar campo">✕</button>
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="editor-seccion-box">
                    <div class="editor-seccion-head">
                        <div class="editor-sec-title-group">
                            <span class="sec-badge">Sección ${sIdx + 1}</span>
                            <input type="text" id="sec_titulo_${sIdx}" value="${escapeHtml(sec.titulo)}" placeholder="Título en el remito (ej: CHIP SIM)">
                        </div>
                        <div class="editor-sec-opts">
                            <label class="chk-inline">
                                <input type="checkbox" id="sec_tiene_cod_${sIdx}" ${sec.tieneCodigo ? 'checked' : ''} onchange="adminPanel.onToggleCodigoSeccion(${sIdx})">
                                Lleva código
                            </label>
                            <input type="text" id="sec_sigla_${sIdx}" class="input-sigla-sm" value="${escapeHtml(sec.sigla)}" maxlength="6" placeholder="Sigla" style="${sec.tieneCodigo ? '' : 'display:none;'}">
                            <input type="text" id="sec_cod_lbl_${sIdx}" class="input-codlbl-sm" value="${escapeHtml(sec.codigoLabel || 'Código')}" placeholder="Etiqueta cód." style="${sec.tieneCodigo ? '' : 'display:none;'}">
                            <label class="chk-inline" title="Si ningún campo se completa, esta sección se oculta del remito">
                                <input type="checkbox" id="sec_opc_${sIdx}" ${sec.opcional ? 'checked' : ''}> Opcional
                            </label>
                            ${d.config.secciones.length > 1 ? `<button type="button" class="btn-icon btn-icon-danger" onclick="adminPanel.eliminarSeccionDraft(${sIdx})" title="Eliminar sección">🗑️</button>` : ''}
                        </div>
                    </div>
                    <div class="editor-campos-list">
                        ${camposHtml || '<div class="admin-empty-sm">Sin campos todavía. Agregá uno abajo.</div>'}
                    </div>
                    <button type="button" class="btn-adm btn-adm-outline btn-sm" onclick="adminPanel.agregarCampoDraft(${sIdx})">+ Agregar Campo</button>
                </div>
            `;
        }).join('');

        return `
            <div class="editor-top-bar">
                <h3>${this.#esNuevaPlantilla ? '✨ Nueva Plantilla de Remito' : `✏️ Editando: ${escapeHtml(d.nombre)}`}</h3>
                <div class="editor-top-actions">
                    <button type="button" class="btn-adm btn-adm-outline" onclick="adminPanel.cancelarEdicionPlantilla()">← Volver</button>
                    <button type="button" class="btn-adm btn-adm-primary" onclick="adminPanel.guardarPlantillaDraft()">💾 Guardar Plantilla</button>
                </div>
            </div>

            <div class="editor-panel-grid">
                <div class="editor-block">
                    <h4>1. Datos Generales y Código</h4>
                    <div class="adm-grid-2">
                        <div class="adm-field">
                            <label for="tpl_nombre">Nombre de la Plantilla *</label>
                            <input type="text" id="tpl_nombre" value="${escapeHtml(d.nombre)}" placeholder="Ej: Chip de Celular, Impresora...">
                        </div>
                        <div class="adm-field">
                            <label for="tpl_tipo_comp">Tipo de Componente</label>
                            <div class="adm-inline-add">
                                <select id="tpl_tipo_comp" onchange="adminPanel.onCambioTipoComponenteEnEditor()">
                                    <option value="">-- Seleccionar --</option>
                                    ${tiposOpts}
                                </select>
                                <button type="button" class="btn-adm btn-adm-outline btn-sm" onclick="adminPanel.crearTipoRapidoDesdeEditor()" title="Crear nuevo tipo de componente">+ Nuevo</button>
                            </div>
                        </div>
                    </div>

                    <div class="adm-grid-3">
                        <div class="adm-field">
                            <label for="tpl_flujo">Tipo de Flujo</label>
                            <select id="tpl_flujo" onchange="adminPanel.onCambioFlujoEditor()">
                                <option value="entrega" ${d.tipo_flujo === 'entrega' ? 'selected' : ''}>Entrega estándar</option>
                                <option value="traslado" ${d.tipo_flujo === 'traslado' ? 'selected' : ''}>Traslado (Entrega / Recepción)</option>
                                <option value="baja" ${d.tipo_flujo === 'baja' ? 'selected' : ''}>Baja / Devolución</option>
                            </select>
                        </div>
                        <div class="adm-field">
                            <label for="tpl_color">Color del Remito</label>
                            <select id="tpl_color">
                                <option value="azul" ${d.config.colorTema === 'azul' ? 'selected' : ''}>Azul (Estándar)</option>
                                <option value="naranja" ${d.config.colorTema === 'naranja' ? 'selected' : ''}>Naranja (Traslado)</option>
                                <option value="rojo" ${d.config.colorTema === 'rojo' ? 'selected' : ''}>Rojo (Baja)</option>
                                <option value="verde" ${d.config.colorTema === 'verde' ? 'selected' : ''}>Verde</option>
                            </select>
                        </div>
                        <div class="adm-field">
                            <label>Dónde estará disponible</label>
                            <div class="chk-stack">
                                <label class="chk-inline"><input type="checkbox" id="tpl_usar_remito" ${d.usar_como_remito ? 'checked' : ''}> Remito Principal</label>
                                <label class="chk-inline"><input type="checkbox" id="tpl_usar_adicional" ${d.usar_como_adicional ? 'checked' : ''}> Componente Adicional</label>
                            </div>
                        </div>
                    </div>

                    <div class="code-config-banner">
                        <label class="chk-inline chk-strong">
                            <input type="checkbox" id="tpl_tiene_codigo" ${tieneCodPrincipal ? 'checked' : ''} onchange="adminPanel.onToggleCodigoPrincipal()">
                            ¿El componente principal lleva código automático ([SIGLA]-[SUCURSAL]-[NÚMERO])?
                        </label>
                        <div class="code-sigla-picker" style="${tieneCodPrincipal ? '' : 'display:none;'}">
                            <label for="tpl_sigla_codigo">Sigla del código:</label>
                            <input type="text" id="tpl_sigla_codigo" value="${escapeHtml(siglaPrincipal)}" maxlength="6" placeholder="Ej: CH" oninput="adminPanel.onSiglaPrincipalInput(this.value)">
                            <span class="code-preview-mini">Vista previa: <b>${escapeHtml(siglaPrincipal || 'XX')}-28-4821</b></span>
                        </div>
                    </div>
                </div>

                <div class="editor-block">
                    <div class="editor-block-head">
                        <h4>2. Secciones y Campos de Información</h4>
                        <button type="button" class="btn-adm btn-adm-secondary btn-sm" onclick="adminPanel.agregarSeccionDraft()">+ Agregar Otra Sección</button>
                    </div>
                    <p class="admin-help-sm">Agregá, quitá o reordená exactamente los datos que necesita este componente. Si no querés un campo (ej: procesador o IMEI), borralo con ✕.</p>
                    ${seccionesHtml}
                    ${d.config.secciones.filter(s => s.tieneCodigo).length > 1 ? `
                        <label class="chk-inline" style="margin-top: 8px;">
                            <input type="checkbox" id="tpl_sinc_codigos" ${d.config.sincronizarCodigos ? 'checked' : ''}>
                            Sincronizar número aleatorio entre secciones con código (como PC + Monitor)
                        </label>
                    ` : `<input type="checkbox" id="tpl_sinc_codigos" style="display:none;" ${d.config.sincronizarCodigos ? 'checked' : ''}>`}
                </div>

                <div class="editor-block">
                    <h4>3. Opciones del Remito y Conformidad</h4>
                    <div class="adm-grid-2">
                        <div class="adm-field">
                            <label for="tpl_banner">Título del Banner</label>
                            <input type="text" id="tpl_banner" value="${escapeHtml(d.config.bannerTitulo)}" placeholder="RECIBO DE ENTREGA DE DISPOSITIVOS">
                        </div>
                        <div class="adm-field">
                            <label for="tpl_subtitulo">Subtítulo Encabezado Derecho (opcional)</label>
                            <input type="text" id="tpl_subtitulo" value="${escapeHtml(d.config.subtituloHeader || '')}" placeholder="Ej: {{marca}} {{modelo}} (dejar vacío para automático)">
                        </div>
                    </div>

                    <div class="chk-row-wrap" style="${d.tipo_flujo === 'entrega' ? '' : 'display:none;'}">
                        <label class="chk-inline"><input type="checkbox" id="tpl_inc_asig" ${d.config.incluirDatosAsignacion ? 'checked' : ''}> Incluir tabla "Datos de Asignación"</label>
                        <label class="chk-inline"><input type="checkbox" id="tpl_inc_email" ${d.config.mostrarEmailAsignacion ? 'checked' : ''}> Incluir campo Email</label>
                        <label class="chk-inline"><input type="checkbox" id="tpl_inc_nota" ${d.config.incluirNotaAdicional ? 'checked' : ''}> Incluir campo Nota Adicional</label>
                    </div>

                    <div class="adm-field" style="margin-top:8px; ${d.tipo_flujo === 'entrega' ? '' : 'display:none;'}">
                        <label for="tpl_nota_ph">Ejemplo de Nota Adicional</label>
                        <input type="text" id="tpl_nota_ph" value="${escapeHtml(d.config.notaPlaceholder || '')}" placeholder="Ejemplo: Incluye funda y cargador">
                    </div>

                    <div class="adm-field" style="margin-top:10px; ${d.tipo_flujo !== 'traslado' ? '' : 'display:none;'}">
                        <label for="tpl_conformidad">Texto de Declaración de Conformidad (opcional — vacío genera texto automático)</label>
                        <div class="var-chips">
                            <span>Insertar variable:</span>
                            ${varsDisponibles.slice(0, 12).map(vName => `<button type="button" class="var-chip" onclick="adminPanel.insertarVariableConformidad('${escapeHtml(vName)}')">{{${escapeHtml(vName)}}}</button>`).join('')}
                        </div>
                        <textarea id="tpl_conformidad" rows="3" placeholder="Dejar vacío para usar el texto automático estándar...">${escapeHtml(d.config.textoConformidad || '')}</textarea>
                    </div>
                </div>
            </div>

            <div class="editor-bottom-bar">
                <button type="button" class="btn-adm btn-adm-outline" onclick="adminPanel.cancelarEdicionPlantilla()">Cancelar</button>
                <button type="button" class="btn-adm btn-adm-primary" onclick="adminPanel.guardarPlantillaDraft()">💾 Guardar Plantilla</button>
            </div>
        `;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TAB 2: SUCURSALES
    // ══════════════════════════════════════════════════════════════════════════

    #renderTabSucursales() {
        const sucursales = this.#store.obtenerSucursales();
        const editObj = this.#editandoSucursalId !== null
            ? this.#store.buscarSucursalPorCodigo(this.#editandoSucursalId)
            : null;

        const filas = sucursales.map(s => `
            <tr>
                <td><b>${s.getId()}</b></td>
                <td>${escapeHtml(s.getNombre())}</td>
                <td>${escapeHtml(s.getNombreCompleto())}</td>
                <td class="td-actions">
                    <button type="button" class="btn-adm btn-adm-secondary btn-sm" onclick="adminPanel.editarSucursal(${s.getId()})">✏️ Editar</button>
                    <button type="button" class="btn-adm btn-adm-danger btn-sm" onclick="adminPanel.eliminarSucursal(${s.getId()})">🗑️</button>
                </td>
            </tr>
        `).join('');

        return `
            <div class="admin-inline-form">
                <h4>${editObj ? `✏️ Editando Sucursal Cód. ${editObj.getId()}` : '+ Agregar Nueva Sucursal'}</h4>
                <div class="adm-grid-form">
                    <input type="number" id="adm_suc_id" min="0" value="${editObj ? editObj.getId() : ''}" ${editObj ? 'disabled' : ''} placeholder="Código (ej: 34)">
                    <input type="text" id="adm_suc_nombre" value="${editObj ? escapeHtml(editObj.getNombre()) : ''}" placeholder="Nombre (ej: AVELLANEDA)">
                    <button type="button" class="btn-adm btn-adm-primary" onclick="adminPanel.guardarSucursal()">${editObj ? 'Guardar Cambios' : '+ Agregar'}</button>
                    ${editObj ? `<button type="button" class="btn-adm btn-adm-outline" onclick="adminPanel.cancelarEditSucursal()">Cancelar</button>` : ''}
                </div>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th style="width:90px;">Código</th>
                        <th>Nombre</th>
                        <th>Título en Remito</th>
                        <th style="width:160px;">Acciones</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
        `;
    }

    editarSucursal(id) {
        this.#editandoSucursalId = id;
        this.render();
    }

    cancelarEditSucursal() {
        this.#editandoSucursalId = null;
        this.render();
    }

    async guardarSucursal() {
        const idVal = this.#editandoSucursalId !== null
            ? this.#editandoSucursalId
            : document.getElementById('adm_suc_id')?.value;
        const nombreVal = document.getElementById('adm_suc_nombre')?.value;

        try {
            if (idVal === '' || idVal === null || idVal === undefined) {
                throw new Error('Ingresá el código numérico de la sucursal.');
            }
            await this.#store.guardarSucursal(Number(idVal), nombreVal);
            this.#editandoSucursalId = null;
            this.mostrarMensaje('Sucursal guardada correctamente.', 'ok');
            this.#notificarCambio();
            this.render();
        } catch (err) {
            this.mostrarMensaje(err.message, 'error');
        }
    }

    async eliminarSucursal(id) {
        const suc = this.#store.buscarSucursalPorCodigo(id);
        if (!suc) return;
        if (!confirm(`¿Eliminar la sucursal "${suc.getNombre()}" (Cód. ${id})?`)) return;
        try {
            await this.#store.eliminarSucursal(id);
            this.mostrarMensaje('Sucursal eliminada.', 'ok');
            this.#notificarCambio();
            this.render();
        } catch (err) {
            this.mostrarMensaje(err.message, 'error');
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TAB 3: SECTORES / ÁREAS
    // ══════════════════════════════════════════════════════════════════════════

    #renderTabSectores() {
        const sectores = this.#store.obtenerSectores();
        const editObj = this.#editandoSectorId ? this.#store.buscarSectorPorId(this.#editandoSectorId) : null;

        const filas = sectores.map(s => `
            <tr>
                <td>${escapeHtml(s.getNombre())}</td>
                <td class="td-actions">
                    <button type="button" class="btn-adm btn-adm-secondary btn-sm" onclick="adminPanel.editarSector('${escapeHtml(s.getId())}')">✏️ Editar</button>
                    <button type="button" class="btn-adm btn-adm-danger btn-sm" onclick="adminPanel.eliminarSector('${escapeHtml(s.getId())}')">🗑️</button>
                </td>
            </tr>
        `).join('');

        return `
            <div class="admin-inline-form">
                <h4>${editObj ? `✏️ Editando Sector` : '+ Agregar Nuevo Sector / Área'}</h4>
                <div class="adm-grid-form">
                    <input type="text" id="adm_sec_nombre" value="${editObj ? escapeHtml(editObj.getNombre()) : ''}" placeholder="Nombre del sector (ej: Sistemas / IT, Posventa...)" style="grid-column: span 2;">
                    <button type="button" class="btn-adm btn-adm-primary" onclick="adminPanel.guardarSector()">${editObj ? 'Guardar Cambios' : '+ Agregar'}</button>
                    ${editObj ? `<button type="button" class="btn-adm btn-adm-outline" onclick="adminPanel.cancelarEditSector()">Cancelar</button>` : ''}
                </div>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Sector / Área</th>
                        <th style="width:160px;">Acciones</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
        `;
    }

    editarSector(id) {
        this.#editandoSectorId = id;
        this.render();
    }

    cancelarEditSector() {
        this.#editandoSectorId = null;
        this.render();
    }

    async guardarSector() {
        const nombre = document.getElementById('adm_sec_nombre')?.value;
        const existente = this.#editandoSectorId ? this.#store.buscarSectorPorId(this.#editandoSectorId) : null;
        try {
            await this.#store.guardarSector({
                id: existente ? existente.getId() : '',
                nombre,
                orden: existente ? existente.getOrden() : this.#store.obtenerSectores().length + 1
            });
            this.#editandoSectorId = null;
            this.mostrarMensaje('Sector guardado correctamente.', 'ok');
            this.#notificarCambio();
            this.render();
        } catch (err) {
            this.mostrarMensaje(err.message, 'error');
        }
    }

    async eliminarSector(id) {
        const sec = this.#store.buscarSectorPorId(id);
        if (!sec) return;
        if (!confirm(`¿Eliminar el sector "${sec.getNombre()}"?`)) return;
        try {
            await this.#store.eliminarSector(id);
            this.mostrarMensaje('Sector eliminado.', 'ok');
            this.#notificarCambio();
            this.render();
        } catch (err) {
            this.mostrarMensaje(err.message, 'error');
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TAB 4: TIPOS DE COMPONENTES
    // ══════════════════════════════════════════════════════════════════════════

    #renderTabComponentes() {
        const tipos = this.#store.obtenerTiposComponente();
        const editObj = this.#editandoTipoId ? this.#store.buscarTipoComponentePorId(this.#editandoTipoId) : null;

        const filas = tipos.map(t => `
            <tr>
                <td><b>${escapeHtml(t.nombre)}</b></td>
                <td>${t.tiene_codigo ? `<span class="tag tag-code">Sí (${escapeHtml(t.sigla)})</span>` : `<span class="tag tag-nocode">Sin código</span>`}</td>
                <td class="td-actions">
                    <button type="button" class="btn-adm btn-adm-secondary btn-sm" onclick="adminPanel.editarTipoComponente('${escapeHtml(t.id)}')">✏️ Editar</button>
                    <button type="button" class="btn-adm btn-adm-danger btn-sm" onclick="adminPanel.eliminarTipoComponente('${escapeHtml(t.id)}')">🗑️</button>
                </td>
            </tr>
        `).join('');

        const tieneCod = editObj ? editObj.tiene_codigo : true;

        return `
            <div class="admin-inline-form">
                <h4>${editObj ? `✏️ Editando Tipo de Componente` : '+ Agregar Nuevo Tipo de Componente'}</h4>
                <div class="adm-grid-form-comp">
                    <input type="text" id="adm_tc_nombre" value="${editObj ? escapeHtml(editObj.nombre) : ''}" placeholder="Nombre (ej: Chip de Celular, Impresora)">
                    <label class="chk-inline">
                        <input type="checkbox" id="adm_tc_tiene_cod" ${tieneCod ? 'checked' : ''} onchange="document.getElementById('adm_tc_sigla').style.display = this.checked ? '' : 'none'">
                        Lleva código
                    </label>
                    <input type="text" id="adm_tc_sigla" value="${editObj ? escapeHtml(editObj.sigla) : ''}" maxlength="6" placeholder="Sigla (ej: CH)" style="${tieneCod ? '' : 'display:none;'}">
                    <button type="button" class="btn-adm btn-adm-primary" onclick="adminPanel.guardarTipoComponente()">${editObj ? 'Guardar Cambios' : '+ Agregar'}</button>
                    ${editObj ? `<button type="button" class="btn-adm btn-adm-outline" onclick="adminPanel.cancelarEditTipo()">Cancelar</button>` : ''}
                </div>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Tipo de Componente</th>
                        <th>Código / Sigla por defecto</th>
                        <th style="width:160px;">Acciones</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
        `;
    }

    editarTipoComponente(id) {
        this.#editandoTipoId = id;
        this.render();
    }

    cancelarEditTipo() {
        this.#editandoTipoId = null;
        this.render();
    }

    async guardarTipoComponente() {
        const nombre = document.getElementById('adm_tc_nombre')?.value;
        const tiene_codigo = document.getElementById('adm_tc_tiene_cod')?.checked;
        const sigla = document.getElementById('adm_tc_sigla')?.value;
        try {
            await this.#store.guardarTipoComponente({
                id: this.#editandoTipoId || '',
                nombre,
                tiene_codigo,
                sigla
            });
            this.#editandoTipoId = null;
            this.mostrarMensaje('Tipo de componente guardado.', 'ok');
            this.#notificarCambio();
            this.render();
        } catch (err) {
            this.mostrarMensaje(err.message, 'error');
        }
    }

    async eliminarTipoComponente(id) {
        const t = this.#store.buscarTipoComponentePorId(id);
        if (!t) return;
        if (!confirm(`¿Eliminar el tipo de componente "${t.nombre}"?`)) return;
        try {
            await this.#store.eliminarTipoComponente(id);
            this.mostrarMensaje('Tipo de componente eliminado.', 'ok');
            this.#notificarCambio();
            this.render();
        } catch (err) {
            this.mostrarMensaje(err.message, 'error');
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TAB 5: BASE DE DATOS (SUPABASE + RESPALDOS JSON)
    // ══════════════════════════════════════════════════════════════════════════

    #renderTabDatabase() {
        const estado = this.#store.getEstadoConexion();
        const cfg = this.#store.getSupabaseConfig();

        let statusBadge = `<span class="db-pill db-pill-local">🟡 Modo Local (guardado en este navegador)</span>`;
        if (estado.modo === 'supabase') {
            statusBadge = `<span class="db-pill db-pill-ok">🟢 Conectado a Supabase (exclusivo en la nube — sin guardado local)</span>`;
        } else if (estado.modo === 'error_fallback') {
            statusBadge = `<span class="db-pill db-pill-err">🔴 Error de conexión con Supabase (${escapeHtml(estado.ultimoError)})</span>`;
        }

        return `
            <div class="db-status-bar">
                <div><strong>Estado actual:</strong> ${statusBadge}</div>
            </div>

            <div class="editor-block">
                <h4>Conexión a Supabase (PostgreSQL en la nube)</h4>
                <p class="admin-help-sm">
                    Conectá un proyecto gratuito de <b>Supabase</b> para que todas las sucursales, sectores, tipos de componentes y plantillas queden guardados en la base de datos y sincronizados entre todas las PCs de la empresa.
                </p>
                <div class="adm-field">
                    <label for="db_supa_url">Project URL</label>
                    <input type="url" id="db_supa_url" value="${escapeHtml(cfg.url)}" placeholder="https://xxxxxxxxxxxx.supabase.co">
                </div>
                <div class="adm-field">
                    <label for="db_supa_key">Anon / Publishable Key (clave pública)</label>
                    <input type="text" id="db_supa_key" value="${escapeHtml(cfg.anonKey)}" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... o sb_publishable_...">
                </div>
                <div class="db-btn-row">
                    <button type="button" class="btn-adm btn-adm-primary" onclick="adminPanel.conectarSupabase()">🔌 Guardar y Conectar</button>
                    ${estado.supabaseConfigurado ? `
                        <button type="button" class="btn-adm btn-adm-secondary" onclick="adminPanel.subirASupabase()">⬆️ Subir datos locales a Supabase</button>
                        <button type="button" class="btn-adm btn-adm-outline" onclick="adminPanel.recargarDesdeSupabase()">⬇️ Recargar desde Supabase</button>
                        <button type="button" class="btn-adm btn-adm-danger" onclick="adminPanel.desconectarSupabase()">Desconectar</button>
                    ` : ''}
                </div>
            </div>

            <div class="editor-block">
                <h4>Guía rápida: crear la base de datos en Supabase (2 minutos)</h4>
                <ol class="db-steps">
                    <li>Creá un proyecto gratuito en <a href="https://supabase.com" target="_blank" rel="noopener">supabase.com</a>.</li>
                    <li>Entrá a <b>SQL Editor → New query</b>, pegá el script SQL de abajo (también guardado en <code>supabase_schema.sql</code>) y pulsá <b>Run</b>.</li>
                    <li>Andá a <b>Project Settings → API</b>, copiá el <b>Project URL</b> y la clave pública (<b>anon / publishable</b>) y pegalos arriba.</li>
                    <li>Al conectar por primera vez, la app sube automáticamente tus sucursales, sectores, componentes y las 10 plantillas iniciales.</li>
                </ol>
                <div class="db-btn-row" style="margin-bottom:8px;">
                    <button type="button" class="btn-adm btn-adm-secondary btn-sm" onclick="adminPanel.copiarSqlSupabase()">📋 Copiar Script SQL</button>
                </div>
                <pre class="sql-preview" id="sql-preview-code">${escapeHtml(SUPABASE_SETUP_SQL)}</pre>
            </div>

            <div class="editor-block">
                <h4>Respaldo y Restauración</h4>
                <div class="db-btn-row">
                    <button type="button" class="btn-adm btn-adm-outline" onclick="adminPanel.exportarJSON()">💾 Exportar Respaldo (JSON)</button>
                    <label class="btn-adm btn-adm-outline" style="cursor:pointer;">
                        📂 Importar Respaldo (JSON)
                        <input type="file" accept=".json,application/json" style="display:none;" onchange="adminPanel.importarJSON(event)">
                    </label>
                    <button type="button" class="btn-adm btn-adm-danger" onclick="adminPanel.restaurarTodoDefaults()">↺ Restaurar todo a valores iniciales</button>
                </div>
            </div>
        `;
    }

    async conectarSupabase() {
        const url = document.getElementById('db_supa_url')?.value || '';
        const key = document.getElementById('db_supa_key')?.value || '';
        try {
            this.mostrarMensaje('Probando conexión con Supabase...', 'ok');
            const res = await this.#store.configurarSupabase(url, key);
            this.mostrarMensaje(res.mensaje, 'ok');
            this.#notificarCambio();
            this.render();
        } catch (err) {
            this.mostrarMensaje(`No se pudo conectar: ${err.message}`, 'error');
        }
    }

    async desconectarSupabase() {
        if (!confirm('¿Desconectar Supabase y volver al modo local en este navegador?')) return;
        await this.#store.configurarSupabase('', '');
        this.mostrarMensaje('Desconectado de Supabase. Trabajando en modo local.', 'ok');
        this.#notificarCambio();
        this.render();
    }

    async subirASupabase() {
        try {
            await this.#store.sincronizarLocalASupabase();
            this.mostrarMensaje('Todos los datos locales se subieron a Supabase correctamente.', 'ok');
            this.#notificarCambio();
            this.render();
        } catch (err) {
            this.mostrarMensaje(`Error al sincronizar: ${err.message}`, 'error');
        }
    }

    async recargarDesdeSupabase() {
        try {
            const st = await this.#store.inicializar();
            if (st.modo === 'supabase') {
                this.mostrarMensaje('Datos recargados desde Supabase.', 'ok');
            } else {
                this.mostrarMensaje(`Error al recargar: ${st.ultimoError || 'sin conexión'}`, 'error');
            }
            this.#notificarCambio();
            this.render();
        } catch (err) {
            this.mostrarMensaje(err.message, 'error');
        }
    }

    async copiarSqlSupabase() {
        try {
            await navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
            this.mostrarMensaje('Script SQL copiado al portapapeles.', 'ok');
        } catch {
            const el = document.getElementById('sql-preview-code');
            if (el) {
                const range = document.createRange();
                range.selectNodeContents(el);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }
            this.mostrarMensaje('SQL seleccionado: presioná Ctrl+C para copiarlo.', 'ok');
        }
    }

    exportarJSON() {
        const snap = this.#store.exportarSnapshot();
        const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `motozuni_remitos_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.mostrarMensaje('Respaldo JSON descargado.', 'ok');
    }

    async importarJSON(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            await this.#store.importarSnapshot(parsed);
            this.mostrarMensaje('Respaldo JSON importado correctamente.', 'ok');
            this.#notificarCambio();
            this.render();
        } catch (err) {
            this.mostrarMensaje(`Error importando JSON: ${err.message}`, 'error');
        } finally {
            event.target.value = '';
        }
    }

    async restaurarTodoDefaults() {
        if (!confirm('¿Restaurar TODAS las sucursales, sectores, tipos de componentes y plantillas a los valores iniciales?')) return;
        try {
            await this.#store.restaurarDefaults(false);
            this.mostrarMensaje('Todos los datos fueron restaurados a los valores iniciales.', 'ok');
            this.#notificarCambio();
            this.render();
        } catch (err) {
            this.mostrarMensaje(err.message, 'error');
        }
    }
}
