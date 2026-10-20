/**
 * SERVICIOS Y REPOSITORIOS — MOTOZUNI S.A.
 * Implementación de IRepositorioSucursal e IRemitoRenderService (SOLID / POO)
 */

// ── REPOSITORIO DE SUCURSALES ────────────────────────────────────────────────

/**
 * Tabla oficial de sucursales con su respectivo código/ID según la imagen provista
 */
const SUCURSALES_DATOS = [
    { id: 0, nombre: "CENTRAL" },
    { id: 10, nombre: "DOMINICO" },
    { id: 11, nombre: "LANUS" },
    { id: 12, nombre: "MONTE GRANDE" },
    { id: 13, nombre: "SAN JUSTO" },
    { id: 14, nombre: "LUIS GUILON" },
    { id: 15, nombre: "CABA 1" },
    { id: 16, nombre: "LOMAS DE ZAMORA" },
    { id: 17, nombre: "QUILMES" },
    { id: 19, nombre: "LANUS 2" },
    { id: 20, nombre: "LUIS GUILLON 2" },
    { id: 21, nombre: "CABA2" },
    { id: 22, nombre: "SAN FERNANDO" },
    { id: 23, nombre: "SAN MARTIN" },
    { id: 24, nombre: "LA PLATA" },
    { id: 25, nombre: "QUILMES 2" },
    { id: 27, nombre: "VICENTE LOPEZ" },
    { id: 28, nombre: "SARANDI" },
    { id: 29, nombre: "BENAVIDEZ" },
    { id: 30, nombre: "CAMPANA" },
    { id: 31, nombre: "SAN MIGUEL" },
    { id: 32, nombre: "MORON" }
];

/**
 * Interfaz para el repositorio de sucursales (Principio de Segregación de Interfaces / DIP)
 */
class IRepositorioSucursal {
    /**
     * @returns {Array<Sucursal>}
     */
    obtenerTodas() {
        throw new Error("Método abstracto 'obtenerTodas' debe ser implementado.");
    }

    /**
     * @param {number} codigo 
     * @returns {Sucursal|null}
     */
    buscarPorCodigo(codigo) {
        throw new Error("Método abstracto 'buscarPorCodigo' debe ser implementado.");
    }
}

/**
 * Implementación en memoria del repositorio de sucursales
 */
class RepositorioSucursalMemoria extends IRepositorioSucursal {
    #sucursales = [];

    constructor(lista = SUCURSALES_DATOS) {
        super();
        this.#sucursales = lista.map(item => {
            if (item instanceof Sucursal) return item;
            return new Sucursal(item.id, item.nombre);
        });
    }

    obtenerTodas() {
        return [...this.#sucursales];
    }

    buscarPorCodigo(codigo) {
        const cod = Number(codigo);
        return this.#sucursales.find(s => s.getId() === cod) || null;
    }

    buscarPorNombre(nombre) {
        if (!nombre) return null;
        const norm = String(nombre).toUpperCase().trim();
        return this.#sucursales.find(s => 
            s.getNombreCompleto().toUpperCase() === norm || 
            s.getNombre().toUpperCase() === norm.replace(/^MOTOZUNI\s+S\.?\s*A\.?\s*/i, '').trim()
        ) || null;
    }
}

// ── SERVICIO DE RENDERIZADO HTML DE REMITOS ──────────────────────────────────

/**
 * Interfaz para el servicio de renderizado de remitos (DIP / OCP)
 */
class IRemitoRenderService {
    /**
     * @param {Remito} remito 
     * @returns {string} Código HTML del remito
     */
    renderizarHTML(remito) {
        throw new Error("Método abstracto 'renderizarHTML' debe ser implementado.");
    }
}

/**
 * Implementación que genera la vista previa y formato imprimible para hoja A4
 */
class RemitoHtmlRenderService extends IRemitoRenderService {

    renderizarHTML(remito) {
        if (!remito || !(remito instanceof Remito)) {
            return '<div class="banner">Error: Remito inválido o no especificado.</div>';
        }

        const headerHtml = this.renderHeader(remito);
        const datosHtml = this.renderTablaDatos(remito);
        const conformidadHtml = this.renderBloqueConformidad(remito);
        const firmasHtml = this.renderBloqueFirmas(remito);

        return `
            <div>
                ${headerHtml}
                ${datosHtml}
                ${conformidadHtml}
                ${firmasHtml}
            </div>
        `;
    }

    /**
     * Devuelve el valor textual o una línea punteada si el campo está vacío para llenarlo a mano
     * @param {string} valor 
     * @param {'normal'|'fecha'|'nombre'|'tabla'} tipo 
     * @returns {string}
     */
    formatearTextoOLineaPunteada(valor, tipo = 'normal') {
        if (valor && valor !== '—' && String(valor).trim() !== '') {
            return valor;
        }
        if (tipo === 'fecha') {
            return '<span class="linea-punteada linea-punteada-fecha"></span>';
        }
        if (tipo === 'nombre') {
            return '<span class="linea-punteada linea-punteada-nombre"></span>';
        }
        if (tipo === 'tabla') {
            return '<span class="linea-punteada linea-punteada-tabla"></span>';
        }
        return '<span class="linea-punteada"></span>';
    }

    renderHeader(remito) {
        const sucursalNombre = remito.getSucursal() 
            ? remito.getSucursal().getNombreCompleto() 
            : 'MOTOZUNI S.A.';

        let tituloDer = remito.getIdDocumento();
        let subtituloDer = remito.getTipoRemito();
        let colorTema = 'var(--cp)';
        let colorSub = 'var(--cs)';

        if (remito instanceof RemitoPcMonitor) {
            const pc = remito.getComputadora();
            const mo = remito.getMonitor();
            tituloDer = `${pc.getCodigo()} + ${mo.getCodigo()}`;
            subtituloDer = 'Computadora + Monitor';
        } else if (remito instanceof RemitoTraslado) {
            tituloDer = 'TRASLADO';
            subtituloDer = `${remito.getPersonaEntrega()} → ${remito.getPersonaRecibe()}`;
            colorTema = 'var(--naranja)';
            colorSub = 'var(--naranja)';
        } else if (remito instanceof RemitoBaja) {
            const eq = remito.getEquipamiento();
            tituloDer = eq ? eq.getCodigo() : remito.getIdDocumento();
            subtituloDer = 'BAJA / DEVOLUCIÓN';
            colorTema = 'var(--rojo)';
            colorSub = 'var(--rojo)';
        } else if (remito instanceof RemitoEquipamientoEstandar) {
            const eq = remito.getEquipamiento();
            if (eq instanceof Celular) {
                tituloDer = eq.getCodigo();
                subtituloDer = `Celular ${eq.getMarca()} ${eq.getModelo()}`;
            } else if (eq instanceof Notebook) {
                tituloDer = eq.getCodigo();
                subtituloDer = `Notebook ${eq.getMarca()} ${eq.getModelo()}`;
            } else if (eq instanceof Periferico || eq instanceof Accesorio) {
                const sn = eq.getNumeroSerie();
                tituloDer = (sn && sn !== '—' && sn !== 'N/A') ? sn : eq.getTipoDescripcion();
                subtituloDer = `${eq.getTipoDescripcion()} — ${eq.getMarca()} ${eq.getModelo()}`;
            } else if (eq) {
                tituloDer = eq.getCodigo();
                subtituloDer = `${eq.getTipoDescripcion()} ${eq.getMarca()} ${eq.getModelo()}`;
            }
        }

        return `
            <table class="header-table">
                <tr>
                    <td>
                        <div class="header-title-left">MOTOZUNI S.A.</div>
                        <div class="header-sub-left">Sistema de Gestión de Dispositivos</div>
                        <div class="header-sub-left">${sucursalNombre}</div>
                    </td>
                    <td>
                        <div class="header-title-right" style="color: ${colorTema};">${tituloDer}</div>
                        <div class="header-sub-right" style="color: ${colorSub};">${subtituloDer}</div>
                    </td>
                </tr>
            </table>
            <div class="divider-hr" style="background-color: ${colorTema};"></div>
        `;
    }

    renderTablaDatos(remito) {
        if (remito instanceof RemitoTraslado) {
            return this.#renderDatosTraslado(remito);
        } else if (remito instanceof RemitoBaja) {
            return this.#renderDatosBaja(remito);
        } else if (remito instanceof RemitoPcMonitor) {
            return this.#renderDatosPcMonitor(remito);
        } else if (remito instanceof RemitoEquipamientoEstandar) {
            return this.#renderDatosEquipamientoEstandar(remito);
        }
        return '';
    }

    #renderDatosPcMonitor(remito) {
        const pc = remito.getComputadora();
        const mo = remito.getMonitor();
        const suc = remito.getSucursal() ? remito.getSucursal().getNombreCompleto() : '—';

        const datosAsignacion = [
            ['Asignado a', this.formatearTextoOLineaPunteada(remito.getAsignadoA(), 'tabla')],
            ['Área / Equipo', remito.getAreaEquipo()],
            ['Email', remito.getEmail()],
            ['Sucursal', suc],
            ['Fecha asignación', this.formatearTextoOLineaPunteada(remito.getFecha(), 'fecha')],
            ['', '']
        ];

        return `
            <div class="banner">RECIBO DE ENTREGA DE DISPOSITIVOS</div>

            <div class="sec-header">DATOS DE ASIGNACIÓN</div>
            ${this.renderTablaEspecificaciones(datosAsignacion)}

            <div class="sec-header">COMPUTADORA — ${pc.getCodigo()}</div>
            ${this.renderTablaEspecificaciones(pc.getEspecificaciones())}

            <div class="sec-header">MONITOR — ${mo.getCodigo()}</div>
            ${this.renderTablaEspecificaciones(mo.getEspecificaciones())}
        `;
    }

    #renderDatosEquipamientoEstandar(remito) {
        const eq = remito.getEquipamiento();
        const suc = remito.getSucursal() ? remito.getSucursal().getNombreCompleto() : '—';

        const datosAsignacion = [
            ['Asignado a', this.formatearTextoOLineaPunteada(remito.getAsignadoA(), 'tabla')],
            ['Área / Equipo', remito.getAreaEquipo()],
            ['Email', remito.getEmail()],
            ['Sucursal', suc],
            ['Fecha asignación', this.formatearTextoOLineaPunteada(remito.getFecha(), 'fecha')],
            ['', '']
        ];

        let htmlExtra = '';
        if (eq instanceof Celular && eq.getLineaSim() && eq.getLineaSim().getNumeroLinea() !== '—') {
            htmlExtra += `
                <div class="sec-header">CHIP SIM</div>
                ${this.renderTablaEspecificaciones(eq.getLineaSim().getEspecificaciones())}
            `;
        }

        let notaExtra = '';
        if (eq instanceof Periferico && eq.getNotaAdicional() && eq.getNotaAdicional() !== '—') {
            notaExtra = `<div style="font-size:7pt; color:var(--csu); margin-top:4px;">* ${eq.getNotaAdicional()}</div>`;
        }

        const tituloSeccion = eq ? `${eq.getTipoDescripcion().toUpperCase()} — ${eq.getCodigo()}` : 'DISPOSITIVO';

        return `
            <div class="banner">RECIBO DE ENTREGA DE DISPOSITIVOS</div>

            <div class="sec-header">DATOS DE ASIGNACIÓN</div>
            ${this.renderTablaEspecificaciones(datosAsignacion)}

            <div class="sec-header">${tituloSeccion}</div>
            ${this.renderTablaEspecificaciones(eq ? eq.getEspecificaciones() : [])}
            ${notaExtra}
            ${htmlExtra}
        `;
    }

    #renderDatosTraslado(remito) {
        const eq = remito.getEquipamiento();
        const fechaHtml = this.formatearTextoOLineaPunteada(remito.getFecha(), 'fecha');
        const nom1Html = this.formatearTextoOLineaPunteada(remito.getPersonaEntrega(), 'nombre');
        const nom2Html = this.formatearTextoOLineaPunteada(remito.getPersonaRecibe(), 'nombre');

        const datosDispositivo = [
            ['Tipo', eq ? eq.getTipoDescripcion() : 'Dispositivo'],
            ['Marca', eq ? eq.getMarca() : '—'],
            ['Modelo', eq ? eq.getModelo() : '—'],
            ['N° Serie', eq ? eq.getNumeroSerie() : '—'],
            ['Código', eq ? eq.getCodigo() : remito.getIdDocumento()],
            ['Fecha traslado', fechaHtml]
        ];

        return `
            <div class="banner" style="background-color: var(--naranja);">REMITO DE TRASLADO DE DISPOSITIVO</div>

            <div class="sec-header" style="background-color: var(--naranja);">DISPOSITIVO</div>
            ${this.renderTablaEspecificaciones(datosDispositivo)}

            <div class="sec-header" style="background-color: var(--rojo);">ENTREGA</div>
            <div class="conf-text">
                Yo, <b>${nom1Html}</b>, con fecha <b>${fechaHtml}</b>, declaro haber entregado la 
                <b>${eq ? eq.getTipoDescripcion() : ''} ${eq ? eq.getMarca() : ''} ${eq ? eq.getModelo() : ''}</b> 
                (Cód: <b>${eq ? eq.getCodigo() : remito.getIdDocumento()}</b>).
            </div>
            <div style="font-weight: bold; font-size: 7.5pt; color: var(--csu); margin-top: 5px;">
                ${remito.getPersonaEntrega()} — ${remito.getAreaEntrega()}
            </div>
            <table class="signatures-table" style="margin-top: 15px; margin-bottom: 5px;">
                <tr>
                    <td><div class="sig-line"></div><div class="sig-label">Firma</div></td>
                    <td><div class="sig-line"></div><div class="sig-label">Aclaración</div></td>
                    <td><div class="sig-line"></div><div class="sig-label">Fecha</div></td>
                </tr>
            </table>

            <div class="sec-header" style="background-color: var(--verde); margin-top: 15px;">RECEPCIÓN</div>
            <div class="conf-text">
                Yo, <b>${nom2Html}</b>, con fecha <b>${fechaHtml}</b>, declaro haber recibido la 
                <b>${eq ? eq.getTipoDescripcion() : ''} ${eq ? eq.getMarca() : ''} ${eq ? eq.getModelo() : ''}</b> 
                (Cód: <b>${eq ? eq.getCodigo() : remito.getIdDocumento()}</b>), comprometiéndome a hacer un uso responsable de la misma.
            </div>
            <div style="font-weight: bold; font-size: 7.5pt; color: var(--csu); margin-top: 5px;">
                ${remito.getPersonaRecibe()} — ${remito.getAreaRecibe()}
            </div>
            <table class="signatures-table" style="margin-top: 15px; margin-bottom: 5px;">
                <tr>
                    <td><div class="sig-line"></div><div class="sig-label">Firma</div></td>
                    <td><div class="sig-line"></div><div class="sig-label">Aclaración</div></td>
                    <td><div class="sig-line"></div><div class="sig-label">Fecha</div></td>
                </tr>
            </table>
        `;
    }

    #renderDatosBaja(remito) {
        const eq = remito.getEquipamiento();
        const suc = remito.getSucursal() ? remito.getSucursal().getNombreCompleto() : '—';
        const cod = eq ? eq.getCodigo() : remito.getIdDocumento();
        const nomHtml = this.formatearTextoOLineaPunteada(remito.getPersonaDevuelve(), 'tabla');
        const fechaHtml = this.formatearTextoOLineaPunteada(remito.getFecha(), 'fecha');

        const datosResp = [
            ['Nombre', nomHtml],
            ['Área', remito.getAreaEquipo()],
            ['Sucursal', suc],
            ['Fecha devolución', fechaHtml]
        ];

        const datosDisp = [
            ['Código', cod], ['Tipo', eq ? eq.getTipoDescripcion() : 'Dispositivo'],
            ['Marca', eq ? eq.getMarca() : '—'], ['Modelo', eq ? eq.getModelo() : '—'],
            ['N° Serie', eq ? eq.getNumeroSerie() : '—'], ['Estado', 'Dado de baja'],
            ['Motivo', remito.getMotivoBaja()], ['', '']
        ];

        return `
            <div class="banner" style="background-color: var(--rojo);">REMITO DE DEVOLUCIÓN / BAJA DE DISPOSITIVO</div>

            <div class="sec-header" style="background-color: var(--rojo);">DATOS DEL RESPONSABLE</div>
            ${this.renderTablaEspecificaciones(datosResp)}

            <div class="sec-header" style="background-color: var(--rojo);">DISPOSITIVO — ${cod}</div>
            ${this.renderTablaEspecificaciones(datosDisp)}
        `;
    }

    renderBloqueConformidad(remito) {
        if (remito instanceof RemitoTraslado) {
            return '';
        }

        const fechaHtml = this.formatearTextoOLineaPunteada(remito.getFecha(), 'fecha');

        if (remito instanceof RemitoBaja) {
            const eq = remito.getEquipamiento();
            const nomHtml = this.formatearTextoOLineaPunteada(remito.getPersonaDevuelve(), 'nombre');
            const cod = eq ? eq.getCodigo() : remito.getIdDocumento();
            const desc = `${eq ? eq.getTipoDescripcion() : ''} ${eq ? eq.getMarca() : ''} ${eq ? eq.getModelo() : ''}`.trim();

            return `
                <div style="border-top: 1px solid var(--rojo); margin-top: 10px; padding-top: 5px;"></div>
                <div class="banner" style="background-color: var(--rojo);">DECLARACIÓN DE DEVOLUCIÓN</div>
                <div class="conf-text">
                    Yo, <b>${nomHtml}</b>, con fecha <b>${fechaHtml}</b>, declaro haber devuelto el dispositivo 
                    <b>${desc}</b> (Cód: <b>${cod}</b>) en las condiciones indicadas.
                </div>
            `;
        }

        const nomHtml = this.formatearTextoOLineaPunteada(remito.getAsignadoA(), 'nombre');
        let textoDeclaracion = '';

        if (remito instanceof RemitoPcMonitor) {
            const pc = remito.getComputadora();
            const mo = remito.getMonitor();
            textoDeclaracion = `
                Yo, <b>${nomHtml}</b>, con fecha <b>${fechaHtml}</b>, declaro haber recibido 
                <b>Computadora ${pc.getMarca()} ${pc.getModelo()}</b> (Cód: <b>${pc.getCodigo()}</b>) y 
                <b>Monitor ${mo.getMarca()} ${mo.getModelo()}</b> (Cód: <b>${mo.getCodigo()}</b>), en las condiciones descritas, 
                comprometiéndome a hacer un uso responsable del mismo.
            `;
        } else if (remito instanceof RemitoEquipamientoEstandar) {
            const eq = remito.getEquipamiento();
            if (eq instanceof Celular) {
                textoDeclaracion = `
                    Yo, <b>${nomHtml}</b>, con fecha <b>${fechaHtml}</b>, declaro haber recibido 
                    <b>Celular ${eq.getMarca()} ${eq.getModelo()}</b> (Cód: <b>${eq.getCodigo()}</b>, S/N: <b>${eq.getNumeroSerie()}</b>), 
                    en las condiciones descritas, comprometiéndome a hacer un uso responsable del mismo.
                `;
            } else if (eq instanceof Notebook) {
                textoDeclaracion = `
                    Yo, <b>${nomHtml}</b>, con fecha <b>${fechaHtml}</b>, declaro haber recibido 
                    <b>Notebook ${eq.getMarca()} ${eq.getModelo()}</b> (Cód: <b>${eq.getCodigo()}</b>), en las condiciones descritas, 
                    comprometiéndome a hacer un uso responsable del mismo.
                `;
            } else if (eq instanceof Periferico || eq instanceof Accesorio) {
                textoDeclaracion = `
                    Yo, <b>${nomHtml}</b>, con fecha <b>${fechaHtml}</b>, declaro haber recibido 
                    <b>${eq.getTipoDescripcion()} ${eq.getMarca()} ${eq.getModelo()}</b> (S/N: <b>${eq.getNumeroSerie()}</b>), 
                    en las condiciones descritas, comprometiéndome a hacer un uso responsable del mismo.
                `;
            } else {
                textoDeclaracion = `
                    Yo, <b>${nomHtml}</b>, con fecha <b>${fechaHtml}</b>, declaro haber recibido el dispositivo indicado,
                    en las condiciones descritas, comprometiéndome a hacer un uso responsable del mismo.
                `;
            }
        }

        return `
            <div style="border-top: 1px solid var(--cl); margin-top: 10px; padding-top: 5px;"></div>
            <div class="banner">RECIBIDO – CONFORMIDAD DE ENTREGA</div>
            <div class="conf-text">
                ${textoDeclaracion}
            </div>
        `;
    }

    renderBloqueFirmas(remito) {
        let footerId = remito.getIdDocumento();
        if (remito instanceof RemitoPcMonitor) {
            footerId = `${remito.getComputadora().getCodigo()} + ${remito.getMonitor().getCodigo()}`;
        } else if (remito instanceof RemitoBaja) {
            footerId = `BAJA ${remito.getEquipamiento() ? remito.getEquipamiento().getCodigo() : remito.getIdDocumento()}`;
        } else if (remito instanceof RemitoEquipamientoEstandar) {
            const eq = remito.getEquipamiento();
            if (eq instanceof Periferico || eq instanceof Accesorio) {
                footerId = remito.getSucursal() ? remito.getSucursal().getNombreCompleto() : 'MOTOZUNI S.A.';
            } else if (eq) {
                footerId = eq.getCodigo();
            }
        } else if (remito instanceof RemitoTraslado) {
            const eq = remito.getEquipamiento();
            footerId = eq ? eq.getCodigo() : remito.getIdDocumento();
        }

        const fechaFooter = (remito.getFecha() && remito.getFecha() !== '—') ? remito.getFecha() : '___/___/______';

        if (remito instanceof RemitoTraslado) {
            return `
                <div class="footer-text">
                    Documento generado automáticamente — MOTOZUNI S.A. | ${footerId} | ${fechaFooter}
                </div>
            `;
        }

        return `
            <table class="signatures-table">
                <tr>
                    <td><div class="sig-line"></div><div class="sig-label">Firma</div></td>
                    <td><div class="sig-line"></div><div class="sig-label">Aclaración</div></td>
                    <td><div class="sig-line"></div><div class="sig-label">Fecha de recibimiento</div></td>
                </tr>
            </table>
            <div class="footer-text">
                Documento generado automáticamente — MOTOZUNI S.A. | ${footerId} | ${fechaFooter}
            </div>
        `;
    }

    /**
     * Helper para renderizar tablas en pares de 2 columnas (etiqueta y valor)
     * @param {Array<[string, string]>} pares 
     * @returns {string}
     */
    renderTablaEspecificaciones(pares = []) {
        let rows = '';
        for (let i = 0; i < pares.length; i += 2) {
            const p1 = pares[i] || ['', ''];
            const p2 = pares[i + 1] || ['', ''];
            rows += `
                <tr>
                    <td class="lbl-col">${p1[0]}</td>
                    <td class="val-col">${p1[1] || '—'}</td>
                    <td class="lbl-col">${p2[0]}</td>
                    <td class="val-col">${p2[1] || '—'}</td>
                </tr>
            `;
        }
        return `<table class="remito-table">${rows}</table>`;
    }
}

// ── FACTORY PARA CREACIÓN POLIMÓRFICA DE REMITOS Y CAMPOS ────────────────────

/**
 * Factory que centraliza la definición de formularios y la instanciación de entidades.
 * Cumple con el Principio de Responsabilidad Única (SRP) y Abierto/Cerrado (OCP).
 */
class RemitoFactory {

    /**
     * Retorna los campos del formulario con su tipo de control (texto, area, codigo, fecha)
     * @param {string} tipo 
     * @param {string} todayFecha 
     * @param {number|string} sucursalCodigo Código de la sucursal activa
     * @returns {Array<{id: string, label: string, tipoControl: string, placeholder?: string, sigla?: string, def?: string}>}
     */
    static getCamposFormulario(tipo, todayFecha, sucursalCodigo = 28) {
        const suc = sucursalCodigo !== undefined && sucursalCodigo !== null ? sucursalCodigo : 28;

        switch (tipo) {
            case 'pc_monitor':
                return [
                    { id: 'cod_pc', label: 'Código PC', tipoControl: 'codigo', sigla: 'PC' },
                    { id: 'marca_pc', label: 'Marca PC', tipoControl: 'texto', placeholder: 'Ejemplo: MSI' },
                    { id: 'mod_pc', label: 'Modelo PC', tipoControl: 'texto', placeholder: 'Ejemplo: A520M-A PRO' },
                    { id: 'cpu', label: 'CPU', tipoControl: 'texto', placeholder: 'Ejemplo: AMD RYZEN 5 3400G' },
                    { id: 'ram', label: 'RAM (GB)', tipoControl: 'texto', placeholder: 'Ejemplo: 16' },
                    { id: 'disco', label: 'Almacenamiento (GB)', tipoControl: 'texto', placeholder: 'Ejemplo: 240' },
                    { id: 'so', label: 'S.O.', tipoControl: 'texto', placeholder: 'Ejemplo: Windows 10 Pro' },
                    { id: 'adapt', label: 'Adaptador de red', tipoControl: 'texto', placeholder: 'Ejemplo: TP-Link TL-WN8200ND' },
                    { id: 'comp', label: 'Componentes', tipoControl: 'texto', placeholder: 'Ejemplo: Teclado MK120, Mouse MK120' },
                    { id: 'cod_mo', label: 'Código Monitor', tipoControl: 'codigo', sigla: 'MO' },
                    { id: 'marca_mo', label: 'Marca Monitor', tipoControl: 'texto', placeholder: 'Ejemplo: Cooler Master' },
                    { id: 'mod_mo', label: 'Modelo Monitor', tipoControl: 'texto', placeholder: 'Ejemplo: GA241' },
                    { id: 'sn_mo', label: 'S/N Monitor', tipoControl: 'texto', placeholder: 'Ejemplo: 68606/66P700091' },
                    { id: 'nombre', label: 'Asignado a', tipoControl: 'texto', placeholder: 'Ejemplo: Mario Araujo' },
                    { id: 'area', label: 'Área / Equipo', tipoControl: 'area' },
                    { id: 'email', label: 'Email', tipoControl: 'texto', placeholder: 'Ejemplo: usuario@motozuni.com.ar' },
                    { id: 'fecha', label: 'Fecha', tipoControl: 'fecha', def: todayFecha, placeholder: `Ejemplo: ${todayFecha}` }
                ];

            case 'notebook':
                return [
                    { id: 'cod', label: 'Código NB', tipoControl: 'codigo', sigla: 'NB' },
                    { id: 'marca', label: 'Marca', tipoControl: 'texto', placeholder: 'Ejemplo: Lenovo' },
                    { id: 'modelo', label: 'Modelo', tipoControl: 'texto', placeholder: 'Ejemplo: ThinkPad E14' },
                    { id: 'sn', label: 'N° Serie', tipoControl: 'texto', placeholder: 'Ejemplo: PF-2X89A1' },
                    { id: 'cpu', label: 'CPU', tipoControl: 'texto', placeholder: 'Ejemplo: Intel Core i5-1135G7' },
                    { id: 'ram', label: 'RAM (GB)', tipoControl: 'texto', placeholder: 'Ejemplo: 16' },
                    { id: 'disco', label: 'Almacenamiento (GB)', tipoControl: 'texto', placeholder: 'Ejemplo: 256' },
                    { id: 'so', label: 'S.O.', tipoControl: 'texto', placeholder: 'Ejemplo: Windows 10 Pro' },
                    { id: 'cargador', label: 'Cargador', tipoControl: 'texto', placeholder: 'Ejemplo: Sí' },
                    { id: 'nombre', label: 'Asignado a', tipoControl: 'texto', placeholder: 'Ejemplo: Mario Araujo' },
                    { id: 'area', label: 'Área', tipoControl: 'area' },
                    { id: 'email', label: 'Email', tipoControl: 'texto', placeholder: 'Ejemplo: usuario@motozuni.com.ar' },
                    { id: 'fecha', label: 'Fecha', tipoControl: 'fecha', def: todayFecha, placeholder: `Ejemplo: ${todayFecha}` }
                ];

            case 'celular':
                return [
                    { id: 'cod', label: 'Código CE', tipoControl: 'codigo', sigla: 'CE' },
                    { id: 'marca', label: 'Marca', tipoControl: 'texto', placeholder: 'Ejemplo: Motorola' },
                    { id: 'modelo', label: 'Modelo', tipoControl: 'texto', placeholder: 'Ejemplo: Moto G54' },
                    { id: 'sn', label: 'N° Serie', tipoControl: 'texto', placeholder: 'Ejemplo: 68606/66P700091' },
                    { id: 'imei', label: 'IMEI', tipoControl: 'texto', placeholder: 'Ejemplo: 869286072510600' },
                    { id: 'cpu', label: 'CPU', tipoControl: 'texto', placeholder: 'Ejemplo: Snapdragon 685 4G Octa-core 2.80GHz' },
                    { id: 'ram', label: 'RAM (GB)', tipoControl: 'texto', placeholder: 'Ejemplo: 8' },
                    { id: 'disco', label: 'Almacenamiento (GB)', tipoControl: 'texto', placeholder: 'Ejemplo: 128' },
                    { id: 'chip', label: 'Línea / Chip SIM', tipoControl: 'texto', placeholder: 'Ejemplo: 1123456789' },
                    { id: 'iccid', label: 'ICCID', tipoControl: 'texto', placeholder: 'Ejemplo: 8954020000000000000' },
                    { id: 'nombre', label: 'Asignado a', tipoControl: 'texto', placeholder: 'Ejemplo: Mario Araujo' },
                    { id: 'area', label: 'Área', tipoControl: 'area' },
                    { id: 'email', label: 'Email', tipoControl: 'texto', placeholder: 'Ejemplo: logistica@motozuni.com.ar' },
                    { id: 'fecha', label: 'Fecha', tipoControl: 'fecha', def: todayFecha, placeholder: `Ejemplo: ${todayFecha}` }
                ];

            case 'traslado':
                return [
                    { id: 'nombre1', label: 'Nombre ENTREGA', tipoControl: 'texto', placeholder: 'Ejemplo: Juan Pérez' },
                    { id: 'rol1', label: 'Área ENTREGA', tipoControl: 'area' },
                    { id: 'nombre2', label: 'Nombre RECIBE', tipoControl: 'texto', placeholder: 'Ejemplo: Mario Araujo' },
                    { id: 'rol2', label: 'Área RECIBE', tipoControl: 'area' },
                    { id: 'tipo_disp', label: 'Tipo Dispositivo', tipoControl: 'texto', placeholder: 'Ejemplo: Notebook' },
                    { id: 'cod', label: 'Código Dispositivo', tipoControl: 'codigo', sigla: 'NB' },
                    { id: 'marca', label: 'Marca', tipoControl: 'texto', placeholder: 'Ejemplo: Lenovo' },
                    { id: 'modelo', label: 'Modelo', tipoControl: 'texto', placeholder: 'Ejemplo: ThinkPad E14' },
                    { id: 'sn', label: 'N° Serie', tipoControl: 'texto', placeholder: 'Ejemplo: N/A' },
                    { id: 'fecha', label: 'Fecha', tipoControl: 'fecha', def: todayFecha, placeholder: `Ejemplo: ${todayFecha}` }
                ];

            case 'baja':
                return [
                    { id: 'cod', label: 'Código Dispositivo', tipoControl: 'codigo', sigla: 'PC' },
                    { id: 'tipo_disp', label: 'Tipo', tipoControl: 'texto', placeholder: 'Ejemplo: Computadora' },
                    { id: 'marca', label: 'Marca', tipoControl: 'texto', placeholder: 'Ejemplo: MSI' },
                    { id: 'modelo', label: 'Modelo', tipoControl: 'texto', placeholder: 'Ejemplo: A520M-A PRO' },
                    { id: 'sn', label: 'N° Serie', tipoControl: 'texto', placeholder: 'Ejemplo: N/A' },
                    { id: 'nombre', label: 'Nombre Quien Devuelve', tipoControl: 'texto', placeholder: 'Ejemplo: Mario Araujo' },
                    { id: 'area', label: 'Área', tipoControl: 'area' },
                    { id: 'motivo', label: 'Motivo Baja', tipoControl: 'texto', placeholder: 'Ejemplo: Fin de vida útil / Reemplazo' },
                    { id: 'fecha', label: 'Fecha', tipoControl: 'fecha', def: todayFecha, placeholder: `Ejemplo: ${todayFecha}` }
                ];

            case 'auricular':
                return [
                    { id: 'tipo_name', label: 'Tipo Producto', tipoControl: 'texto', placeholder: 'Ejemplo: AURICULAR H151' },
                    { id: 'marca', label: 'Marca', tipoControl: 'texto', placeholder: 'Ejemplo: Logitech' },
                    { id: 'modelo', label: 'Modelo', tipoControl: 'texto', placeholder: 'Ejemplo: H151' },
                    { id: 'sn', label: 'N° Serie / Código', tipoControl: 'codigo', sigla: 'AU' },
                    { id: 'nombre', label: 'Asignado a', tipoControl: 'texto', placeholder: 'Ejemplo: Mario Araujo' },
                    { id: 'area', label: 'Área', tipoControl: 'area' },
                    { id: 'fecha', label: 'Fecha', tipoControl: 'fecha', def: todayFecha, placeholder: `Ejemplo: ${todayFecha}` },
                    { id: 'nota', label: 'Nota Adicional', tipoControl: 'texto', placeholder: 'Ejemplo: Conexión Jack 3.5mm con micrófono' }
                ];

            case 'mouse':
                return [
                    { id: 'tipo_name', label: 'Tipo Producto', tipoControl: 'texto', placeholder: 'Ejemplo: MOUSE' },
                    { id: 'marca', label: 'Marca', tipoControl: 'texto', placeholder: 'Ejemplo: Logitech' },
                    { id: 'modelo', label: 'Modelo', tipoControl: 'texto', placeholder: 'Ejemplo: M90' },
                    { id: 'sn', label: 'N° Serie / Código', tipoControl: 'codigo', sigla: 'MS' },
                    { id: 'nombre', label: 'Asignado a', tipoControl: 'texto', placeholder: 'Ejemplo: Mario Araujo' },
                    { id: 'area', label: 'Área', tipoControl: 'area' },
                    { id: 'fecha', label: 'Fecha', tipoControl: 'fecha', def: todayFecha, placeholder: `Ejemplo: ${todayFecha}` },
                    { id: 'nota', label: 'Nota Adicional', tipoControl: 'texto', placeholder: 'Ejemplo: Conexión USB óptico' }
                ];

            case 'teclado':
                return [
                    { id: 'tipo_name', label: 'Tipo Producto', tipoControl: 'texto', placeholder: 'Ejemplo: TECLADO' },
                    { id: 'marca', label: 'Marca', tipoControl: 'texto', placeholder: 'Ejemplo: Logitech' },
                    { id: 'modelo', label: 'Modelo', tipoControl: 'texto', placeholder: 'Ejemplo: K120' },
                    { id: 'sn', label: 'N° Serie / Código', tipoControl: 'codigo', sigla: 'TC' },
                    { id: 'nombre', label: 'Asignado a', tipoControl: 'texto', placeholder: 'Ejemplo: Mario Araujo' },
                    { id: 'area', label: 'Área', tipoControl: 'area' },
                    { id: 'fecha', label: 'Fecha', tipoControl: 'fecha', def: todayFecha, placeholder: `Ejemplo: ${todayFecha}` },
                    { id: 'nota', label: 'Nota Adicional', tipoControl: 'texto', placeholder: 'Ejemplo: Distribución español latinoamericano' }
                ];

            case 'wifi':
                return [
                    { id: 'tipo_name', label: 'Tipo Producto', tipoControl: 'texto', placeholder: 'Ejemplo: ADAPTADOR WI-FI' },
                    { id: 'marca', label: 'Marca', tipoControl: 'texto', placeholder: 'Ejemplo: TP-Link' },
                    { id: 'modelo', label: 'Modelo', tipoControl: 'texto', placeholder: 'Ejemplo: TL-WN8200ND' },
                    { id: 'sn', label: 'N° Serie / Código', tipoControl: 'codigo', sigla: 'WF' },
                    { id: 'nombre', label: 'Asignado a', tipoControl: 'texto', placeholder: 'Ejemplo: Mario Araujo' },
                    { id: 'area', label: 'Área', tipoControl: 'area' },
                    { id: 'fecha', label: 'Fecha', tipoControl: 'fecha', def: todayFecha, placeholder: `Ejemplo: ${todayFecha}` },
                    { id: 'nota', label: 'Nota Adicional', tipoControl: 'texto', placeholder: 'Ejemplo: 300 Mbps High Power USB' }
                ];

            case 'monitor_solo':
            default:
                return [
                    { id: 'tipo_name', label: 'Tipo Producto', tipoControl: 'texto', placeholder: 'Ejemplo: MONITOR' },
                    { id: 'marca', label: 'Marca', tipoControl: 'texto', placeholder: 'Ejemplo: Cooler Master' },
                    { id: 'modelo', label: 'Modelo', tipoControl: 'texto', placeholder: 'Ejemplo: GA241' },
                    { id: 'sn', label: 'N° Serie / Código', tipoControl: 'codigo', sigla: 'MO' },
                    { id: 'nombre', label: 'Asignado a', tipoControl: 'texto', placeholder: 'Ejemplo: Mario Araujo' },
                    { id: 'area', label: 'Área', tipoControl: 'area' },
                    { id: 'fecha', label: 'Fecha', tipoControl: 'fecha', def: todayFecha, placeholder: `Ejemplo: ${todayFecha}` },
                    { id: 'nota', label: 'Nota Adicional', tipoControl: 'texto', placeholder: 'Ejemplo: Panel 23.8 pulgadas FHD 100Hz' }
                ];
        }
    }

    /**
     * Instancia el objeto Remito apropiado según el tipo y los valores del formulario
     * @param {string} tipo 
     * @param {Function} v Función helper para obtener valores por ID
     * @param {Sucursal} sucursal 
     * @returns {Remito}
     */
    static crearRemito(tipo, v, sucursal) {
        const fecha = v('fecha');

        switch (tipo) {
            case 'pc_monitor': {
                const pc = new Computadora(
                    v('cod_pc'), v('marca_pc'), v('mod_pc'), 'N/A',
                    v('cpu'), v('ram'), v('disco'), v('so'), v('adapt'), v('comp')
                );
                const mo = new Monitor(v('cod_mo'), v('marca_mo'), v('mod_mo'), v('sn_mo'));
                const remito = new RemitoPcMonitor(
                    `${pc.getCodigo()} + ${mo.getCodigo()}`,
                    fecha,
                    sucursal,
                    pc,
                    mo
                );
                remito.setAsignadoA(v('nombre'));
                remito.setAreaEquipo(v('area'));
                remito.setEmail(v('email'));
                return remito;
            }

            case 'notebook': {
                const nb = new Notebook(
                    v('cod'), v('marca'), v('modelo'), v('sn'),
                    v('cpu'), v('ram'), v('disco'), v('so'), v('cargador')
                );
                const remito = new RemitoEquipamientoEstandar(nb.getCodigo(), fecha, sucursal, nb);
                remito.setAsignadoA(v('nombre'));
                remito.setAreaEquipo(v('area'));
                remito.setEmail(v('email'));
                return remito;
            }

            case 'celular': {
                const chip = v('chip');
                let lineaSim = null;
                if (chip && chip !== '—' && chip !== '') {
                    lineaSim = new LineaSIM('Claro', chip, v('iccid'), 'Asignado');
                }
                const cel = new Celular(
                    v('cod'), v('marca'), v('modelo'), v('sn'),
                    v('imei'), v('cpu'), v('ram'), v('disco'), lineaSim
                );
                const remito = new RemitoEquipamientoEstandar(cel.getCodigo(), fecha, sucursal, cel);
                remito.setAsignadoA(v('nombre'));
                remito.setAreaEquipo(v('area'));
                remito.setEmail(v('email'));
                return remito;
            }

            case 'traslado': {
                const equip = new Periferico(
                    v('cod'), v('marca'), v('modelo'), v('sn'),
                    v('tipo_disp') || 'Dispositivo', ''
                );
                const remito = new RemitoTraslado(v('cod'), fecha, sucursal, equip);
                remito.setPersonaEntrega(v('nombre1'));
                remito.setAreaEntrega(v('rol1'));
                remito.setPersonaRecibe(v('nombre2'));
                remito.setAreaRecibe(v('rol2'));
                return remito;
            }

            case 'baja': {
                const equip = new Periferico(
                    v('cod'), v('marca'), v('modelo'), v('sn'),
                    v('tipo_disp') || 'Computadora', ''
                );
                const remito = new RemitoBaja(v('cod'), fecha, sucursal, equip, v('motivo'));
                remito.setPersonaDevuelve(v('nombre'));
                remito.setAreaEquipo(v('area'));
                return remito;
            }

            case 'auricular':
            case 'mouse':
            case 'teclado':
            case 'wifi':
            case 'monitor_solo':
            default: {
                const tName = v('tipo_name') || tipo.toUpperCase();
                const perif = new Periferico(
                    v('sn') !== '—' && v('sn') !== '' ? v('sn') : tName,
                    v('marca'), v('modelo'), v('sn'),
                    tName, v('nota')
                );
                const remito = new RemitoEquipamientoEstandar(tName, fecha, sucursal, perif);
                remito.setAsignadoA(v('nombre'));
                remito.setAreaEquipo(v('area'));
                return remito;
            }
        }
    }
}
