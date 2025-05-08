// Estado global
let endpointId = 0;
let nodoIdCounter = 0;
let conexiones = [];
let conectandoDesde = null;
let nodos = [];

// Referencias DOM
const btnNuevoNodo = document.getElementById("btnNuevoNodo");
const modalCrear = document.getElementById("modalCrearNodo");
const formNodo = document.getElementById("formNodo");
const btnCrear = document.getElementById("btnCrear");
const btnExport = document.getElementById("btnExport");
const btnImport = document.getElementById("btnImport");
const fileImport = document.getElementById("fileImport");

const nombreInput = document.getElementById("nombreNodo");
const descInput = document.getElementById("descripcionNodo");
const tipoSel = document.getElementById("tipoNodo");

const catSel = document.getElementById("categoriaCond");
const subSel = document.getElementById("subcampoCond");
const nivSel = document.getElementById("subnivelCond");
const opSel = document.getElementById("operadorCond");
const valInput = document.getElementById("valorCond");
const blockCond = document.getElementById("configCondicion");

const moduloSel = document.getElementById("moduloAccion");
const camposCont = document.getElementById("camposAccion");
const blockAccion = document.getElementById("configAccion");

// Jerarquía de Condición
const jerarquia = {
    ultimomensaje: {
        usuario: ["tiempo", "contexto", "palabra clave", "multimedia"],
        operativo: ["tiempo", "contexto", "palabra clave", "multimedia"]
    },
    datoscliente: {
        datospersonales: ["nombre", "correo", "teléfono", "documento"],
        "compras activas": ["fecha de última compra"],
        "cotizaciones activas": ["fecha de cotización", "estado"],
        "estado de proceso": ["etapa", "responsable"]
    },
    "apis externas": {
        Pasarelas: ["estado", "última respuesta", "token"],
        "APIs de terceros": ["estado", "última respuesta", "token"],
        "Widgets dinámicos": ["estado", "última respuesta", "token"]
    }
};

// Configuración de Acción
const modulosAccion = {
    ubicacion: [
        { id: "coordenadas", label: "Coordenadas (lat,lng)", type: "text", required: true },
        { id: "etiqueta", label: "Etiqueta de ubicación", type: "text" }
    ],
    imagen: [
        { id: "url", label: "URL de imagen", type: "url", required: true },
        { id: "descripcion", label: "Descripción", type: "text" }
    ],
    mensaje: [
        { id: "texto", label: "Texto del mensaje", type: "text", required: true },
        { id: "contextoIA", label: "Incluir contexto IA", type: "checkbox" }
    ],
    flujo: [
        { id: "idFlujo", label: "ID del flujo", type: "text", required: true },
        { id: "nombreFlujo", label: "Nombre referencial", type: "text" }
    ],
    plantilla: [
        { id: "idPlantilla", label: "ID Plantilla", type: "text", required: true },
        { id: "variables", label: "Variables JSON", type: "textarea" }
    ]
};

// Utilidades
const llenar = (sel, arr) => {
    sel.innerHTML = "";
    arr.forEach(v => sel.insertAdjacentHTML("beforeend", `<option>${v}</option>`));
};
const esNumero = v => /^\d+(\.\d+)?$/.test(v.trim());

// Formulario
function validarForm() {
    let ok = nombreInput.value.trim() && tipoSel.value;
    if (tipoSel.value === "Condición") {
        ok = ok && catSel.value && subSel.value && nivSel.value && valInput.value.trim();
        if (/tiempo|fecha/i.test(nivSel.value)) ok = ok && esNumero(valInput.value);
    }
    if (tipoSel.value === "Acción") {
        ok = ok && moduloSel.value;
        const campos = modulosAccion[moduloSel.value] || [];
        campos.forEach(c => {
            const val = document.getElementById("accion_" + c.id);
            if (c.required && val && !val.value.trim()) {
                ok = false;
            }
            if (c.type === "checkbox" && c.required && !val.checked) {
                ok = false;
            }
        });
        const val = document.getElementById("accion_" + c.id);
        if (c.required && val && !val.value.trim()) ok = false;
    };

    btnCrear.disabled = !ok;
}

function cargarJerarquia() {
    llenar(catSel, Object.keys(jerarquia));
    catSel.selectedIndex = 0;
    cargarSub();
}
function cargarSub() {
    llenar(subSel, Object.keys(jerarquia[catSel.value] || {}));
    subSel.selectedIndex = 0;
    cargarNiv();
}
function cargarNiv() {
    llenar(nivSel, jerarquia[catSel.value]?.[subSel.value] || []);
    nivSel.selectedIndex = 0;
    validarForm();
}
function generarCamposAccion(modulo) {
    camposCont.innerHTML = "";
    const campos = modulosAccion[modulo] || [];
    campos.forEach(c => {
        const val = document.getElementById("accion_" + c.id);
        if (c.required && val && !val.value.trim()) {
            ok = false;
        }
        if (c.type === "checkbox" && c.required && !val.checked) {
            ok = false;
        }
    });
    const div = document.createElement("div");
    div.className = "mb-2";
    div.innerHTML = `<label>${c.label}</label>` +
        (c.type === "textarea"
            ? `<textarea class="form-control" id="accion_${c.id}" rows="2"></textarea>`
            : `<input class="form-control" id="accion_${c.id}" type="${c.type}">`);
    camposCont.appendChild(div);
    // Activar validación al modificar
    const el = document.getElementById("accion_" + c.id);
    if (el) el.oninput = validarForm;
    if (c.type === "checkbox" && el) el.onchange = validarForm;
};


// Eventos de cambio
tipoSel.onchange = () => {
    const tipo = tipoSel.value;
    blockCond.style.display = tipo === "Condición" ? "block" : "none";
    blockAccion.style.display = tipo === "Acción" ? "block" : "none";
    if (tipo === "Condición") cargarJerarquia();
    if (tipo === "Acción") {
        moduloSel.value = "";
        camposCont.innerHTML = "";
    }
    validarForm();
};
catSel.onchange = cargarSub;
subSel.onchange = cargarNiv;
nivSel.oninput = validarForm;
valInput.oninput = validarForm;
nombreInput.oninput = validarForm;
moduloSel.onchange = () => {
    generarCamposAccion(moduloSel.value);
    validarForm();
};

btnNuevoNodo.onclick = () => {
    formNodo.reset();
    tipoSel.value = "";
    blockCond.style.display = "none";
    blockAccion.style.display = "none";
    btnCrear.disabled = true;
    bootstrap.Modal.getOrCreateInstance(modalCrear).show();
};

formNodo.onsubmit = e => {
    e.preventDefault();
    const id = "nodo_" + (++nodoIdCounter);
    const nombre = nombreInput.value.trim();
    const desc = descInput.value.trim();
    const tipo = tipoSel.value;
    let cfg = {};
    if (tipo === "Condición") {
        cfg = {
            cat: catSel.value,
            sub: subSel.value,
            niv: nivSel.value,
            op: opSel.value,
            val: valInput.value.trim()
        };
    }
    if (tipo === "Acción") {
        const mod = moduloSel.value;
        cfg = { modulo: mod, parametros: {} };
        const campos = modulosAccion[mod] || [];
        campos.forEach(c => {
            const val = document.getElementById("accion_" + c.id);
            if (c.required && val && !val.value.trim()) {
                ok = false;
            }
            if (c.type === "checkbox" && c.required && !val.checked) {
                ok = false;
            }
        });
        const el = document.getElementById("accion_" + c.id);
        if (!el) return;
        cfg.parametros[c.id] = c.type === "checkbox" ? el.checked : el.value.trim();
    };

    crearNodo(id, nombre, desc, tipo, cfg);
    bootstrap.Modal.getInstance(modalCrear).hide();
};

function crearNodo(id, nombre, desc, tipo, cfg, x = 100, y = 100) {
    const nodo = document.createElement("div");
    nodo.className = "nodo";
    nodo.dataset.id = id;
    nodo.style.left = x + "px";
    nodo.style.top = y + "px";

    nodo.innerHTML = `
        <div class="titulo">${nombre}</div>
        <div class="descripcion">${desc}</div>
        <hr>
        ${tipo === "Condición"
            ? `<small>${cfg.cat} → ${cfg.sub} → <strong>${cfg.niv}</strong> (${cfg.op} ${cfg.val})</small>`
            : tipo === "Acción"
                ? `<small><strong>${cfg.modulo}</strong><br>${Object.entries(cfg.parametros || {})
                    .map(([k, v]) => `${k}: ${v}`)
                    .join("<br>")}</small>`
                : `<small><em>${tipo}</em></small>`
        }
    `;

    document.getElementById("canvas").appendChild(nodo);
    nodos.push({ id, nombre, desc, tipo, cfg, x, y });
}

// Exportar e importar
function exportarJSON() {
    const data = { nodos, conexiones };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "flujo.json";
    a.click();
    URL.revokeObjectURL(a.href);
}
btnExport.onclick = exportarJSON;

btnImport.onclick = () => fileImport.click();
fileImport.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
        try {
            const data = JSON.parse(evt.target.result);
            reconstruirFlujo(data);
        } catch (err) {
            alert("JSON inválido");
        }
    };
    reader.readAsText(file);
};

function reconstruirFlujo({ nodos: nArr = [], conexiones: conArr = [] }) {
    document.getElementById("canvas").querySelectorAll(".nodo").forEach(n => n.remove());
    conexiones.length = 0; nodos.length = 0; endpointId = 0;

    nArr.forEach(nd => {
        crearNodo(nd.id, nd.nombre, nd.desc, nd.tipo, nd.cfg, nd.x, nd.y);
        nodos.push({ ...nd });
    });

    conArr.forEach(c => conexiones.push({ ...c }));
}
