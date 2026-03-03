// =====================================================
// VERIFICAR USUARIO LOGUEADO
// =====================================================
let usuarioLogueado = null;
let idBeneficiario = null;

try {
  const usuarioGuardado = localStorage.getItem("usuario");
  const token = localStorage.getItem("token");

  if (!usuarioGuardado || usuarioGuardado === "undefined" || !token) {
    throw new Error("No hay usuario logueado");
  }

  usuarioLogueado = JSON.parse(usuarioGuardado);
  idBeneficiario = usuarioLogueado.id;

} catch (error) {
  localStorage.removeItem("usuario");
  localStorage.removeItem("token");
  window.location.href = "../menu/Menu.html";
}




// 🔹 Función para hacer fetch con token
async function fetchAuth(url, options = {}) {
  const token = localStorage.getItem("token"); // tu token guardado
  if (!options.headers) options.headers = {};
  options.headers["Authorization"] = `Bearer ${token}`;
  options.headers["Content-Type"] = "application/json";

  const res = await fetch(url, options);

  if (!res.ok) {
      throw new Error(`Error en la petición a ${url}: ${res.status} ${res.statusText}`);
  }

  return res.json();
}
// =====================================================
// LOGOUT
// =====================================================
function logout() {
  localStorage.removeItem("usuario");
  window.location.href = "../menu/Menu.html";
}


// =====================================================
// MOSTRAR SECCIONES
// =====================================================
function mostrar(seccionId) {

  // 🔹 Ocultar todas las secciones usando display
  const secciones = document.querySelectorAll(".seccion");
  secciones.forEach(sec => {
    sec.style.display = "none";
  });

  // 🔹 Mostrar la sección seleccionada
  const seccion = document.getElementById(seccionId);
  if (seccion) {
    seccion.style.display = "block";
  }

  // 🔹 Limpiar intervalo inventario si existe
  if (typeof intervaloUltimaActualizacion !== "undefined") {
    clearInterval(intervaloUltimaActualizacion);
  }

  // ================== INVENTARIO ==================
  if (seccionId === "inventario") {

    cargarInventario(idBeneficiario);
    cargarUltimaActualizacion(idBeneficiario);

    intervaloUltimaActualizacion = setInterval(() => {
      cargarUltimaActualizacion(idBeneficiario);
    }, 60000);
  }

  // ================== DONACIONES ==================
  if (seccionId === "donaciones") {
    cargarDonacionesRecibidas(idBeneficiario);
  }

  // ================== MENSAJES ==================
  if (seccionId === "mensajes") {

    cargarConversaciones();

  } else {

    // 🔹 Cerrar chat si salimos de mensajes
    const chatActivo = document.getElementById("chatActivo");

    if (chatActivo) {
      chatActivo.classList.add("oculto");
      chatActivo.dataset.destinatarioId = "";
      chatActivo.dataset.nombreUsuario = "";
    }

    if (window.intervalMensajes) {
      clearInterval(window.intervalMensajes);
      window.intervalMensajes = null;
    }
  }
}


// =====================================================
// TIEMPO RELATIVO
// =====================================================
function tiempoRelativo(fechaISO) {
  const ahora = new Date();
  const fecha = new Date(fechaISO);

  const diferencia = ahora - fecha;

  const minutos = Math.floor(diferencia / 60000);
  const horas = Math.floor(diferencia / 3600000);
  const dias = Math.floor(diferencia / 86400000);
  const meses = Math.floor(dias / 30);

  if (minutos < 1) return "Actualizado hace unos segundos";
  if (minutos < 60) return `Actualizado hace ${minutos} minuto${minutos !== 1 ? "s" : ""}`;
  if (horas < 24) return `Actualizado hace ${horas} hora${horas !== 1 ? "s" : ""}`;
  if (dias < 30) return `Actualizado hace ${dias} día${dias !== 1 ? "s" : ""}`;

  return `Actualizado hace ${meses} mes${meses !== 1 ? "es" : ""}`;
}


// =====================================================
// INVENTARIO + BUSQUEDA + PAGINACION
// =====================================================
let inventarioData = [];
let inventarioFiltrado = [];
let paginaActual = 1;
const itemsPorPagina = 8;

// Renderizar tabla según la página actual
function renderInventarioPagina(pagina = 1) {
  const tabla = document.getElementById("tablaInventario");
  if (!tabla) return;

  tabla.innerHTML = "";

  const inicio = (pagina - 1) * itemsPorPagina;
  const fin = inicio + itemsPorPagina;
  const items = inventarioFiltrado.slice(inicio, fin);

  items.forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.categoria}</td>
      <td>${item.nombre}</td>
      <td>${item.total}</td>
    `;
    tabla.appendChild(tr);
  });

  const totalPaginas = Math.ceil(inventarioFiltrado.length / itemsPorPagina) || 1;
  const paginaTexto = document.getElementById("paginaActual");
  if (paginaTexto) {
    paginaTexto.textContent = `Página ${pagina} de ${totalPaginas}`;
  }

  const btnAnterior = document.getElementById("btnAnterior");
  const btnSiguiente = document.getElementById("btnSiguiente");

  if (btnAnterior) btnAnterior.disabled = (pagina === 1);
  if (btnSiguiente) btnSiguiente.disabled = (pagina === totalPaginas);
}

// Aplicar búsqueda en inventario
function aplicarBusqueda() {
  const inputBusqueda = document.getElementById("inputBusqueda");
  if (!inputBusqueda) return;

  const filtro = inputBusqueda.value.toLowerCase().trim();

  inventarioFiltrado = inventarioData.filter(item =>
    item.categoria.toLowerCase().includes(filtro) ||
    item.nombre.toLowerCase().includes(filtro)
  );

  paginaActual = 1;
  renderInventarioPagina(paginaActual);
}

// Cargar inventario desde la API con token
async function cargarInventario(idBeneficiario) {
  try {
    const data = await fetchAuth(`http://localhost:3000/api/inventario/${idBeneficiario}`);
    inventarioData = data;
    inventarioFiltrado = [...data];
    renderInventarioPagina(1);
  } catch (err) {
    console.error("Error inventario:", err);
  }
}


// =====================================================
// Ultima Actualizacion 
// =====================================================

let intervaloUltimaActualizacion;

async function cargarUltimaActualizacion(idBeneficiario) {
  try {
    // Usamos fetchAuth para incluir token y evitar 401
    const data = await fetchAuth(`http://localhost:3000/api/inventario/ultima-actualizacion/${idBeneficiario}`);

    const elemento = document.getElementById("ultimaActualizacion");
    if (!elemento) return;

    if (!data.ultima) {
      elemento.textContent = "Sin actualizaciones";
      return;
    }

    elemento.textContent = tiempoRelativo(data.ultima);

  } catch (error) {
    console.error("Error obteniendo última actualización:", error);
    const elemento = document.getElementById("ultimaActualizacion");
    if (elemento) elemento.textContent = "Error al cargar última actualización";
  }
}

// =====================================================
// DONACIONES + BUSQUEDA + PAGINACION
// =====================================================

let donacionesData = [];
let donacionesFiltradas = [];
let paginaActualDonaciones = 1;
const itemsPorPaginaDonaciones = 5;

// Cargar donaciones desde la API con token
async function cargarDonacionesRecibidas(idBeneficiario) {
  try {
    const data = await fetchAuth(`http://localhost:3000/api/donaciones-beneficiario/${idBeneficiario}`);
    donacionesData = data;
    donacionesFiltradas = [...data];
    paginaActualDonaciones = 1;
    renderDonacionesPagina(1);
  } catch (err) {
    console.error("Error donaciones:", err);
  }
}

// Renderizar tabla según la página actual
function renderDonacionesPagina(pagina = 1) {
  const tabla = document.getElementById("tablaDonaciones");
  if (!tabla) return;

  tabla.innerHTML = "";

  const inicio = (pagina - 1) * itemsPorPaginaDonaciones;
  const fin = inicio + itemsPorPaginaDonaciones;
  const items = donacionesFiltradas.slice(inicio, fin);

  items.forEach(donacion => {
    const tr = document.createElement("tr");
    tr.classList.add("donacion-preview");
    tr.innerHTML = `
      <td>${donacion.nombre_donador || "Anónimo"}</td>
      <td>${donacion.tipo.charAt(0).toUpperCase() + donacion.tipo.slice(1)}</td>
    `;

    tr.addEventListener("click", () => abrirModalDonacion(donacion));

    tabla.appendChild(tr);
  });

  const totalPaginas = Math.ceil(donacionesFiltradas.length / itemsPorPaginaDonaciones) || 1;
  const paginaTexto = document.getElementById("paginaActualDonaciones");
  if (paginaTexto) {
    paginaTexto.textContent = `Página ${pagina} de ${totalPaginas}`;
  }

  const btnAnterior = document.getElementById("btnAnteriorDonaciones");
  const btnSiguiente = document.getElementById("btnSiguienteDonaciones");
  if (btnAnterior) btnAnterior.disabled = (pagina === 1);
  if (btnSiguiente) btnSiguiente.disabled = (pagina === totalPaginas);
}

// Aplicar búsqueda en donaciones
function aplicarBusquedaDonaciones() {
  const input = document.getElementById("inputBusquedaDonaciones");
  if (!input) return;

  const filtro = input.value.toLowerCase().trim();

  donacionesFiltradas = donacionesData.filter(d =>
    (d.nombre_donador && d.nombre_donador.toLowerCase().includes(filtro)) ||
    d.tipo.toLowerCase().includes(filtro)
  );

  paginaActualDonaciones = 1;
  renderDonacionesPagina(1);
}

// ====================================
// MODAL DONACIONES
// ====================================

const modalDonacion = document.getElementById("modalDonacion");
const cerrarModal = document.getElementById("cerrarModal");

function abrirModalDonacion(donacion) {
  const modalBody = modalDonacion.querySelector(".modal-body");
  if (!modalBody) return;

  const fecha = donacion.fechaAceptacion || donacion.fecha;
  const fechaFormateada = new Date(fecha).toLocaleDateString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  });

  let descripcion = "";
  let cantidad = "";

  if (donacion.tipo === "dinero") {
    cantidad = "$" + parseFloat(donacion.cantidad || 0).toFixed(2);
  }

  if (donacion.tipo === "utiles") {
    descripcion = donacion.utiles
      .map(u => `${u.nombre} (${u.cantidad})`)
      .join(", ");
  }

  modalBody.innerHTML = `
    <p><strong>Donador:</strong> ${donacion.nombre_donador || "Anónimo"}</p>
    <p><strong>Tipo:</strong> ${donacion.tipo.charAt(0).toUpperCase() + donacion.tipo.slice(1)}</p>
    <p><strong>Fecha:</strong> ${fechaFormateada}</p>
    ${donacion.tipo === "dinero" ? `<p><strong>Cantidad:</strong> ${cantidad}</p>` : ""}
    ${donacion.tipo === "utiles" ? `<p><strong>Descripción:</strong> ${descripcion}</p>` : ""}
  `;

  modalDonacion.style.display = "flex";
}

cerrarModal.addEventListener("click", () => {
  modalDonacion.style.display = "none";
});

modalDonacion.addEventListener("click", (e) => {
  if (e.target === modalDonacion) {
    modalDonacion.style.display = "none";
  }
});

// =====================================================
// FUNCION PARA MOSTRAR CONTRASEÑA
// =====================================================
  function togglePass(inputId, icon) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === "password") {
      input.type = "text";
      icon.classList.add("fa-eye-slash");
    } else {
      input.type = "password";
      icon.classList.remove("fa-eye-slash");
    }
  }


// =====================================================
// CARGA PRINCIPAL CUANDO EL DOM ESTA LISTO
// =====================================================
document.addEventListener("DOMContentLoaded", async function () {

  if (!idBeneficiario) return;

  try {
    // ================== TOTAL DONACIONES ==================
    const totalDonacionesData = await fetchAuth(`http://localhost:3000/api/donaciones-beneficiario-total/${idBeneficiario}`);
    const totalEl = document.getElementById("totalDonaciones");
    if (totalEl) totalEl.textContent = totalDonacionesData.total || 0;
  } catch (err) {
    console.error("Error cargando total donaciones:", err);
  }

  try {
    // ================== TOTAL DINERO ==================
    const totalDineroData = await fetchAuth(`http://localhost:3000/api/donaciones-beneficiario-dinero/${idBeneficiario}`);
    const total = "$" + parseFloat(totalDineroData.total || 0).toFixed(2);

    const cardInicio = document.getElementById("totalDinero");
    const cardInventario = document.getElementById("totalDineroInventario");

    if (cardInicio) cardInicio.textContent = total;
    if (cardInventario) cardInventario.textContent = total;
  } catch (err) {
    console.error("Error cargando total dinero:", err);
  }

  try {
    // ================== PROMEDIO ==================
    const promedioData = await fetchAuth(`http://localhost:3000/api/promedio-donacion/${idBeneficiario}`);
    const promedioEl = document.getElementById("promedioDonacion");
    if (promedioEl) {
      promedioEl.textContent = promedioData.promedio
        ? parseFloat(promedioData.promedio).toFixed(2)
        : 0;
    }
  } catch (err) {
    console.error("Error cargando promedio donaciones:", err);
  }

  try {
    // ================== MES VS HISTORICO ==================
    const mesHistoricoData = await fetchAuth(`http://localhost:3000/api/donaciones-mes-vs-historico/${idBeneficiario}`);
    const mesEl = document.getElementById("donacionesMes");
    const histEl = document.getElementById("donacionesHistorico");

    if (mesEl) mesEl.textContent = mesHistoricoData.totalMes || 0;
    if (histEl) histEl.textContent = mesHistoricoData.totalHistorico || 0;
  } catch (err) {
    console.error("Error cargando donaciones mes vs histórico:", err);
  }

  try {
    // ================== GRAFICA ==================
    const distribucionData = await fetchAuth(`http://localhost:3000/api/distribucion-donaciones/${idBeneficiario}`);
    const ctxCanvas = document.getElementById("graficaDonaciones");
    if (ctxCanvas) {
      const ctx = ctxCanvas.getContext("2d");

      new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: ["Dinero", "Útiles"],
          datasets: [{
            data: [
              parseInt(distribucionData.totalDinero) || 0,
              parseInt(distribucionData.totalUtiles) || 0
            ],
            backgroundColor: ["#4338ca", "#10b981"],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { position: "bottom" } }
        }
      });
    }
  } catch (err) {
    console.error("Error cargando gráfica de donaciones:", err);
  }

  });

  // ================== INVENTARIO ==================
  cargarInventario(idBeneficiario);


  // ================== EVENTOS ==================
  const inputBusqueda = document.getElementById("inputBusqueda");
  if (inputBusqueda) {
    inputBusqueda.addEventListener("input", aplicarBusqueda);
  }

  const btnAnterior = document.getElementById("btnAnterior");
  const btnSiguiente = document.getElementById("btnSiguiente");

  if (btnAnterior) {
    btnAnterior.addEventListener("click", () => {
      if (paginaActual > 1) {
        paginaActual--;
        renderInventarioPagina(paginaActual);
      }
    });
  }

  if (btnSiguiente) {
    btnSiguiente.addEventListener("click", () => {
      const totalPaginas = Math.ceil(inventarioFiltrado.length / itemsPorPagina) || 1;
      if (paginaActual < totalPaginas) {
        paginaActual++;
        renderInventarioPagina(paginaActual);
      }
    });
  }

  // ================== EVENTOS DONACIONES ==================

  const inputBusquedaDonaciones = document.getElementById("inputBusquedaDonaciones");
  if (inputBusquedaDonaciones) {
    inputBusquedaDonaciones.addEventListener("input", aplicarBusquedaDonaciones);
  }

  const btnAnteriorDon = document.getElementById("btnAnteriorDonaciones");
  const btnSiguienteDon = document.getElementById("btnSiguienteDonaciones");

  if (btnAnteriorDon) {
    btnAnteriorDon.addEventListener("click", () => {
      if (paginaActualDonaciones > 1) {
        paginaActualDonaciones--;
        renderDonacionesPagina(paginaActualDonaciones);
      }
    });
  }

  if (btnSiguienteDon) {
    btnSiguienteDon.addEventListener("click", () => {
      const totalPaginas = Math.ceil(donacionesFiltradas.length / itemsPorPaginaDonaciones) || 1;
      if (paginaActualDonaciones < totalPaginas) {
        paginaActualDonaciones++;
        renderDonacionesPagina(paginaActualDonaciones);
      }
    });
  }

// ====================================
// PERFIL BENEFICIARIO
// ====================================
const btnEditarB = document.getElementById("btnEditarPerfilB");
const editarDivB = document.getElementById("editarPerfilB");
const datosDivB = document.getElementById("datosPerfilB");
const btnGuardarB = document.getElementById("guardarPerfilB");
const btnCancelarB = document.getElementById("cancelarEdicionB");
const mensajePerfilB = document.getElementById("mensajePerfilB");

// 🔹 Inicialización correcta al cargar la página
if (usuarioLogueado) {
  document.getElementById("perfilNombreBeneficiario").textContent = usuarioLogueado.nombre;
  document.getElementById("perfilCorreoBeneficiario").textContent = usuarioLogueado.correo;
  document.getElementById("perfilOrganizacionBeneficiario").textContent = usuarioLogueado.institucion;
  const nombreHeader = document.getElementById("nombreDonador");
  if (nombreHeader) nombreHeader.textContent = usuarioLogueado.nombre;

  // Mostrar solo los datos visibles y ocultar el formulario de edición
  editarDivB.style.display = "none";  // oculto al inicio
  datosDivB.style.display = "block";   // datos visibles
  btnEditarB.style.display = "inline-block";
  mensajePerfilB.textContent = "";
}

// EDITAR
btnEditarB.addEventListener("click", () => {
  document.getElementById("inputNombreB").value = usuarioLogueado.nombre;
  document.getElementById("inputCorreoB").value = usuarioLogueado.correo;
  document.getElementById("inputOrganizacionB").value = usuarioLogueado.institucion;
  document.getElementById("inputPasswordB").value = "";

  datosDivB.style.display = "none";   // ocultar datos
  editarDivB.style.display = "block"; // mostrar formulario
  btnEditarB.style.display = "none";  // ocultar botón
  mensajePerfilB.textContent = "";
});

// CANCELAR
btnCancelarB.addEventListener("click", () => {
  editarDivB.style.display = "none";   // ocultar formulario
  datosDivB.style.display = "block";   // mostrar datos
  btnEditarB.style.display = "inline-block"; // mostrar botón
  mensajePerfilB.textContent = "";
});

// GUARDAR
btnGuardarB.addEventListener("click", async () => {
  const nombre = document.getElementById("inputNombreB").value.trim();
  const correo = document.getElementById("inputCorreoB").value.trim();
  const organizacion = document.getElementById("inputOrganizacionB").value.trim();
  const password = document.getElementById("inputPasswordB").value.trim();

  if (!nombre || !correo || !organizacion) {
    mensajePerfilB.style.color = "red";
    mensajePerfilB.textContent = "Completa todos los campos obligatorios";
    return;
  }

  try {
    const bodyData = { nombre, correo, institucion: organizacion };
    if (password) bodyData.password = password;

    const data = await fetchAuth(`http://localhost:3000/api/usuarios/${usuarioLogueado.id}`, {
      method: "PUT",
      body: JSON.stringify(bodyData)
    });

    if (data.success) {
      mensajePerfilB.style.color = "green";
      mensajePerfilB.textContent = "Perfil actualizado correctamente";

      usuarioLogueado.nombre = nombre;
      usuarioLogueado.correo = correo;
      usuarioLogueado.institucion = organizacion;
      localStorage.setItem("usuario", JSON.stringify(usuarioLogueado));

      document.getElementById("perfilNombreBeneficiario").textContent = nombre;
      document.getElementById("perfilCorreoBeneficiario").textContent = correo;
      document.getElementById("perfilOrganizacionBeneficiario").textContent = organizacion;

      editarDivB.style.display = "none";
      datosDivB.style.display = "block";
      btnEditarB.style.display = "inline-block";
    } else {
      mensajePerfilB.style.color = "red";
      mensajePerfilB.textContent = data.error || "Error al actualizar";
    }

  } catch (err) {
    mensajePerfilB.style.color = "red";
    mensajePerfilB.textContent = "Error al actualizar";
    console.error("Error al actualizar perfil:", err);
  }
});


    // =====================================================
    // Función helper para hacer fetch con token
    // =====================================================
    async function fetchConToken(url, options = {}) {
      options.headers = {
          ...options.headers,
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json"
      };
      const res = await fetch(url, options);
      if (!res.ok) {
          if (res.status === 403) mostrarToast("No tienes permisos para acceder a esta información", "error");
          throw new Error(`Error ${res.status}`);
      }
      return res.json();
    }

    // =====================================================
    // Sistema de mensajes
    // =====================================================
    // =====================================================
    // Cargar lista de conversaciones
    // =====================================================
    async function cargarConversaciones() {
      try {
        const data = await fetchConToken("http://localhost:3000/api/mensajes/conversaciones");
        console.log("🚀 Respuesta del endpoint:", data);
    
        if (!data.ok) {
          mostrarToast("Error al cargar conversaciones", "error");
          return;
        }
    
        const contenedor = document.getElementById("contenedorConversaciones");
        contenedor.innerHTML = "";
    
        if (!data.conversaciones || data.conversaciones.length === 0) {
          contenedor.innerHTML = "<p>No hay conversaciones</p>";
          return;
        }
    
        // 🔹 Filtrar solo conversaciones que tengan al menos una fecha de mensaje (existió interacción)
        const conversacionesValidas = data.conversaciones.filter(c => c.ultima_fecha);
    
        if (conversacionesValidas.length === 0) {
          contenedor.innerHTML = "<p>No hay conversaciones</p>";
          return;
        }
    
        // 🔹 Ordenar conversaciones por fecha de última interacción (más reciente arriba)
        conversacionesValidas.sort((a, b) => new Date(b.ultima_fecha) - new Date(a.ultima_fecha));
    
        // 🔹 Renderizar
        conversacionesValidas.forEach(c => {
          const otroId = c.otro_usuario_id;
          const otroNombre = c.otro_usuario_nombre || ("Usuario " + otroId);
    
          const div = document.createElement("div");
          div.classList.add("usuario-conversacion");
          div.onclick = () => seleccionarChat(otroId, otroNombre);
    
          // Nombre del usuario
          const nombreSpan = document.createElement("span");
          nombreSpan.textContent = otroNombre;
          div.appendChild(nombreSpan);
    
          // Badge de mensajes no leídos
          if (c.no_leidos && c.no_leidos > 0) {
            const badge = document.createElement("span");
            badge.classList.add("badge-no-leidos");
            badge.textContent = c.no_leidos;
            div.appendChild(badge);
          }
    
          // Último mensaje como preview (si existe)
          if (c.ultimo_mensaje) {
            const preview = document.createElement("span");
            preview.classList.add("mensaje-preview");
            preview.textContent = c.ultimo_mensaje;
            div.appendChild(preview);
          }
    
          // Hora del último mensaje
          if (c.ultima_fecha) {
            const hora = document.createElement("span");
            hora.classList.add("hora-preview");
            const fecha = new Date(c.ultima_fecha);
            hora.textContent =
              fecha.getHours().toString().padStart(2, "0") + ":" +
              fecha.getMinutes().toString().padStart(2, "0");
            div.appendChild(hora);
          }
    
          contenedor.appendChild(div);
        });
    
      } catch (error) {
        console.error("Error cargando conversaciones:", error);
        contenedor.innerHTML = "<p>Error cargando conversaciones</p>";
      }
    }

    // =====================================================
    // Seleccionar chat
    // =====================================================
    async function seleccionarChat(destinatarioId, nombreUsuario) {
      const chatActivo = document.getElementById("chatActivo");
      const chatMensajes = document.getElementById("chatMensajes");

      const nombreChat = document.getElementById("nombreChatActivo");


      chatActivo.classList.remove("oculto");
      chatMensajes.innerHTML = "<p>Cargando mensajes...</p>";

      nombreChat.textContent = nombreUsuario;

      // 🔹 Guardar datos correctamente
      chatActivo.dataset.destinatarioId = destinatarioId;
      chatActivo.dataset.nombreUsuario = nombreUsuario;

      await actualizarMensajes();
      await cargarConversaciones(); 
      await marcarMensajesLeidos(destinatarioId);

      // 🔹 Controlar intervalo correctamente
      if (window.intervalMensajes) clearInterval(window.intervalMensajes);
      window.intervalMensajes = setInterval(actualizarMensajes, 2000);
    }

    // =====================================================
    // Actualizar mensajes
    // =====================================================
    let scrollAutomatico = true; 
    async function actualizarMensajes() {
      const chatActivo = document.getElementById("chatActivo");
      const destinatarioId = chatActivo.dataset.destinatarioId;
      const chatMensajes = document.getElementById("chatMensajes");
    
      if (!destinatarioId) return;
    
      try {
        const data = await fetchConToken(`http://localhost:3000/api/mensajes/${destinatarioId}`);
    
        if (!data.ok) {
          chatMensajes.innerHTML = "<p>Error al cargar mensajes</p>";
          return;
        }
    
        chatMensajes.innerHTML = "";
    
        data.mensajes.forEach(msg => {
          const div = document.createElement("div");
          div.classList.add("mensaje");
          div.classList.add(msg.remitente_id === idBeneficiario ? "own" : "other");
    
          // 🔹 Texto del mensaje
          const texto = document.createElement("span");
          texto.textContent = msg.mensaje;
          div.appendChild(texto);
    
          // 🔹 Check de mensaje leído (solo para propios)
          if (msg.remitente_id === idBeneficiario) {
            const check = document.createElement("span");
            check.classList.add("mensaje-leido");
            check.textContent = msg.leido ? "✔✔" : "✔"; // ✔ enviado, ✔✔ leído
            div.appendChild(check);
          }
    
          // 🔹 Hora del mensaje
          const hora = document.createElement("span");
          hora.classList.add("mensaje-hora");
    
          if (msg.creado_en) {
            const fechaISO = msg.creado_en.replace(" ", "T"); // Convertir a formato ISO
            const fecha = new Date(fechaISO);
            hora.textContent =
              fecha.getHours().toString().padStart(2, "0") + ":" +
              fecha.getMinutes().toString().padStart(2, "0");
          } else {
            hora.textContent = "--:--";
          }
    
          div.appendChild(hora);
    
          chatMensajes.appendChild(div);
        });
    
        // 🔹 Scroll automático si está habilitado
        if (scrollAutomatico) {
          chatMensajes.scrollTop = chatMensajes.scrollHeight;
        }
    
      } catch (error) {
        console.error("Error cargando mensajes:", error);
        chatMensajes.innerHTML = "<p>Error al cargar mensajes</p>";
      }
    }

    // =====================================================
    // Enviar mensaje
    // =====================================================
    async function enviarMensaje() {
      const chatActivo = document.getElementById("chatActivo");
      const destinatarioId = chatActivo.dataset.destinatarioId;
      const input = document.getElementById("mensajeInput");
      const mensaje = input.value.trim();

      if (!mensaje || !destinatarioId) return;

      try {
        const data = await fetchConToken("http://localhost:3000/api/mensajes", {
          method: "POST",
          body: JSON.stringify({
            destinatario_id: destinatarioId,
            mensaje: mensaje
          })
        });

        if (!data.ok) throw new Error(data.error || "Error al enviar");

        input.value = "";

        // 🔹 Recargar mensajes desde backend
        await actualizarMensajes();
        await cargarConversaciones();

      } catch (error) {
        console.error(error);
        mostrarToast("No se pudo enviar el mensaje", "error");
      }
    }

    // Ejemplo de fetchConToken si no lo tienes
    async function fetchConToken(url, options = {}) {
      const token = localStorage.getItem('token');
      const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers
      };

      const response = await fetch(url, { ...options, headers });
      return response.json();
    }

    // =====================================================
    // Inicializar
    // =====================================================
    cargarConversaciones();


    // Variables
    const btnNuevoMensaje_msg = document.getElementById("btnNuevoMensaje");
    const modalNuevoMensaje_msg = document.getElementById("modalNuevoMensaje_msg");
    const cerrarModalNuevo_msg = document.getElementById("cerrarModalNuevo_msg");

    // Contenedores de usuarios
    const listaAdmin_msg = document.querySelector(".listaUsuariosAdmin_msg");
    const listaBeneficiario_msg = document.querySelector(".listaUsuariosBeneficiario_msg");
    const listaDonador_msg = document.querySelector(".listaUsuariosDonador_msg");

    // Abrir modal
    btnNuevoMensaje_msg.onclick = async () => {
    modalNuevoMensaje_msg.style.display = "flex";
    await cargarUsuariosModal();
    };

    // Cerrar modal
    cerrarModalNuevo_msg.onclick = () => {
    modalNuevoMensaje_msg.style.display = "none";
    };

    // Función para cargar usuarios en el modal desde el endpoint
    async function cargarUsuariosModal() {
      try {
        const resp = await fetch("http://localhost:3000/api/usuarios-simple");
        const data = await resp.json();

        if (!Array.isArray(data)) {
          console.error("usuarios_msg no es un array:", data);
          return;
        }

        // Limpiar contenedores
        listaAdmin_msg.innerHTML = "";
        listaBeneficiario_msg.innerHTML = "";
        listaDonador_msg.innerHTML = "";

        // 🔹 Filtrar usuario logueado para que no aparezca
        const usuariosFiltrados = data.filter(u => u.id !== idBeneficiario);
        // Agregar usuarios al modal
        usuariosFiltrados.forEach(u => {
          const div = document.createElement("div");
          div.classList.add("usuario-item_msg");
          div.textContent = u.nombre;
          div.onclick = () => seleccionarUsuario(u);
      
          if (u.rol === "administrador") listaAdmin_msg.appendChild(div);
          else if (u.rol === "beneficiario") listaBeneficiario_msg.appendChild(div);
          else if (u.rol === "donadores") listaDonador_msg.appendChild(div);
        });

      } catch (err) {
        console.error("Error cargando usuarios:", err);
      }
    }

    function seleccionarUsuario(usuario) {
      seleccionarChat(usuario.id, usuario.nombre);
      modalNuevoMensaje_msg.style.display = "none";
    }


    document.getElementById("enviarMensaje").onclick = enviarMensaje;
    document.getElementById("mensajeInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        enviarMensaje();
      }
    });

    const buscarMensajesInput = document.getElementById("buscarMensajes");

    buscarMensajesInput.addEventListener("input", () => {
      const filtro = buscarMensajesInput.value.toLowerCase();
      const chatMensajes = document.getElementById("chatMensajes");
    
      const mensajes = chatMensajes.querySelectorAll(".mensaje");
      mensajes.forEach(msgDiv => {
        const texto = msgDiv.querySelector("span").textContent.toLowerCase();
        if (texto.includes(filtro)) {
          msgDiv.style.display = "flex"; // mostrar mensaje
        } else {
          msgDiv.style.display = "none"; // ocultar mensaje
        }
      });
    });

    async function marcarMensajesLeidos(destinatarioId) {
      try {
        await fetchConToken(`http://localhost:3000/api/mensajes/leido/${destinatarioId}`, {
          method: "PUT"
        });
      } catch (err) {
        console.error("Error al marcar mensajes como leídos:", err);
      }
    }

    // 🔹 Elemento de búsqueda dentro del modal
const buscarUsuarioInput = document.getElementById("buscarUsuario");

buscarUsuarioInput.addEventListener("input", () => {
  const filtro = buscarUsuarioInput.value.toLowerCase();

  // Contenedores de cada rol
  const contAdmin = document.querySelector(".listaUsuariosAdmin_msg");
  const contDonador = document.querySelector(".listaUsuariosDonador_msg");
  const contBenef = document.querySelector(".listaUsuariosBeneficiario_msg");

  [contAdmin, contDonador, contBenef].forEach(contenedor => {
    const usuarios = contenedor.querySelectorAll(".usuario-item_msg");
    usuarios.forEach(u => {
      const nombre = u.textContent.toLowerCase();
      if (nombre.includes(filtro)) {
        u.style.display = "flex"; // mostrar usuario
      } else {
        u.style.display = "none"; // ocultar usuario
      }
    });
  });
});