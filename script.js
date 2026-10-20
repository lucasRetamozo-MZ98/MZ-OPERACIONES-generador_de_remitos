/**
 * CONTROLADOR PRINCIPAL DE LA APLICACIÓN — MOTOZUNI S.A.
 * Coordina la UI, la captura de datos y delega la renderización a los servicios orientados a objetos.
 */

// Instanciación de dependencias (Inversión de Dependencias / Inyección)
const repositorioSucursales = new RepositorioSucursalMemoria();
const renderService = new RemitoHtmlRenderService();

const TODAY = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

// Estado de códigos automáticos/manuales
const codigosEstado = {};

// Inicializar el select de sucursales desde el repositorio oficial
const selectSucursal = document.getElementById('sucursal');
if (selectSucursal) {
    selectSucursal.innerHTML = '';
    repositorioSucursales.obtenerTodas().forEach(suc => {
        const opt = document.createElement('option');
        opt.value = suc.getId();
        opt.innerText = `${suc.getNombreCompleto()} (Cód. ${suc.getId()})`;
        // Dejar SARANDI (28) preseleccionado por defecto
        if (suc.getId() === 28) {
            opt.selected = true;
        }
        selectSucursal.appendChild(opt);
    });
}

/**
 * Función helper para obtener el valor de un campo del DOM.
 * Si es nombre o fecha y está vacío, devuelve cadena vacía para que el renderizador
 * dibuje la línea punteada para llenado a mano.
 * @param {string} id ID del elemento input
 * @returns {string}
 */
function v(id) {
    const el = document.getElementById(id);
    if (!el) return '';
    const val = el.value.trim();
    if (val === '') {
        // En nombre y fecha se devuelve vacío para activar la línea punteada
        if (id === 'nombre' || id === 'nombre1' || id === 'nombre2' || id === 'fecha') {
            return '';
        }
        return '—';
    }
    return val;
}

/**
 * Obtiene la sucursal actualmente seleccionada en el formulario
 * @returns {Sucursal}
 */
function obtenerSucursalActual() {
    const select = document.getElementById('sucursal');
    if (!select) return new Sucursal(28, 'SARANDI');
    const codigo = Number(select.value);
    return repositorioSucursales.buscarPorCodigo(codigo) || new Sucursal(28, 'SARANDI');
}

/**
 * Genera un código automático para un campo según la sucursal actual
 * @param {string} inputId 
 * @param {string} sigla 
 */
function generarNuevoCodigoAutomatico(inputId, sigla) {
    const sucursal = obtenerSucursalActual();
    const codigo = CodigoGenerador.generarCodigo(sigla, sucursal.getId());
    codigosEstado[inputId] = {
        sigla: sigla,
        modo: 'auto',
        autoCodigo: codigo,
        manualCodigo: ''
    };
    sincronizarDisplayCodigo(inputId);
}

/**
 * Sincroniza la visualización de la caja de código con el estado
 * @param {string} inputId 
 */
function sincronizarDisplayCodigo(inputId) {
    const estado = codigosEstado[inputId];
    if (!estado) return;

    const badge = document.getElementById(`display_${inputId}`);
    const inputOculto = document.getElementById(inputId);
    const manualContainer = document.getElementById(`manual_container_${inputId}`);
    const btnToggle = document.getElementById(`btn_toggle_${inputId}`);

    const valorFinal = estado.modo === 'auto' ? estado.autoCodigo : (estado.manualCodigo || estado.autoCodigo);

    if (badge) badge.innerText = valorFinal;
    if (inputOculto) inputOculto.value = valorFinal;

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
 * Regenera el código automático con 4 dígitos nuevos
 * @param {string} inputId 
 */
function regenerarCodigo(inputId) {
    const estado = codigosEstado[inputId];
    if (!estado) return;
    const sucursal = obtenerSucursalActual();
    estado.autoCodigo = CodigoGenerador.generarCodigo(estado.sigla, sucursal.getId());
    estado.modo = 'auto';
    sincronizarDisplayCodigo(inputId);
    updatePreview();
}

/**
 * Alterna entre modo automático y anotación manual
 * @param {string} inputId 
 */
function toggleModoCodigo(inputId) {
    const estado = codigosEstado[inputId];
    if (!estado) return;

    if (estado.modo === 'auto') {
        estado.modo = 'manual';
        const inputManual = document.getElementById(`manual_input_${inputId}`);
        if (inputManual && !inputManual.value) {
            inputManual.value = estado.autoCodigo;
            estado.manualCodigo = estado.autoCodigo;
        }
    } else {
        estado.modo = 'auto';
    }

    sincronizarDisplayCodigo(inputId);
    updatePreview();
}

/**
 * Se ejecuta cuando el usuario escribe a mano en el campo manual
 * @param {string} inputId 
 */
function onCodigoManualInput(inputId) {
    const estado = codigosEstado[inputId];
    if (!estado) return;
    const inputManual = document.getElementById(`manual_input_${inputId}`);
    estado.manualCodigo = inputManual ? inputManual.value.trim() : '';
    sincronizarDisplayCodigo(inputId);
    updatePreview();
}

/**
 * Maneja el cambio en el selector de área
 * @param {string} campoId 
 */
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

/**
 * Maneja la escritura a mano en el campo de área personalizada
 * @param {string} campoId 
 */
function onAreaCustomInput(campoId) {
    const customInput = document.getElementById(`custom_input_${campoId}`);
    const inputOculto = document.getElementById(campoId);
    if (inputOculto && customInput) {
        inputOculto.value = customInput.value.trim();
        updatePreview();
    }
}

/**
 * Renderiza dinámicamente los campos del formulario según el tipo de remito seleccionado.
 */
function renderForm() {
    const tipo = document.getElementById('tipo_remito').value;
    const sucursal = obtenerSucursalActual();
    const campos = RemitoFactory.getCamposFormulario(tipo, TODAY, sucursal.getId());
    const container = document.getElementById('dynamic-fields');
    if (!container) return;

    container.innerHTML = '';

    campos.forEach(campo => {
        const group = document.createElement('div');
        group.className = 'form-group';

        if (campo.tipoControl === 'codigo') {
            const sucursalId = sucursal.getId();
            const autoCode = CodigoGenerador.generarCodigo(campo.sigla, sucursalId);
            codigosEstado[campo.id] = {
                sigla: campo.sigla,
                modo: 'auto',
                autoCodigo: autoCode,
                manualCodigo: ''
            };

            group.innerHTML = `
                <div class="label-row">
                    <label>${campo.label}</label>
                </div>
                <div class="code-box">
                    <span class="code-badge" id="display_${campo.id}">${autoCode}</span>
                    <div class="code-actions">
                        <button type="button" class="btn-code-action" onclick="regenerarCodigo('${campo.id}')" title="Generar otro número aleatorio">🎲 Nuevo</button>
                        <button type="button" class="btn-code-action" id="btn_toggle_${campo.id}" onclick="toggleModoCodigo('${campo.id}')" title="Permitir escribir el código a mano">✏️ Anotar a mano</button>
                    </div>
                </div>
                <div class="code-manual-container" id="manual_container_${campo.id}" style="display: none;">
                    <input type="text" id="manual_input_${campo.id}" value="${autoCode}" placeholder="Ejemplo: ${autoCode}" oninput="onCodigoManualInput('${campo.id}')">
                </div>
                <input type="hidden" id="${campo.id}" value="${autoCode}">
            `;
        } else if (campo.tipoControl === 'area') {
            const defaultArea = 'Logística';
            group.innerHTML = `
                <label for="select_${campo.id}">${campo.label}</label>
                <select id="select_${campo.id}" onchange="onAreaSelectChange('${campo.id}')">
                    <option value="Logística" selected>Logística</option>
                    <option value="Administración">Administración</option>
                    <option value="Comercial">Comercial</option>
                    <option value="__OTRA__">Otra (escribir a mano)...</option>
                </select>
                <div id="custom_container_${campo.id}" style="display: none; margin-top: 6px;">
                    <input type="text" id="custom_input_${campo.id}" placeholder="Ejemplo: Recursos Humanos" oninput="onAreaCustomInput('${campo.id}')">
                </div>
                <input type="hidden" id="${campo.id}" value="${defaultArea}">
            `;
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

/**
 * Se ejecuta al cambiar de sucursal
 */
function onSucursalChange() {
    const sucursal = obtenerSucursalActual();
    const sucursalId = sucursal.getId();

    Object.keys(codigosEstado).forEach(inputId => {
        const estado = codigosEstado[inputId];
        if (estado && estado.modo === 'auto') {
            estado.autoCodigo = CodigoGenerador.generarCodigo(estado.sigla, sucursalId);
            sincronizarDisplayCodigo(inputId);
        }
    });

    updatePreview();
}

/**
 * Obtiene el nombre del archivo PDF sugerido para la descarga/impresión.
 * Formato: Recibo_[CÓDIGO]
 * @returns {string}
 */
function obtenerNombreSugeridoPDF() {
    const tipo = document.getElementById('tipo_remito').value;
    
    if (tipo === 'pc_monitor') {
        const codPc = v('cod_pc');
        const codMo = v('cod_mo');
        return `Recibo_${codPc}+${codMo}`;
    } else if (tipo === 'traslado') {
        const cod = v('cod');
        return `Recibo_Traslado_${cod}`;
    } else if (tipo === 'baja') {
        const cod = v('cod');
        return `Recibo_Baja_${cod}`;
    } else {
        const cod = v('cod') !== '—' ? v('cod') : (v('sn') !== '—' ? v('sn') : 'Remito');
        return `Recibo_${cod}`;
    }
}

/**
 * Prepara el título del documento antes de abrir el diálogo de impresión del navegador
 */
function imprimirConNombreSugerido() {
    const nombreSugerido = obtenerNombreSugeridoPDF();
    document.title = nombreSugerido;
    window.print();
}

/**
 * Actualiza la vista previa del remito
 */
function updatePreview() {
    const tipo = document.getElementById('tipo_remito').value;
    const sucursal = obtenerSucursalActual();
    const previewContainer = document.getElementById('document-preview');
    if (!previewContainer) return;

    // 1. Creación del objeto de dominio correspondiente
    const remito = RemitoFactory.crearRemito(tipo, v, sucursal);

    // 2. Renderizado mediante el servicio de presentación
    previewContainer.innerHTML = renderService.renderizarHTML(remito);

    // 3. Sincronizar el título de la página para la impresión en PDF
    document.title = obtenerNombreSugeridoPDF();
}

// Inicialización automática
renderForm();