/**
 * CAPA DE BASE DE DATOS Y PERSISTENCIA — MOTOZUNI S.A.
 * Implementa el patrón Repository (Principio DIP / OCP) con soporte para:
 *  - Supabase (PostgreSQL vía REST API nativa con fetch, sin dependencias externas)
 *  - Respaldo local automático en localStorage para trabajo offline o previo a conectar Supabase
 */

// ── UTILIDADES DE SLUG Y CLONADO ─────────────────────────────────────────────

function generarSlug(texto, prefijo = 'item') {
    const base = String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    return base || `${prefijo}_${Date.now()}`;
}

function clonarProfundo(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// ── CLIENTE REST LIVIANO PARA SUPABASE ───────────────────────────────────────

class SupabaseRestClient {
    #url;
    #anonKey;

    constructor(url, anonKey) {
        this.#url = String(url || '').trim().replace(/\/+$/, '');
        this.#anonKey = String(anonKey || '').trim();
    }

    isConfigured() {
        return Boolean(this.#url && this.#anonKey && /^https?:\/\//i.test(this.#url));
    }

    getUrl() { return this.#url; }
    getAnonKey() { return this.#anonKey; }

    #headers(extra = {}) {
        return {
            'apikey': this.#anonKey,
            'Authorization': `Bearer ${this.#anonKey}`,
            'Content-Type': 'application/json',
            ...extra
        };
    }

    async #request(path, options = {}) {
        if (!this.isConfigured()) {
            throw new Error('Supabase no está configurado.');
        }
        const resp = await fetch(`${this.#url}/rest/v1/${path}`, {
            ...options,
            headers: this.#headers(options.headers || {})
        });

        const text = await resp.text();
        let data = null;
        if (text) {
            try {
                data = JSON.parse(text);
            } catch {
                data = text;
            }
        }

        if (!resp.ok) {
            const msg = (data && (data.message || data.hint || data.details || data.error))
                ? `${data.message || data.error}${data.details ? ' — ' + data.details : ''}`
                : `Error HTTP ${resp.status}`;
            throw new Error(msg);
        }
        return data;
    }

    async select(table, query = 'select=*') {
        return await this.#request(`${table}?${query}`, { method: 'GET' });
    }

    async upsert(table, rows, onConflict = 'id') {
        const payload = Array.isArray(rows) ? rows : [rows];
        return await this.#request(`${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
            method: 'POST',
            headers: {
                'Prefer': 'resolution=merge-duplicates,return=representation'
            },
            body: JSON.stringify(payload)
        });
    }

    async deleteById(table, id) {
        return await this.#request(`${table}?id=eq.${encodeURIComponent(id)}`, {
            method: 'DELETE'
        });
    }

    async testConnection() {
        // Verifica acceso a las 4 tablas requeridas
        const tablas = ['sucursales', 'sectores', 'tipos_componente', 'plantillas'];
        for (const tabla of tablas) {
            await this.select(tabla, 'select=id&limit=1');
        }
        return true;
    }
}

// ── INTERFAZ DE REPOSITORIO UNIFICADO (DIP) ──────────────────────────────────

class IRepositorioDatos {
    async cargarTodo() { throw new Error("Método abstracto 'cargarTodo'"); }
    async guardarSucursal(sucursal) { throw new Error("Método abstracto 'guardarSucursal'"); }
    async eliminarSucursal(id) { throw new Error("Método abstracto 'eliminarSucursal'"); }
    async guardarSector(sector) { throw new Error("Método abstracto 'guardarSector'"); }
    async eliminarSector(id) { throw new Error("Método abstracto 'eliminarSector'"); }
    async guardarTipoComponente(tipo) { throw new Error("Método abstracto 'guardarTipoComponente'"); }
    async eliminarTipoComponente(id) { throw new Error("Método abstracto 'eliminarTipoComponente'"); }
    async guardarPlantilla(plantilla) { throw new Error("Método abstracto 'guardarPlantilla'"); }
    async eliminarPlantilla(id) { throw new Error("Método abstracto 'eliminarPlantilla'"); }
    async guardarTodo(snapshot) { throw new Error("Método abstracto 'guardarTodo'"); }
}

// ── REPOSITORIO LOCAL (localStorage) ─────────────────────────────────────────

class RepositorioDatosLocal extends IRepositorioDatos {
    static STORAGE_KEY = 'mz_remitos_db_v1';

    #leerRaw() {
        try {
            const raw = localStorage.getItem(RepositorioDatosLocal.STORAGE_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (err) {
            console.warn('No se pudo leer almacenamiento local:', err);
            return null;
        }
    }

    #escribirRaw(data) {
        try {
            localStorage.setItem(RepositorioDatosLocal.STORAGE_KEY, JSON.stringify(data));
        } catch (err) {
            console.error('No se pudo guardar en almacenamiento local:', err);
            throw new Error('Error guardando datos localmente (espacio insuficiente o navegador bloqueado).');
        }
    }

    crearSnapshotDefaults() {
        return {
            sucursales: clonarProfundo(DEFAULT_SUCURSALES),
            sectores: clonarProfundo(DEFAULT_SECTORES),
            tipos_componente: clonarProfundo(DEFAULT_TIPOS_COMPONENTE),
            plantillas: clonarProfundo(DEFAULT_PLANTILLAS)
        };
    }

    async cargarTodo() {
        let data = this.#leerRaw();
        if (!data || !Array.isArray(data.plantillas) || data.plantillas.length === 0) {
            data = this.crearSnapshotDefaults();
            this.#escribirRaw(data);
        }
        return data;
    }

    async guardarTodo(snapshot) {
        this.#escribirRaw(snapshot);
        return snapshot;
    }

    async guardarSucursal(suc) {
        const data = await this.cargarTodo();
        const idx = data.sucursales.findIndex(s => Number(s.id) === Number(suc.id));
        const record = { id: Number(suc.id), nombre: String(suc.nombre).trim() };
        if (idx >= 0) data.sucursales[idx] = record;
        else data.sucursales.push(record);
        data.sucursales.sort((a, b) => Number(a.id) - Number(b.id));
        this.#escribirRaw(data);
        return record;
    }

    async eliminarSucursal(id) {
        const data = await this.cargarTodo();
        data.sucursales = data.sucursales.filter(s => Number(s.id) !== Number(id));
        this.#escribirRaw(data);
    }

    async guardarSector(sec) {
        const data = await this.cargarTodo();
        const idx = data.sectores.findIndex(s => s.id === sec.id);
        const record = { id: sec.id, nombre: sec.nombre, orden: Number(sec.orden || 0) };
        if (idx >= 0) data.sectores[idx] = record;
        else data.sectores.push(record);
        data.sectores.sort((a, b) => (a.orden - b.orden) || a.nombre.localeCompare(b.nombre));
        this.#escribirRaw(data);
        return record;
    }

    async eliminarSector(id) {
        const data = await this.cargarTodo();
        data.sectores = data.sectores.filter(s => s.id !== id);
        this.#escribirRaw(data);
    }

    async guardarTipoComponente(tipo) {
        const data = await this.cargarTodo();
        const idx = data.tipos_componente.findIndex(t => t.id === tipo.id);
        const record = {
            id: tipo.id,
            nombre: tipo.nombre,
            tiene_codigo: Boolean(tipo.tiene_codigo),
            sigla: tipo.tiene_codigo ? String(tipo.sigla || '').trim().toUpperCase() : '',
            es_sistema: Boolean(tipo.es_sistema)
        };
        if (idx >= 0) data.tipos_componente[idx] = record;
        else data.tipos_componente.push(record);
        this.#escribirRaw(data);
        return record;
    }

    async eliminarTipoComponente(id) {
        const data = await this.cargarTodo();
        data.tipos_componente = data.tipos_componente.filter(t => t.id !== id);
        this.#escribirRaw(data);
    }

    async guardarPlantilla(plantilla) {
        const data = await this.cargarTodo();
        const plain = plantilla instanceof PlantillaRemito ? plantilla.toJSON() : clonarProfundo(plantilla);
        const idx = data.plantillas.findIndex(p => p.id === plain.id);
        if (idx >= 0) data.plantillas[idx] = plain;
        else data.plantillas.push(plain);
        data.plantillas.sort((a, b) => (Number(a.orden ?? 100) - Number(b.orden ?? 100)) || a.nombre.localeCompare(b.nombre));
        this.#escribirRaw(data);
        return plain;
    }

    async eliminarPlantilla(id) {
        const data = await this.cargarTodo();
        data.plantillas = data.plantillas.filter(p => p.id !== id);
        this.#escribirRaw(data);
    }
}

// ── REPOSITORIO SUPABASE (PostgreSQL en la nube) ─────────────────────────────

class RepositorioDatosSupabase extends IRepositorioDatos {
    #client;

    constructor(client) {
        super();
        this.#client = client;
    }

    async cargarTodo() {
        const [sucursales, sectores, tipos_componente, plantillas] = await Promise.all([
            this.#client.select('sucursales', 'select=id,nombre,activa&order=id.asc'),
            this.#client.select('sectores', 'select=id,nombre,orden&order=orden.asc,nombre.asc'),
            this.#client.select('tipos_componente', 'select=id,nombre,tiene_codigo,sigla,es_sistema&order=nombre.asc'),
            this.#client.select('plantillas', 'select=id,nombre,orden,tipo_componente_id,tipo_flujo,usar_como_remito,usar_como_adicional,tiene_codigo,sigla_codigo,config,es_sistema&order=orden.asc,nombre.asc')
        ]);

        return {
            sucursales: Array.isArray(sucursales) ? sucursales : [],
            sectores: Array.isArray(sectores) ? sectores : [],
            tipos_componente: Array.isArray(tipos_componente) ? tipos_componente : [],
            plantillas: Array.isArray(plantillas) ? plantillas : []
        };
    }

    async guardarSucursal(suc) {
        const payload = { id: Number(suc.id), nombre: String(suc.nombre).trim(), activa: true, updated_at: new Date().toISOString() };
        const res = await this.#client.upsert('sucursales', payload);
        return Array.isArray(res) ? res[0] : payload;
    }

    async eliminarSucursal(id) {
        await this.#client.deleteById('sucursales', id);
    }

    async guardarSector(sec) {
        const payload = { id: sec.id, nombre: sec.nombre, orden: Number(sec.orden || 0), updated_at: new Date().toISOString() };
        const res = await this.#client.upsert('sectores', payload);
        return Array.isArray(res) ? res[0] : payload;
    }

    async eliminarSector(id) {
        await this.#client.deleteById('sectores', id);
    }

    async guardarTipoComponente(tipo) {
        const payload = {
            id: tipo.id,
            nombre: tipo.nombre,
            tiene_codigo: Boolean(tipo.tiene_codigo),
            sigla: tipo.tiene_codigo ? String(tipo.sigla || '').trim().toUpperCase() : '',
            es_sistema: Boolean(tipo.es_sistema),
            updated_at: new Date().toISOString()
        };
        const res = await this.#client.upsert('tipos_componente', payload);
        return Array.isArray(res) ? res[0] : payload;
    }

    async eliminarTipoComponente(id) {
        await this.#client.deleteById('tipos_componente', id);
    }

    async guardarPlantilla(plantilla) {
        const plain = plantilla instanceof PlantillaRemito ? plantilla.toJSON() : clonarProfundo(plantilla);
        const payload = {
            id: plain.id,
            nombre: plain.nombre,
            orden: Number(plain.orden ?? 100),
            tipo_componente_id: plain.tipo_componente_id || null,
            tipo_flujo: plain.tipo_flujo || 'entrega',
            usar_como_remito: Boolean(plain.usar_como_remito),
            usar_como_adicional: Boolean(plain.usar_como_adicional),
            tiene_codigo: Boolean(plain.tiene_codigo),
            sigla_codigo: plain.tiene_codigo ? String(plain.sigla_codigo || '').trim().toUpperCase() : '',
            config: plain.config || {},
            es_sistema: Boolean(plain.es_sistema),
            updated_at: new Date().toISOString()
        };
        const res = await this.#client.upsert('plantillas', payload);
        return Array.isArray(res) ? res[0] : payload;
    }

    async eliminarPlantilla(id) {
        await this.#client.deleteById('plantillas', id);
    }

    async guardarTodo(snapshot) {
        const now = new Date().toISOString();
        if (snapshot.sucursales?.length) {
            await this.#client.upsert('sucursales', snapshot.sucursales.map(s => ({
                id: Number(s.id),
                nombre: String(s.nombre).trim(),
                activa: true,
                updated_at: now
            })));
        }
        if (snapshot.sectores?.length) {
            await this.#client.upsert('sectores', snapshot.sectores.map((s, i) => ({
                id: s.id,
                nombre: s.nombre,
                orden: Number(s.orden ?? i + 1),
                updated_at: now
            })));
        }
        if (snapshot.tipos_componente?.length) {
            await this.#client.upsert('tipos_componente', snapshot.tipos_componente.map(t => ({
                id: t.id,
                nombre: t.nombre,
                tiene_codigo: Boolean(t.tiene_codigo),
                sigla: t.tiene_codigo ? String(t.sigla || '').trim().toUpperCase() : '',
                es_sistema: Boolean(t.es_sistema),
                updated_at: now
            })));
        }
        if (snapshot.plantillas?.length) {
            await this.#client.upsert('plantillas', snapshot.plantillas.map((p, i) => ({
                id: p.id,
                nombre: p.nombre,
                orden: Number(p.orden ?? i + 1),
                tipo_componente_id: p.tipo_componente_id || null,
                tipo_flujo: p.tipo_flujo || 'entrega',
                usar_como_remito: Boolean(p.usar_como_remito),
                usar_como_adicional: Boolean(p.usar_como_adicional),
                tiene_codigo: Boolean(p.tiene_codigo),
                sigla_codigo: p.tiene_codigo ? String(p.sigla_codigo || '').trim().toUpperCase() : '',
                config: p.config || {},
                es_sistema: Boolean(p.es_sistema),
                updated_at: now
            })));
        }
    }
}

// ── SERVICIO CENTRAL DE DATOS (ORQUESTADOR) ──────────────────────────────────

class DataStoreService {
    static CONFIG_KEY = 'mz_remitos_supabase_config_v1';

    #repoLocal;
    #repoSupabase;
    #supabaseClient;
    #modo; // 'local' | 'supabase' | 'error_fallback'
    #ultimoError;
    #listeners = [];

    // Caché en memoria con objetos de dominio
    #sucursales = [];
    #sectores = [];
    #tiposComponente = [];
    #plantillas = [];

    constructor() {
        this.#repoLocal = new RepositorioDatosLocal();
        this.#repoSupabase = null;
        this.#supabaseClient = null;
        this.#modo = 'local';
        this.#ultimoError = null;
        this.#cargarConfigSupabase();
    }

    // ── Configuración Supabase ──────────────────────────────────────────────

    #cargarConfigSupabase() {
        let cfg = { url: '', anonKey: '' };
        try {
            const saved = localStorage.getItem(DataStoreService.CONFIG_KEY);
            if (saved) {
                cfg = JSON.parse(saved);
            } else if (window.SUPABASE_DEFAULT_CONFIG && window.SUPABASE_DEFAULT_CONFIG.url) {
                cfg = {
                    url: window.SUPABASE_DEFAULT_CONFIG.url,
                    anonKey: window.SUPABASE_DEFAULT_CONFIG.anonKey
                };
            }
        } catch (err) {
            console.warn('Error leyendo configuración de Supabase:', err);
        }

        const client = new SupabaseRestClient(cfg.url, cfg.anonKey);
        if (client.isConfigured()) {
            this.#supabaseClient = client;
            this.#repoSupabase = new RepositorioDatosSupabase(client);
        } else {
            this.#supabaseClient = null;
            this.#repoSupabase = null;
        }
    }

    getSupabaseConfig() {
        if (this.#supabaseClient) {
            return {
                url: this.#supabaseClient.getUrl(),
                anonKey: this.#supabaseClient.getAnonKey()
            };
        }
        try {
            const saved = localStorage.getItem(DataStoreService.CONFIG_KEY);
            if (saved) return JSON.parse(saved);
        } catch { /* ignore */ }
        return {
            url: (window.SUPABASE_DEFAULT_CONFIG && window.SUPABASE_DEFAULT_CONFIG.url) || '',
            anonKey: (window.SUPABASE_DEFAULT_CONFIG && window.SUPABASE_DEFAULT_CONFIG.anonKey) || ''
        };
    }

    getEstadoConexion() {
        return {
            modo: this.#modo,
            supabaseConfigurado: Boolean(this.#supabaseClient && this.#supabaseClient.isConfigured()),
            ultimoError: this.#ultimoError
        };
    }

    suscribir(listener) {
        if (typeof listener === 'function') this.#listeners.push(listener);
    }

    #notificar() {
        this.#listeners.forEach(fn => {
            try { fn(this); } catch (e) { console.error(e); }
        });
    }

    #hidratarCache(snapshot) {
        this.#sucursales = (snapshot.sucursales || [])
            .map(s => new Sucursal(s.id, s.nombre))
            .sort((a, b) => a.getId() - b.getId());

        this.#sectores = (snapshot.sectores || [])
            .map((s, idx) => new Sector(s.id, s.nombre, s.orden ?? idx + 1))
            .sort((a, b) => (a.getOrden() - b.getOrden()) || a.getNombre().localeCompare(b.getNombre()));

        this.#tiposComponente = (snapshot.tipos_componente || [])
            .map(t => new TipoComponente(t.id, t.nombre, t.tiene_codigo, t.sigla, t.es_sistema))
            .sort((a, b) => a.getNombre().localeCompare(b.getNombre()));

        this.#plantillas = (snapshot.plantillas || [])
            .map(p => new PlantillaRemito(p))
            .sort((a, b) => (a.orden - b.orden) || a.nombre.localeCompare(b.nombre));
    }

    exportarSnapshot() {
        return {
            version: 1,
            exportado_en: new Date().toISOString(),
            sucursales: this.#sucursales.map(s => ({ id: s.getId(), nombre: s.getNombre() })),
            sectores: this.#sectores.map(s => s.toJSON()),
            tipos_componente: this.#tiposComponente.map(t => t.toJSON()),
            plantillas: this.#plantillas.map(p => p.toJSON())
        };
    }

    // ── Inicialización ──────────────────────────────────────────────────────

    async inicializar() {
        this.#ultimoError = null;
        if (this.#repoSupabase) {
            try {
                let remote = await this.#repoSupabase.cargarTodo();
                // Si Supabase está recién creado sin plantillas, subimos las iniciales automáticamente
                const localSnap = await this.#repoLocal.cargarTodo();
                const faltaSemilla = !remote.plantillas.length || !remote.sucursales.length || !remote.sectores.length || !remote.tipos_componente.length;
                if (faltaSemilla) {
                    const merged = {
                        sucursales: remote.sucursales.length ? remote.sucursales : localSnap.sucursales,
                        sectores: remote.sectores.length ? remote.sectores : localSnap.sectores,
                        tipos_componente: remote.tipos_componente.length ? remote.tipos_componente : localSnap.tipos_componente,
                        plantillas: remote.plantillas.length ? remote.plantillas : localSnap.plantillas
                    };
                    await this.#repoSupabase.guardarTodo(merged);
                    remote = await this.#repoSupabase.cargarTodo();
                }
                await this.#repoLocal.guardarTodo(remote);
                this.#hidratarCache(remote);
                this.#modo = 'supabase';
                this.#notificar();
                return this.getEstadoConexion();
            } catch (err) {
                console.warn('Fallo conexión a Supabase, usando respaldo local:', err);
                this.#ultimoError = err.message || String(err);
                const local = await this.#repoLocal.cargarTodo();
                this.#hidratarCache(local);
                this.#modo = 'error_fallback';
                this.#notificar();
                return this.getEstadoConexion();
            }
        }

        const local = await this.#repoLocal.cargarTodo();
        this.#hidratarCache(local);
        this.#modo = 'local';
        this.#notificar();
        return this.getEstadoConexion();
    }

    async configurarSupabase(url, anonKey) {
        const cleanUrl = String(url || '').trim().replace(/\/+$/, '');
        const cleanKey = String(anonKey || '').trim();

        if (!cleanUrl && !cleanKey) {
            localStorage.removeItem(DataStoreService.CONFIG_KEY);
            this.#supabaseClient = null;
            this.#repoSupabase = null;
            this.#modo = 'local';
            this.#ultimoError = null;
            this.#notificar();
            return { ok: true, mensaje: 'Desconectado de Supabase. Trabajando en modo local.' };
        }

        const testClient = new SupabaseRestClient(cleanUrl, cleanKey);
        if (!testClient.isConfigured()) {
            throw new Error('Ingresá una URL válida (https://...supabase.co) y la Anon Key.');
        }

        await testClient.testConnection();

        localStorage.setItem(DataStoreService.CONFIG_KEY, JSON.stringify({ url: cleanUrl, anonKey: cleanKey }));
        this.#supabaseClient = testClient;
        this.#repoSupabase = new RepositorioDatosSupabase(testClient);
        await this.inicializar();
        return { ok: true, mensaje: 'Conectado correctamente a Supabase.' };
    }

    async sincronizarLocalASupabase() {
        if (!this.#repoSupabase) {
            throw new Error('Primero configurá la URL y Anon Key de Supabase.');
        }
        const snap = this.exportarSnapshot();
        await this.#repoSupabase.guardarTodo(snap);
        await this.inicializar();
        return true;
    }

    async importarSnapshot(snapshot) {
        if (!snapshot || !Array.isArray(snapshot.plantillas) || !Array.isArray(snapshot.sucursales)) {
            throw new Error('El archivo JSON no tiene un formato de respaldo válido.');
        }
        const limpio = {
            sucursales: snapshot.sucursales || [],
            sectores: snapshot.sectores || [],
            tipos_componente: snapshot.tipos_componente || [],
            plantillas: snapshot.plantillas || []
        };
        await this.#repoLocal.guardarTodo(limpio);
        if (this.#repoSupabase && this.#modo === 'supabase') {
            await this.#repoSupabase.guardarTodo(limpio);
        }
        this.#hidratarCache(limpio);
        this.#notificar();
    }

    async restaurarDefaults(soloPlantillas = false) {
        const defaults = this.#repoLocal.crearSnapshotDefaults();
        const actual = this.exportarSnapshot();
        const nuevo = soloPlantillas
            ? { ...actual, plantillas: defaults.plantillas }
            : defaults;

        await this.#repoLocal.guardarTodo(nuevo);
        if (this.#repoSupabase && this.#modo === 'supabase') {
            await this.#repoSupabase.guardarTodo(nuevo);
        }
        this.#hidratarCache(nuevo);
        this.#notificar();
    }

    // ── Consultas síncronas desde caché ─────────────────────────────────────

    obtenerSucursales() { return [...this.#sucursales]; }
    buscarSucursalPorCodigo(codigo) {
        const cod = Number(codigo);
        return this.#sucursales.find(s => s.getId() === cod) || null;
    }

    obtenerSectores() { return [...this.#sectores]; }
    buscarSectorPorId(id) { return this.#sectores.find(s => s.getId() === id) || null; }

    obtenerTiposComponente() { return [...this.#tiposComponente]; }
    buscarTipoComponentePorId(id) { return this.#tiposComponente.find(t => t.getId() === id) || null; }

    obtenerPlantillas() { return [...this.#plantillas]; }
    obtenerPlantillasRemito() { return this.#plantillas.filter(p => p.usar_como_remito); }
    obtenerPlantillasAdicional() { return this.#plantillas.filter(p => p.usar_como_adicional); }
    buscarPlantillaPorId(id) { return this.#plantillas.find(p => p.id === id) || null; }

    // ── Operaciones CRUD (escriben en Supabase si está activo + espejo local) ─

    async guardarSucursal(id, nombre) {
        const numId = Number(id);
        const cleanNombre = String(nombre || '').trim().toUpperCase();
        if (Number.isNaN(numId) || numId < 0) throw new Error('El código de sucursal debe ser un número válido (0 o mayor).');
        if (!cleanNombre) throw new Error('El nombre de la sucursal es obligatorio.');

        const rec = { id: numId, nombre: cleanNombre };
        if (this.#repoSupabase && this.#modo === 'supabase') {
            await this.#repoSupabase.guardarSucursal(rec);
        }
        await this.#repoLocal.guardarSucursal(rec);
        const snap = await this.#repoLocal.cargarTodo();
        this.#hidratarCache(snap);
        this.#notificar();
    }

    async eliminarSucursal(id) {
        if (this.#sucursales.length <= 1) {
            throw new Error('Debe existir al menos una sucursal.');
        }
        if (this.#repoSupabase && this.#modo === 'supabase') {
            await this.#repoSupabase.eliminarSucursal(id);
        }
        await this.#repoLocal.eliminarSucursal(id);
        const snap = await this.#repoLocal.cargarTodo();
        this.#hidratarCache(snap);
        this.#notificar();
    }

    async guardarSector(sectorData) {
        const nombre = String(sectorData.nombre || '').trim();
        if (!nombre) throw new Error('El nombre del sector es obligatorio.');
        const id = sectorData.id ? String(sectorData.id).trim() : generarSlug(nombre, 'sector');
        const orden = Number(sectorData.orden ?? (this.#sectores.length + 1));

        const rec = { id, nombre, orden };
        if (this.#repoSupabase && this.#modo === 'supabase') {
            await this.#repoSupabase.guardarSector(rec);
        }
        await this.#repoLocal.guardarSector(rec);
        const snap = await this.#repoLocal.cargarTodo();
        this.#hidratarCache(snap);
        this.#notificar();
    }

    async eliminarSector(id) {
        if (this.#sectores.length <= 1) {
            throw new Error('Debe existir al menos un sector.');
        }
        if (this.#repoSupabase && this.#modo === 'supabase') {
            await this.#repoSupabase.eliminarSector(id);
        }
        await this.#repoLocal.eliminarSector(id);
        const snap = await this.#repoLocal.cargarTodo();
        this.#hidratarCache(snap);
        this.#notificar();
    }

    async guardarTipoComponente(tipoData) {
        const nombre = String(tipoData.nombre || '').trim();
        if (!nombre) throw new Error('El nombre del tipo de componente es obligatorio.');
        const id = tipoData.id ? String(tipoData.id).trim() : generarSlug(nombre, 'comp');
        const tieneCodigo = Boolean(tipoData.tiene_codigo);
        const sigla = tieneCodigo ? String(tipoData.sigla || '').trim().toUpperCase() : '';
        if (tieneCodigo && !sigla) {
            throw new Error('Si el tipo de componente lleva código, debés indicar una sigla (ej: PC, CH, IM).');
        }

        const rec = { id, nombre, tiene_codigo: tieneCodigo, sigla, es_sistema: Boolean(tipoData.es_sistema) };
        if (this.#repoSupabase && this.#modo === 'supabase') {
            await this.#repoSupabase.guardarTipoComponente(rec);
        }
        await this.#repoLocal.guardarTipoComponente(rec);
        const snap = await this.#repoLocal.cargarTodo();
        this.#hidratarCache(snap);
        this.#notificar();
        return rec;
    }

    async eliminarTipoComponente(id) {
        if (this.#repoSupabase && this.#modo === 'supabase') {
            await this.#repoSupabase.eliminarTipoComponente(id);
        }
        await this.#repoLocal.eliminarTipoComponente(id);
        const snap = await this.#repoLocal.cargarTodo();
        this.#hidratarCache(snap);
        this.#notificar();
    }

    async guardarPlantilla(plantillaData) {
        const nombre = String(plantillaData.nombre || '').trim();
        if (!nombre) throw new Error('El nombre de la plantilla es obligatorio.');

        let id = plantillaData.id ? String(plantillaData.id).trim() : generarSlug(nombre, 'plantilla');
        if (!plantillaData.id && this.buscarPlantillaPorId(id)) {
            id = `${id}_${Date.now().toString().slice(-4)}`;
        }

        const plantilla = new PlantillaRemito({
            ...plantillaData,
            id,
            nombre,
            orden: plantillaData.orden ?? (this.#plantillas.length + 1)
        });

        if (!plantilla.usar_como_remito && !plantilla.usar_como_adicional) {
            throw new Error('Marcá al menos una opción: "Usar como Remito Principal" o "Usar como Componente Adicional".');
        }

        if (!plantilla.config.secciones.length) {
            throw new Error('La plantilla debe tener al menos una sección con campos.');
        }

        if (this.#repoSupabase && this.#modo === 'supabase') {
            await this.#repoSupabase.guardarPlantilla(plantilla);
        }
        await this.#repoLocal.guardarPlantilla(plantilla);
        const snap = await this.#repoLocal.cargarTodo();
        this.#hidratarCache(snap);
        this.#notificar();
        return plantilla;
    }

    async eliminarPlantilla(id) {
        const remitos = this.obtenerPlantillasRemito();
        const objetivo = this.buscarPlantillaPorId(id);
        if (objetivo && objetivo.usar_como_remito && remitos.length <= 1) {
            throw new Error('Debe quedar al menos una plantilla disponible como Remito Principal.');
        }
        if (this.#repoSupabase && this.#modo === 'supabase') {
            await this.#repoSupabase.eliminarPlantilla(id);
        }
        await this.#repoLocal.eliminarPlantilla(id);
        const snap = await this.#repoLocal.cargarTodo();
        this.#hidratarCache(snap);
        this.#notificar();
    }
}
