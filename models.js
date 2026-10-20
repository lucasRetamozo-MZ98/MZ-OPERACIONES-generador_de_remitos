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
    #nombre;

    /**
     * @param {number} id Código o ID de la sucursal
     * @param {string} nombre Nombre de la sucursal
     */
    constructor(id, nombre) {
        this.#id = Number(id);
        this.#nombre = nombre;
    }

    getId() {
        return this.#id;
    }

    getCodigo() {
        return this.#id;
    }

    get id() {
        return this.#id;
    }

    get codigo() {
        return this.#id;
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

    /**
     * @param {string} codigo 
     * @param {string} marca 
     * @param {string} modelo 
     * @param {string} numeroSerie 
     */
    constructor(codigo, marca, modelo, numeroSerie) {
        if (new.target === Equipamiento) {
            throw new Error("No se puede instanciar directamente la clase abstracta Equipamiento.");
        }
        this.#codigo = codigo || '—';
        this.#marca = marca || '—';
        this.#modelo = modelo || '—';
        this.#numeroSerie = numeroSerie || 'N/A';
        this.#estado = 'Asignado';
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
    #notaAdicional;

    constructor(codigo, marca, modelo, numeroSerie, tipoAccesorio, notaAdicional = '') {
        super(codigo, marca, modelo, numeroSerie, tipoAccesorio);
        this.#notaAdicional = notaAdicional;
    }

    getNotaAdicional() {
        return this.#notaAdicional;
    }

    getEspecificaciones() {
        return [
            ['Tipo', this.getTipoAccesorio()],
            ['Marca', this.getMarca()],
            ['Modelo', this.getModelo()],
            ['N° Serie', this.getNumeroSerie() !== '—' && this.getNumeroSerie() !== '' ? this.getNumeroSerie() : '—'],
            ['Estado', this.getEstado()],
            ['', '']
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
