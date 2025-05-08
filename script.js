const DEFAULT_MODULOS = {
    "Multiagente": {
        habilitado: true,
        data: {
            datosPrincipales: [
                { nombre: "Nombre de módulo", valor: "Multiagente", tipo: "texto" },
                { nombre: "Versión", valor: "1.0", tipo: "texto" },
                { nombre: "Permitir múltiples sesiones", valor: "Sí", tipo: "booleano" },
                { nombre: "Tiempo de espera", valor: "30", tipo: "número" },
                { nombre: "Activo", valor: "Sí", tipo: "booleano" },
                { nombre: "Nombre de módulo", valor: "Multiagente", tipo: "texto" },
                { nombre: "Versión", valor: "1.0", tipo: "texto" },
                { nombre: "Permitir múltiples sesiones", valor: "Sí", tipo: "booleano" },
                { nombre: "Tiempo de espera", valor: "30", tipo: "número" },
                { nombre: "Activo", valor: "Sí", tipo: "booleano" }
            ],
            configuracion: [
                { nombre: "Permitir múltiples sesiones", valor: "Sí", tipo: "booleano" },
                { nombre: "Tiempo de espera", valor: "30", tipo: "número" }
            ]
        }
    },
    "Torre administrativa": {
        habilitado: true, data: {
            datosPrincipales: [
                { nombre: "Nombre de módulo", valor: "Multiagente", tipo: "texto" },
                { nombre: "Versión", valor: "1.0", tipo: "texto" },
                { nombre: "Activo", valor: "Sí", tipo: "booleano" }
            ],
            configuracion: [
                { nombre: "Permitir múltiples sesiones", valor: "Sí", tipo: "booleano" },
                { nombre: "Tiempo de espera", valor: "30", tipo: "número" }
            ]
        }
    },
    "Torre de servicios": { habilitado: false, data: { datosPrincipales: [], configuracion: [] } },
    "Flujos automáticos": { habilitado: false, data: { datosPrincipales: [], configuracion: [] } },
    "Estados": { habilitado: false, data: { datosPrincipales: [], configuracion: [] } },
    "Canales": { habilitado: false, data: { datosPrincipales: [], configuracion: [] } },
    "Transaccional": { habilitado: false, data: { datosPrincipales: [], configuracion: [] } },
    "API y servicios externos": { habilitado: false, data: { datosPrincipales: [], configuracion: [] } }
};

function loadModulos() {
    const saved = localStorage.getItem("panelModulos");
    return saved ? JSON.parse(saved) : DEFAULT_MODULOS;
}

function saveModulos() {
    localStorage.setItem("panelModulos", JSON.stringify(modulos));
}

let modulos = loadModulos();
let estadoActual = "";
let vistaActual = "Ver";
let vincularTemporal = "";
let datosOriginales = [];
let hayCambiosNoGuardados = false;

function renderSectionButtons() {
    const container = document.getElementById("sectionButtons");
    container.innerHTML = "";
    Object.entries(modulos).forEach(([nombre, modulo]) => {
        const btn = document.createElement("button");
        btn.className = `btn btn-outline-primary ${modulo.habilitado ? "" : "disabled-module"}`;
        btn.innerText = modulo.habilitado ? nombre : `Vincular ${nombre}`;
        btn.onclick = () => {
            if (modulo.habilitado) selectSection(nombre);
            else mostrarVincular(nombre);
        };
        container.appendChild(btn);
    });
}

function mostrarVincular(nombre) {
    vincularTemporal = nombre;
    const modal = new bootstrap.Modal(document.getElementById("vincularModal"));
    document.getElementById("vincularModalLabel").innerText = `Vincular ${nombre}`;
    modal.show();
}

function confirmarVincular() {
    modulos[vincularTemporal].habilitado = true;
    modulos[vincularTemporal].data.datosPrincipales = [
        { nombre: "Nombre de módulo", valor: vincularTemporal, tipo: "texto" },
        { nombre: "Versión", valor: "1.0", tipo: "texto" },
        { nombre: "Activo", valor: "Sí", tipo: "booleano" }
    ];
    modulos[vincularTemporal].data.configuracion = [
        { nombre: "Permitir múltiples sesiones", valor: "No", tipo: "booleano" },
        { nombre: "Tiempo de espera", valor: "20", tipo: "número" }
    ];
    saveModulos();
    renderSectionButtons();
    selectSection(vincularTemporal);
    bootstrap.Modal.getInstance(document.getElementById("vincularModal")).hide();
}

function confirmarSalida(callback) {
    if (hayCambiosNoGuardados) {
        const salir = confirm("Tienes cambios no guardados. ¿Deseas salir sin guardar?");
        if (salir) {
            hayCambiosNoGuardados = false;
            callback();
        }
    } else {
        callback();
    }
}

function selectSection(section) {
    confirmarSalida(() => {
        estadoActual = section;
        document.getElementById("panelTitle").innerHTML = `<i class="bi bi-diagram-3"></i> Módulo ${section} - ${vistaActual}`;
        document.querySelectorAll('.nav-section button').forEach(btn => btn.classList.remove('active'));
        [...document.querySelectorAll('.nav-section button')].find(btn => btn.innerText.includes(section)).classList.add('active');
        updatePanel();
    });
}

function selectView(view, btnEvent) {
    confirmarSalida(() => {
        vistaActual = view;
        document.getElementById("panelTitle").innerHTML = `<i class="bi bi-diagram-3"></i> Módulo ${estadoActual} - ${vistaActual}`;
        document.querySelectorAll('.view-toggle button').forEach(btn => btn.classList.remove('active'));
        btnEvent.target.classList.add('active');
        updatePanel();
    });
}

function updatePanel() {
    const area = document.getElementById("contentArea");
    area.classList.remove("fade-in");
    void area.offsetWidth;
    area.classList.add("fade-in");
    area.innerHTML = "";

    const datos = modulos[estadoActual].data;
    const lista = vistaActual === "Configuración" ? datos.configuracion : datos.datosPrincipales;
    datosOriginales = JSON.parse(JSON.stringify(lista));

    lista.forEach((item, idx) => {
        const row = document.createElement("div");
        row.className = "mb-3";
        if (vistaActual === "Ver") {
            row.innerHTML = `<div class="field-label">${item.nombre}:</div><div>${item.valor}</div>`;
        } else {
            const id = `input_${idx}`;
            row.innerHTML = `
          <label class="field-label" for="${id}">${item.nombre}</label>
          <input class="form-control campo-dinamico" id="${id}" type="${item.tipo === 'número' ? 'number' : 'text'}" value="${item.valor}" data-index="${idx}">
        `;
        }
        area.appendChild(row);
    });

    if (vistaActual !== "Ver") {
        document.querySelectorAll('.campo-dinamico').forEach(input => {
            input.addEventListener('input', validarCambios);
        });
    }

    document.getElementById("saveBtn").disabled = true;
    document.getElementById("saveBtn").classList.toggle("d-none", vistaActual === "Ver");
}

function validarCambios() {
    const inputs = document.querySelectorAll('.campo-dinamico');
    let cambioDetectado = false;

    inputs.forEach((input, idx) => {
        const original = datosOriginales[idx]?.valor || "";
        const actual = input.value.trim();
        if (original !== actual) {
            cambioDetectado = true;
        }
    });

    hayCambiosNoGuardados = cambioDetectado;
    document.getElementById("saveBtn").disabled = !cambioDetectado;
}

function guardarCambios() {
    const inputs = document.querySelectorAll('#contentArea input');
    const targetList = vistaActual === "Configuración"
        ? modulos[estadoActual].data.configuracion
        : modulos[estadoActual].data.datosPrincipales;

    for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        if (!input.value.trim()) {
            alert("Completa todos los campos.");
            input.focus();
            return;
        }
        targetList[i].valor = input.value.trim();
    }

    hayCambiosNoGuardados = false;
    document.getElementById("saveBtn").disabled = true;
    saveModulos();
    alert("Cambios guardados correctamente.");
}

function cerrarModal() {
    confirmarSalida(() => {
        alert("Modal cerrado.");
        document.getElementById("contentArea").innerHTML = "";
        document.getElementById("saveBtn").classList.add("d-none");
    });
}

function resetearConfiguracion() {
    const confirmar = confirm("¿Seguro que deseas borrar todos los datos guardados y restaurar la configuración por defecto?");
    if (confirmar) {
        localStorage.removeItem("panelModulos");
        location.reload();
    }
}
function mostrarModalEstado(mensaje) {
    document.getElementById("estadoCargaMensaje").innerText = mensaje;
    const modal = new bootstrap.Modal(document.getElementById("estadoCargaModal"));
    modal.show();
}

function ocultarModalEstado() {
    const modalElement = document.getElementById("estadoCargaModal");
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) modal.hide();
}

async function inicializarDesdeQuery() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
        mostrarModalEstado("No se puede cargar por falta de datos o permisos.");
        return;
    }

    mostrarModalEstado("Cargando configuración...");
    setTimeout(() => {
        /* mostrarModalEstado("No se pudo cargar la información. Error de permisos o datos.");
        mostrarModalEstado("Error de conexión con el servidor.");  
                   */
        modulos = DEFAULT_MODULOS;
        ocultarModalEstado();
        renderSectionButtons();
        selectSection("Multiagente");
        selectView("Ver", { target: document.querySelector(".view-toggle button") });
    }, 3000);
    /*   
        try {
          const response = await fetch(`https://example.com/api/integraciones?token=${token}`);
          
          if (response.status === 200) {
            const data = await response.json();
            modulos = data;
            ocultarModalEstado();
            renderSectionButtons();
            selectSection("Multiagente");
            selectView("Ver", { target: document.querySelector(".view-toggle button") });
          } else {
            mostrarModalEstado("No se pudo cargar la información. Error de permisos o datos.");
          }
        } catch (err) {
          mostrarModalEstado("Error de conexión con el servidor.");
        } */
}

window.onload = () => {
    inicializarDesdeQuery();
};