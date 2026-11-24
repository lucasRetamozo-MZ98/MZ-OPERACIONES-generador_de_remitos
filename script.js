/**
 * CONTROLADOR PRINCIPAL DE LA APLICACIÓN — MOTOZUNI S.A.
 * Coordina la UI, los catálogos dinámicos desde la base de datos (Supabase / Local)
 * y delega la renderización A4 a los servicios orientados a objetos.
 */

// ── Instanciación de dependencias ────────────────────────────────────────────
const dataStore = new DataStoreService();
const repositorioSucursales = new RepositorioSucursalStore(dataStore);
const renderService = new RemitoHtmlRenderService();
const adminPanel = new AdminPanelController(dataStore, () => onCatalogosActualizados());

const TODAY = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

// Estado de códigos automáticos/manuales { inputId: { sigla, sucursal, numero, siglaDefault, modo, syncGroup } }
const codigosEstado = {};

// Lista de componentes adicionales agregados al remito
// Cada item: { uid, plantillaId, campos: { [campoId]: valor }, nota: '' }
let componentesAdicionales = [];
let uidCounter = 0;

// ── Helpers de lectura ───────────────────────────────────────────────────────

function v(id) {
    const el = document.getElementById(id);
    if (!el) return '';
    return el.value.trim();
}

function obtenerSucursalActual() {
    const select = document.getElementById('sucursal');
    const todas = repositorioSucursales.obtenerTodas();
    if (!select) return todas[0] || new Sucursal(28, 'SARANDI');
    return repositorioSucursales.buscarPorCodigo(Number(select.value)) || todas[0] || new Sucursal(28, 'SARANDI');
}

function obtenerPlantillaActual() {
    const select = document.getElementById('tipo_remito');
    const plantillas = dataStore.obtenerPlantillasRemito();
    if (!select) return plantillas[0] || null;
    return dataStore.buscarPlantillaPorId(select.value) || plantillas[0] || null;
}

// ── Poblado dinámico de selectores desde la BD ───────────────────────────────

function poblarSelectTiposRemito(preservarSeleccion = true) {
    const select = document.getElementById('tipo_remito');
    if (!select) return;
    const prev = preservarSeleccion ? select.value : '';
    const plantillas = dataStore.obtenerPlantillasRemito();

    select.innerHTML = '';
    plantillas.forEach((p, idx) => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.innerText = `${idx + 1}. ${p.nombre}`;
        select.appendChild(opt);
    });

    if (prev && plantillas.some(p => p.id === prev)) {
        select.value = prev;
    } else if (plantillas.length > 0) {
        select.value = plantillas[0].id;
    }
}

function poblarSelectSucursales(preservarSeleccion = true) {
    const select = document.getElementById('sucursal');
    if (!select) return;
    const prev = preservarSeleccion ? select.value : '';
    const sucursales = repositorioSucursales.obtenerTodas();

    select.innerHTML = '';
    sucursales.forEach(suc => {
        const opt = document.createElement('option');
        opt.value = suc.getId();
        opt.innerText = `${suc.getNombreCompleto()} (Cód. ${suc.getId()})`;
        select.appendChild(opt);
    });

    if (prev !== '' && sucursales.some(s => String(s.getId()) === String(prev))) {
        select.value = prev;
    } else if (sucursales.some(s => s.getId() === 28)) {
        select.value = '28';
    } else if (sucursales.length > 0) {
        select.value = String(sucursales[0].getId());
    }
}

function actualizarIndicadorBD() {
    const pill = document.getElementById('db-status-pill');
    if (!pill) return;
    const estado = dataStore.getEstadoConexion();
    if (estado.modo === 'supabase') {
        pill.className = 'header-db-pill pill-supa';
        pill.textContent = '🟢 Supabase conectado';
    } else if (estado.modo === 'error_fallback') {
        pill.className = 'header-db-pill pill-err';
        pill.textContent = '🔴 Sin conexión (modo local)';
    } else {
        pill.className = 'header-db-pill pill-local';
        pill.textContent = '🟡 Base local · Conectar Supabase';
    }
}

function onCatalogosActualizados() {
    actualizarIndicadorBD();
    poblarSelectTiposRemito(true);
    poblarSelectSucursales(true);

    // Depurar componentes adicionales cuyas plantillas fueron eliminadas o desmarcadas
    const disponibles = dataStore.obtenerPlantillasAdicional();
    const idsValidos = new Set(disponibles.map(p => p.id));
    componentesAdicionales = componentesAdicionales.filter(c => idsValidos.has(c.plantillaId));

    // Re-renderizar el formulario con los catálogos/plantillas actualizados
    Object.keys(codigosEstado).forEach(k => {
        if (!k.startsWith('extra_cod_')) delete codigosEstado[k];
    });
    renderForm();
    renderComponentesAdicionales();
}

// ── Lógica de Códigos ([Sigla]-[Sucursal]-[Número]) ──────────────────────────

function generarSufijo() {
    return String(Math.floor(Math.random() * 10000)).padStart(4, '0');
}

function construirCodigo(sigla, sucursal, numero) {
    const s = (sigla !== undefined && sigla !== null && String(sigla).trim() !== '') ? String(sigla).trim().toUpperCase() : 'EQ';
    const suc = (sucursal !== undefined && sucursal !== null && String(sucursal).trim() !== '') ? String(sucursal).trim() : '0';
    const n = (numero !== undefined && numero !== null && String(numero).trim() !== '') ? String(numero).trim() : '0000';
    return `${s}-${suc}-${n}`;
}

function initEstadoCodigo(inputId, sigla, sucursalId = null, numero = null, syncGroup = null) {
    const num = numero || generarSufijo();
    const suc = String(sucursalId !== null && sucursalId !== undefined ? sucursalId : obtenerSucursalActual().getId());
    codigosEstado[inputId] = {
        sigla: sigla || 'EQ',
        sucursal: suc,
        numero: num,
        siglaDefault: sigla || 'EQ',
        modo: 'auto',
        syncGroup
    };
}

function sincronizarDisplayCodigo(inputId) {
    const estado = codigosEstado[inputId];
    if (!estado) return;

    const codigoFinal = construirCodigo(estado.sigla, estado.sucursal, estado.numero);

    const badge = document.getElementById(`display_${inputId}`);
    const inputOculto = document.getElementById(inputId);
    const manualContainer = document.getElementById(`manual_container_${inputId}`);
    const btnToggle = document.getElementById(`btn_toggle_${inputId}`);

    const siglaInput = document.getElementById(`sigla_input_${inputId}`);
    const sucInput = document.getElementById(`suc_input_${inputId}`);
    const numInput = document.getElementById(`sufijo_input_${inputId}`);

    if (badge) badge.innerText = codigoFinal;
    if (inputOculto) inputOculto.value = codigoFinal;

    if (siglaInput && document.activeElement !== siglaInput) siglaInput.value = estado.sigla;
    if (sucInput && document.activeElement !== sucInput) sucInput.value = estado.sucursal;
    if (numInput && document.activeElement !== numInput) numInput.value = estado.numero;

    if (manualContainer && btnToggle) {
        if (estado.modo === 'manual') {
            manualContainer.style.display = 'block';
            btnToggle.classList.add('active');
            btnToggle.innerText = '⚙️ Automático';
        } else {
            manualContainer.style.display = 'none';
            btnToggle.classList.remove('active');
            btnToggle.innerText = '✏️ Anotar a mano';
        }
    }
}

function sincronizarGrupoCodigos(origenId) {
    const origen = codigosEstado[origenId];
    if (!origen || !origen.syncGroup) return;

    Object.keys(codigosEstado).forEach(otherId => {
        if (otherId === origenId) return;
        const otro = codigosEstado[otherId];
        if (otro && otro.syncGroup === origen.syncGroup) {
            otro.sucursal = origen.sucursal;
            otro.numero = origen.numero;
            sincronizarDisplayCodigo(otherId);
        }
    });
}

function onCodigoSegmentChange(inputId) {
    const estado = codigosEstado[inputId];
    if (!estado) return;

    const siglaInput = document.getElementById(`sigla_input_${inputId}`);
    const sucInput = document.getElementById(`suc_input_${inputId}`);
    const numInput = document.getElementById(`sufijo_input_${inputId}`);

    if (siglaInput) estado.sigla = siglaInput.value.trim().toUpperCase();
    if (sucInput) estado.sucursal = sucInput.value.trim();
    if (numInput) estado.numero = numInput.value.trim();

    sincronizarGrupoCodigos(inputId);
    sincronizarDisplayCodigo(inputId);
    updatePreview();
}

function regenerarCodigo(inputId) {
    const estado = codigosEstado[inputId];
    if (!estado) return;

    estado.numero = generarSufijo();
    if (estado.modo === 'auto') {
        estado.sigla = estado.siglaDefault;
        estado.sucursal = String(obtenerSucursalActual().getId());
    }

    sincronizarGrupoCodigos(inputId);
    sincronizarDisplayCodigo(inputId);
    updatePreview();
}

function toggleModoCodigo(inputId) {
    const estado = codigosEstado[inputId];
    if (!estado) return;

    estado.modo = estado.modo === 'auto' ? 'manual' : 'auto';
    if (estado.modo === 'auto') {
        estado.sigla = estado.siglaDefault;
        estado.sucursal = String(obtenerSucursalActual().getId());
    }

    sincronizarDisplayCodigo(inputId);
    updatePreview();
}

function renderCampoCodigoHTML(campo, autoCode, estado, suc) {
    const isManual = estado && estado.modo === 'manual';
    const cid = escapeHtml(campo.id);

    return `
        <div class="label-row">
            <label>${escapeHtml(campo.label)}</label>
        </div>
        <div class="code-box">
            <span class="code-badge" id="display_${cid}">${escapeHtml(autoCode)}</span>
            <div class="code-actions">
                <button type="button" class="btn-code-action" onclick="regenerarCodigo('${cid}')" title="Generar otro número aleatorio">🎲 Nuevo</button>
                <button type="button" class="btn-code-action ${isManual ? 'active' : ''}" id="btn_toggle_${cid}" onclick="toggleModoCodigo('${cid}')" title="Modificar sigla, sucursal o número a mano">
                    ${isManual ? '⚙️ Automático' : '✏️ Anotar a mano'}
                </button>
            </div>
        </div>
        <div class="code-manual-container" id="manual_container_${cid}" style="display: ${isManual ? 'block' : 'none'};">
            <div class="code-manual-segments">
                <input type="text" class="code-seg-input code-seg-sigla" id="sigla_input_${cid}" value="${escapeHtml(estado.sigla)}" maxlength="6" placeholder="${escapeHtml(campo.sigla || 'EQ')}" title="Sigla del componente" oninput="onCodigoSegmentChange('${cid}')">
                <span class="code-seg-sep">-</span>
                <input type="text" class="code-seg-input code-seg-suc" id="suc_input_${cid}" value="${escapeHtml(estado.sucursal)}" maxlength="4" placeholder="${suc.getId()}" title="Código de sucursal" oninput="onCodigoSegmentChange('${cid}')">
                <span class="code-seg-sep">-</span>
                <input type="text" class="code-seg-input code-seg-num" id="sufijo_input_${cid}" value="${escapeHtml(estado.numero)}" maxlength="8" placeholder="0000" title="Número" oninput="onCodigoSegmentChange('${cid}')">
            </div>
        </div>
        <input type="hidden" id="${cid}" value="${escapeHtml(autoCode)}">
    `;
}

// ── Lógica de Área / Sector (dinámico desde la BD) ───────────────────────────

function onAreaSelectChange(campoId) {
    const select = document.getElementById(`select_${campoId}`);
    const customContainer = document.getElementById(`custom_container_${campoId}`);
    const inputOculto = document.getElementById(campoId);
    const customInput = document.getElementById(`custom_input_${campoId}`);
    if (!select || !inputOculto) return;
    if (select.value === '__OTRA__') {
        if (customContainer) customContainer.style.display = 'block';
        inputOculto.value = customInput ? customInput.value.trim() : '';
    } else {
        if (customContainer) customContainer.style.display = 'none';
        inputOculto.value = select.value;
    }
    updatePreview();
}

function onAreaCustomInput(campoId) {
    const customInput = document.getElementById(`custom_input_${campoId}`);
    const inputOculto = document.getElementById(campoId);
    if (inputOculto && customInput) {
        inputOculto.value = customInput.value.trim();
        updatePreview();
    }
}

function renderCampoAreaHTML(campo) {
    const sectores = dataStore.obtenerSectores();
    const defaultSector = sectores.find(s => s.getNombre().toLowerCase() === 'logística') || sectores[0];
    const defaultVal = defaultSector ? defaultSector.getNombre() : '';
    const cid = escapeHtml(campo.id);

    const opts = sectores.map(s => {
        const nom = s.getNombre();
        return `<option value="${escapeHtml(nom)}" ${nom === defaultVal ? 'selected' : ''}>${escapeHtml(nom)}</option>`;
    }).join('');

    return `
        <div class="label-row">
            <label for="select_${cid}">${escapeHtml(campo.label)}</label>
            <span class="btn-gen-code" onclick="adminPanel.abrir('sectores')" title="Agregar o editar sectores">✏️ Sectores</span>
        </div>
        <select id="select_${cid}" onchange="onAreaSelectChange('${cid}')">
            ${opts}
            <option value="__OTRA__">Otra (escribir a mano)...</option>
        </select>
        <div id="custom_container_${cid}" style="display: none; margin-top: 6px;">
            <input type="text" id="custom_input_${cid}" placeholder="Escribir sector a mano..." oninput="onAreaCustomInput('${cid}')">
        </div>
        <input type="hidden" id="${cid}" value="${escapeHtml(defaultVal)}">
    `;
}

// ── Componentes Adicionales Dinámicos ────────────────────────────────────────

function agregarComponenteAdicional() {
    const disponibles = dataStore.obtenerPlantillasAdicional();
    if (!disponibles.length) {
        alert('No hay plantillas marcadas como "Componente Adicional". Podés habilitar alguna desde ⚙️ Gestionar → Plantillas.');
        return;
    }

    const suc = obtenerSucursalActual();
    const plantilla = disponibles[0];
    const uid = ++uidCounter;
    const inputId = `extra_cod_${uid}`;
    const sec = plantilla.getSeccionPrincipal();
    const tieneCodigo = Boolean(plantilla.tiene_codigo || (sec && sec.tieneCodigo));
    const sigla = (sec && sec.sigla) || plantilla.sigla_codigo || 'EQ';

    componentesAdicionales.push({
        uid,
        plantillaId: plantilla.id,
        campos: {},
        nota: ''
    });

    if (tieneCodigo) {
        initEstadoCodigo(inputId, sigla, suc.getId(), generarSufijo(), null);
    }

    renderComponentesAdicionales();
    updatePreview();
}

function eliminarComponenteAdicional(uid) {
    componentesAdicionales = componentesAdicionales.filter(c => c.uid !== uid);
    delete codigosEstado[`extra_cod_${uid}`];
    renderComponentesAdicionales();
    updatePreview();
}

function onTipoComponenteChange(uid) {
    const select = document.getElementById(`extra_tipo_${uid}`);
    if (!select) return;
    const nuevaPlantilla = dataStore.buscarPlantillaPorId(select.value);
    const comp = componentesAdicionales.find(c => c.uid === uid);
    if (!comp || !nuevaPlantilla) return;

    comp.plantillaId = nuevaPlantilla.id;
    comp.campos = {};

    const inputId = `extra_cod_${uid}`;
    const sec = nuevaPlantilla.getSeccionPrincipal();
    const tieneCodigo = Boolean(nuevaPlantilla.tiene_codigo || (sec && sec.tieneCodigo));
    const sigla = (sec && sec.sigla) || nuevaPlantilla.sigla_codigo || 'EQ';

    if (tieneCodigo) {
        if (codigosEstado[inputId]) {
            codigosEstado[inputId].siglaDefault = sigla;
            if (codigosEstado[inputId].modo === 'auto') {
                codigosEstado[inputId].sigla = sigla;
            }
        } else {
            initEstadoCodigo(inputId, sigla, obtenerSucursalActual().getId(), generarSufijo(), null);
        }
    } else {
        delete codigosEstado[inputId];
    }

    renderComponentesAdicionales();
    updatePreview();
}

function onCampoExtraInput(uid, campoId) {
    const comp = componentesAdicionales.find(c => c.uid === uid);
    if (!comp) return;
    const el = document.getElementById(`extra_f_${uid}_${campoId}`);
    if (el) comp.campos[campoId] = el.value.trim();
    updatePreview();
}

function onNotaExtraInput(uid) {
    const comp = componentesAdicionales.find(c => c.uid === uid);
    if (!comp) return;
    const el = document.getElementById(`extra_nota_${uid}`);
    if (el) comp.nota = el.value.trim();
    updatePreview();
}

function renderComponentesAdicionales() {
    const container = document.getElementById('componentes-adicionales-lista');
    if (!container) return;
    const suc = obtenerSucursalActual();
    const disponibles = dataStore.obtenerPlantillasAdicional();

    container.innerHTML = '';

    componentesAdicionales.forEach(comp => {
        const uid = comp.uid;
        const plantilla = dataStore.buscarPlantillaPorId(comp.plantillaId) || disponibles[0];
        if (!plantilla) return;

        const sec = plantilla.getSeccionPrincipal();
        const tieneCodigo = Boolean(plantilla.tiene_codigo || (sec && sec.tieneCodigo));
        const sigla = (sec && sec.sigla) || plantilla.sigla_codigo || 'EQ';
        const inputId = `extra_cod_${uid}`;

        let codigoHtml = '';
        if (tieneCodigo) {
            if (!codigosEstado[inputId]) {
                initEstadoCodigo(inputId, sigla, suc.getId(), generarSufijo(), null);
            }
            const estado = codigosEstado[inputId];
            const codigoFull = construirCodigo(estado.sigla, estado.sucursal, estado.numero);
            codigoHtml = `<div class="form-group">${renderCampoCodigoHTML({ id: inputId, label: (sec && sec.codigoLabel) || 'Código', sigla }, codigoFull, estado, suc)}</div>`;
        }

        const tiposOpts = disponibles.map(p =>
            `<option value="${escapeHtml(p.id)}" ${p.id === plantilla.id ? 'selected' : ''}>${escapeHtml(p.nombre)}</option>`
        ).join('');

        // Campos dinámicos propios de la plantilla del componente adicional
        const camposSec = (sec && Array.isArray(sec.campos)) ? sec.campos.filter(c => c.tipoControl !== 'fijo') : [];
        const camposHtml = camposSec.map(c => {
            const valActual = comp.campos[c.id] ?? c.valorDefecto ?? '';
            const fid = `extra_f_${uid}_${escapeHtml(c.id)}`;
            if (c.tipoControl === 'select' && Array.isArray(c.opciones) && c.opciones.length) {
                const opts = ['<option value="">-- Seleccionar --</option>', ...c.opciones.map(o =>
                    `<option value="${escapeHtml(o)}" ${o === valActual ? 'selected' : ''}>${escapeHtml(o)}</option>`
                )].join('');
                return `
                    <div class="form-group">
                        <label for="${fid}">${escapeHtml(c.labelForm || c.label)}</label>
                        <select id="${fid}" onchange="onCampoExtraInput(${uid}, '${escapeHtml(c.id)}')">${opts}</select>
                    </div>
                `;
            }
            return `
                <div class="form-group">
                    <label for="${fid}">${escapeHtml(c.labelForm || c.label)}</label>
                    <input type="text" id="${fid}" value="${escapeHtml(valActual)}" placeholder="${escapeHtml(c.placeholder || '')}" oninput="onCampoExtraInput(${uid}, '${escapeHtml(c.id)}')">
                </div>
            `;
        }).join('');

        const card = document.createElement('div');
        card.className = 'comp-adicional-card';
        card.id = `comp_card_${uid}`;
        card.innerHTML = `
            <div class="comp-adicional-header">
                <select id="extra_tipo_${uid}" onchange="onTipoComponenteChange(${uid})">${tiposOpts}</select>
                <button type="button" class="btn-eliminar-comp" onclick="eliminarComponenteAdicional(${uid})" title="Quitar este componente">✕</button>
            </div>
            ${codigoHtml}
            ${camposHtml}
            <div class="form-group">
                <label for="extra_nota_${uid}">Nota Adicional</label>
                <input type="text" id="extra_nota_${uid}" value="${escapeHtml(comp.nota || '')}" placeholder="${escapeHtml(plantilla.config.notaPlaceholder || 'Observación opcional...')}" oninput="onNotaExtraInput(${uid})">
            </div>
        `;
        container.appendChild(card);
    });
}

// ── Render principal del formulario ──────────────────────────────────────────

function renderForm() {
    const plantilla = obtenerPlantillaActual();
    const sucursal = obtenerSucursalActual();
    const container = document.getElementById('dynamic-fields');
    if (!container) return;

    container.innerHTML = '';
    if (!plantilla) {
        container.innerHTML = '<div class="admin-empty-sm">No hay plantillas configuradas. Creá una desde ⚙️ Gestionar.</div>';
        updatePreview();
        return;
    }

    const campos = RemitoFactory.getCamposFormulario(plantilla, TODAY);
    const syncGroup = plantilla.config.sincronizarCodigos ? `sync_${plantilla.id}` : null;
    let numeroSincronizado = null;

    campos.forEach(campo => {
        if (campo.tipoControl === 'separador') {
            const sep = document.createElement('div');
            sep.className = 'form-section-divider';
            sep.textContent = campo.label;
            container.appendChild(sep);
            return;
        }

        const group = document.createElement('div');
        group.className = 'form-group';

        if (campo.tipoControl === 'codigo') {
            const num = syncGroup
                ? (numeroSincronizado || (numeroSincronizado = generarSufijo()))
                : generarSufijo();

            initEstadoCodigo(campo.id, campo.sigla, sucursal.getId(), num, syncGroup);
            const estado = codigosEstado[campo.id];
            const autoCode = construirCodigo(campo.sigla, sucursal.getId(), num);
            group.innerHTML = renderCampoCodigoHTML(campo, autoCode, estado, sucursal);

        } else if (campo.tipoControl === 'area') {
            group.innerHTML = renderCampoAreaHTML(campo);

        } else if (campo.tipoControl === 'select') {
            const cid = escapeHtml(campo.id);
            const opts = ['<option value="">-- Seleccionar --</option>', ...(campo.opciones || []).map(o =>
                `<option value="${escapeHtml(o)}" ${o === campo.def ? 'selected' : ''}>${escapeHtml(o)}</option>`
            )].join('');
            group.innerHTML = `
                <label for="${cid}">${escapeHtml(campo.label)}</label>
                <select id="${cid}" onchange="updatePreview()">${opts}</select>
            `;

        } else if (campo.tipoControl === 'fecha') {
            const cid = escapeHtml(campo.id);
            group.innerHTML = `
                <label for="${cid}">${escapeHtml(campo.label)}</label>
                <input type="text" id="${cid}" value="${escapeHtml(campo.def || TODAY)}" placeholder="${escapeHtml(campo.placeholder || 'Ejemplo: ' + TODAY)}" oninput="updatePreview()">
            `;

        } else {
            const cid = escapeHtml(campo.id);
            group.innerHTML = `
                <label for="${cid}">${escapeHtml(campo.label)}</label>
                <input type="text" id="${cid}" value="${escapeHtml(campo.def || '')}" placeholder="${escapeHtml(campo.placeholder || '')}" oninput="updatePreview()">
            `;
        }

        container.appendChild(group);
    });

    updatePreview();
}

// ── Eventos de cambio ────────────────────────────────────────────────────────

function onSucursalChange() {
    const sucursal = obtenerSucursalActual();
    const sucursalId = String(sucursal.getId());

    Object.keys(codigosEstado).forEach(inputId => {
        const estado = codigosEstado[inputId];
        if (estado && estado.modo === 'auto') {
            estado.sucursal = sucursalId;
            sincronizarDisplayCodigo(inputId);
        }
    });

    updatePreview();
}

function onTipoRemitoChange() {
    componentesAdicionales = [];
    Object.keys(codigosEstado).forEach(k => delete codigosEstado[k]);
    renderForm();
    renderComponentesAdicionales();
}

// ── Construcción del Remito + Vista Previa ───────────────────────────────────

function buildRemitoConExtras(plantilla, sucursal) {
    const remito = RemitoFactory.crearRemito(plantilla, v, sucursal);

    componentesAdicionales.forEach(comp => {
        const extraPlantilla = dataStore.buscarPlantillaPorId(comp.plantillaId);
        if (!extraPlantilla) return;

        const inputId = `extra_cod_${comp.uid}`;
        const estado = codigosEstado[inputId];
        const cod = estado ? construirCodigo(estado.sigla, estado.sucursal, estado.numero) : '';

        const eqExtra = RemitoFactory.crearComponenteAdicional(extraPlantilla, cod, comp.campos, comp.nota);
        remito.agregarComponenteAdicional(eqExtra);
    });

    return remito;
}

function updatePreview() {
    const plantilla = obtenerPlantillaActual();
    const sucursal = obtenerSucursalActual();
    const previewContainer = document.getElementById('document-preview');
    if (!previewContainer) return;

    if (!plantilla) {
        previewContainer.innerHTML = '<div class="banner">Creá una plantilla para comenzar a generar remitos</div>';
        return;
    }

    const remito = buildRemitoConExtras(plantilla, sucursal);
    previewContainer.innerHTML = renderService.renderizarHTML(remito);
    document.title = obtenerNombreSugeridoPDF(remito);
}

// ── Nombre sugerido PDF e Impresión ──────────────────────────────────────────

function obtenerNombreSugeridoPDF(remitoObj = null) {
    const plantilla = obtenerPlantillaActual();
    if (!plantilla) return 'Recibo_Remito';

    const prefijo = (plantilla.config && plantilla.config.prefijoPdf) || 'Recibo';
    const seccionesConCodigo = (plantilla.config.secciones || []).filter(s => s.tieneCodigo);

    if (seccionesConCodigo.length > 0) {
        const cods = seccionesConCodigo.map((s, idx) => {
            const fid = s.codigoFieldId || (idx === 0 ? 'cod' : `cod_${idx + 1}`);
            return v(fid);
        }).filter(Boolean);
        if (cods.length > 0) {
            return `${prefijo}_${cods.join('+')}`;
        }
    }

    const nombreLimpio = plantilla.nombre.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
    return `${prefijo}_${nombreLimpio || 'Remito'}`;
}

function imprimirConNombreSugerido() {
    const originalTitle = document.title;
    document.title = obtenerNombreSugeridoPDF();
    window.print();
    setTimeout(() => {
        document.title = originalTitle;
    }, 1000);
}

// Cerrar modal con Escape
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('admin-modal');
        if (modal && modal.classList.contains('open')) {
            adminPanel.cerrar();
        }
    }
});

// ── Inicialización asíncrona desde la BD ─────────────────────────────────────

async function iniciarApp() {
    await dataStore.inicializar();
    actualizarIndicadorBD();
    poblarSelectTiposRemito(false);
    poblarSelectSucursales(false);
    renderForm();
    renderComponentesAdicionales();
}

iniciarApp();
