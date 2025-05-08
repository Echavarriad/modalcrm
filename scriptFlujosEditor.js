/* ================================================================
   VARIABLES GLOBALES
   ================================================================= */
   let nextEndpointId  = 0;      // id único para cada circulito (endpoint)
   let nextNodeId      = 0;      // id único para cada nodo
   const nodes         = [];     // { id, el, data }
   const connections   = [];     // { from, to, lineEl }
   let connectFrom     = null;   // endpoint que inicia la conexión (div)
   
   /* ------------------------------------------------
      Jerarquía para nodos tipo “Condición”
      ------------------------------------------------ */
   const jerarquia = {
       ultimomensaje: {
           usuario:   ["tiempo", "contexto", "palabra clave", "multimedia", "agregar otro"],
           operativo: ["tiempo", "contexto", "palabra clave", "multimedia", "agregar otro"]
       },
       datoscliente: {
           datospersonales:       ["nombre", "correo", "teléfono", "documento"],
           "compras activas":     ["fecha de última compra"],
           "cotizaciones activas": ["fecha de cotización", "estado"],
           "estado de proceso":   ["etapa", "responsable"]
       },
       "apis externas": {
           Pasarelas:          ["estado", "última respuesta", "token"],
           "APIs de terceros": ["estado", "última respuesta", "token"],
           "Widgets dinámicos": ["estado"]
       }
   };
   
   /* ================================================================
      REFERENCIAS A ELEMENTOS DOM
      ================================================================= */
   const canvas        = document.getElementById('canvas');
   const svgLines      = document.getElementById('lineas');
   
   const btnNuevoNodo  = document.getElementById('btnNuevoNodo');
   const btnExport     = document.getElementById('btnExport');
   const btnImport     = document.getElementById('btnImport');
   const fileImport    = document.getElementById('fileImport');
   
   /* —— Modal y formulario —— */
   const modalCrear    = new bootstrap.Modal(document.getElementById('modalCrearNodo'));
   const formNodo      = document.getElementById('formNodo');
   const nombreNodo    = document.getElementById('nombreNodo');
   const descripcion   = document.getElementById('descripcionNodo');
   const tipoNodo      = document.getElementById('tipoNodo');
   const configCondDiv = document.getElementById('configCondicion');
   const categoriaSel  = document.getElementById('categoriaCond');
   const subcampoSel   = document.getElementById('subcampoCond');
   const subnivelSel   = document.getElementById('subnivelCond');
   const operadorSel   = document.getElementById('operadorCond');
   const valorCondInp  = document.getElementById('valorCond');
   const btnCrear      = document.getElementById('btnCrear');
   
   /* ================================================================
      UTILIDADES
      ================================================================= */
   const qs  = (sel, el = document) => el.querySelector(sel);
   const qsa = (sel, el = document) => [...el.querySelectorAll(sel)];
   
   function uuid() {      // id sencillito para export / import
       return (Math.random().toString(36).slice(2, 10) + Date.now().toString(36));
   }
   
   /* —––– Actualiza un <line> SVG para que conecte dos endpoints —––– */
   function updateLinePosition(lineEl) {
       const fromEl = document.getElementById(lineEl.dataset.from);
       const toEl   = document.getElementById(lineEl.dataset.to);
       if (!fromEl || !toEl) return;
   
       const fromRect = fromEl.getBoundingClientRect();
       const toRect   = toEl.getBoundingClientRect();
       const svgRect  = svgLines.getBoundingClientRect();
   
       const x1 = fromRect.left + fromRect.width  / 2 - svgRect.left;
       const y1 = fromRect.top  + fromRect.height / 2 - svgRect.top;
       const x2 = toRect.left   + toRect.width   / 2 - svgRect.left;
       const y2 = toRect.top    + toRect.height  / 2 - svgRect.top;
   
       lineEl.setAttribute('x1', x1);
       lineEl.setAttribute('y1', y1);
       lineEl.setAttribute('x2', x2);
       lineEl.setAttribute('y2', y2);
   }
   
   /* Recalcula TODAS las líneas (p.e. al mover un nodo o redimensionar) */
   function refreshAllLines() {
       connections.forEach(c => updateLinePosition(c.lineEl));
   }
   
   /* ================================================================
      MANEJO DE NODOS
      ================================================================= */
   function crearNodoDesdeFormulario(e) {
       e.preventDefault();
   
       const data = {
           id:          uuid(),
           nombre:      nombreNodo.value.trim(),
           descripcion: descripcion.value.trim(),
           tipo:        tipoNodo.value,
           x:           50,  // posición inicial: esquina sup izq
           y:           50,
           config:      {}
       };
   
       if (data.tipo === 'Condición') {
           data.config = {
               categoria: categoriaSel.value,
               subcampo:  subcampoSel.value,
               subnivel:  subnivelSel.value,
               operador:  operadorSel.value,
               valor:     valorCondInp.value.trim()
           };
       }
   
       addNodeElement(data);
       modalCrear.hide();
       formNodo.reset();
       btnCrear.disabled = true;
       configCondDiv.style.display = 'none';
   }
   
   function addNodeElement(data) {
       /* — DIV principal del nodo — */
       const nodeEl = document.createElement('div');
       nodeEl.className = 'nodo';
       nodeEl.style.left = data.x + 'px';
       nodeEl.style.top  = data.y + 'px';
       nodeEl.dataset.id = data.id;
   
       /* — Contenido — */
       nodeEl.innerHTML = `
           <div class="titulo">${data.nombre}</div>
           <div class="descripcion">${data.descripcion || ''}</div>
       `;
   
       /* — Endpoints — */
       const epIn  = document.createElement('div');
       epIn.className  = 'endpoint entrada';
       epIn.id = `ep-${++nextEndpointId}`;
       nodeEl.appendChild(epIn);
   
       const epOut = document.createElement('div');
       epOut.className = 'endpoint salida';
       epOut.id = `ep-${++nextEndpointId}`;
       nodeEl.appendChild(epOut);
   
       canvas.appendChild(nodeEl);
   
       /* — Arrastre — */
       enableDrag(nodeEl);
   
       /* — Conexiones — */
       epOut.addEventListener('click', startConnect);
       epIn .addEventListener('click', endConnect);
   
       /* — Guardamos en memoria — */
       nodes.push({ id: data.id, el: nodeEl, data, epInId: epIn.id, epOutId: epOut.id });
   }
   
   /* ---------- Arrastrar libre ---------- */
   function enableDrag(nodeEl) {
       let offsetX = 0, offsetY = 0, dragging = false;
   
       nodeEl.addEventListener('pointerdown', ev => {
           dragging = true;
           offsetX = ev.clientX - nodeEl.offsetLeft;
           offsetY = ev.clientY - nodeEl.offsetTop;
           nodeEl.setPointerCapture(ev.pointerId);
       });
   
       nodeEl.addEventListener('pointermove', ev => {
           if (!dragging) return;
           nodeEl.style.left = ev.clientX - offsetX + 'px';
           nodeEl.style.top  = ev.clientY - offsetY + 'px';
           refreshAllLines();
       });
   
       nodeEl.addEventListener('pointerup', () => { dragging = false; });
   }
   
   /* ================================================================
      CONEXIÓN DE NODOS
      ================================================================= */
   function startConnect(ev) {
       ev.stopPropagation();
       connectFrom = ev.currentTarget;           // endpoint salida
       connectFrom.classList.add('border', 'border-primary');
       /* ESC cancela */
       window.addEventListener('keydown', escCancelOnce, { once:true });
   }
   
   function escCancelOnce(e) {
       if (e.key === 'Escape' && connectFrom) {
           connectFrom.classList.remove('border', 'border-primary');
           connectFrom = null;
       }
   }
   
   function endConnect(ev) {
       ev.stopPropagation();
       if (!connectFrom) return;
   
       const fromId = connectFrom.id;
       const toId   = ev.currentTarget.id;
       if (fromId === toId) return;              // no se conecta a sí mismo
   
       /* crear línea SVG */
       const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
       line.setAttribute('stroke', '#0d6efd');
       line.setAttribute('stroke-width', '2');
       line.dataset.from = fromId;
       line.dataset.to   = toId;
   
       svgLines.appendChild(line);
       updateLinePosition(line);
   
       connections.push({ from: fromId, to: toId, lineEl: line });
   
       /* limpiar estado */
       connectFrom.classList.remove('border', 'border-primary');
       connectFrom = null;
   }
   
   /* ================================================================
      IMPORTAR / EXPORTAR JSON
      ================================================================= */
   function exportarJSON() {
       const exportData = {
           nodes: nodes.map(n => ({
               ...n.data,
               x: parseInt(n.el.style.left, 10),
               y: parseInt(n.el.style.top , 10),
               epInId:  n.epInId,
               epOutId: n.epOutId
           })),
           connections: connections.map(c => ({
               from: c.from,
               to:   c.to
           }))
       };
   
       const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
       const a = document.createElement('a');
       a.href = URL.createObjectURL(blob);
       a.download = 'flujo.json';
       a.click();
       URL.revokeObjectURL(a.href);
   }
   
   function importarJSON(event) {
       const file = event.target.files[0];
       if (!file) return;
   
       const reader = new FileReader();
       reader.onload = e => {
           try {
               const data = JSON.parse(e.target.result);
               cargarDesdeJSON(data);
           } catch (err) {
               alert('JSON inválido');
           }
           fileImport.value = '';   // permite volver a seleccionar el mismo archivo
       };
       reader.readAsText(file);
   }
   
   function cargarDesdeJSON(data) {
       /* limpiar canvas */
       nodes.forEach(n => n.el.remove());
       connections.forEach(c => c.lineEl.remove());
       nodes.length = connections.length = 0;
       nextEndpointId = 0;
   
       /* nodos */
       data.nodes.forEach(n => {
           addNodeElement(n);
           const node = nodes.find(x => x.data.id === n.id);
           node.el.style.left = n.x + 'px';
           node.el.style.top  = n.y + 'px';
           node.epInId  = n.epInId;
           node.epOutId = n.epOutId;
       });
   
       /* conexiones */
       data.connections.forEach(c => {
           const fromEl = document.getElementById(c.from);
           const toEl   = document.getElementById(c.to);
           if (!fromEl || !toEl) return;
   
           const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
           line.setAttribute('stroke', '#0d6efd');
           line.setAttribute('stroke-width', '2');
           line.dataset.from = c.from;
           line.dataset.to   = c.to;
           svgLines.appendChild(line);
           updateLinePosition(line);
           connections.push({ ...c, lineEl: line });
       });
   }
   
   /* ================================================================
      SELECTORES JERÁRQUICOS (DE “CONDICIÓN”)
      ================================================================= */
   function poblarCategorias() {
       categoriaSel.innerHTML = '<option value="">Seleccione</option>';
       Object.keys(jerarquia).forEach(cat => {
           categoriaSel.insertAdjacentHTML('beforeend', `<option>${cat}</option>`);
       });
   }
   function poblarSubcampos() {
       subcampoSel.innerHTML = '<option value="">Seleccione</option>';
       const sub = jerarquia[categoriaSel.value] || {};
       Object.keys(sub).forEach(s => {
           subcampoSel.insertAdjacentHTML('beforeend', `<option>${s}</option>`);
       });
       subnivelSel.innerHTML = '<option value="">Seleccione</option>';
   }
   function poblarSubniveles() {
       subnivelSel.innerHTML = '<option value="">Seleccione</option>';
       const lista = (jerarquia[categoriaSel.value] || {})[subcampoSel.value] || [];
       lista.forEach(item => {
           subnivelSel.insertAdjacentHTML('beforeend', `<option>${item}</option>`);
       });
   }
   
   /* ================================================================
      VALIDACIÓN FORMULARIO
      ================================================================= */
   function validarForm() {
       const baseOk = nombreNodo.value.trim() && tipoNodo.value;
       let condOk   = true;
   
       if (tipoNodo.value === 'Condición') {
           condOk = categoriaSel.value && subcampoSel.value &&
                    subnivelSel.value && valorCondInp.value.trim();
       }
       btnCrear.disabled = !(baseOk && condOk);
   }
   
   /* ================================================================
      EVENTOS INICIALES
      ================================================================= */
   document.addEventListener('DOMContentLoaded', () => {
   
       /* —— Botones cabecera —— */
       btnNuevoNodo .addEventListener('click', () => { modalCrear.show(); });
       btnExport    .addEventListener('click', exportarJSON);
       btnImport    .addEventListener('click', () => fileImport.click());
       fileImport   .addEventListener('change', importarJSON);
   
       /* —— Formulario modal —— */
       formNodo.addEventListener('submit', crearNodoDesdeFormulario);
       [nombreNodo, descripcion, tipoNodo,
        categoriaSel, subcampoSel, subnivelSel,
        operadorSel, valorCondInp].forEach(el =>
           el.addEventListener('input', validarForm)
       );
   
       tipoNodo.addEventListener('change', () => {
           const isCond = tipoNodo.value === 'Condición';
           configCondDiv.style.display = isCond ? 'block' : 'none';
           if (isCond) {
               poblarCategorias();
           }
           validarForm();
       });
   
       categoriaSel.addEventListener('change', () => { poblarSubcampos(); validarForm(); });
       subcampoSel .addEventListener('change', () => { poblarSubniveles(); validarForm(); });
   
       /* —— Ajusta líneas al redimensionar la ventana —— */
       window.addEventListener('resize', refreshAllLines);
   });
   