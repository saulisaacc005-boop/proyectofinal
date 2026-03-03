const modalSolicitud = document.getElementById("modalSolicitud");
const modalVerMas = document.getElementById("modalVerMas");

// =====================================================
// 1️⃣ Verificar usuario logueado y definir idDonador
// =====================================================
let usuarioLogueado = null;
let idAdmin = null;

try {
  const usuarioGuardado = localStorage.getItem("usuario");
  const token = localStorage.getItem("token"); // 🔑 Token JWT

  if (!usuarioGuardado || usuarioGuardado === "undefined" || !token) {
    throw new Error("No hay usuario logueado");
  }

  usuarioLogueado = JSON.parse(usuarioGuardado);
  idAdmin = usuarioLogueado.id;

} catch (error) {
  console.warn("Usuario inválido o no logueado");
  mostrarToast("Debes iniciar sesión", "error");
  localStorage.removeItem("usuario");
  localStorage.removeItem("token");
  window.location.href = "../menu/Menu.html";
}

// ---------- Navegación entre secciones ----------
function mostrar(id){
    document.querySelectorAll(".seccion").forEach(sec => sec.classList.add("oculto"));
    document.getElementById(id).classList.remove("oculto");

    // Si la sección es usuarios, recargar los datos
    if(id === "usuarios") {
        cargarUsuarios();
    }
}

// ---------- Logout ----------
function logout(){
    window.location.href="../menu/Menu.html";
}

    // ---------- Cargar usuarios desde la API ----------
    async function cargarUsuarios() {
      try {
          // 🔹 Usar fetchConToken en lugar de fetch normal
          const usuariosResp = await fetchConToken("http://localhost:3000/api/usuarios");
  
          // 🔹 Validar que sea array
          if (!Array.isArray(usuariosResp)) {
              console.error("Respuesta de usuarios inválida:", usuariosResp);
              return;
          }
  
          // 🔹 Guardar en la variable global
          usuarios = usuariosResp.map(u => ({ ...u, id: Number(u.id) }));
  
          // Separar por rol
          const donadores = usuarios.filter(u => u.rol.toLowerCase().includes("donador"));
          const beneficiarios = usuarios.filter(u => u.rol.toLowerCase().includes("beneficiario"));
  
          // Actualizar contadores individuales
          document.getElementById("totalDonadores").textContent = donadores.length;
          document.getElementById("totalBeneficiarios").textContent = beneficiarios.length;
  
          // Contador de usuarios totales
          const totalUsuarios = donadores.length + beneficiarios.length;
          document.getElementById("totalUsuarios").textContent = totalUsuarios;
  
          // Donadores
          tablaDonadores.innerHTML = "";
          donadores.forEach(u => {
              const tr = document.createElement("tr");
              tr.innerHTML = `
                  <td>${u.id}</td>
                  <td>${u.institucion}</td>
                  <td>${u.correo}</td>
                  <td>${u.rol}</td>
              `;
              tr.style.cursor = "pointer";
              tr.onclick = () => abrirPerfilUsuario(u);
              tablaDonadores.appendChild(tr);
          });
  
          // Beneficiarios
          tablaBeneficiarios.innerHTML = "";
          beneficiarios.forEach(u => {
              const tr = document.createElement("tr");
              tr.innerHTML = `
                  <td>${u.id}</td>
                  <td>${u.institucion}</td>
                  <td>${u.correo}</td>
                  <td>${u.rol}</td>
              `;
              tr.style.cursor = "pointer";
              tr.onclick = () => abrirPerfilUsuario(u);
              tablaBeneficiarios.appendChild(tr);
          });
  
      } catch (err) {
          console.error("Error cargando usuarios:", err);
          mostrarToast("No se pudieron cargar los usuarios", "error");
      }
  }

// Variables de paginación para usuarios
let paginaDonadores = 0;
let paginaBeneficiarios = 0;
const ITEMS_POR_PAGINA_USUARIOS = 10;

// Función para abrir modal de usuarios
function abrirModalUsuarios(tipo) {
    const modal = modalVerMas;
    const lista = document.getElementById("listaModalVerMas");
    const titulo = document.getElementById("tituloModalVerMas");

    let datos = tipo === "donadores" 
        ? usuarios.filter(u => u.rol.toLowerCase().includes("donador"))
        : usuarios.filter(u => u.rol.toLowerCase().includes("beneficiario"));

    let pagina = tipo === "donadores" ? paginaDonadores : paginaBeneficiarios;
    const totalPaginas = Math.ceil(datos.length / ITEMS_POR_PAGINA_USUARIOS);

    // Determinar slice de datos
    const inicio = pagina * ITEMS_POR_PAGINA_USUARIOS;
    const fin = inicio + ITEMS_POR_PAGINA_USUARIOS;
    const subset = datos.slice(inicio, fin);

    // Renderizar tabla
    lista.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>ID</th><th>Institución</th><th>Correo</th><th>Rol</th>
          </tr>
        </thead>
        <tbody>
          ${subset.map(u => `
            <tr>
              <td>${u.id}</td>
              <td>${u.institucion}</td>
              <td>${u.correo}</td>
              <td>${u.rol}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    `;

    // Título
    titulo.textContent = tipo === "donadores" ? "Donadores" : "Beneficiarios";

    // Actualizar indicador de página
    document.getElementById("pageIndicator").textContent = `Página ${pagina + 1} de ${totalPaginas}`;

    // Botones paginación
    document.getElementById("prevPage").disabled = pagina === 0;
    document.getElementById("nextPage").disabled = pagina >= totalPaginas - 1;

    document.getElementById("prevPage").onclick = () => {
        if (pagina > 0) {
            if(tipo === "donadores") paginaDonadores--;
            else paginaBeneficiarios--;
            abrirModalUsuarios(tipo);
        }
    };

    document.getElementById("nextPage").onclick = () => {
        if (pagina < totalPaginas - 1) {
            if(tipo === "donadores") paginaDonadores++;
            else paginaBeneficiarios++;
            abrirModalUsuarios(tipo);
        }
    };

    // Mostrar modal
    modal.style.display = "flex";

    // Cerrar modal
    document.getElementById("cerrarModalVerMas").onclick = () => modal.style.display = "none";
}

// Eventos botones "Ver Más"
document.getElementById("verMasDonadores").addEventListener("click", () => abrirModalUsuarios("donadores"));
document.getElementById("verMasBeneficiarios").addEventListener("click", () => abrirModalUsuarios("beneficiarios"));


// Variables
const modalUsuario = document.getElementById("modalUsuario");
const cerrarModalUsuario = document.getElementById("cerrarModalUsuario");

// Cerrar modal
cerrarModalUsuario.onclick = () => modalUsuario.style.display = "none";

// Función para abrir modal de perfil de usuario
function abrirPerfilUsuario(usuario) {
    document.getElementById("tituloModalUsuario").textContent = usuario.nombre;
    document.getElementById("usuarioId").textContent = usuario.id;
    document.getElementById("usuarioNombre").textContent = usuario.nombre;
    document.getElementById("usuarioCorreo").textContent = usuario.correo;
    document.getElementById("usuarioRol").textContent = usuario.rol;
    document.getElementById("usuarioInstitucion").textContent = usuario.institucion;
    document.getElementById("usuarioFecha").textContent = new Date(usuario.fecha_registro).toLocaleString("es-MX");

  

    // Mostrar modal
    modalUsuario.style.display = "flex";
  }

  let solicitudes = []; // donaciones
  let usuarios = [];    // todos los usuarios

  const ITEMS_POR_DEFECTO = 5;
  const ITEMS_POR_PAGINA = 10;

  // Páginas por estado en modal Ver Más
  let paginaModalActual = 0;
  let estadoModalActual = "";


// =====================================================
// Obtener token desde localStorage
// =====================================================
const token = localStorage.getItem("token");
if (!token) {
    mostrarToast("Debes iniciar sesión", "error");
    window.location.href = "../menu/Menu.html";
}

// =====================================================
// 1️⃣ Función helper para hacer fetch con token
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
// Función para cargar dashboard completo
// =====================================================
async function cargarDatosDashboard() {
    try {
        // 🔹 Cargar usuarios
        const usuariosResp = await fetchConToken("http://localhost:3000/api/usuarios");
        if (!Array.isArray(usuariosResp)) {
            mostrarToast("No se pudieron cargar los usuarios", "error");
            return;
        }

        usuarios = usuariosResp.map(u => ({ ...u, id: Number(u.id) }));

        // ✅ MOSTRAR TOTAL DE USUARIOS INMEDIATAMENTE
        document.getElementById("totalUsuarios").textContent = usuarios.length;

        // 🔹 Cargar donaciones
        const donacionesResp = await fetchConToken("http://localhost:3000/api/donaciones");
        if (!Array.isArray(donacionesResp)) {
            mostrarToast("No se pudieron cargar las donaciones", "error");
            return;
        }

        solicitudes = donacionesResp.map(s => ({
            ...s,
            id_donador: Number(s.id_donador),
            id_beneficiario: Number(s.id_beneficiario)
        }));

        console.log("✅ Usuarios obtenidos:", usuarios);
        console.log("✅ Donaciones obtenidas:", solicitudes);

        // 🔹 Mostrar preview inicial en dashboard
        mostrarSolicitudesPorEstado();

    } catch (err) {
        console.error("Error cargando datos:", err);
        mostrarToast("Error al cargar datos del dashboard", "error");
    }

    // =====================================================
    // 3️⃣ Funciones internas de indicadores
    // =====================================================

    async function cargarTotalDinero() {
        try {
            const data = await fetchConToken('http://localhost:3000/api/admin/total-dinero');
            document.getElementById("totalDinero").textContent = data.total ?? 0;
        } catch (err) {
            console.error("Error cargando total dinero:", err);
        }
    }

    async function cargarPorcentajeAprobacion() {
        try {
            const data = await fetchConToken('http://localhost:3000/api/admin/porcentaje-aprobacion');
            document.getElementById("porcentajeAprobacion").textContent =
                (data.porcentaje ?? 0) + "%";
        } catch (err) {
            console.error("Error cargando porcentaje:", err);
        }
    }

    async function cargarTopDonador() {
        try {
            const data = await fetchConToken('http://localhost:3000/api/admin/top-donador');
            document.getElementById("topDonador").innerHTML = `
                ${data.nombre ?? "Desconocido"}<br>
                ${data.total ?? 0} donaciones
            `;
        } catch (err) {
            console.error("Error cargando top donador:", err);
        }
    }

    async function cargarUsuariosUltimoMes() {
        try {
            const data = await fetchConToken('http://localhost:3000/api/usuarios-ultimo-mes');
            document.getElementById("usuariosUltimoMes").textContent =
                (data.total ?? 0) + " usuarios registrados";
        } catch (err) {
            console.error("Error cargando usuarios último mes:", err);
        }
    }

    async function cargarTotalInstituciones() {
        try {
            const data = await fetchConToken('http://localhost:3000/api/admin/total-instituciones');
            document.getElementById("totalInstituciones").textContent = data.total ?? 0;
        } catch (err) {
            console.error("Error cargando instituciones:", err);
        }
    }

    async function notificarSolicitudesPendientes() {
        try {
            const data = await fetchConToken('http://localhost:3000/api/admin/solicitudes-pendientes');
            const pendientes = data.pendientes ?? 0;

            if (pendientes > 0) {
                mostrarToast(
                    `Tienes ${pendientes} solicitud${pendientes > 1 ? "es" : ""} pendiente${pendientes > 1 ? "s" : ""}`,
                    "warning"
                );
            }
        } catch (err) {
            console.error("Error obteniendo solicitudes pendientes:", err);
        }
    }

    // =====================================================
    // 4️⃣ Ejecutar todas las funciones de indicadores
    // =====================================================

    cargarTotalDinero();
    cargarPorcentajeAprobacion();
    cargarTopDonador();
    cargarUsuariosUltimoMes();
    cargarTotalInstituciones();
    notificarSolicitudesPendientes();

    // 🔹 Repetir notificación cada 10 minutos
    setInterval(notificarSolicitudesPendientes, 600000);
}

// =====================================================
// 5️⃣ Inicializar dashboard
// =====================================================
document.addEventListener("DOMContentLoaded", () => {
    cargarDatosDashboard();
});


  // --- Mostrar preview por estado ---
  function mostrarSolicitudesPorEstado() {
    const estadosMap = { 
        pendiente: "pendientesList", 
        aceptada: "aprobadasList", 
        rechazada: "rechazadasList" 
    };
    
    Object.entries(estadosMap).forEach(([estadoBD, idLista]) => {
        const lista = document.getElementById(idLista);
        if (!lista) return;
        lista.innerHTML = "";

        let solicitudesFiltradas = solicitudes.filter(s => s.estado.toLowerCase() === estadoBD);

        solicitudesFiltradas.slice(0, ITEMS_POR_DEFECTO).forEach(s => {
            const donador = usuarios.find(u => u.id === s.id_donador);
            const beneficiario = usuarios.find(u => u.id === s.id_beneficiario);

            const div = document.createElement("div");
            div.className = "solicitud-preview";
            div.innerHTML = `
                <strong>ID:</strong> ${s.id} |
                <strong>Donador:</strong> ${donador ? donador.nombre : "Desconocido"} |
                <strong>Beneficiario:</strong> ${beneficiario ? beneficiario.nombre : "Desconocido"}
            `;
            div.onclick = () => abrirModal(s);
            lista.appendChild(div);
        });

    });
  }
  // Muestra las solicitudes con el boton "Ver Mas"
  document.addEventListener("click", function (e) {
    if (e.target.id === "verMasPendiente") {
        abrirModalVerMas("pendiente");
    }
    if (e.target.id === "verMasAprobada") {
        abrirModalVerMas("aceptada"); // 🔥 importante
    }
    if (e.target.id === "verMasRechazada") {
        abrirModalVerMas("rechazada");
    }
  });

  // ----- Notificacion ----- //
  function mostrarToast(mensaje, tipo = "success") {
    try {
      let toastContainer = document.getElementById("toast-container");
      if (!toastContainer) {
        toastContainer = document.createElement("div");
        toastContainer.id = "toast-container";
        document.body.appendChild(toastContainer);
      }
  
      const toast = document.createElement("div");
      toast.className = "toast " + tipo;
      toast.textContent = mensaje || "";
      toastContainer.appendChild(toast);
  
      setTimeout(() => toast.remove(), 6000);
  
    } catch (e) {
      console.error("mostrarToast error:", e);
      alert(mensaje);
    }
  }
  
  // --- Modal de detalle ---
  const modal = document.getElementById("modalSolicitud");
  document.getElementById("cerrarModal").onclick = () => modal.style.display = "none";

  async function abrirModal(solicitud) {

    if (typeof modalVerMas !== "undefined" && modalVerMas) {
        modalVerMas.style.display = "none";
    }

    const modal = document.getElementById("modalSolicitud");
    if (!modal) return;
    modal.style.display = "flex";

    try {

        const donacion = await fetchConToken(
            `http://localhost:3000/api/donacion-detalle/${solicitud.id}`
        );

        if (!donacion) {
            mostrarToast("No se pudo cargar el detalle", "error");
            return;
        }

        const donador = usuarios.find(u => u.id === donacion.id_donador);
        const beneficiario = usuarios.find(u => u.id === donacion.id_beneficiario);

        document.getElementById("modalId").textContent = donacion.id;
        document.getElementById("modalUsuario").textContent =
            donador ? donador.nombre : donacion.id_donador;
        document.getElementById("modalBeneficiario").textContent =
            beneficiario ? beneficiario.nombre : donacion.id_beneficiario;
        document.getElementById("modalTipo").textContent = donacion.tipo;

        const cantidadElement = document.getElementById("modalCantidad");

        if (donacion.tipo === "dinero") {
            cantidadElement.textContent = `$${donacion.cantidad}`;
        } 
        else if (donacion.tipo === "utiles") {

            if (donacion.utiles && donacion.utiles.length > 0) {

                let listaHTML = "<ul>";

                donacion.utiles.forEach(util => {
                    listaHTML += `<li>${util.nombre} x${util.cantidad}</li>`;
                });

                listaHTML += "</ul>";

                cantidadElement.innerHTML = listaHTML;

            } else {
                cantidadElement.textContent = "Sin detalles de útiles";
            }
        }

        const fecha = new Date(donacion.fecha);
        const fechaFormateada = fecha.toLocaleString("es-MX", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });

        document.getElementById("modalFecha").textContent = fechaFormateada;

        const aceptarBtn = document.getElementById("aceptarSolicitud");
        const rechazarBtn = document.getElementById("rechazarSolicitud");

        if (aceptarBtn && rechazarBtn && donacion.estado) {

            if (donacion.estado.toLowerCase() === "pendiente") {
                aceptarBtn.style.display = "inline-block";
                rechazarBtn.style.display = "inline-block";
                aceptarBtn.onclick = () => cambiarEstado(donacion.id, "aceptada");
                rechazarBtn.onclick = () => cambiarEstado(donacion.id, "rechazada");
            } else {
                aceptarBtn.style.display = "none";
                rechazarBtn.style.display = "none";
            }
        }

    } catch (error) {
        console.error("Error cargando detalle:", error);
        mostrarToast("Error al cargar detalle", "error");
    }
}


  function abrirModalVerMas(estado) {
    estadoModalActual = estado.toLowerCase();
    paginaModalActual = 0;
    renderModalVerMas();
    modalVerMas.style.display = "flex";
  }

  function renderModalVerMas() {
    if (!estadoModalActual) return;
    const solicitudesFiltradas = solicitudes.filter(
        s => s.estado.toLowerCase() === estadoModalActual.toLowerCase()
    );
    const inicio = paginaModalActual * ITEMS_POR_PAGINA;
    const fin = inicio + ITEMS_POR_PAGINA;
    const subset = solicitudesFiltradas.slice(inicio, fin);

    
    const lista = document.getElementById("listaModalVerMas");
    lista.innerHTML = "";
    subset.forEach(s => {
        const donador = usuarios.find(u => u.id === s.id_donador);
        const beneficiario = usuarios.find(u => u.id === s.id_beneficiario);

        const div = document.createElement("div");
        div.className = "solicitud-preview";
        div.innerHTML = `
            <strong>ID:</strong> ${s.id} |
            <strong>Donador:</strong> ${donador ? donador.nombre : "Desconocido"} |
            <strong>Beneficiario:</strong> ${beneficiario ? beneficiario.nombre : "Desconocido"}
        `;
        div.onclick = () => abrirModal(s);
        lista.appendChild(div);
    });

        // Paginación

        const totalPaginas = Math.ceil(solicitudesFiltradas.length / ITEMS_POR_PAGINA);
        const paginaActual = paginaModalActual;
        const btnPrev = document.getElementById("prevPage");
        const btnNext = document.getElementById("nextPage");

        document.getElementById("pageIndicator").textContent = `Página ${paginaModalActual + 1} de ${totalPaginas}`;


        // Desactivar botones si corresponde
        btnPrev.disabled = paginaActual === 0;
        btnNext.disabled = paginaActual >= totalPaginas - 1;

        btnPrev.onclick = () => {
            if (paginaModalActual > 0) {
                paginaModalActual--;
                renderModalVerMas();
            }
        };
        
        btnNext.onclick = () => {
            if (paginaModalActual < totalPaginas - 1) {
                paginaModalActual++;
                renderModalVerMas();
            }
        };
        


    // Cerrar modal
    document.getElementById("cerrarModalVerMas").onclick = () => modalVerMas.style.display = "none";
  }

  // --- Cambiar estado ---
    async function cambiarEstado(idSolicitud, nuevoEstado) {
        try {
        const data = await fetchConToken(
            `http://localhost:3000/api/donaciones/${idSolicitud}`,
            {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ estado: nuevoEstado })
            }
        );
    
        if (!data || !data.success) {
            mostrarToast("Error al actualizar estado", "error");
            return;
        }
    
        // ✅ ACTUALIZAR EN MEMORIA
        const solicitud = solicitudes.find(s => s.id === idSolicitud);
        if (solicitud) {
            solicitud.estado = nuevoEstado;
        }
    
        // ✅ VOLVER A PINTAR LAS LISTAS
        mostrarSolicitudesPorEstado();
    
        // ✅ CERRAR MODAL AUTOMÁTICAMENTE
        const modal = document.getElementById("modalSolicitud");
        if (modal) {
            modal.style.display = "none";
        }
    
        // ✅ OCULTAR BOTONES (por seguridad visual)
        const aceptarBtn = document.getElementById("aceptarSolicitud");
        const rechazarBtn = document.getElementById("rechazarSolicitud");
    
        if (aceptarBtn) aceptarBtn.style.display = "none";
        if (rechazarBtn) rechazarBtn.style.display = "none";
    
        mostrarToast("Estado actualizado correctamente", "success");
    
        } catch (error) {
        console.error("Error al cambiar estado:", error);
        mostrarToast("Error del servidor", "error");
        }
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
      div.classList.add(msg.remitente_id === idAdmin ? "own" : "other");

      // 🔹 Texto del mensaje
      const texto = document.createElement("span");
      texto.textContent = msg.mensaje;
      div.appendChild(texto);

      // 🔹 Check de mensaje leído (solo para propios)
      if (msg.remitente_id === idAdmin) {
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
document.addEventListener('DOMContentLoaded', () => {
    cargarConversaciones();
});


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
        const usuariosFiltrados = data.filter(u => u.id !== idAdmin);

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