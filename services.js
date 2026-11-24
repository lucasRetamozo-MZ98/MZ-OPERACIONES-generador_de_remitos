/**
 * SERVICIOS Y REPOSITORIOS — MOTOZUNI S.A.
 * Implementación de IRepositorioSucursal, IRemitoRenderService y RemitoFactory dinámico (SOLID / POO)
 */

// ── HELPERS HTML ─────────────────────────────────────────────────────────────

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ── REPOSITORIO DE SUCURSALES (INTERFAZ + COMPATIBILIDAD) ────────────────────

class IRepositorioSucursal {
    obtenerTodas() {
        throw new Error("Método abstracto 'obtenerTodas' debe ser implementado.");
    }

    buscarPorCodigo(codigo) {
        throw new Error("Método abstracto 'buscarPorCodigo' debe ser implementado.");
    }
}

class RepositorioSucursalMemoria extends IRepositorioSucursal {
    #sucursales = [];

    constructor(lista = (typeof DEFAULT_SUCURSALES !== 'undefined' ? DEFAULT_SUCURSALES : [])) {
        super();
        this.#sucursales = lista.map((item, idx) => (
            item instanceof Sucursal
                ? item
                : new Sucursal(item.id ?? (idx + 1), item.nombre, item.codigo ?? item.id)
        ));
    }

    obtenerTodas() { return [...this.#sucursales]; }
    buscarPorCodigo(codigo) {
        const cod = Number(codigo);
        return this.#sucursales.find(s => s.getCodigo() === cod) || null;
    }
}

class RepositorioSucursalStore extends IRepositorioSucursal {
    #store;

    constructor(store) {
        super();
        this.#store = store;
    }

    obtenerTodas() {
        return this.#store.obtenerSucursales();
    }

    buscarPorCodigo(codigo) {
        return this.#store.buscarSucursalPorCodigo(codigo);
    }
}

// ── MAPA DE TEMAS DE COLOR ───────────────────────────────────────────────────

const TEMAS_COLOR_REMITO = {
    azul:    { principal: 'var(--cp)',      secundario: 'var(--cs)',      borde: 'var(--cl)' },
    naranja: { principal: 'var(--naranja)', secundario: 'var(--naranja)', borde: 'var(--naranja)' },
    rojo:    { principal: 'var(--rojo)',    secundario: 'var(--rojo)',    borde: 'var(--rojo)' },
    verde:   { principal: 'var(--verde)',   secundario: 'var(--verde)',   borde: 'var(--verde)' }
};

// ── SERVICIO DE RENDERIZADO HTML DE REMITOS ──────────────────────────────────

class IRemitoRenderService {
    renderizarHTML(remito) {
        throw new Error("Método abstracto 'renderizarHTML' debe ser implementado.");
    }
}

class RemitoHtmlRenderService extends IRemitoRenderService {

    renderizarHTML(remito) {
        if (!remito || !(remito instanceof Remito)) {
            return '<div class="banner">Error: Remito inválido o no especificado.</div>';
        }

        if (remito instanceof RemitoDinamico) {
            return this.#renderizarRemitoDinamico(remito);
        }

        return '<div class="banner">Formato de remito no soportado.</div>';
    }

    /**
     * Devuelve el valor textual escapado o una línea punteada si el campo está vacío para llenarlo a mano
     */
    formatearTextoOLineaPunteada(valor, tipo = 'normal') {
        if (valor && valor !== '—' && String(valor).trim() !== '') {
            return escapeHtml(valor);
        }
        if (tipo === 'fecha') return '<span class="linea-punteada linea-punteada-fecha"></span>';
        if (tipo === 'nombre') return '<span class="linea-punteada linea-punteada-nombre"></span>';
        if (tipo === 'tabla') return '<span class="linea-punteada linea-punteada-tabla"></span>';
        return '<span class="linea-punteada"></span>';
    }

    #getTema(remito) {
        const plantilla = remito.getPlantilla();
        const key = (plantilla && plantilla.config && plantilla.config.colorTema) || 'azul';
        return TEMAS_COLOR_REMITO[key] || TEMAS_COLOR_REMITO.azul;
    }

    /**
     * Reemplaza variables {{campo}} dentro de plantillas de texto (subtítulo, declaración de conformidad)
     */
    #interpolarTexto(templateStr, remito, { usarLineasPunteadas = false } = {}) {
        if (!templateStr) return '';
        const plantilla = remito.getPlantilla();
        const valores = remito.getValores();
        const secciones = remito.getSeccionesResueltas();
        const primeraSec = secciones[0] || null;
        const sucNombre = remito.getSucursal() ? remito.getSucursal().getNombreCompleto() : 'MOTOZUNI S.A.';

        return String(templateStr).replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
            if (key === 'nombre' || key === 'nombre1' || key === 'nombre2') {
                const raw = key === 'nombre1'
                    ? remito.getPersonaEntrega()
                    : key === 'nombre2'
                        ? remito.getPersonaRecibe()
                        : (plantilla.tipo_flujo === 'baja' ? remito.getPersonaDevuelve() : remito.getAsignadoA());
                return usarLineasPunteadas
                    ? this.formatearTextoOLineaPunteada(raw, 'nombre')
                    : (raw && raw !== '—' ? escapeHtml(raw) : '—');
            }
            if (key === 'fecha') {
                const raw = remito.getFecha();
                return usarLineasPunteadas
                    ? this.formatearTextoOLineaPunteada(raw, 'fecha')
                    : (raw && raw !== '—' ? escapeHtml(raw) : '___/___/______');
            }
            if (key === 'sucursal') return escapeHtml(sucNombre);
            if (key === 'componente' || key === 'plantilla') return escapeHtml(plantilla.nombre);
            if (key === 'codigo') {
                const cod = primeraSec && primeraSec.tieneCodigo ? primeraSec.codigo : '';
                return cod ? escapeHtml(cod) : '—';
            }

            // Buscar primero en los códigos de secciones
            const secMatch = secciones.find(s => s.tieneCodigo && s.codigoFieldId === key);
            if (secMatch) return escapeHtml(secMatch.codigo || '—');

            const val = valores[key];
            if (val !== undefined && val !== null && String(val).trim() !== '' && val !== '—') {
                return escapeHtml(val);
            }
            return '—';
        });
    }

    #renderizarRemitoDinamico(remito) {
        const plantilla = remito.getPlantilla();
        const flujo = plantilla.tipo_flujo || 'entrega';
        const tema = this.#getTema(remito);

        const headerHtml = this.#renderHeaderDinamico(remito, tema);
        let cuerpoHtml = '';

        if (flujo === 'traslado') {
            cuerpoHtml = this.#renderCuerpoTraslado(remito, tema);
        } else if (flujo === 'baja') {
            cuerpoHtml = this.#renderCuerpoBaja(remito, tema);
        } else {
            cuerpoHtml = this.#renderCuerpoEntrega(remito, tema);
        }

        const extrasHtml = this.#renderComponentesAdicionales(remito, tema);
        const conformidadHtml = this.#renderConformidadDinamica(remito, tema);
        const firmasHtml = this.#renderFirmasYFooter(remito);

        return `
            <div>
                ${headerHtml}
                ${cuerpoHtml}
                ${extrasHtml}
                ${conformidadHtml}
                ${firmasHtml}
            </div>
        `;
    }

    #renderHeaderDinamico(remito, tema) {
        const plantilla = remito.getPlantilla();
        const cfg = plantilla.config;
        const flujo = plantilla.tipo_flujo || 'entrega';
        const sucNombre = remito.getSucursal() ? remito.getSucursal().getNombreCompleto() : 'MOTOZUNI S.A.';
        const seccionesConCodigo = remito.getSeccionesResueltas().filter(s => s.tieneCodigo && s.codigo && s.codigo !== '—');

        let tituloDer = '';
        if (flujo === 'traslado') {
            tituloDer = 'TRASLADO';
        } else if (seccionesConCodigo.length > 0) {
            tituloDer = seccionesConCodigo.map(s => escapeHtml(s.codigo)).join(' + ');
        } else {
            tituloDer = escapeHtml(plantilla.nombre.toUpperCase());
        }

        let subtituloDer = '';
        if (cfg.subtituloHeader && cfg.subtituloHeader.trim() !== '') {
            subtituloDer = this.#interpolarTexto(cfg.subtituloHeader, remito, { usarLineasPunteadas: false });
        } else if (flujo === 'baja') {
            subtituloDer = 'BAJA / DEVOLUCIÓN';
        } else if (flujo === 'traslado') {
            subtituloDer = `${escapeHtml(remito.getPersonaEntrega() || '—')} → ${escapeHtml(remito.getPersonaRecibe() || '—')}`;
        } else {
            const marca = remito.getValor('marca', '');
            const modelo = remito.getValor('modelo', '');
            const detalle = [marca, modelo].filter(x => x && x !== '—').join(' ');
            subtituloDer = escapeHtml(detalle ? `${plantilla.nombre} — ${detalle}` : plantilla.nombre);
        }

        return `
            <table class="header-table">
                <tr>
                    <td>
                        <div class="header-title-left">MOTOZUNI S.A.</div>
                        <div class="header-sub-left">Sistema de Gestión de Dispositivos</div>
                        <div class="header-sub-left">${escapeHtml(sucNombre)}</div>
                    </td>
                    <td>
                        <div class="header-title-right" style="color: ${tema.principal};">${tituloDer}</div>
                        <div class="header-sub-right" style="color: ${tema.secundario};">${subtituloDer}</div>
                    </td>
                </tr>
            </table>
            <div class="divider-hr" style="background-color: ${tema.principal};"></div>
        `;
    }

    #renderCuerpoEntrega(remito, tema) {
        const plantilla = remito.getPlantilla();
        const cfg = plantilla.config;
        const sucNombre = remito.getSucursal() ? remito.getSucursal().getNombreCompleto() : '—';
        let html = `<div class="banner" style="background-color: ${tema.principal};">${escapeHtml(cfg.bannerTitulo || 'RECIBO DE ENTREGA DE DISPOSITIVOS')}</div>`;

        if (cfg.incluirDatosAsignacion) {
            const datosAsignacion = [
                ['Asignado a', this.formatearTextoOLineaPunteada(remito.getAsignadoA(), 'tabla')],
                ['Área / Equipo', escapeHtml(remito.getAreaEquipo())],
            ];
            if (cfg.mostrarEmailAsignacion) {
                datosAsignacion.push(['Email', escapeHtml(remito.getEmail())]);
            }
            datosAsignacion.push(['Sucursal', escapeHtml(sucNombre)]);
            datosAsignacion.push(['Fecha asignación', this.formatearTextoOLineaPunteada(remito.getFecha(), 'fecha')]);
            if (datosAsignacion.length % 2 !== 0) {
                datosAsignacion.push(['', '']);
            }

            html += `
                <div class="sec-header" style="background-color: ${tema.secundario};">DATOS DE ASIGNACIÓN</div>
                ${this.renderTablaEspecificaciones(datosAsignacion, { valoresYaHtml: true })}
            `;
        }

        remito.getSeccionesResueltas().forEach(sec => {
            if (sec.opcional && !sec.tieneDatosUsuario) return;
            const tituloSec = sec.tieneCodigo && sec.codigo && sec.codigo !== '—'
                ? `${escapeHtml(sec.titulo.toUpperCase())} — ${escapeHtml(sec.codigo)}`
                : escapeHtml(sec.titulo.toUpperCase());

            html += `
                <div class="sec-header" style="background-color: ${tema.secundario};">${tituloSec}</div>
                ${this.renderTablaEspecificaciones(sec.pares)}
            `;
        });

        const nota = remito.getNotaAdicional();
        if (cfg.incluirNotaAdicional && nota && nota !== '—' && String(nota).trim() !== '') {
            html += `<div style="font-size:7pt; color:var(--csu); margin-top:4px;">* ${escapeHtml(nota)}</div>`;
        }

        return html;
    }

    #renderCuerpoTraslado(remito, tema) {
        const plantilla = remito.getPlantilla();
        const cfg = plantilla.config;
        const secciones = remito.getSeccionesResueltas();
        const secPrincipal = secciones[0];
        const fechaHtml = this.formatearTextoOLineaPunteada(remito.getFecha(), 'fecha');
        const nom1Html = this.formatearTextoOLineaPunteada(remito.getPersonaEntrega(), 'nombre');
        const nom2Html = this.formatearTextoOLineaPunteada(remito.getPersonaRecibe(), 'nombre');

        const paresDisp = secPrincipal ? [...secPrincipal.pares] : [];
        paresDisp.push(['Fecha traslado', fechaHtml]);

        const descDisp = this.#construirResumenDispositivo(remito);
        const codTexto = secPrincipal && secPrincipal.tieneCodigo && secPrincipal.codigo
            ? ` (Cód: <b>${escapeHtml(secPrincipal.codigo)}</b>)`
            : '';

        let html = `<div class="banner" style="background-color: ${tema.principal};">${escapeHtml(cfg.bannerTitulo || 'REMITO DE TRASLADO DE DISPOSITIVO')}</div>`;

        html += `
            <div class="sec-header" style="background-color: ${tema.principal};">${escapeHtml((secPrincipal?.titulo || 'DISPOSITIVO').toUpperCase())}</div>
            ${this.renderTablaEspecificaciones(paresDisp, { ultimaFilaHtml: true })}
        `;

        // Secciones adicionales propias de la plantilla si existieran
        secciones.slice(1).forEach(sec => {
            if (sec.opcional && !sec.tieneDatosUsuario) return;
            const tituloSec = sec.tieneCodigo && sec.codigo ? `${sec.titulo.toUpperCase()} — ${sec.codigo}` : sec.titulo.toUpperCase();
            html += `
                <div class="sec-header" style="background-color: ${tema.secundario};">${escapeHtml(tituloSec)}</div>
                ${this.renderTablaEspecificaciones(sec.pares)}
            `;
        });

        html += `
            <div class="sec-header" style="background-color: var(--rojo);">ENTREGA</div>
            <div class="conf-text">
                Yo, <b>${nom1Html}</b>, con fecha <b>${fechaHtml}</b>, declaro haber entregado 
                <b>${escapeHtml(descDisp)}</b>${codTexto}.
            </div>
            <div style="font-weight: bold; font-size: 7.5pt; color: var(--csu); margin-top: 5px;">
                ${escapeHtml(remito.getPersonaEntrega() || '—')} — ${escapeHtml(remito.getAreaEntrega())}
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
                Yo, <b>${nom2Html}</b>, con fecha <b>${fechaHtml}</b>, declaro haber recibido 
                <b>${escapeHtml(descDisp)}</b>${codTexto}, comprometiéndome a hacer un uso responsable del mismo.
            </div>
            <div style="font-weight: bold; font-size: 7.5pt; color: var(--csu); margin-top: 5px;">
                ${escapeHtml(remito.getPersonaRecibe() || '—')} — ${escapeHtml(remito.getAreaRecibe())}
            </div>
            <table class="signatures-table" style="margin-top: 15px; margin-bottom: 5px;">
                <tr>
                    <td><div class="sig-line"></div><div class="sig-label">Firma</div></td>
                    <td><div class="sig-line"></div><div class="sig-label">Aclaración</div></td>
                    <td><div class="sig-line"></div><div class="sig-label">Fecha</div></td>
                </tr>
            </table>
        `;
        return html;
    }

    #renderCuerpoBaja(remito, tema) {
        const plantilla = remito.getPlantilla();
        const cfg = plantilla.config;
        const sucNombre = remito.getSucursal() ? remito.getSucursal().getNombreCompleto() : '—';
        const nomHtml = this.formatearTextoOLineaPunteada(remito.getPersonaDevuelve(), 'tabla');
        const fechaHtml = this.formatearTextoOLineaPunteada(remito.getFecha(), 'fecha');

        const datosResp = [
            ['Nombre', nomHtml],
            ['Área', escapeHtml(remito.getAreaEquipo())],
            ['Sucursal', escapeHtml(sucNombre)],
            ['Fecha devolución', fechaHtml]
        ];

        let html = `
            <div class="banner" style="background-color: ${tema.principal};">${escapeHtml(cfg.bannerTitulo || 'REMITO DE DEVOLUCIÓN / BAJA DE DISPOSITIVO')}</div>
            <div class="sec-header" style="background-color: ${tema.secundario};">DATOS DEL RESPONSABLE</div>
            ${this.renderTablaEspecificaciones(datosResp, { valoresYaHtml: true })}
        `;

        remito.getSeccionesResueltas().forEach(sec => {
            if (sec.opcional && !sec.tieneDatosUsuario) return;
            const tituloSec = sec.tieneCodigo && sec.codigo && sec.codigo !== '—'
                ? `${escapeHtml(sec.titulo.toUpperCase())} — ${escapeHtml(sec.codigo)}`
                : escapeHtml(sec.titulo.toUpperCase());

            html += `
                <div class="sec-header" style="background-color: ${tema.secundario};">${tituloSec}</div>
                ${this.renderTablaEspecificaciones(sec.pares)}
            `;
        });

        return html;
    }

    #renderComponentesAdicionales(remito, tema) {
        const extras = remito.getComponentesAdicionales();
        if (!Array.isArray(extras) || extras.length === 0) return '';

        let html = '';
        extras.forEach(extra => {
            const tipoDesc = escapeHtml(extra.getTipoDescripcion().toUpperCase());
            const tieneCod = typeof extra.tieneCodigo === 'function' ? extra.tieneCodigo() : true;
            const cod = extra.getCodigo();
            const headerTitulo = (tieneCod && cod && cod !== '—') ? `${tipoDesc} — ${escapeHtml(cod)}` : tipoDesc;

            html += `
                <div class="sec-header" style="background-color: ${tema.secundario};">${headerTitulo}</div>
                ${this.renderTablaEspecificaciones(extra.getEspecificaciones())}
            `;
            const notaExtra = extra.getNotaAdicional ? extra.getNotaAdicional() : '';
            if (notaExtra && notaExtra !== '—' && String(notaExtra).trim() !== '') {
                html += `<div style="font-size:7pt; color:var(--csu); margin-top:4px;">* ${escapeHtml(notaExtra)}</div>`;
            }
        });
        return html;
    }

    #construirResumenDispositivo(remito) {
        const plantilla = remito.getPlantilla();
        const tipo = remito.getValor('tipo_disp', '') || remito.getValor('tipo_name', '') || plantilla.nombre;
        const marca = remito.getValor('marca', '');
        const modelo = remito.getValor('modelo', '');
        return [tipo, marca, modelo].filter(x => x && x !== '—').join(' ') || plantilla.nombre;
    }

    #renderConformidadDinamica(remito, tema) {
        const plantilla = remito.getPlantilla();
        const cfg = plantilla.config;
        const flujo = plantilla.tipo_flujo || 'entrega';

        if (flujo === 'traslado') return '';

        const fechaHtml = this.formatearTextoOLineaPunteada(remito.getFecha(), 'fecha');
        const secciones = remito.getSeccionesResueltas();
        const primeraSec = secciones[0];

        let textoDeclaracion = '';
        if (cfg.textoConformidad && cfg.textoConformidad.trim() !== '') {
            textoDeclaracion = this.#interpolarTexto(cfg.textoConformidad, remito, { usarLineasPunteadas: true });
        } else if (flujo === 'baja') {
            const nomHtml = this.formatearTextoOLineaPunteada(remito.getPersonaDevuelve(), 'nombre');
            const desc = escapeHtml(this.#construirResumenDispositivo(remito));
            const codParte = (primeraSec && primeraSec.tieneCodigo && primeraSec.codigo)
                ? ` (Cód: <b>${escapeHtml(primeraSec.codigo)}</b>)` : '';
            textoDeclaracion = `Yo, <b>${nomHtml}</b>, con fecha <b>${fechaHtml}</b>, declaro haber devuelto <b>${desc}</b>${codParte} en las condiciones indicadas.`;
        } else {
            const nomHtml = this.formatearTextoOLineaPunteada(remito.getAsignadoA(), 'nombre');
            const desc = escapeHtml(this.#construirResumenDispositivo(remito));
            const codParte = (primeraSec && primeraSec.tieneCodigo && primeraSec.codigo)
                ? ` (Cód: <b>${escapeHtml(primeraSec.codigo)}</b>)` : '';
            textoDeclaracion = `Yo, <b>${nomHtml}</b>, con fecha <b>${fechaHtml}</b>, declaro haber recibido <b>${desc}</b>${codParte}, en las condiciones descritas, comprometiéndome a hacer un uso responsable del mismo.`;
        }

        const bannerConf = flujo === 'baja' ? 'DECLARACIÓN DE DEVOLUCIÓN' : 'RECIBIDO – CONFORMIDAD DE ENTREGA';
        const borderTopColor = flujo === 'baja' ? tema.principal : 'var(--cl)';

        return `
            <div style="border-top: 1px solid ${borderTopColor}; margin-top: 10px; padding-top: 5px;"></div>
            <div class="banner" style="background-color: ${tema.principal};">${bannerConf}</div>
            <div class="conf-text">${textoDeclaracion}</div>
        `;
    }

    #renderFirmasYFooter(remito) {
        const plantilla = remito.getPlantilla();
        const flujo = plantilla.tipo_flujo || 'entrega';
        const seccionesConCodigo = remito.getSeccionesResueltas().filter(s => s.tieneCodigo && s.codigo && s.codigo !== '—');
        const sucNombre = remito.getSucursal() ? remito.getSucursal().getNombreCompleto() : 'MOTOZUNI S.A.';

        let footerId = '';
        if (flujo === 'baja') {
            footerId = seccionesConCodigo.length ? `BAJA ${seccionesConCodigo[0].codigo}` : `BAJA ${plantilla.nombre}`;
        } else if (seccionesConCodigo.length) {
            footerId = seccionesConCodigo.map(s => s.codigo).join(' + ');
        } else {
            footerId = `${plantilla.nombre} — ${sucNombre}`;
        }

        const fechaFooter = (remito.getFecha() && remito.getFecha() !== '—') ? remito.getFecha() : '___/___/______';

        if (flujo === 'traslado') {
            return `
                <div class="footer-text">
                    Documento generado automáticamente — MOTOZUNI S.A. | ${escapeHtml(footerId)} | ${escapeHtml(fechaFooter)}
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
                Documento generado automáticamente — MOTOZUNI S.A. | ${escapeHtml(footerId)} | ${escapeHtml(fechaFooter)}
            </div>
        `;
    }

    /**
     * Renderiza tabla de 2 pares (4 columnas: label, valor, label, valor)
     */
    renderTablaEspecificaciones(pares = [], opts = {}) {
        const lista = [...pares];
        if (lista.length % 2 !== 0) {
            lista.push(['', '']);
        }
        let rows = '';
        for (let i = 0; i < lista.length; i += 2) {
            const p1 = lista[i] || ['', ''];
            const p2 = lista[i + 1] || ['', ''];
            const isLastPair1 = (i === lista.length - 1);
            const isLastPair2 = (i + 1 === lista.length - 1);

            const v1 = this.#formatCellVal(p1[1], opts.valoresYaHtml || (opts.ultimaFilaHtml && isLastPair1));
            const v2 = this.#formatCellVal(p2[1], opts.valoresYaHtml || (opts.ultimaFilaHtml && isLastPair2));

            rows += `
                <tr>
                    <td class="lbl-col">${escapeHtml(p1[0])}</td>
                    <td class="val-col">${v1}</td>
                    <td class="lbl-col">${escapeHtml(p2[0])}</td>
                    <td class="val-col">${v2}</td>
                </tr>
            `;
        }
        return `<table class="remito-table">${rows}</table>`;
    }

    #formatCellVal(val, yaEsHtml) {
        if (val === '' || val === null || val === undefined) return '';
        if (yaEsHtml) return String(val);
        return escapeHtml(val);
    }
}

// ── FACTORY DINÁMICA DE FORMULARIOS Y REMITOS ────────────────────────────────

class RemitoFactory {

    /**
     * Genera la definición de controles del formulario lateral a partir de una PlantillaRemito
     * @param {PlantillaRemito} plantilla
     * @param {string} todayFecha
     * @returns {Array<Object>}
     */
    static getCamposFormulario(plantilla, todayFecha) {
        if (!plantilla) return [];
        const cfg = plantilla.config;
        const flujo = plantilla.tipo_flujo || 'entrega';
        const campos = [];

        // 1. Bloque de Datos de Asignación / Responsables (siempre primero y separado)
        if (flujo === 'traslado') {
            campos.push(
                { id: '__sep_traslado', label: 'Datos de Traslado', tipoControl: 'separador', icono: '🔄' },
                { id: 'nombre1', label: 'Nombre ENTREGA', tipoControl: 'texto', placeholder: 'Ejemplo: Juan Pérez' },
                { id: 'rol1', label: 'Área ENTREGA', tipoControl: 'area' },
                { id: 'nombre2', label: 'Nombre RECIBE', tipoControl: 'texto', placeholder: 'Ejemplo: Mario Araujo' },
                { id: 'rol2', label: 'Área RECIBE', tipoControl: 'area' },
                { id: 'fecha', label: 'Fecha', tipoControl: 'fecha', def: todayFecha, placeholder: `Ejemplo: ${todayFecha}` }
            );
        } else if (flujo === 'baja') {
            campos.push(
                { id: '__sep_baja', label: 'Datos de Devolución / Baja', tipoControl: 'separador', icono: '📋' },
                { id: 'nombre', label: 'Nombre Quien Devuelve', tipoControl: 'texto', placeholder: 'Ejemplo: Mario Araujo' },
                { id: 'area', label: 'Área', tipoControl: 'area' },
                { id: 'fecha', label: 'Fecha', tipoControl: 'fecha', def: todayFecha, placeholder: `Ejemplo: ${todayFecha}` }
            );
        } else {
            if (cfg.incluirDatosAsignacion) {
                campos.push(
                    { id: '__sep_asignacion', label: 'Datos de Asignación', tipoControl: 'separador', icono: '👤' },
                    { id: 'nombre', label: 'Asignado a', tipoControl: 'texto', placeholder: 'Ejemplo: Mario Araujo' },
                    { id: 'area', label: 'Área / Equipo', tipoControl: 'area' }
                );
                if (cfg.mostrarEmailAsignacion) {
                    campos.push({ id: 'email', label: 'Email', tipoControl: 'texto', placeholder: 'Ejemplo: usuario@motozuni.com.ar' });
                }
                campos.push({ id: 'fecha', label: 'Fecha', tipoControl: 'fecha', def: todayFecha, placeholder: `Ejemplo: ${todayFecha}` });
            } else {
                campos.push(
                    { id: '__sep_asignacion', label: 'Datos Generales', tipoControl: 'separador', icono: '📅' },
                    { id: 'fecha', label: 'Fecha', tipoControl: 'fecha', def: todayFecha, placeholder: `Ejemplo: ${todayFecha}` }
                );
            }
        }

        // 2. Bloques de cada Componente / Sección de la plantilla
        const secciones = cfg.secciones || [];
        secciones.forEach((sec, idx) => {
            campos.push({
                id: `__sep_${sec.id}_${idx}`,
                label: sec.opcional ? `${sec.titulo} (Opcional)` : sec.titulo,
                tipoControl: 'separador',
                icono: '🧩'
            });

            if (sec.tieneCodigo) {
                campos.push({
                    id: sec.codigoFieldId || (idx === 0 ? 'cod' : `cod_${idx + 1}`),
                    label: sec.codigoLabel || `Código ${sec.titulo}`,
                    tipoControl: 'codigo',
                    sigla: sec.sigla || plantilla.sigla_codigo || 'EQ',
                    seccionIndex: idx
                });
            }

            (sec.campos || []).forEach(c => {
                if (c.tipoControl === 'fijo') return; // Los valores fijos van directo a la tabla
                campos.push({
                    id: c.id,
                    label: c.labelForm || c.label,
                    tipoControl: c.tipoControl || 'texto',
                    placeholder: c.placeholder || '',
                    def: c.valorDefecto || '',
                    opciones: Array.isArray(c.opciones) ? c.opciones : []
                });
            });

            // Si es la última sección y hay nota adicional, incluirla dentro de este bloque de componente
            if (idx === secciones.length - 1 && flujo === 'entrega' && cfg.incluirNotaAdicional) {
                campos.push({
                    id: 'nota',
                    label: 'Nota Adicional',
                    tipoControl: 'texto',
                    placeholder: cfg.notaPlaceholder || 'Ejemplo: Observaciones adicionales...'
                });
            }
        });

        // Fallback si no hubiera secciones pero sí nota adicional
        if (secciones.length === 0 && flujo === 'entrega' && cfg.incluirNotaAdicional) {
            campos.push({
                id: 'nota',
                label: 'Nota Adicional',
                tipoControl: 'texto',
                placeholder: cfg.notaPlaceholder || 'Ejemplo: Observaciones adicionales...'
            });
        }

        return campos;
    }

    /**
     * Construye un RemitoDinamico a partir de la plantilla y los valores del formulario
     * @param {PlantillaRemito} plantilla
     * @param {Function} getVal Función (id) => string ('' si vacío)
     * @param {Sucursal} sucursal
     * @returns {RemitoDinamico}
     */
    static crearRemito(plantilla, getVal, sucursal) {
        const cfg = plantilla.config;
        const flujo = plantilla.tipo_flujo || 'entrega';
        const valores = {};
        const seccionesResueltas = [];

        (cfg.secciones || []).forEach((sec, idx) => {
            const codigoFieldId = sec.codigoFieldId || (idx === 0 ? 'cod' : `cod_${idx + 1}`);
            const codigoVal = sec.tieneCodigo ? (getVal(codigoFieldId) || '—') : '';
            if (sec.tieneCodigo) valores[codigoFieldId] = codigoVal;

            const pares = [];
            if (sec.tieneCodigo) {
                pares.push(['Código', codigoVal]);
            }

            let tieneDatosUsuario = false;

            (sec.campos || []).forEach(c => {
                let rawVal = '';
                if (c.tipoControl === 'fijo') {
                    rawVal = c.valorDefecto || '—';
                } else {
                    rawVal = getVal(c.id);
                    if (rawVal && rawVal !== '—') {
                        tieneDatosUsuario = true;
                    }
                    if (!rawVal && c.fallbackTabla) {
                        rawVal = c.fallbackTabla;
                    }
                }
                valores[c.id] = rawVal || '—';
                if (c.enTabla !== false) {
                    pares.push([c.label, rawVal || '—']);
                }
            });

            seccionesResueltas.push({
                id: sec.id,
                titulo: sec.titulo,
                tieneCodigo: Boolean(sec.tieneCodigo),
                codigoFieldId,
                codigo: codigoVal,
                opcional: Boolean(sec.opcional),
                tieneDatosUsuario,
                pares
            });
        });

        const codigosActivos = seccionesResueltas.filter(s => s.tieneCodigo && s.codigo && s.codigo !== '—').map(s => s.codigo);
        const idDocumento = codigosActivos.length ? codigosActivos.join(' + ') : plantilla.nombre;
        const fecha = getVal('fecha');

        const remito = new RemitoDinamico(idDocumento, fecha, sucursal, plantilla, valores, seccionesResueltas);

        if (flujo === 'traslado') {
            remito.setPersonaEntrega(getVal('nombre1'));
            remito.setAreaEntrega(getVal('rol1') || '—');
            remito.setPersonaRecibe(getVal('nombre2'));
            remito.setAreaRecibe(getVal('rol2') || '—');
        } else if (flujo === 'baja') {
            remito.setPersonaDevuelve(getVal('nombre'));
            remito.setAreaEquipo(getVal('area') || '—');
        } else {
            remito.setAsignadoA(getVal('nombre'));
            remito.setAreaEquipo(getVal('area') || '—');
            remito.setEmail(getVal('email') || '—');
            remito.setNotaAdicional(getVal('nota'));
        }

        return remito;
    }

    /**
     * Construye un EquipamientoDinamico para la sección "Componentes Adicionales"
     */
    static crearComponenteAdicional(plantilla, codigoVal, camposValores, notaVal) {
        const sec = plantilla.getSeccionPrincipal();
        const tieneCodigo = Boolean(plantilla.tiene_codigo || (sec && sec.tieneCodigo));
        const pares = [];

        if (tieneCodigo) {
            pares.push(['Código', codigoVal || '—']);
        }

        if (sec && Array.isArray(sec.campos)) {
            sec.campos.forEach(c => {
                if (c.enTabla === false) return;
                let val = '';
                if (c.tipoControl === 'fijo') {
                    val = c.valorDefecto || '—';
                } else {
                    val = (camposValores && camposValores[c.id]) ? String(camposValores[c.id]).trim() : '';
                    if (!val && c.fallbackTabla) val = c.fallbackTabla;
                }
                pares.push([c.label, val || '—']);
            });
        }

        return new EquipamientoDinamico({
            codigo: tieneCodigo ? (codigoVal || '—') : '',
            tieneCodigo,
            tipoDescripcion: (sec && sec.titulo) ? sec.titulo : plantilla.nombre,
            especificaciones: pares,
            notaAdicional: notaVal || ''
        });
    }
}
