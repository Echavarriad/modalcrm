/***** Estado global *****/
let endpointId = 0;
let nodoIdCounter = 0;
let conexiones = [];
let conectandoDesde = null;
let promptsAnalisisDisponibles = [];

let nodos = [];
/***** Jerarquía para nodos tipo Condición *****/
const promptsDisponibles = [
    { id: "saludo", titulo: "Saludo inicial", cuerpo: "Hola, soy tu asistente virtual..." },
    { id: "despedida", titulo: "Despedida", cuerpo: "Gracias por contactarnos..." }
];
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
        { id: "promptId", label: "Prompt", type: "select", required: true },
        { id: "promptTexto", label: "Texto del prompt", type: "textarea", required: true }
    ],
    analisis: [
        { id: "promptId", label: "Prompt", type: "select", required: true },
        { id: "promptTexto", label: "Texto del prompt", type: "textarea", required: true }
    ],
    flujo: [
        { id: "idFlujo", label: "ID del flujo", type: "text", required: true },
        { id: "nombreFlujo", label: "Nombre referencial", type: "text", required: true }
    ],
    plantilla: [
        { id: "idPlantilla", label: "Selecciona plantilla", type: "select", required: true, options: [] }
    ]
};
/***** Referencias DOM principales *****/
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
const moduloSel = document.getElementById("moduloAccion");
const camposCont = document.getElementById("camposAccion");
const blockAccion = document.getElementById("configAccion");

const catSel = document.getElementById("categoriaCond");
const subSel = document.getElementById("subcampoCond");
const nivSel = document.getElementById("subnivelCond");
const opSel = document.getElementById("operadorCond");
const valInput = document.getElementById("valorCond");
const blockCond = document.getElementById("configCondicion");
let plantillasDisponibles = [];
async function fetchPromptsAnalisis() {
    try {
        /*   const res = await fetch("/api/prompts/analisis"); // Ajusta la ruta según tu backend
          if (!res.ok) throw new Error("Error al cargar prompts de análisis");
          const data = await res.json();
          if (!Array.isArray(data)) throw new Error("Formato inesperado"); */

        promptsAnalisisDisponibles = [
            { "id": "verifica_datos", "titulo": "Verificación de datos", "cuerpo": "Analiza si los datos del cliente están completos..." },
            { "id": "riesgo_cliente", "titulo": "Detección de riesgo", "cuerpo": "Evalúa si este cliente presenta señales de riesgo comercial..." }
        ];
    } catch (err) {
        console.error("Fallo en fetchPromptsAnalisis:", err.message);
        promptsAnalisisDisponibles = [];
    }
}
async function cargarPlantillasDesdeAPI() {
    try {
        /*   const res = await fetch("https://tuapi.com/plantillas");
          if (!res.ok) throw new Error("Error al obtener plantillas");
  
          const plantillas = await res.json(); // Esperamos que venga como array de objetos
          const opciones = plantillas.map(p => ({
              value: p.id,
              label: p.nombre || `Plantilla ${p.id}`
          })); */
        const plantillas = [
            {
                "id": "tpl_001",
                "nombre": "Bienvenida",
                "cuerpo": "Hola {{nombre}}, bienvenido a nuestro servicio.",
                "botones": ["Ver más", "Contactar", "Cancelar"]
            },
            {
                "id": "tpl_002",
                "nombre": "Despedida",
                "cuerpo": "Gracias por tu visita, {{nombre}}.",
                "botones": []
            }
        ];
        plantillasDisponibles = plantillas
        const opciones = plantillas.map(p => ({
            value: p.id,
            label: p.nombre || `Plantilla ${p.id}`
        }));
        // Guardar para referencia posterior

        const campoId = modulosAccion.plantilla.find(c => c.id === "idPlantilla");
        if (campoId) campoId.options = opciones;
        // Actualizar las opciones en el módulo de acción

    } catch (error) {
        console.error("Fallo al cargar plantillas:", error);
    }
}
cargarPlantillasDesdeAPI();
fetchPromptsAnalisis()
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
    blockAccion.style.display = tipoSel.value === "Acción" ? "block" : "none";
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

    const id = nodoEditando ? nodoEditando.id : "nodo_" + (++nodoIdCounter);
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
        cfg = { modulo: moduloSel.value };
        if (cfg.modulo === "mensaje") {
            const promptId = document.getElementById("accion_promptId").value;
            const promptTexto = document.getElementById("accion_promptTexto").value;
            cfg.promptId = promptId;
            cfg.promptTexto = promptTexto;
        } else {
            if (cfg.modulo === "analisis") {
                const promptId = document.getElementById("accion_promptId").value;
                const promptTexto = document.getElementById("accion_promptTexto").value;
                cfg.promptId = promptId;
                cfg.promptTexto = promptTexto;
            } else {
                (modulosAccion[moduloSel.value] || []).forEach(c => {
                    const el = document.getElementById("accion_" + c.id);
                    cfg[c.id] = c.type === "checkbox" ? el.checked : el.value.trim();
                });
            }

        }

    }

    // Si estamos editando
    if (nodoEditando) {
        // Reemplazar nodo visual
        const idx = nodos.findIndex(nd => nd.id === id);
        if (idx !== -1) nodos.splice(idx, 1);
        document.querySelector(`[data-id="${id}"]`).remove();
    }

    if (tipo === "Acción") {
        const modulo = moduloSel.value;
        cfg.modulo = modulo;
        if (modulo === "plantilla") {
            const plantilla = plantillasDisponibles.find(p => p.id === document.getElementById("accion_idPlantilla").value);
            if (plantilla) {
                cfg.idPlantilla = plantilla.id;
                cfg.cuerpo = plantilla.cuerpo;
                cfg.botones = plantilla.botones;
            }
        }
    }
    crearNodo(id, nombre, desc, tipo, cfg);
    nodoEditando = null;
    btnCrear.textContent = "Crear Nodo";
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
        let inputHTML = "";
        if (c.type === "textarea") {
            inputHTML = `<textarea class="form-control" id="accion_${c.id}" rows="2"></textarea>`;
        } else if (c.type === "select") {
            const opts = (c.options || []).map(opt =>
                `<option value="${opt.value}">${opt.label}</option>`
            ).join("");
            inputHTML = `<select class="form-select" id="accion_${c.id}">${opts}</select>`;
        } else {
            inputHTML = `<input class="form-control" id="accion_${c.id}" type="${c.type}">`;
        }
        div.innerHTML = `<label>${c.label}</label>${inputHTML}`;
        camposCont.appendChild(div);
    });

    // 🧠 Importante: activar validarForm al cambiar cualquier campo dinámico

    if (modulo === "plantilla") {
        const plantillaSelect = document.getElementById("accion_idPlantilla");
        const infoCont = document.getElementById("infoPlantillaCont");
        const infoTextarea = document.getElementById("infoPlantilla");

        infoCont.style.display = "block";

        const mostrarInfoPlantilla = () => {
            console.log();

            const plantilla = plantillasDisponibles.find(p => p.id === plantillaSelect.value);
            if (!plantilla) {
                infoTextarea.value = "Plantilla no encontrada.";
                return;
            }

            let info = `📝 Cuerpo:\n${plantilla.cuerpo || "Sin contenido"}\n\n`;
            if (plantilla.botones?.length) {
                info += `🔘 Botones:\n- ${plantilla.botones.join("\n- ")}`;
            } else {
                info += `🔘 Botones: ninguno`;
            }
            infoTextarea.value = info;
        };

        mostrarInfoPlantilla();
        plantillaSelect.onchange = () => {
            mostrarInfoPlantilla();
            validarForm();
        };
    } else {
        document.getElementById("infoPlantillaCont").style.display = "none";
        if (modulo === "analisis") {
            const selectPrompt = document.getElementById("accion_promptId");
            const promptTexto = document.getElementById("accion_promptTexto");

            llenar(selectPrompt, ["Personalizado", ...promptsAnalisisDisponibles.map(p => `${p.id} - ${p.titulo}`)]);


            selectPrompt.onchange = () => {
                const val = selectPrompt.value.split(" - ")[0];
                if (val === "Personalizado") {
                    promptTexto.value = "";
                    promptTexto.readOnly = false;
                } else {
                    const p = promptsAnalisisDisponibles.find(p => p.id === val);
                    if (p) {
                        promptTexto.value = p.cuerpo;
                        promptTexto.readOnly = true;
                    }
                }
                validarForm();
            };

            promptTexto.oninput = validarForm;
        }
        if (modulo === "mensaje") {
            const selectPrompt = document.getElementById("accion_promptId");
            const promptTexto = document.getElementById("accion_promptTexto");
        
            llenar(selectPrompt, ["Personalizado", "Crear nuevo prompt", ...promptsDisponibles.map(p => `${p.id} - ${p.titulo}`)]);
        
            const crearCamposNuevoPrompt = () => {
                // Remueve anteriores si existen
                const previo = document.getElementById("nuevoPromptCampos");
                if (previo) previo.remove();

                const cont = document.createElement("div");
                cont.id = "nuevoPromptCampos";
                cont.innerHTML = `
                    <label class="mt-2">Nombre del nuevo prompt</label>
                    <input type="text" class="form-control" id="nuevoPromptNombre">
        
                    <label class="mt-2">Descripción</label>
                    <input type="text" class="form-control" id="nuevoPromptDescripcion">
        
                    <label class="mt-2">Instrucciones</label>
                    <textarea class="form-control" id="nuevoPromptInstrucciones" rows="3"></textarea>
        
                    <button type="button" class="btn btn-sm btn-success mt-2" id="btnGuardarNuevoPrompt">Guardar nuevo prompt</button>
                `;
                camposCont.appendChild(cont);
        
                document.getElementById("btnGuardarNuevoPrompt").onclick = () => {
                    const nombre = document.getElementById("nuevoPromptNombre").value.trim();
                    const descripcion = document.getElementById("nuevoPromptDescripcion").value.trim();
                    const instrucciones = document.getElementById("nuevoPromptInstrucciones").value.trim();
        
                    if (!nombre || !instrucciones) return alert("Faltan campos obligatorios");
        
                    const idNuevo = "prompt_" + Date.now(); // ID único
                    const nuevoPrompt = {
                        id: nombre,
                        titulo: nombre,
                        descripcion,
                        cuerpo: instrucciones
                    };
        
                    promptsDisponibles.push(nuevoPrompt);
                    llenar(selectPrompt, ["Personalizado", "Crear nuevo prompt", ...promptsDisponibles.map(p => `${p.id} - ${p.titulo}`)]);
                    selectPrompt.value = `${idNuevo} - ${nombre}`;
                    promptTexto.value = instrucciones;
                    promptTexto.readOnly = true;
                    cont.remove();
                    validarForm();
                };
            };
        
            selectPrompt.onchange = () => {
                const val = selectPrompt.value.split(" - ")[0];
                document.getElementById("nuevoPromptCampos")?.remove();
        
                if (val === "Crear nuevo prompt") {
                    promptTexto.value = "";
                    promptTexto.readOnly = true;
                    crearCamposNuevoPrompt();
                } else if (val === "Personalizado") {
                    promptTexto.value = "";
                    promptTexto.readOnly = false;
                } else {
                    const p = promptsDisponibles.find(p => p.id === val);
                    if (p) {
                        promptTexto.value = p.cuerpo;
                        promptTexto.readOnly = true;
                    }
                }
                validarForm();
            };
        
            promptTexto.oninput = validarForm;
        }
    }
    campos.forEach(c => {
        const el = document.getElementById("accion_" + c.id);
        if (el) el.oninput = validarForm;
        if (c.type === "checkbox" && el) el.onchange = validarForm;
    });
}
let nodoEditando = null;

function editarNodo(id) {
    const n = nodos.find(nd => nd.id === id);
    if (!n) return;

    nodoEditando = n;

    // Cargar datos al formulario
    nombreInput.value = n.nombre;
    descInput.value = n.desc;
    tipoSel.value = n.tipo;
    tipoSel.dispatchEvent(new Event("change")); // muestra la sección adecuada

    if (n.tipo === "Condición") {
        catSel.value = n.cfg.cat;
        cargarSub();
        subSel.value = n.cfg.sub;
        cargarNiv();
        nivSel.value = n.cfg.niv;
        opSel.value = n.cfg.op;
        valInput.value = n.cfg.val;
    }

    if (n.tipo === "Acción") {
        moduloSel.value = n.cfg.modulo;
        generarCamposAccion(n.cfg.modulo);
        (modulosAccion[n.cfg.modulo] || []).forEach(c => {
            const el = document.getElementById("accion_" + c.id);
            if (el) {
                if (c.type === "checkbox") {
                    el.checked = n.cfg[c.id] || false;
                } else {
                    el.value = n.cfg[c.id] || "";
                }
            }
        });
    }

    btnCrear.textContent = "Actualizar Nodo";
    bootstrap.Modal.getOrCreateInstance(modalCrear).show();
}
/***** Crear nodo visual *****/
function crearNodo(id, nombre, desc, tipo, cfg,
    x = 120 + Math.random() * 200,
    y = 120 + Math.random() * 150) {

    /* contenedor nodo */
    const nodo = document.createElement("div");
    nodo.className = "nodo";
    nodo.dataset.id = id;
    nodo.ondblclick = () => editarNodo(id);
    nodo.style.left = x + "px";
    nodo.style.top = y + "px";
    nodo.style.borderColor = {
        Inicio: "#0d6efd", Acción: "#198754",
        Condición: "#ffc107", Fin: "#dc3545"
    }[tipo] || "#ccc";
    let contenidoExtra = "";

    if (tipo === "Condición") {
        contenidoExtra = `<small>${cfg.cat} → ${cfg.sub} → <strong>${cfg.niv}</strong> (${cfg.op} ${cfg.val})</small>`;
    } else if (tipo === "Acción") {
        if (cfg.modulo === "plantilla") {
            contenidoExtra = `<div style="font-size: .75em">
                <strong>Plantilla:</strong> ${cfg.idPlantilla}<br>
                <div style="margin-top: 4px">${cfg.cuerpo?.slice(0, 100) || 'Sin cuerpo'}${cfg.cuerpo?.length > 100 ? '...' : ''}</div>
                ${cfg.botones?.length ? `<div><strong>Botones:</strong> ${cfg.botones.join(", ")}</div>` : ""}
            </div>`;
        } else {
            if (cfg.modulo === "mensaje") {
                contenidoExtra = `<div style="font-size:.75em">
                    <strong>Prompt:</strong> ${cfg.promptId}<br>
                    <div style="margin-top:4px">${cfg.promptTexto?.slice(0, 100) || ""}${cfg.promptTexto?.length > 100 ? '...' : ''}</div>
                </div>`;
            } else {
                if (cfg.modulo === "analisis") {
                    contenidoExtra = `<div style="font-size:.75em">
                        <strong>Validación IA:</strong> ${cfg.promptId}<br>
                        <div style="margin-top:4px">${cfg.promptTexto?.slice(0, 100) || ""}${cfg.promptTexto?.length > 100 ? '...' : ''}</div>
                    </div>`;
                }
                else {
                    const campos = modulosAccion[cfg.modulo] || [];
                    console.log(campos, cfg, cfg.modulo);
                    const detalles = campos.map(c => {
                        console.log(cfg, c, cfg[c.id]);
                        const val = cfg[c.id];
                        return val
                            ? `<div><strong>${c.label}:</strong> ${c.type === "checkbox" ? (val ? "Sí" : "No") : val}</div>`
                            : '';
                    }).join('');
                    contenidoExtra = `<small><strong>${cfg.modulo}</strong></small><div style="font-size:0.8em;">${detalles}</div>`;
                }

            }

        }
    } else {
        contenidoExtra = `<small><em>${tipo}</em></small>`;
    }



    nodo.innerHTML = `
        <div class="titulo">${nombre}</div>
        <div class="descripcion">${desc}</div>
        <hr>
        ${contenidoExtra}
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
        s.onclick = () => {
            const nodoPadre = s.closest(".nodo");
            if (nodoPadre && nodoPadre.dataset && nodoPadre.dataset.tipo === "Fin") return;
            conectandoDesde = s;
        };
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
    } else if (tipo !== "Fin") {
        addSalida("out", "#0d6efd", "50%");
    }

    document.getElementById("canvas").appendChild(nodo);
    hacerDraggable(nodo);
    if (!nodos.find(nd => nd.id === id)) {
        nodos.push({
            id, tipo, nombre, desc,
            cfg,
            x, y
        });
    }

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

    conexiones.forEach((c, index) => {
        const a = document.getElementById(c.from);
        const b = document.getElementById(c.to);
        if (!a || !b) return;

        const p1 = centro(a), p2 = centro(b);

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("stroke", getComputedStyle(a).backgroundColor);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke-width", "2");
        path.setAttribute("cursor", "pointer"); // cursor visible
        path.setAttribute(
            "d",
            `M ${p1.x},${p1.y - 50} C ${p1.x + 50},${p1.y - 50} ${p2.x - 50},${p2.y - 50} ${p2.x},${p2.y - 50}`
        );

        // Asegura que la línea responda al mouse
        path.style.pointerEvents = "auto";

        // Clic derecho para eliminar conexión
        path.addEventListener("contextmenu", e => {
            e.preventDefault();
            const tooltip = document.getElementById("tooltip-linea");
            if (tooltip) tooltip.remove(); // ✅ remover tooltip si existe
            conexiones.splice(index, 1);
            dibujarLineas();
        });

        // Tooltip: Eliminar conexión
        path.addEventListener("mouseenter", e => {
            const tooltip = document.createElement("div");
            tooltip.id = "tooltip-linea";
            tooltip.textContent = "Click Derecho para Eliminar conexión";
            tooltip.style.cssText = `
                position: absolute;
                left: ${e.pageX + 10}px;
                top: ${e.pageY - 10}px;
                background: #333;
                color: #fff;
                padding: 4px 8px;
                font-size: 0.75em;
                border-radius: 4px;
                pointer-events: none;
                z-index: 1000;
            `;
            document.body.appendChild(tooltip);
        });

        path.addEventListener("mousemove", e => {
            const tooltip = document.getElementById("tooltip-linea");
            if (tooltip) {
                tooltip.style.left = (e.pageX + 10) + "px";
                tooltip.style.top = (e.pageY - 10) + "px";
            }
        });


        path.addEventListener("mouseleave", () => {
            const tooltip = document.getElementById("tooltip-linea");
            if (tooltip) tooltip.remove(); // ✅ remover al salir del hover
        });
        path.addEventListener("click", () => {
            const tooltip = document.getElementById("tooltip-linea");
            if (tooltip) tooltip.remove();
        });
        svg.appendChild(path);
    });
}

/* Auto-crear un nodo Condición de ejemplo (opcional)
crearNodo("nodo_demo","Condición demo","", "Condición",
          {cat:"ultimomensaje",sub:"usuario",niv:"tiempo",op:"==",val:"5"}); */
/********* Exportar *********/
function exportarJSON() {
    // Actualizar posiciones desde el DOM
    document.querySelectorAll(".nodo").forEach(dom => {
        const id = dom.dataset.id;
        const nodo = nodos.find(n => n.id === id);
        if (nodo) {
            nodo.x = parseInt(dom.style.left);
            nodo.y = parseInt(dom.style.top);
        }
    });

    // Eliminar nodos duplicados
    const nodosExportar = [];
    const nodosVistos = new Set();
    nodos.forEach(n => {
        if (!nodosVistos.has(n.id)) {
            nodosExportar.push({ ...n });
            nodosVistos.add(n.id);
        }
    });

    // Filtrar conexiones válidas
    const conexionesExportar = conexiones.filter(c => {
        return document.getElementById(c.from) && document.getElementById(c.to);
    });

    // Generar y descargar JSON
    const data = { nodos: nodosExportar, conexiones: conexionesExportar };
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
    const vistos = new Set();
    nArr.forEach(nd => {
        if (!vistos.has(nd.id)) {
            crearNodo(nd.id, nd.nombre, nd.desc, nd.tipo, nd.cfg, nd.x, nd.y);
            nodos.push({ ...nd });
            vistos.add(nd.id);
        }
    });
    // recrear conexiones
    conArr.forEach(c => {
        const nodoOrigen = nodos.find(n => n && document.getElementById(c.from)?.closest(".nodo")?.dataset.id === n.id);
        if (!nodoOrigen || nodoOrigen.tipo === "Fin") return; // ignora salidas desde "Fin"
        conexiones.push({ ...c });
    });
    dibujarLineas();
}
