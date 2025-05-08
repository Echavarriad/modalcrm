/***** Estado global *****/
let endpointId = 0;
let nodoIdCounter = 0;
let conexiones = [];
let conectandoDesde = null;
let nodos = [];
/***** Jerarquía para nodos tipo Condición *****/
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
const modulosAccion = {
    mensaje: [
        { id: "texto", label: "Texto del mensaje", type: "text", required: true },
        { id: "contextoIA", label: "Incluir contexto IA", type: "checkbox" }
    ],
    flujo: [
        { id: "idFlujo", label: "ID del flujo", type: "text", required: true },
        { id: "nombreFlujo", label: "Nombre referencial", type: "text", required: true }
    ],
    plantilla: [
        { id: "idPlantilla", label: "ID Plantilla", type: "text", required: true },
        { id: "variables", label: "Variables JSON", type: "textarea", required: true }
    ]
};
/***** Referencias DOM principales *****/
const btnNuevoNodo = document.getElementById("btnNuevoNodo");
const modalCrear = document.getElementById("modalCrearNodo");
const formNodo = document.getElementById("formNodo");
const btnCrear = document.getElementById("btnCrear");
const btnExport    = document.getElementById("btnExport");
const btnImport    = document.getElementById("btnImport");
const fileImport   = document.getElementById("fileImport");
const nombreInput = document.getElementById("nombreNodo");
const descInput = document.getElementById("descripcionNodo");
const tipoSel = document.getElementById("tipoNodo");
const moduloSel = document.getElementById("moduloAccion");
const camposCont = document.getElementById("camposAccion");
const blockAccion = document.getElementById("configAccion");

const catSel = document.getElementById("categoriaCond");
const subSel = document.getElementById("subcampoCond");
const nivSel = document.getElementById("subnivelCond");
const opSel = document.getElementById("operadorCond");
const valInput = document.getElementById("valorCond");
const blockCond = document.getElementById("configCondicion");

/***** Utilidades *****/
const llenar = (sel, arr) => {
    sel.innerHTML = "";
    arr.forEach(v => sel.insertAdjacentHTML("beforeend", `<option>${v}</option>`));
};

const esNumero = v => /^\d+(\.\d+)?$/.test(v.trim());

/***** Validación del formulario *****/
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
        if (c.required && val && !val.value.trim()) ok = false;
        }); /*  */
    }
    btnCrear.disabled = !ok;
}

/***** Carga jerárquica *****/
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

/***** Listeners jerárquicos *****/
tipoSel.onchange = () => {
    blockCond.style.display = tipoSel.value === "Condición" ? "block" : "none";
    blockAccion.style.display = tipoSel.value ==="Acción" ? "block" : "none";
    if (tipoSel.value === "Condición") cargarJerarquia();
    if (tipoSel.value === "Acción") {
        moduloSel.value = "";
        camposCont.innerHTML = "";
    }
    validarForm();
};
catSel.onchange = cargarSub;
subSel.onchange = cargarNiv;
nivSel.onchange = validarForm;
valInput.oninput = validarForm;
nombreInput.oninput = validarForm;

/***** Abrir modal *****/
btnNuevoNodo.onclick = () => {
    formNodo.reset();
    tipoSel.value = "";
    blockCond.style.display = "none";
    btnCrear.disabled = true;
    bootstrap.Modal.getOrCreateInstance(modalCrear).show();
};

/***** Manejo submit del modal *****/
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
    let ok= nombreInput.value.trim() && tipoSel.value;
    if (tipoSel.value === "Acción") {
        ok = ok && moduloSel.value;
        const campos = modulosAccion[moduloSel.value] || [];
        campos.forEach(c => {
            const val = document.getElementById("accion_" + c.id);
            if (c.required) {
                if (c.type === "checkbox" && !val.checked) {
                    ok = false;
                } else if (c.type !== "checkbox" && (!val || !val.value.trim())) {
                    ok = false;
                }
            }
        });
    }
    crearNodo(id, nombre, desc, tipo, cfg);
    bootstrap.Modal.getInstance(modalCrear).hide();
};
moduloSel.onchange = () => {
    generarCamposAccion(moduloSel.value);
    validarForm();
};

function generarCamposAccion(modulo) {
    camposCont.innerHTML = "";
    const campos = modulosAccion[modulo] || [];
    campos.forEach(c => {
        const div = document.createElement("div");
        div.className = "mb-2";
        div.innerHTML = `<label>${c.label}</label>` +
            (c.type === "textarea"
                ? `<textarea class="form-control" id="accion_${c.id}" rows="2"></textarea>`
                : `<input class="form-control" id="accion_${c.id}" type="${c.type}">`);
        camposCont.appendChild(div);
    });

    // 🧠 Importante: activar validarForm al cambiar cualquier campo dinámico
    campos.forEach(c => {
        const el = document.getElementById("accion_" + c.id);
        if (el) el.oninput = validarForm;
        if (c.type === "checkbox" && el) el.onchange = validarForm;
    });
    
}
/***** Crear nodo visual *****/
function crearNodo(id, nombre, desc, tipo, cfg,
    x = 120 + Math.random() * 200,
    y = 120 + Math.random() * 150) {

    /* contenedor nodo */
    const nodo = document.createElement("div");
    nodo.className = "nodo";
    nodo.dataset.id = id;
    nodo.style.left = x + "px";
    nodo.style.top = y + "px";
    nodo.style.borderColor = {
        Inicio: "#0d6efd", Acción: "#198754",
        Condición: "#ffc107", Fin: "#dc3545"
    }[tipo] || "#ccc";

    nodo.innerHTML = `
    <div class="titulo">${nombre}</div>
    <div class="descripcion">${desc}</div>
    <hr>
    ${tipo === "Condición"
            ? `<small>${cfg.cat} → ${cfg.sub} → <strong>${cfg.niv}</strong> (${cfg.op} ${cfg.val})</small>`
            : `<small><em>${tipo}</em></small>`
        }
  `;

    /* entrada */
    const entrada = document.createElement("div");
    entrada.className = "endpoint entrada";
    entrada.id = "ep_" + (++endpointId);
    entrada.onclick = () => {
        if (conectandoDesde) {
            conexiones.push({ from: conectandoDesde.id, to: entrada.id });
            conectandoDesde = null;
            dibujarLineas();
        }
    };
    nodo.appendChild(entrada);

    /* salidas */
    const addSalida = (label, color, top) => {
        const s = document.createElement("div");
        s.className = "endpoint salida";
        s.style.background = color;
        s.style.top = top;
        s.title = label;
        s.id = "ep_" + (++endpointId);
        s.onclick = () => conectandoDesde = s;
        s.onmouseenter = tipIn;
        s.onmouseleave = tipOut;
        nodo.appendChild(s);
    };

    if (tipo === "Condición") {
        addSalida("Sí", "#28a745", "30%");
        addSalida("No", "#dc3545", "70%");
    } else if (tipo === "Acción") {
        addSalida("Nuevo Cliente", "#0d6efd", "25%");
        addSalida("Cliente Asignado", "#20c997", "50%");
        addSalida("Cliente Con Porceso", "#6610f2", "75%");
    } else {
        addSalida("out", "#0d6efd", "50%");
    }

    document.getElementById("canvas").appendChild(nodo);
    hacerDraggable(nodo);
    nodos.push({
        id, tipo, nombre, desc,
        cfg,                         // configuración (si es Condición)
        x, y                         // posición inicial
    });
}

/***** Tooltip *****/
function tipIn(e) {
    const t = document.createElement("div");
    t.className = "tooltip-float";
    t.textContent = e.target.title;
    t.style.cssText =
        "position:absolute;left:110%;top:50%;transform:translateY(-50%);" +
        "background:#333;color:#fff;padding:2px 6px;font-size:.75em;border-radius:4px;";
    e.target.appendChild(t);
}
function tipOut(e) {
    const t = e.target.querySelector(".tooltip-float");
    if (t) t.remove();
}

/***** Drag básico *****/
function hacerDraggable(el) {
    let ox, oy;
    el.onmousedown = e => {
        if (e.target.classList.contains("endpoint")) return;
        ox = e.offsetX; oy = e.offsetY;
        const mover = ev => {
            el.style.left = (ev.pageX - ox) + "px";
            el.style.top = (ev.pageY - oy) + "px";
            dibujarLineas();
        };
        document.addEventListener("mousemove", mover);
        document.addEventListener("mouseup", () => {
            document.removeEventListener("mousemove", mover);
            // actualizar coordenadas guardadas
            const obj = nodos.find(nd => nd.id === el.dataset.id);
            if (obj) { obj.x = parseInt(el.style.left); obj.y = parseInt(el.style.top); }
        }, { once: true });
    };
}

/***** Líneas *****/
const centro = el => {
    const r = el.getBoundingClientRect();
    return {
        x: r.left + r.width / 2 + scrollX,
        y: r.top + r.height / 2 + scrollY - 8
    }; // 8 px arriba
};

function dibujarLineas() {
    const svg = document.getElementById("lineas");
    svg.innerHTML = "";
    conexiones.forEach((c, i) => {
        const a = document.getElementById(c.from);
        const b = document.getElementById(c.to);
        if (!a || !b) return;

        const p1 = centro(a), p2 = centro(b);
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("stroke", getComputedStyle(a).backgroundColor);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke-width", "2");
        path.setAttribute(
            "d",
            `M ${p1.x},${p1.y - 50} C ${p1.x + 50},${p1.y - 50} ${p2.x - 50},${p2.y - 50} ${p2.x},${p2.y - 50}`
        );

        path.oncontextmenu = e => {
            e.preventDefault();
            conexiones.splice(i, 1);
            dibujarLineas();
        };
        svg.appendChild(path);
    });
}

/* Auto-crear un nodo Condición de ejemplo (opcional)
crearNodo("nodo_demo","Condición demo","", "Condición",
          {cat:"ultimomensaje",sub:"usuario",niv:"tiempo",op:"==",val:"5"}); */
/********* Exportar *********/
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

/********* Importar *********/
btnImport.onclick = () => fileImport.click();

fileImport.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
        try {
            const data = JSON.parse(evt.target.result);
            reconstruirFlujo(data);
        } catch (err) { alert("JSON inválido"); }
    };
    reader.readAsText(file);
};

/* Limpia y reconstruye */
function reconstruirFlujo({ nodos: nArr = [], conexiones: conArr = [] }) {
    // limpiar UI y arrays
    document.getElementById("canvas").querySelectorAll(".nodo").forEach(n => n.remove());
    conexiones.length = 0; nodos.length = 0; endpointId = 0;
    // recrear nodos
    nArr.forEach(nd => {
        crearNodo(nd.id, nd.nombre, nd.desc, nd.tipo, nd.cfg, nd.x, nd.y);
        nodos.push({ ...nd });                 // re-guardar
    });
    // recrear conexiones
    conArr.forEach(c => conexiones.push({ ...c }));
    dibujarLineas();
}
