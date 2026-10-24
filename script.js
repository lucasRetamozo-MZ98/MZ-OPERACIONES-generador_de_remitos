/**
 * CONTROLADOR PRINCIPAL DE LA APLICACIÓN — MOTOZUNI S.A.
 * Coordina la UI, la captura de datos y delega la renderización a los servicios orientados a objetos.
 */

// ── Instanciación de dependencias ────────────────────────────────────────────
const repositorioSucursales = new RepositorioSucursalMemoria();
const renderService = new RemitoHtmlRenderService();

const TODAY = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

// Estado de códigos automáticos/manuales { inputId: { sigla, modo, autoCodigo, manualSufijo } }
const codigosEstado = {};

// Lista de componentes adicionales agregados al remito
// Cada item: { uid, tipo, sigla, campos: {marca, modelo, sn, nota, cod} }
let componentesAdicionales = [];
let uidCounter = 0;

// Mapeo de tipo de componente adicional → sigla y etiqueta
const TIPOS_COMPONENTE_ADICIONAL = [
    { value: 'auricular', label: 'Auricular', sigla: 'AU' },
    { value: 'mouse',     label: 'Mouse',     sigla: 'MS' },
    { value: 'teclado',   label: 'Teclado',   sigla: 'TC' },
    { value: 'wifi',      label: 'Adaptador Wi-Fi', sigla: 'WF' },
    { value: 'monitor_solo', label: 'Monitor', sigla: 'MO' },
];

// ── Inicializar select de sucursales ──────────────────────────────────────────
const selectSucursal = document.getElementById('sucursal');
if (selectSucursal) {
    selectSucursal.innerHTML = '';
    repositorioSucursales.obtenerTodas().forEach(suc => {
        const opt = document.createElement('option');
        opt.value = suc.getId();
        opt.innerText = `${suc.getNombreCompleto()} (Cód. ${suc.getId()})`;
        if (suc.getId() === 28) opt.selected = true;
        selectSucursal.appendChild(opt);
    });
}

// ── Helper: obtener valor de input ────────────────────────────────────────────
/**
 * @param {string} id
 * @returns {string}
 */
function v(id) {
    const el = document.getElementById(id);
    if (!el) return '';
    const val = el.value.trim();
    if (val === '') {
        if (id === 'nombre' || id === 'nombre1' || id === 'nombre2' || id === 'fecha') return '';
        return '—';
    }
    return val;
}

/**
 * Obtiene la sucursal actualmente seleccionada
 * @returns {Sucursal}
 */
function obtenerSucursalActual() {
    const select = document.getElementById('sucursal');
    if (!select) return new Sucursal(28, 'SARANDI');
    return repositorioSucursales.buscarPorCodigo(Number(select.value)) || new Sucursal(28, 'SARANDI');
}

// ── Lógica de Código (automático / prefijo fijo + sufijo manual) ──────────────

/**
 * Genera un sufijo de 4 dígitos aleatorio
 */
function generarSufijo() {
    return String(Math.floor(Math.random() * 10000)).padStart(4, '0');
}

/**
 * Construye un código a partir de sigla, id de sucursal y sufijo
 */
function construirCodigo(sigla, idSuc, sufijo) {
    return `${sigla}-${idSuc}-${sufijo}`;
}

/**
 * Inicializa el estado de un campo de código
 */
function initEstadoCodigo(inputId, sigla, sufijo = null) {
    const suf = sufijo || generarSufijo();
    codigosEstado[inputId] = {
        sigla,
        modo: 'auto',   // 'auto' | 'manual'
        sufijo: suf,
        manualSufijo: suf
    };
}

/**
 * Devuelve el valor final del código para un inputId
 */
function getValorCodigo(inputId) {
    const estado = codigosEstado[inputId];
    if (!estado) return '—';
    const suf = estado.modo === 'auto' ? estado.sufijo : (estado.manualSufijo || estado.sufijo);
    return construirCodigo(estado.sigla, obtenerSucursalActual().getId(), suf);
}

/**
 * Sincroniza el DOM del campo código con su estado actual
 */
function sincronizarDisplayCodigo(inputId) {
    const estado = codigosEstado[inputId];
    if (!estado) return;

    const suc = obtenerSucursalActual();
    const prefijo = `${estado.sigla}-${suc.getId()}-`;
    const sufijo = estado.modo === 'auto' ? estado.sufijo : (estado.manualSufijo || estado.sufijo);
    const codigoFinal = `${prefijo}${sufijo}`;

    const badge = document.getElementById(`display_${inputId}`);
    const inputOculto = document.getElementById(inputId);
    const manualContainer = document.getElementById(`manual_container_${inputId}`);
    const btnToggle = document.getElementById(`btn_toggle_${inputId}`);
    const prefijoBadge = document.getElementById(`prefix_${inputId}`);
    const sufijoInput = document.getElementById(`sufijo_input_${inputId}`);

    if (badge) badge.innerText = codigoFinal;
    if (inputOculto) inputOculto.value = codigoFinal;

    if (prefijoBadge) prefijoBadge.innerText = prefijo;
    if (sufijoInput) sufijoInput.value = sufijo;

    if (manualContainer && btnToggle) {
        if (estado.modo === 'manual') {
            manualContainer.style.display = 'flex';
            btnToggle.classList.add('active');
            btnToggle.innerText = '⚙️ Automático';
        } else {
            manualContainer.style.display = 'none';
            btnToggle.classList.remove('active');
            btnToggle.innerText = '✏️ Anotar a mano';
        }
    }
}

/** Regenera el sufijo aleatorio */
function regenerarCodigo(inputId) {
    const estado = codigosEstado[inputId];
    if (!estado) return;
    estado.sufijo = generarSufijo();
    estado.manualSufijo = estado.sufijo;
    estado.modo = 'auto';
    sincronizarDisplayCodigo(inputId);
    updatePreview();
}

/** Alterna entre modo automático y modo manual (prefijo fijo + sufijo editable) */
function toggleModoCodigo(inputId) {
    const estado = codigosEstado[inputId];
    if (!estado) return;
    estado.modo = estado.modo === 'auto' ? 'manual' : 'auto';
    sincronizarDisplayCodigo(inputId);
    updatePreview();
}

/** El usuario edita el sufijo a mano */
function onSufijoManualInput(inputId) {
    const estado = codigosEstado[inputId];
    if (!estado) return;
    const sufijoInput = document.getElementById(`sufijo_input_${inputId}`);
    estado.manualSufijo = sufijoInput ? sufijoInput.value : estado.sufijo;
    sincronizarDisplayCodigo(inputId);
    updatePreview();
}

/**
 * Para PC+Monitor: cuando el sufijo de la PC cambia, lo propaga al Monitor.
 */
function onSufijoManualPcInput() {
    const estadoPc = codigosEstado['cod_pc'];
    if (!estadoPc) return;
    const sufijoInput = document.getElementById('sufijo_input_cod_pc');
    const nuevo = sufijoInput ? sufijoInput.value : estadoPc.sufijo;
    estadoPc.manualSufijo = nuevo;

    // Propagar al monitor
    const estadoMo = codigosEstado['cod_mo'];
    if (estadoMo && estadoMo.modo === 'manual') {
        estadoMo.manualSufijo = nuevo;
        const sufijoMo = document.getElementById('sufijo_input_cod_mo');
        if (sufijoMo) sufijoMo.value = nuevo;
    }

    sincronizarDisplayCodigo('cod_pc');
    sincronizarDisplayCodigo('cod_mo');
    updatePreview();
}

/**
 * Renderiza el bloque HTML de un campo de código
 */
function renderCampoCodigoHTML(campo, autoCode, suf, suc) {
    const prefijo = `${campo.sigla}-${suc.getId()}-`;
    const esPcMonitor = campo.id === 'cod_pc' || campo.id === 'cod_mo';
    const onInputFn = esPcMonitor && campo.id === 'cod_pc'
        ? `onSufijoManualPcInput()`
        : `onSufijoManualInput('${campo.id}')`;

    return `
        <div class="label-row">
            <label>${campo.label}</label>
        </div>
        <div class="code-box">
            <span class="code-badge" id="display_${campo.id}">${autoCode}</span>
            <div class="code-actions">
                <button type="button" class="btn-code-action" onclick="regenerarCodigo('${campo.id}')" title="Generar otro número aleatorio">🎲 Nuevo</button>
                <button type="button" class="btn-code-action" id="btn_toggle_${campo.id}" onclick="toggleModoCodigo('${campo.id}')" title="Escribir el código a mano">✏️ Anotar a mano</button>
            </div>
        </div>
        <div class="code-manual-container" id="manual_container_${campo.id}" style="display: none;">
            <div style="display: flex; align-items: center; gap: 0; border: 1px solid #ccc; border-radius: 4px; overflow: hidden;">
                <span id="prefix_${campo.id}" style="background: #e2e8f0; padding: 7px 8px; font-family: monospace; font-weight: bold; font-size: 0.85rem; color: var(--cp); white-space: nowrap; border-right: 1px solid #ccc;">${prefijo}</span>
                <input type="text" id="sufijo_input_${campo.id}" value="${suf}" maxlength="6" placeholder="0000" style="flex: 1; border: none; padding: 7px 8px; font-family: monospace; font-size: 0.92rem; font-weight: bold; outline: none;" oninput="${onInputFn}">
            </div>
        </div>
        <input type="hidden" id="${campo.id}" value="${autoCode}">
    `;
}

// ── Lógica de Área ────────────────────────────────────────────────────────────

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
    return `
        <label for="select_${campo.id}">${campo.label}</label>
        <select id="select_${campo.id}" onchange="onAreaSelectChange('${campo.id}')">
            <option value="Administración">Administración</option>
            <option value="Comercial">Comercial</option>
            <option value="Gerencia - Administración">Gerencia - Administración</option>
            <option value="Gerencia - Comercial">Gerencia - Comercial</option>
            <option value="Gerencia - Operaciones">Gerencia - Operaciones</option>
            <option value="Gestoría">Gestoría</option>
            <option value="Logística" selected>Logística</option>
            <option value="Operaciones">Operaciones</option>
            <option value="Procesos">Procesos</option>
            <option value="Recursos Humanos">Recursos Humanos</option>
            <option value="__OTRA__">Otra (escribir a mano)...</option>
        </select>
        <div id="custom_container_${campo.id}" style="display: none; margin-top: 6px;">
            <input type="text" id="custom_input_${campo.id}" placeholder="Ejemplo: Recursos Humanos" oninput="onAreaCustomInput('${campo.id}')">
        </div>
        <input type="hidden" id="${campo.id}" value="Logística">
    `;
}

// ── Componentes Adicionales ───────────────────────────────────────────────────

function agregarComponenteAdicional() {
    const suc = obtenerSucursalActual();
    const tipo = TIPOS_COMPONENTE_ADICIONAL[0];
    const uid = ++uidCounter;
    const suf = generarSufijo();
    const cod = construirCodigo(tipo.sigla, suc.getId(), suf);

    componentesAdicionales.push({
        uid,
        tipo: tipo.value,
        sigla: tipo.sigla,
        sufijo: suf,
        manualSufijo: suf,
        modoCodigo: 'auto',
        campos: { marca: '', modelo: '', nota: '' }
    });

    codigosEstado[`extra_cod_${uid}`] = {
        sigla: tipo.sigla,
        modo: 'auto',
        sufijo: suf,
        manualSufijo: suf
    };

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
    const nuevoTipo = select.value;
    const def = TIPOS_COMPONENTE_ADICIONAL.find(t => t.value === nuevoTipo);
    const comp = componentesAdicionales.find(c => c.uid === uid);
    if (!comp || !def) return;

    comp.tipo = nuevoTipo;
    comp.sigla = def.sigla;

    const estado = codigosEstado[`extra_cod_${uid}`];
    if (estado) {
        estado.sigla = def.sigla;
        sincronizarDisplayCodigoExtra(uid);
    }
    updatePreview();
}

function sincronizarDisplayCodigoExtra(uid) {
    const inputId = `extra_cod_${uid}`;
    sincronizarDisplayCodigo(inputId);
    const comp = componentesAdicionales.find(c => c.uid === uid);
    if (comp) {
        const estado = codigosEstado[inputId];
        comp.sufijo = estado ? estado.sufijo : comp.sufijo;
        comp.modoCodigo = estado ? estado.modo : 'auto';
    }
}

function regenerarCodigoExtra(uid) {
    const inputId = `extra_cod_${uid}`;
    const estado = codigosEstado[inputId];
    const comp = componentesAdicionales.find(c => c.uid === uid);
    if (!estado || !comp) return;
    const suf = generarSufijo();
    estado.sufijo = suf;
    estado.manualSufijo = suf;
    estado.modo = 'auto';
    comp.sufijo = suf;
    sincronizarDisplayCodigo(inputId);
    updatePreview();
}

function toggleModoCodigoExtra(uid) {
    const inputId = `extra_cod_${uid}`;
    const estado = codigosEstado[inputId];
    if (!estado) return;
    estado.modo = estado.modo === 'auto' ? 'manual' : 'auto';
    sincronizarDisplayCodigo(inputId);
    updatePreview();
}

function onSufijoExtraInput(uid) {
    const inputId = `extra_cod_${uid}`;
    const estado = codigosEstado[inputId];
    if (!estado) return;
    const sufijoInput = document.getElementById(`sufijo_input_${inputId}`);
    estado.manualSufijo = sufijoInput ? sufijoInput.value : estado.sufijo;
    sincronizarDisplayCodigo(inputId);
    updatePreview();
}

function onCampoExtraInput(uid, campo) {
    const comp = componentesAdicionales.find(c => c.uid === uid);
    if (!comp) return;
    const el = document.getElementById(`extra_${campo}_${uid}`);
    if (el) comp.campos[campo] = el.value.trim();
    updatePreview();
}

/**
 * Renderiza la sección de componentes adicionales en el sidebar
 */
function renderComponentesAdicionales() {
    const container = document.getElementById('componentes-adicionales-lista');
    if (!container) return;
    const suc = obtenerSucursalActual();

    container.innerHTML = '';

    componentesAdicionales.forEach(comp => {
        const uid = comp.uid;
        const inputId = `extra_cod_${uid}`;
        const estado = codigosEstado[inputId];
        const suf = estado ? estado.sufijo : comp.sufijo;
        const sigla = estado ? estado.sigla : comp.sigla;
        const prefijo = `${sigla}-${suc.getId()}-`;
        const codigoFull = `${prefijo}${suf}`;

        const tiposOpts = TIPOS_COMPONENTE_ADICIONAL.map(t =>
            `<option value="${t.value}" ${t.value === comp.tipo ? 'selected' : ''}>${t.label}</option>`
        ).join('');

        const card = document.createElement('div');
        card.className = 'comp-adicional-card';
        card.id = `comp_card_${uid}`;
        card.innerHTML = `
            <div class="comp-adicional-header">
                <select id="extra_tipo_${uid}" onchange="onTipoComponenteChange(${uid})">${tiposOpts}</select>
                <button type="button" class="btn-eliminar-comp" onclick="eliminarComponenteAdicional(${uid})" title="Quitar este componente">✕</button>
            </div>
            <div class="form-group">
                <label>Código</label>
                <div class="code-box">
                    <span class="code-badge" id="display_${inputId}">${codigoFull}</span>
                    <div class="code-actions">
                        <button type="button" class="btn-code-action" onclick="regenerarCodigoExtra(${uid})">🎲 Nuevo</button>
                        <button type="button" class="btn-code-action" id="btn_toggle_${inputId}" onclick="toggleModoCodigoExtra(${uid})">✏️ Anotar a mano</button>
                    </div>
                </div>
                <div class="code-manual-container" id="manual_container_${inputId}" style="display: none;">
                    <div style="display: flex; align-items: center; gap: 0; border: 1px solid #ccc; border-radius: 4px; overflow: hidden;">
                        <span id="prefix_${inputId}" style="background: #e2e8f0; padding: 7px 8px; font-family: monospace; font-weight: bold; font-size: 0.85rem; color: var(--cp); white-space: nowrap; border-right: 1px solid #ccc;">${prefijo}</span>
                        <input type="text" id="sufijo_input_${inputId}" value="${suf}" maxlength="6" placeholder="0000" style="flex: 1; border: none; padding: 7px 8px; font-family: monospace; font-size: 0.92rem; font-weight: bold; outline: none;" oninput="onSufijoExtraInput(${uid})">
                    </div>
                </div>
                <input type="hidden" id="${inputId}" value="${codigoFull}">
            </div>
            <div class="form-group">
                <label>Marca</label>
                <input type="text" id="extra_marca_${uid}" value="${comp.campos.marca}" placeholder="Ejemplo: Logitech" oninput="onCampoExtraInput(${uid}, 'marca')">
            </div>
            <div class="form-group">
                <label>Modelo</label>
                <input type="text" id="extra_modelo_${uid}" value="${comp.campos.modelo}" placeholder="Ejemplo: H151" oninput="onCampoExtraInput(${uid}, 'modelo')">
            </div>
            <div class="form-group">
                <label>Nota Adicional</label>
                <input type="text" id="extra_nota_${uid}" value="${comp.campos.nota}" placeholder="Ejemplo: Conexión Jack 3.5mm" oninput="onCampoExtraInput(${uid}, 'nota')">
            </div>
        `;
        container.appendChild(card);
    });
}

// ── Render principal del formulario ──────────────────────────────────────────

function renderForm() {
    const tipo = document.getElementById('tipo_remito').value;
    const sucursal = obtenerSucursalActual();
    const campos = RemitoFactory.getCamposFormulario(tipo, TODAY, sucursal.getId());
    const container = document.getElementById('dynamic-fields');
    if (!container) return;

    container.innerHTML = '';

    // Para PC+Monitor, el sufijo de PC y MO debe ser compartido
    let sufijoPcMonitor = null;

    campos.forEach(campo => {
        const group = document.createElement('div');
        group.className = 'form-group';

        if (campo.tipoControl === 'codigo') {
            const suf = (() => {
                if (tipo === 'pc_monitor') {
                    if (!sufijoPcMonitor) sufijoPcMonitor = generarSufijo();
                    return sufijoPcMonitor;
                }
                return generarSufijo();
            })();

            initEstadoCodigo(campo.id, campo.sigla, suf);
            const autoCode = construirCodigo(campo.sigla, sucursal.getId(), suf);

            group.innerHTML = renderCampoCodigoHTML(campo, autoCode, suf, sucursal);

        } else if (campo.tipoControl === 'area') {
            group.innerHTML = renderCampoAreaHTML(campo);

        } else if (campo.tipoControl === 'fecha') {
            group.innerHTML = `
                <label for="${campo.id}">${campo.label}</label>
                <input type="text" id="${campo.id}" value="${campo.def || TODAY}" placeholder="${campo.placeholder || 'Ejemplo: ' + TODAY}" oninput="updatePreview()">
            `;
        } else {
            group.innerHTML = `
                <label for="${campo.id}">${campo.label}</label>
                <input type="text" id="${campo.id}" value="" placeholder="${campo.placeholder || ''}" oninput="updatePreview()">
            `;
        }

        container.appendChild(group);
    });

    updatePreview();
}

// ── Cambio de sucursal ────────────────────────────────────────────────────────

function onSucursalChange() {
    const sucursal = obtenerSucursalActual();
    const sucursalId = sucursal.getId();

    // Para PC+Monitor: si ambos están en modo auto, mantener el mismo sufijo
    if (codigosEstado['cod_pc'] && codigosEstado['cod_mo'] &&
        codigosEstado['cod_pc'].modo === 'auto') {
        // Solo actualizar el prefijo (el sufijo no cambia), sincronizar display
        sincronizarDisplayCodigo('cod_pc');
        sincronizarDisplayCodigo('cod_mo');
    }

    Object.keys(codigosEstado).forEach(inputId => {
        const estado = codigosEstado[inputId];
        if (estado && estado.modo === 'auto') {
            sincronizarDisplayCodigo(inputId);
        }
    });

    renderComponentesAdicionales();
    updatePreview();
}

// ── Cambio de tipo de remito ─────────────────────────────────────────────────

function onTipoRemitoChange() {
    // Limpiar componentes adicionales al cambiar el tipo principal
    componentesAdicionales = [];
    Object.keys(codigosEstado).forEach(k => {
        if (k.startsWith('extra_')) delete codigosEstado[k];
    });
    renderForm();
    renderComponentesAdicionales();
}

// ── Generar el objeto de dominio completo ─────────────────────────────────────

function buildRemitoConExtras(tipo, sucursal) {
    const remito = RemitoFactory.crearRemito(tipo, v, sucursal);

    // Adjuntar los componentes adicionales como lista
    if (componentesAdicionales.length > 0) {
        const extras = componentesAdicionales.map(comp => {
            const inputId = `extra_cod_${comp.uid}`;
            const estado = codigosEstado[inputId];
            const suf = estado ? (estado.modo === 'auto' ? estado.sufijo : (estado.manualSufijo || estado.sufijo)) : comp.sufijo;
            const cod = construirCodigo(estado ? estado.sigla : comp.sigla, sucursal.getId(), suf);
            const def = TIPOS_COMPONENTE_ADICIONAL.find(t => t.value === comp.tipo);
            const tipoLabel = def ? def.label : comp.tipo;
            return new Periferico(
                cod,
                comp.campos.marca || '—',
                comp.campos.modelo || '—',
                cod,
                tipoLabel,
                comp.campos.nota || ''
            );
        });
        remito._componentesAdicionales = extras;
    }

    return remito;
}

// ── UpdatePreview ─────────────────────────────────────────────────────────────

function updatePreview() {
    const tipo = document.getElementById('tipo_remito').value;
    const sucursal = obtenerSucursalActual();
    const previewContainer = document.getElementById('document-preview');
    if (!previewContainer) return;

    const remito = buildRemitoConExtras(tipo, sucursal);
    previewContainer.innerHTML = renderService.renderizarHTML(remito);
    document.title = obtenerNombreSugeridoPDF();
}

// ── Nombre sugerido PDF ───────────────────────────────────────────────────────

function obtenerNombreSugeridoPDF() {
    const tipo = document.getElementById('tipo_remito').value;
    if (tipo === 'pc_monitor') {
        return `Recibo_${v('cod_pc')}+${v('cod_mo')}`;
    } else if (tipo === 'traslado') {
        return `Recibo_Traslado_${v('cod')}`;
    } else if (tipo === 'baja') {
        return `Recibo_Baja_${v('cod')}`;
    } else {
        const cod = v('cod') !== '—' ? v('cod') : (v('sn') !== '—' ? v('sn') : 'Remito');
        return `Recibo_${cod}`;
    }
}

// Inicialización
renderForm();
