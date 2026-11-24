/**
 * MODELOS DE DOMINIO — MOTOZUNI S.A.
 * Implementación del Diagrama de Clases (POO / Principios SOLID)
 */

// ── GENERADOR DE CÓDIGOS ─────────────────────────────────────────────────────

class CodigoGenerador {
    /**
     * Genera un número aleatorio de 4 dígitos con padding (0000 a 9999)
     * @returns {string}
     */
    static generarNumeroAleatorio() {
        return String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    }

    /**
     * Construye el código según la especificación:
     * [Las siglas del tipo de componente]-[el codigo de la sucursal]-[un numero aleatorio de 4 digitos]
     * @param {string} sigla Ej: 'PC', 'MO', 'NB', 'CE', 'AU', 'MS', 'TC', 'WF'
     * @param {number|string} codigoSucursal Ej: 28
     * @param {string} [numero] Si no se provee, genera uno aleatorio de 4 dígitos
     * @returns {string}
     */
    static generarCodigo(sigla, codigoSucursal, numero = null) {
        const num = numero || this.generarNumeroAleatorio();
        return `${sigla}-${codigoSucursal}-${num}`;
    }
}

// ── SUCURSAL ──────────────────────────────────────────────────────────────────
class Sucursal {
    #id;
    #codigo;
    #nombre;

    /**
     * @param {number} id Clave primaria autoincremental de BD
     * @param {string} nombre Nombre de la sucursal
     * @param {number} [codigo] Código operativo de sucursal (ej: 28 para SARANDI)
     */
    constructor(id, nombre, codigo = undefined) {
        this.#id = Number(id);
        this.#codigo = codigo !== undefined && codigo !== null ? Number(codigo) : Number(id);
        this.#nombre = nombre;
    }

    getId() {
        return this.#id;
    }

    getCodigo() {
        return this.#codigo;
    }

    get id() {
        return this.#id;
    }

    get codigo() {
        return this.#codigo;
    }

    getNombre() {
        return this.#nombre;
    }

    get nombre() {
        return this.#nombre;
    }

    getNombreCompleto() {
        if (this.#nombre.toUpperCase().startsWith("MOTOZUNI")) {
            return this.#nombre;
        }
        return `MOTOZUNI S. A. ${this.#nombre}`;
    }

    toJSON() {
        return {
            id: this.#id,
            codigo: this.#codigo,
            nombre: this.#nombre
        };
    }
}

// ── JERARQUÍA DE EQUIPAMIENTO ────────────────────────────────────────────────

/**
 * Clase base abstracta para todo equipamiento informático o accesorio.
 */
class Equipamiento {
    #codigo;
    #marca;
    #modelo;
    #numeroSerie;
    #estado;
    #notaAdicional;

    /**
     * @param {string} codigo 
     * @param {string} marca 
     * @param {string} modelo 
     * @param {string} numeroSerie 
     * @param {string} [notaAdicional]
     */
    constructor(codigo, marca, modelo, numeroSerie, notaAdicional = '') {
        if (new.target === Equipamiento) {
            throw new Error("No se puede instanciar directamente la clase abstracta Equipamiento.");
        }
        this.#codigo = codigo || '—';
        this.#marca = marca || '—';
        this.#modelo = modelo || '—';
        this.#numeroSerie = numeroSerie || 'N/A';
        this.#estado = 'Asignado';
        this.#notaAdicional = notaAdicional || '';
    }

    getCodigo() {
        return this.#codigo;
    }

    getMarca() {
        return this.#marca;
    }

    getModelo() {
        return this.#modelo;
    }

    getNumeroSerie() {
        return this.#numeroSerie;
    }

    getEstado() {
        return this.#estado;
    }

    setEstado(estado) {
        this.#estado = estado;
    }

    getNotaAdicional() {
        return this.#notaAdicional;
    }

    setNotaAdicional(nota) {
        this.#notaAdicional = nota || '';
    }

    /**
     * Retorna el nombre o tipo representativo del dispositivo.
     * @returns {string}
     */
    getTipoDescripcion() {
        return "Dispositivo";
    }

    /**
     * Retorna los pares clave-valor para ser renderizados en la tabla del remito.
     * Permite que cada equipamiento defina polimórficamente sus especificaciones (OCP).
     * @returns {Array<[string, string]>}
     */
    getEspecificaciones() {
        return [
            ['Código', this.getCodigo()],
            ['Marca', this.getMarca()],
            ['Modelo', this.getModelo()],
            ['N° Serie', this.getNumeroSerie()],
            ['Estado', this.getEstado()],
            ['', '']
        ];
    }
}

/**
 * Computadora de escritorio (PC)
 */
class Computadora extends Equipamiento {
    #procesador;
    #ramGB;
    #almacenamientoGB;
    #sistemaOperativo;
    #adaptadorRed;
    #componentes;

    constructor(codigo, marca, modelo, numeroSerie, procesador, ramGB, almacenamientoGB, sistemaOperativo, adaptadorRed, componentes) {
        super(codigo, marca, modelo, numeroSerie);
        this.#procesador = procesador || '—';
        this.#ramGB = ramGB || '—';
        this.#almacenamientoGB = almacenamientoGB || '—';
        this.#sistemaOperativo = sistemaOperativo || 'Windows 10 Pro';
        this.#adaptadorRed = adaptadorRed || '—';
        this.#componentes = componentes || '—';
    }

    getProcesador() { return this.#procesador; }
    getRamGB() { return this.#ramGB; }
    getAlmacenamientoGB() { return this.#almacenamientoGB; }
    getSistemaOperativo() { return this.#sistemaOperativo; }
    getAdaptadorRed() { return this.#adaptadorRed; }
    getComponentes() { return this.#componentes; }

    getTipoDescripcion() {
        return "Computadora";
    }

    getEspecificaciones() {
        return [
            ['Código', this.getCodigo()],
            ['Marca', this.getMarca()],
            ['Modelo', this.getModelo()],
            ['N° Serie', this.getNumeroSerie()],
            ['Estado', this.getEstado()],
            ['S.O.', this.getSistemaOperativo()],
            ['CPU', this.getProcesador()],
            ['RAM (GB)', this.getRamGB()],
            ['Almacenamiento (GB)', this.getAlmacenamientoGB()],
            ['Adaptador de Red', this.getAdaptadorRed()],
            ['Componentes', this.getComponentes()],
            ['', '']
        ];
    }
}

/**
 * Monitor
 */
class Monitor extends Equipamiento {
    constructor(codigo, marca, modelo, numeroSerie) {
        super(codigo, marca, modelo, numeroSerie);
    }

    getTipoDescripcion() {
        return "Monitor";
    }

    getEspecificaciones() {
        return [
            ['Código', this.getCodigo()],
            ['Marca', this.getMarca()],
            ['Modelo', this.getModelo()],
            ['N° Serie', this.getNumeroSerie() || '—'],
            ['Estado', this.getEstado()],
            ['', '']
        ];
    }
}

/**
 * Notebook
 */
class Notebook extends Equipamiento {
    #procesador;
    #ramGB;
    #almacenamientoGB;
    #sistemaOperativo;
    #incluyeCargador;

    constructor(codigo, marca, modelo, numeroSerie, procesador, ramGB, almacenamientoGB, sistemaOperativo, incluyeCargador = true) {
        super(codigo, marca, modelo, numeroSerie);
        this.#procesador = procesador || '—';
        this.#ramGB = ramGB || '—';
        this.#almacenamientoGB = almacenamientoGB || '—';
        this.#sistemaOperativo = sistemaOperativo || 'Windows 10 Pro';
        this.#incluyeCargador = typeof incluyeCargador === 'boolean' 
            ? incluyeCargador 
            : (String(incluyeCargador).toLowerCase() === 'sí' || String(incluyeCargador).toLowerCase() === 'si' || String(incluyeCargador) === 'true');
    }

    getProcesador() { return this.#procesador; }
    getRamGB() { return this.#ramGB; }
    getAlmacenamientoGB() { return this.#almacenamientoGB; }
    getSistemaOperativo() { return this.#sistemaOperativo; }
    isIncluyeCargador() { return this.#incluyeCargador; }

    getTipoDescripcion() {
        return "Notebook";
    }

    getEspecificaciones() {
        return [
            ['Código', this.getCodigo()],
            ['Marca', this.getMarca()],
            ['Modelo', this.getModelo()],
            ['N° Serie', this.getNumeroSerie()],
            ['Estado', this.getEstado()],
            ['S.O.', this.getSistemaOperativo()],
            ['CPU', this.getProcesador()],
            ['RAM (GB)', this.getRamGB()],
            ['Almacenamiento (GB)', this.getAlmacenamientoGB()],
            ['Cargador', this.isIncluyeCargador() ? 'Sí' : 'No']
        ];
    }
}

/**
 * Chip / Línea SIM
 */
class LineaSIM {
    #operadora;
    #numeroLinea;
    #iccid;
    #estado;

    constructor(operadora, numeroLinea, iccid, estado = 'Asignado') {
        this.#operadora = operadora || 'Claro';
        this.#numeroLinea = numeroLinea || '—';
        this.#iccid = iccid || '—';
        this.#estado = estado || 'Asignado';
    }

    getOperadora() { return this.#operadora; }
    getNumeroLinea() { return this.#numeroLinea; }
    getIccid() { return this.#iccid; }
    getEstado() { return this.#estado; }

    getEspecificaciones() {
        return [
            ['Operadora', this.getOperadora()],
            ['Número', this.getNumeroLinea()],
            ['ICCID', this.getIccid()],
            ['Estado', this.getEstado()]
        ];
    }
}

/**
 * Celular móvil
 */
class Celular extends Equipamiento {
    #imei;
    #procesador;
    #ramGB;
    #almacenamientoGB;
    #lineaSim;

    constructor(codigo, marca, modelo, numeroSerie, imei, procesador, ramGB, almacenamientoGB, lineaSim = null) {
        super(codigo, marca, modelo, numeroSerie);
        this.#imei = imei || '—';
        this.#procesador = procesador || '—';
        this.#ramGB = ramGB || '—';
        this.#almacenamientoGB = almacenamientoGB || '—';
        this.#lineaSim = lineaSim;
    }

    getImei() { return this.#imei; }
    getProcesador() { return this.#procesador; }
    getRamGB() { return this.#ramGB; }
    getAlmacenamientoGB() { return this.#almacenamientoGB; }
    getLineaSim() { return this.#lineaSim; }
    setLineaSim(lineaSim) { this.#lineaSim = lineaSim; }

    getTipoDescripcion() {
        return "Celular";
    }

    getEspecificaciones() {
        return [
            ['Código', this.getCodigo()],
            ['Marca', this.getMarca()],
            ['Modelo', this.getModelo()],
            ['N° Serie', this.getNumeroSerie()],
            ['Estado', this.getEstado()],
            ['S.O.', 'Android'],
            ['CPU', this.getProcesador()],
            ['RAM', this.getRamGB()],
            ['Almacenamiento', this.getAlmacenamientoGB()],
            ['IMEI', this.getImei()]
        ];
    }
}

/**
 * Accesorio (Clase base abstracta)
 */
class Accesorio extends Equipamiento {
    #tipoAccesorio;

    constructor(codigo, marca, modelo, numeroSerie, tipoAccesorio) {
        if (new.target === Accesorio) {
            throw new Error("No se puede instanciar directamente la clase abstracta Accesorio.");
        }
        super(codigo, marca, modelo, numeroSerie);
        this.#tipoAccesorio = tipoAccesorio || 'Accesorio';
    }

    getTipoAccesorio() {
        return this.#tipoAccesorio;
    }

    getTipoDescripcion() {
        return this.#tipoAccesorio;
    }
}

/**
 * Periférico concreto (Auricular, Mouse, Teclado, Adaptador Wi-Fi, Monitor Solo, etc.)
 */
class Periferico extends Accesorio {
    constructor(codigo, marca, modelo, numeroSerie, tipoAccesorio, notaAdicional = '') {
        super(codigo, marca, modelo, numeroSerie, tipoAccesorio);
        this.setNotaAdicional(notaAdicional);
    }

    getEspecificaciones() {
        return [
            ['Tipo', this.getTipoAccesorio()],
            ['Marca', this.getMarca()],
            ['Modelo', this.getModelo()],
            ['N° Serie', this.getNumeroSerie() !== '—' && this.getNumeroSerie() !== '' ? this.getNumeroSerie() : '—'],
            ['Estado', this.getEstado()],
            ['Código', this.getCodigo()]
        ];
    }
}

// ── JERARQUÍA DE REMITOS ─────────────────────────────────────────────────────

/**
 * Clase base abstracta Remito.
 */
class Remito {
    #idDocumento;
    #fecha;
    #sucursal;
    #asignadoA;
    #areaEquipo;
    #email;
    #observaciones;
    #notaAdicional;
    #componentesAdicionales;

    /**
     * @param {string} idDocumento 
     * @param {string} fecha 
     * @param {Sucursal} sucursal 
     */
    constructor(idDocumento, fecha, sucursal) {
        if (new.target === Remito) {
            throw new Error("No se puede instanciar directamente la clase abstracta Remito.");
        }
        this.#idDocumento = idDocumento || 'REM-S/N';
        this.#fecha = fecha || new Date().toLocaleDateString('es-AR');
        this.#sucursal = sucursal;
        this.#asignadoA = '—';
        this.#areaEquipo = '—';
        this.#email = '—';
        this.#observaciones = '';
        this.#notaAdicional = '';
        this.#componentesAdicionales = [];
    }

    getIdDocumento() { return this.#idDocumento; }
    getFecha() { return this.#fecha; }
    getSucursal() { return this.#sucursal; }

    getAsignadoA() { return this.#asignadoA; }
    setAsignadoA(asignadoA) { this.#asignadoA = asignadoA || '—'; }

    getAreaEquipo() { return this.#areaEquipo; }
    setAreaEquipo(areaEquipo) { this.#areaEquipo = areaEquipo || '—'; }

    getEmail() { return this.#email; }
    setEmail(email) { this.#email = email || '—'; }

    getObservaciones() { return this.#observaciones; }
    setObservaciones(observaciones) { this.#observaciones = observaciones || ''; }

    getNotaAdicional() { return this.#notaAdicional; }
    setNotaAdicional(nota) { this.#notaAdicional = nota || ''; }

    getComponentesAdicionales() { return [...this.#componentesAdicionales]; }
    agregarComponenteAdicional(equipamiento) {
        if (equipamiento && equipamiento instanceof Equipamiento) {
            this.#componentesAdicionales.push(equipamiento);
        }
    }
    setComponentesAdicionales(lista) {
        this.#componentesAdicionales = Array.isArray(lista) ? [...lista] : [];
    }

    /**
     * @abstract
     * @returns {string}
     */
    getTipoRemito() {
        throw new Error("El método getTipoRemito() debe ser implementado por la subclase.");
    }
}

/**
 * Remito para combinación de Computadora + Monitor
 */
class RemitoPcMonitor extends Remito {
    #computadora;
    #monitor;

    /**
     * @param {string} idDocumento 
     * @param {string} fecha 
     * @param {Sucursal} sucursal 
     * @param {Computadora} computadora 
     * @param {Monitor} monitor 
     */
    constructor(idDocumento, fecha, sucursal, computadora, monitor) {
        super(idDocumento, fecha, sucursal);
        this.#computadora = computadora;
        this.#monitor = monitor;
    }

    getComputadora() { return this.#computadora; }
    getMonitor() { return this.#monitor; }

    getTipoRemito() {
        return "PC + Monitor";
    }
}

/**
 * Remito para un único equipamiento estándar (Notebook, Celular, Accesorio/Periférico)
 */
class RemitoEquipamientoEstandar extends Remito {
    #equipamiento;

    /**
     * @param {string} idDocumento 
     * @param {string} fecha 
     * @param {Sucursal} sucursal 
     * @param {Equipamiento} equipamiento 
     */
    constructor(idDocumento, fecha, sucursal, equipamiento) {
        super(idDocumento, fecha, sucursal);
        this.#equipamiento = equipamiento;
    }

    getEquipamiento() {
        return this.#equipamiento;
    }

    getTipoRemito() {
        return this.#equipamiento ? this.#equipamiento.getTipoDescripcion() : "Equipamiento Estándar";
    }
}

/**
 * Remito para traslado de equipamiento entre dos personas/áreas
 */
class RemitoTraslado extends Remito {
    #equipamiento;
    #personaEntrega;
    #areaEntrega;
    #personaRecibe;
    #areaRecibe;

    /**
     * @param {string} idDocumento 
     * @param {string} fecha 
     * @param {Sucursal} sucursal 
     * @param {Equipamiento} equipamiento 
     */
    constructor(idDocumento, fecha, sucursal, equipamiento) {
        super(idDocumento, fecha, sucursal);
        this.#equipamiento = equipamiento;
        this.#personaEntrega = '—';
        this.#areaEntrega = '—';
        this.#personaRecibe = '—';
        this.#areaRecibe = '—';
    }

    getEquipamiento() { return this.#equipamiento; }

    getPersonaEntrega() { return this.#personaEntrega; }
    setPersonaEntrega(persona) { this.#personaEntrega = persona || '—'; }

    getAreaEntrega() { return this.#areaEntrega; }
    setAreaEntrega(area) { this.#areaEntrega = area || '—'; }

    getPersonaRecibe() { return this.#personaRecibe; }
    setPersonaRecibe(persona) { this.#personaRecibe = persona || '—'; }

    getAreaRecibe() { return this.#areaRecibe; }
    setAreaRecibe(area) { this.#areaRecibe = area || '—'; }

    getTipoRemito() {
        return "Traslado";
    }
}

/**
 * Remito para devolución o baja de un equipamiento
 */
class RemitoBaja extends Remito {
    #equipamiento;
    #personaDevuelve;
    #motivoBaja;

    /**
     * @param {string} idDocumento 
     * @param {string} fecha 
     * @param {Sucursal} sucursal 
     * @param {Equipamiento} equipamiento 
     * @param {string} motivoBaja 
     */
    constructor(idDocumento, fecha, sucursal, equipamiento, motivoBaja) {
        super(idDocumento, fecha, sucursal);
        this.#equipamiento = equipamiento;
        this.#motivoBaja = motivoBaja || 'Fin de vida útil / Reemplazo';
        this.#personaDevuelve = '—';
    }

    getEquipamiento() { return this.#equipamiento; }
    getMotivoBaja() { return this.#motivoBaja; }

    getPersonaDevuelve() { return this.#personaDevuelve; }
    setPersonaDevuelve(persona) { this.#personaDevuelve = persona || '—'; }

    getTipoRemito() {
        return "Baja";
    }
}

// ── ENTIDADES DE CATÁLOGOS Y PLANTILLAS DINÁMICAS ────────────────────────────

/**
 * Sector o Área organizacional
 */
class Sector {
    #id;
    #nombre;
    #orden;

    constructor(id, nombre, orden = 0) {
        this.#id = id !== undefined && id !== null && id !== '' ? Number(id) : null;
        this.#nombre = String(nombre || '').trim();
        this.#orden = Number(orden) || 0;
    }

    getId() { return this.#id; }
    getNombre() { return this.#nombre; }
    getOrden() { return this.#orden; }
    get id() { return this.#id; }
    get nombre() { return this.#nombre; }
    get orden() { return this.#orden; }

    toJSON() {
        return {
            id: this.#id,
            nombre: this.#nombre,
            orden: this.#orden
        };
    }
}

/**
 * Tipo de componente configurable (Computadora, Monitor, Chip SIM, etc.)
 */
class TipoComponente {
    #id;
    #slug;
    #nombre;
    #tieneCodigo;
    #sigla;
    #esSistema;

    constructor(id, nombre, tieneCodigo = true, sigla = '', esSistema = false, slug = '') {
        this.#id = id !== undefined && id !== null && id !== '' ? Number(id) : null;
        this.#slug = String(slug || '').trim();
        this.#nombre = String(nombre || '').trim();
        this.#tieneCodigo = Boolean(tieneCodigo);
        this.#sigla = this.#tieneCodigo ? String(sigla || '').trim().toUpperCase() : '';
        this.#esSistema = Boolean(esSistema);
    }

    getId() { return this.#id; }
    getSlug() { return this.#slug; }
    getNombre() { return this.#nombre; }
    tieneCodigo() { return this.#tieneCodigo; }
    getSigla() { return this.#sigla; }
    esSistema() { return this.#esSistema; }

    get id() { return this.#id; }
    get slug() { return this.#slug; }
    get nombre() { return this.#nombre; }
    get tiene_codigo() { return this.#tieneCodigo; }
    get sigla() { return this.#sigla; }
    get es_sistema() { return this.#esSistema; }

    toJSON() {
        return {
            id: this.#id,
            slug: this.#slug,
            nombre: this.#nombre,
            tiene_codigo: this.#tieneCodigo,
            sigla: this.#sigla,
            es_sistema: this.#esSistema
        };
    }
}

/**
 * Plantilla configurable de Remito / Componente Adicional
 */
class PlantillaRemito {
    constructor(data = {}) {
        this.id = data.id !== undefined && data.id !== null && data.id !== '' ? Number(data.id) : null;
        this.slug = String(data.slug || '').trim();
        this.nombre = String(data.nombre || '').trim();
        this.orden = Number(data.orden ?? 100);
        this.tipo_componente_id = data.tipo_componente_id !== undefined && data.tipo_componente_id !== null && data.tipo_componente_id !== ''
            ? Number(data.tipo_componente_id)
            : null;
        this.tipo_flujo = data.tipo_flujo || 'entrega'; // 'entrega' | 'traslado' | 'baja'
        this.usar_como_remito = data.usar_como_remito !== undefined ? Boolean(data.usar_como_remito) : true;
        this.usar_como_adicional = Boolean(data.usar_como_adicional);
        this.tiene_codigo = data.tiene_codigo !== undefined ? Boolean(data.tiene_codigo) : true;
        this.sigla_codigo = this.tiene_codigo ? String(data.sigla_codigo || '').trim().toUpperCase() : '';
        this.es_sistema = Boolean(data.es_sistema);
        this.config = this.#normalizarConfig(data.config || {});
    }

    #normalizarConfig(cfg) {
        const secciones = Array.isArray(cfg.secciones)
            ? cfg.secciones.map((sec, idx) => ({
                id: sec.id || `sec_${idx + 1}`,
                titulo: sec.titulo || (this.nombre ? this.nombre.toUpperCase() : 'DISPOSITIVO'),
                tieneCodigo: sec.tieneCodigo !== undefined ? Boolean(sec.tieneCodigo) : (idx === 0 ? this.tiene_codigo : false),
                sigla: String(sec.sigla ?? (idx === 0 ? this.sigla_codigo : '')).trim().toUpperCase(),
                codigoFieldId: sec.codigoFieldId || (idx === 0 ? 'cod' : `cod_${idx + 1}`),
                codigoLabel: sec.codigoLabel || 'Código',
                opcional: Boolean(sec.opcional),
                campos: Array.isArray(sec.campos)
                    ? sec.campos.map((c, cIdx) => ({
                        id: c.id || `campo_${idx}_${cIdx}`,
                        label: c.label || 'Campo',
                        labelForm: c.labelForm || '',
                        tipoControl: c.tipoControl || 'texto', // 'texto' | 'textarea' | 'select' | 'fecha' | 'area' | 'fijo'
                        placeholder: c.placeholder || '',
                        valorDefecto: c.valorDefecto ?? '',
                        fallbackTabla: c.fallbackTabla ?? '',
                        opciones: Array.isArray(c.opciones) ? c.opciones : [],
                        enTabla: c.enTabla !== undefined ? Boolean(c.enTabla) : true
                    }))
                    : []
            }))
            : [];

        return {
            bannerTitulo: cfg.bannerTitulo || (
                this.tipo_flujo === 'traslado'
                    ? 'REMITO DE TRASLADO DE DISPOSITIVO'
                    : this.tipo_flujo === 'baja'
                        ? 'REMITO DE DEVOLUCIÓN / BAJA DE DISPOSITIVO'
                        : 'RECIBO DE ENTREGA DE DISPOSITIVOS'
            ),
            colorTema: cfg.colorTema || (
                this.tipo_flujo === 'traslado' ? 'naranja'
                    : this.tipo_flujo === 'baja' ? 'rojo' : 'azul'
            ),
            subtituloHeader: cfg.subtituloHeader || '',
            prefijoPdf: cfg.prefijoPdf || (
                this.tipo_flujo === 'traslado' ? 'Recibo_Traslado'
                    : this.tipo_flujo === 'baja' ? 'Recibo_Baja' : 'Recibo'
            ),
            sincronizarCodigos: Boolean(cfg.sincronizarCodigos),
            incluirDatosAsignacion: cfg.incluirDatosAsignacion !== undefined
                ? Boolean(cfg.incluirDatosAsignacion)
                : (this.tipo_flujo === 'entrega'),
            mostrarEmailAsignacion: cfg.mostrarEmailAsignacion !== undefined
                ? Boolean(cfg.mostrarEmailAsignacion)
                : false,
            incluirNotaAdicional: cfg.incluirNotaAdicional !== undefined
                ? Boolean(cfg.incluirNotaAdicional)
                : (this.tipo_flujo === 'entrega'),
            notaPlaceholder: cfg.notaPlaceholder || 'Ejemplo: Observaciones adicionales...',
            textoConformidad: cfg.textoConformidad ?? '',
            secciones
        };
    }

    getSeccionPrincipal() {
        return this.config.secciones[0] || null;
    }

    toJSON() {
        return {
            id: this.id,
            slug: this.slug,
            nombre: this.nombre,
            orden: this.orden,
            tipo_componente_id: this.tipo_componente_id,
            tipo_flujo: this.tipo_flujo,
            usar_como_remito: this.usar_como_remito,
            usar_como_adicional: this.usar_como_adicional,
            tiene_codigo: this.tiene_codigo,
            sigla_codigo: this.sigla_codigo,
            es_sistema: this.es_sistema,
            config: JSON.parse(JSON.stringify(this.config))
        };
    }
}

/**
 * Equipamiento dinámico definido por una plantilla (puede tener o no código,
 * y sus especificaciones provienen directamente de la definición de la plantilla).
 */
class EquipamientoDinamico extends Equipamiento {
    #tipoDescripcion;
    #tieneCodigo;
    #especificaciones;

    constructor({ codigo = '', tieneCodigo = true, tipoDescripcion = 'Componente', especificaciones = [], notaAdicional = '' } = {}) {
        super(tieneCodigo ? (codigo || '—') : '', '—', '—', '—', notaAdicional);
        this.#tipoDescripcion = tipoDescripcion || 'Componente';
        this.#tieneCodigo = Boolean(tieneCodigo);
        this.#especificaciones = Array.isArray(especificaciones) ? especificaciones : [];
    }

    tieneCodigo() {
        return this.#tieneCodigo;
    }

    getTipoDescripcion() {
        return this.#tipoDescripcion;
    }

    getEspecificaciones() {
        return this.#especificaciones.map(par => [par[0], par[1]]);
    }
}

/**
 * Remito dinámico impulsado por una PlantillaRemito almacenada en la base de datos.
 */
class RemitoDinamico extends Remito {
    #plantilla;
    #valores;
    #seccionesResueltas;
    #personaEntrega;
    #areaEntrega;
    #personaRecibe;
    #areaRecibe;
    #personaDevuelve;

    constructor(idDocumento, fecha, sucursal, plantilla, valores = {}, seccionesResueltas = []) {
        super(idDocumento, fecha, sucursal);
        this.#plantilla = plantilla;
        this.#valores = { ...valores };
        this.#seccionesResueltas = Array.isArray(seccionesResueltas) ? seccionesResueltas : [];
        this.#personaEntrega = '';
        this.#areaEntrega = '—';
        this.#personaRecibe = '';
        this.#areaRecibe = '—';
        this.#personaDevuelve = '';
    }

    getPlantilla() { return this.#plantilla; }
    getValores() { return { ...this.#valores }; }
    getValor(campoId, fallback = '—') {
        const val = this.#valores[campoId];
        return (val !== undefined && val !== null && String(val).trim() !== '') ? val : fallback;
    }
    getSeccionesResueltas() { return [...this.#seccionesResueltas]; }

    getPersonaEntrega() { return this.#personaEntrega; }
    setPersonaEntrega(p) { this.#personaEntrega = p || ''; }
    getAreaEntrega() { return this.#areaEntrega; }
    setAreaEntrega(a) { this.#areaEntrega = a || '—'; }
    getPersonaRecibe() { return this.#personaRecibe; }
    setPersonaRecibe(p) { this.#personaRecibe = p || ''; }
    getAreaRecibe() { return this.#areaRecibe; }
    setAreaRecibe(a) { this.#areaRecibe = a || '—'; }
    getPersonaDevuelve() { return this.#personaDevuelve; }
    setPersonaDevuelve(p) { this.#personaDevuelve = p || ''; }

    getTipoRemito() {
        return this.#plantilla ? this.#plantilla.nombre : 'Remito';
    }
}
