/**
 * CONTROLADOR PRINCIPAL DE LA APLICACIÓN — MOTOZUNI S.A.
 * Coordina la UI, la captura de datos y delega la renderización a los servicios orientados a objetos.
 */

// ── Instanciación de dependencias ────────────────────────────────────────────
const repositorioSucursales = new RepositorioSucursalMemoria();
const renderService = new RemitoHtmlRenderService();

const TODAY = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

// Estado de códigos automáticos/manuales { inputId: { sigla, sucursal, numero, siglaDefault, modo } }
const codigosEstado = {};

// Lista de componentes adicionales agregados al remito
// Cada item: { uid, tipo, sigla, campos: { marca, modelo, nota } }
let componentesAdicionales = [];
let uidCounter = 0;

// Mapeo de tipo de componente adicional → sigla y etiqueta
const TIPOS_COMPONENTE_ADICIONAL = [
    { value: 'auricular',    label: 'Auricular',        sigla: 'AU' },
    { value: 'mouse',        label: 'Mouse',            sigla: 'MS' },
    { value: 'teclado',      label: 'Teclado',          sigla: 'TC' },
    { value: 'wifi',         label: 'Adaptador Wi-Fi',  sigla: 'WF' },
    { value: 'monitor_solo', label: 'Monitor',          sigla: 'MO' },
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

// ── Lógica de Códigos ([Sigla]-[Sucursal]-[Número]) ──────────────────────────

/**
 * Genera un número aleatorio de 4 dígitos
 */
function generarSufijo() {
    return String(Math.floor(Math.random() * 10000)).padStart(4, '0');
}

/**
 * Construye un código según la especificación: [SIGLA]-[SUCURSAL]-[NUMERO]
 */
function construirCodigo(sigla, sucursal, numero) {
    const s = (sigla !== undefined && sigla !== null && String(sigla).trim() !== '') ? String(sigla).trim().toUpperCase() : 'XX';
    const suc = (sucursal !== undefined && sucursal !== null && String(sucursal).trim() !== '') ? String(sucursal).trim() : '0';
    const n = (numero !== undefined && numero !== null && String(numero).trim() !== '') ? String(numero).trim() : '0000';
    return `${s}-${suc}-${n}`;
}

/**
 * Inicializa el estado de un campo de código
 */
function initEstadoCodigo(inputId, sigla, sucursalId = null, numero = null) {
    const num = numero || generarSufijo();
    const suc = String(sucursalId !== null && sucursalId !== undefined ? sucursalId : obtenerSucursalActual().getId());
    codigosEstado[inputId] = {
        sigla: sigla,
        sucursal: suc,
        numero: num,
        siglaDefault: sigla,
        modo: 'auto' // 'auto' | 'manual'
    };
}

/**
 * Devuelve el valor final del código para un inputId
 */
function getValorCodigo(inputId) {
    const estado = codigosEstado[inputId];
    if (!estado) return '—';
    return construirCodigo(estado.sigla, estado.sucursal, estado.numero);
}

/**
 * Sincroniza el DOM del campo código con su estado actual
 */
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

    if (siglaInput && document.activeElement !== siglaInput) {
        siglaInput.value = estado.sigla;
    }
    if (sucInput && document.activeElement !== sucInput) {
        sucInput.value = estado.sucursal;
    }
    if (numInput && document.activeElement !== numInput) {
        numInput.value = estado.numero;
    }

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

/**
 * Escucha cambios en cualquiera de los tres segmentos del código manual:
 * 1. Sigla (ej: PC)
 * 2. Sucursal (ej: 28)
 * 3. Número (ej: 2381)
 */
function onCodigoSegmentChange(inputId, segment) {
    const estado = codigosEstado[inputId];
    if (!estado) return;

    const siglaInput = document.getElementById(`sigla_input_${inputId}`);
    const sucInput = document.getElementById(`suc_input_${inputId}`);
    const numInput = document.getElementById(`sufijo_input_${inputId}`);

    if (siglaInput) estado.sigla = siglaInput.value.trim().toUpperCase();
    if (sucInput) estado.sucursal = sucInput.value.trim();
    if (numInput) estado.numero = numInput.value.trim();

    // Sincronización especial PC + Monitor:
    // Si se modifica la sucursal o el número de la PC, sincronizarlo al Monitor
    if (inputId === 'cod_pc') {
        const estadoMo = codigosEstado['cod_mo'];
        if (estadoMo) {
            estadoMo.sucursal = estado.sucursal;
            estadoMo.numero = estado.numero;
            sincronizarDisplayCodigo('cod_mo');
        }
    }

    sincronizarDisplayCodigo(inputId);
    updatePreview();
}

/**
 * Regenera el número aleatorio (botón "🎲 Nuevo")
 */
function regenerarCodigo(inputId) {
    const estado = codigosEstado[inputId];
    if (!estado) return;

    const nuevoNum = generarSufijo();
    estado.numero = nuevoNum;

    // Si está en auto, asegurar que sigla y sucursal correspondan a los defaults
    if (estado.modo === 'auto') {
        estado.sigla = estado.siglaDefault;
        estado.sucursal = String(obtenerSucursalActual().getId());
    }

    // Sincronizar PC + Monitor
    if (inputId === 'cod_pc') {
        const estadoMo = codigosEstado['cod_mo'];
        if (estadoMo) {
            estadoMo.numero = nuevoNum;
            if (estadoMo.modo === 'auto') {
                estadoMo.sucursal = estado.sucursal;
            }
            sincronizarDisplayCodigo('cod_mo');
        }
    }

    sincronizarDisplayCodigo(inputId);
    updatePreview();
}

/**
 * Alterna entre modo automático y modo manual (permite editar sigla, sucursal y número)
 */
function toggleModoCodigo(inputId) {
    const estado = codigosEstado[inputId];
    if (!estado) return;

    estado.modo = estado.modo === 'auto' ? 'manual' : 'auto';

    if (estado.modo === 'auto') {
        // Al regresar a modo automático, restablecer sigla y sucursal según la sucursal seleccionada
        estado.sigla = estado.siglaDefault;
        estado.sucursal = String(obtenerSucursalActual().getId());
    }

    sincronizarDisplayCodigo(inputId);
    updatePreview();
}

/**
 * Renderiza el bloque HTML del campo de código con soporte de edición segmentada completa
 */
function renderCampoCodigoHTML(campo, autoCode, estado, suc) {
    const isManual = estado && estado.modo === 'manual';

    return `
        <div class="label-row">
            <label>${campo.label}</label>
        </div>
        <div class="code-box">
            <span class="code-badge" id="display_${campo.id}">${autoCode}</span>
            <div class="code-actions">
                <button type="button" class="btn-code-action" onclick="regenerarCodigo('${campo.id}')" title="Generar otro número aleatorio">🎲 Nuevo</button>
                <button type="button" class="btn-code-action ${isManual ? 'active' : ''}" id="btn_toggle_${campo.id}" onclick="toggleModoCodigo('${campo.id}')" title="Modificar sigla, sucursal o número a mano">
                    ${isManual ? '⚙️ Automático' : '✏️ Anotar a mano'}
                </button>
            </div>
        </div>
        <div class="code-manual-container" id="manual_container_${campo.id}" style="display: ${isManual ? 'block' : 'none'};">
            <div class="code-manual-segments">
                <input type="text" class="code-seg-input code-seg-sigla" id="sigla_input_${campo.id}" value="${estado.sigla}" maxlength="4" placeholder="${campo.sigla}" title="Sigla del componente (ej: ${campo.sigla})" oninput="onCodigoSegmentChange('${campo.id}', 'sigla')">
                <span class="code-seg-sep">-</span>
                <input type="text" class="code-seg-input code-seg-suc" id="suc_input_${campo.id}" value="${estado.sucursal}" maxlength="4" placeholder="${suc.getId()}" title="Código de sucursal (ej: ${suc.getId()})" oninput="onCodigoSegmentChange('${campo.id}', 'sucursal')">
                <span class="code-seg-sep">-</span>
                <input type="text" class="code-seg-input code-seg-num" id="sufijo_input_${campo.id}" value="${estado.numero}" maxlength="8" placeholder="0000" title="Número de serie o aleatorio" oninput="onCodigoSegmentChange('${campo.id}', 'numero')">
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
    const num = generarSufijo();
    const inputId = `extra_cod_${uid}`;

    componentesAdicionales.push({
        uid,
        tipo: tipo.value,
        sigla: tipo.sigla,
        campos: { marca: '', modelo: '', nota: '' }
    });

    initEstadoCodigo(inputId, tipo.sigla, suc.getId(), num);

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

    const inputId = `extra_cod_${uid}`;
    const estado = codigosEstado[inputId];
    if (estado) {
        estado.siglaDefault = def.sigla;
        if (estado.modo === 'auto') {
            estado.sigla = def.sigla;
        }
        sincronizarDisplayCodigo(inputId);
    }
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
        const estado = codigosEstado[inputId] || {
            sigla: comp.sigla,
            sucursal: String(suc.getId()),
            numero: generarSufijo(),
            siglaDefault: comp.sigla,
            modo: 'auto'
        };
        const codigoFull = construirCodigo(estado.sigla, estado.sucursal, estado.numero);
        const isManual = estado.modo === 'manual';

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
                        <button type="button" class="btn-code-action" onclick="regenerarCodigo('${inputId}')" title="Generar otro número">🎲 Nuevo</button>
                        <button type="button" class="btn-code-action ${isManual ? 'active' : ''}" id="btn_toggle_${inputId}" onclick="toggleModoCodigo('${inputId}')" title="Modificar sigla, sucursal o número a mano">
                            ${isManual ? '⚙️ Automático' : '✏️ Anotar a mano'}
                        </button>
                    </div>
                </div>
                <div class="code-manual-container" id="manual_container_${inputId}" style="display: ${isManual ? 'block' : 'none'};">
                    <div class="code-manual-segments">
                        <input type="text" class="code-seg-input code-seg-sigla" id="sigla_input_${inputId}" value="${estado.sigla}" maxlength="4" placeholder="${comp.sigla}" title="Sigla" oninput="onCodigoSegmentChange('${inputId}', 'sigla')">
                        <span class="code-seg-sep">-</span>
                        <input type="text" class="code-seg-input code-seg-suc" id="suc_input_${inputId}" value="${estado.sucursal}" maxlength="4" placeholder="${suc.getId()}" title="Código de sucursal" oninput="onCodigoSegmentChange('${inputId}', 'sucursal')">
                        <span class="code-seg-sep">-</span>
                        <input type="text" class="code-seg-input code-seg-num" id="sufijo_input_${inputId}" value="${estado.numero}" maxlength="8" placeholder="0000" title="Número" oninput="onCodigoSegmentChange('${inputId}', 'numero')">
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

    // Para PC+Monitor, el número aleatorio de PC y Monitor se sincroniza inicialmente
    let numeroPcMonitor = null;

    campos.forEach(campo => {
        const group = document.createElement('div');
        group.className = 'form-group';

        if (campo.tipoControl === 'codigo') {
            const num = (() => {
                if (tipo === 'pc_monitor') {
                    if (!numeroPcMonitor) numeroPcMonitor = generarSufijo();
                    return numeroPcMonitor;
                }
                return generarSufijo();
            })();

            initEstadoCodigo(campo.id, campo.sigla, sucursal.getId(), num);
            const estado = codigosEstado[campo.id];
            const autoCode = construirCodigo(campo.sigla, sucursal.getId(), num);

            group.innerHTML = renderCampoCodigoHTML(campo, autoCode, estado, sucursal);

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
    const sucursalId = String(sucursal.getId());

    // Actualizar sucursal en todos los códigos que estén en modo automático
    Object.keys(codigosEstado).forEach(inputId => {
        const estado = codigosEstado[inputId];
        if (estado && estado.modo === 'auto') {
            estado.sucursal = sucursalId;
            sincronizarDisplayCodigo(inputId);
        }
    });

    renderComponentesAdicionales();
    updatePreview();
}

// ── Cambio de tipo de remito ─────────────────────────────────────────────────

function onTipoRemitoChange() {
    // Limpiar componentes adicionales y estados al cambiar el tipo principal
    componentesAdicionales = [];
    Object.keys(codigosEstado).forEach(k => {
        delete codigosEstado[k];
    });
    renderForm();
    renderComponentesAdicionales();
}

// ── Generar el objeto de dominio completo ─────────────────────────────────────

function buildRemitoConExtras(tipo, sucursal) {
    const remito = RemitoFactory.crearRemito(tipo, v, sucursal);

    // Adjuntar los componentes adicionales como entidades de dominio
    if (componentesAdicionales.length > 0) {
        componentesAdicionales.forEach(comp => {
            const inputId = `extra_cod_${comp.uid}`;
            const estado = codigosEstado[inputId];
            const cod = estado 
                ? construirCodigo(estado.sigla, estado.sucursal, estado.numero)
                : construirCodigo(comp.sigla, sucursal.getId(), generarSufijo());

            const def = TIPOS_COMPONENTE_ADICIONAL.find(t => t.value === comp.tipo);
            const tipoLabel = def ? def.label : comp.tipo;

            const extraPeriferico = new Periferico(
                cod,
                comp.campos.marca || '—',
                comp.campos.modelo || '—',
                cod,
                tipoLabel,
                comp.campos.nota || ''
            );
            remito.agregarComponenteAdicional(extraPeriferico);
        });
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

// ── Nombre sugerido PDF e Impresión ──────────────────────────────────────────

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

function imprimirConNombreSugerido() {
    const originalTitle = document.title;
    document.title = obtenerNombreSugeridoPDF();
    window.print();
    setTimeout(() => {
        document.title = originalTitle;
    }, 1000);
}

// ── Inicialización ───────────────────────────────────────────────────────────
renderForm();
