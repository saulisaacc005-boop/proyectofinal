// =====================================================
// Helper global para hacer fetch con token
// =====================================================
async function fetchConToken(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    if (response.status === 403) mostrarToast("No tienes permisos para acceder a esta información", "error");
    throw new Error(`Error ${response.status}`);
  }
  return response.json();
}
  
  // -------------------------
  // Mostrar/Ocultar contraseña
  // -------------------------
  function togglePass(id, icon) {
    const input = document.getElementById(id);
    if (!input) return;
    if (input.type === "password") {
      input.type = "text";
      icon?.classList.remove("fa-eye");
      icon?.classList.add("fa-eye-slash");
    } else {
      input.type = "password";
      icon?.classList.remove("fa-eye-slash");
      icon?.classList.add("fa-eye");
    }
  }

document.addEventListener("DOMContentLoaded", () => {

  // =====================================================
  // 1️⃣ Verificar usuario logueado y definir idDonador
  // =====================================================
  let usuarioLogueado = null;
  let idDonador = null;

  try {
    const usuarioGuardado = localStorage.getItem("usuario");
    const token = localStorage.getItem("token"); // 🔑 Token JWT

    if (!usuarioGuardado || usuarioGuardado === "undefined" || !token) {
      throw new Error("No hay usuario logueado");
    }

    usuarioLogueado = JSON.parse(usuarioGuardado);
    idDonador = usuarioLogueado.id;

  } catch (error) {
    console.warn("Usuario inválido o no logueado");
    mostrarToast("Debes iniciar sesión", "error");
    localStorage.removeItem("usuario");
    localStorage.removeItem("token");
    window.location.href = "../menu/Menu.html";
  }

    // =====================================================
    // 2️⃣ Mostrar secciones
    // =====================================================
    function mostrar(id) {
      document.querySelectorAll(".seccion").forEach(sec =>
        sec.classList.add("oculto")
      );
      document.getElementById(id).classList.remove("oculto");
    }
    window.mostrar = mostrar;

  // =====================================================
  // 3️⃣ Logout
  // =====================================================
  window.logout = function () {
    localStorage.removeItem("usuario");
    localStorage.removeItem("token");
    window.location.href = "../menu/Menu.html";
  };



    // =====================================================
    // 4️⃣ Cargar beneficiarios
    // =====================================================
    async function cargarBeneficiarios() {
      try {

        const token = localStorage.getItem("token");

        if (!token) {
          console.warn("No hay token, redirigiendo al login...");
          window.location.href = "../menu.html";
          return;
        }

        const res = await fetch("http://localhost:3000/api/beneficiarios", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
          }
        });

        if (res.status === 401 || res.status === 403) {
          console.warn("Token inválido o expirado");
          localStorage.removeItem("token");
          localStorage.removeItem("usuario");
          window.location.href = "../menu.html";
          return;
        }

        const beneficiarios = await res.json();

        const select = document.getElementById("beneficiario");
        select.innerHTML = "<option value=''>Selecciona un beneficiario</option>";

        if (Array.isArray(beneficiarios)) {
          beneficiarios.forEach(b => {
            const option = document.createElement("option");
            option.value = b.id;
            option.textContent = `${b.nombre} (${b.institucion})`;
            select.appendChild(option);
          });
        }

      } catch (err) {
        console.error("Error cargando beneficiarios:", err);
      }
    }


  // =====================================================
  // 5️⃣ Cargar donaciones (VERSIÓN JWT)
  // =====================================================
  async function cargarDonaciones() {
    try {

      const token = localStorage.getItem("token");
      const usuarioGuardado = localStorage.getItem("usuario");

      if (!token || !usuarioGuardado) {
        window.location.href = "../menu/Menu.html";
        return;
      }

      const usuarioLogueado = JSON.parse(usuarioGuardado);
      const idDonador = usuarioLogueado.id;

      const res = await fetch(
        `http://localhost:3000/api/donaciones/${idDonador}`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      // 🔥 Manejar sesión inválida correctamente
      if (res.status === 401 || res.status === 403) {
        localStorage.clear();
        window.location.href = "../menu/Menu.html";
        return;
      }

      if (!res.ok) {
        console.error("Error backend:", res.status);
        return;
      }

      const donaciones = await res.json();

      if (!Array.isArray(donaciones)) return;

      const donacionesAceptadas = donaciones.filter(
        d => d.estado && d.estado.toLowerCase() === "aceptada"
      );

      document.getElementById("totalDonaciones").textContent =
        donacionesAceptadas.length;

      calcularNivel(donacionesAceptadas.length);
      crearGrafica(donaciones);

      document.getElementById("ultimaDonacion").textContent =
        donaciones.length > 0
          ? new Date(donaciones[donaciones.length - 1].fecha).toLocaleDateString()
          : "-";

      const tabla = document.getElementById("tablaDonaciones");
      tabla.innerHTML = "";

      for (const d of donaciones) {

        const estadoClass =
          d.estado === "Completado"
            ? "estado-completado"
            : d.estado === "Cancelado"
            ? "estado-cancelado"
            : "estado-pendiente";

        const tipoNormalizado =
          d.tipo?.toLowerCase() === "dinero" ? "Dinero" : "Utiles";

        let descripcionHTML = "-";

        if (tipoNormalizado === "Dinero") {
          descripcionHTML = `$${d.cantidad}`;
        }

        if (tipoNormalizado === "Utiles") {

          try {
            const response = await fetch(
              `http://localhost:3000/api/donacion-detalle/${d.id}`,
              {
                headers: {
                  "Authorization": `Bearer ${token}`,
                  "Content-Type": "application/json"
                }
              }
            );

            if (response.status === 401 || response.status === 403) {
              localStorage.clear();
              window.location.href = "../menu/Menu.html";
              return;
            }

            if (response.ok) {
              const donacionDetalle = await response.json();

              if (donacionDetalle.utiles?.length > 0) {
                let listaHTML = "<ul style='padding-left:18px; margin:0;'>";
                donacionDetalle.utiles.forEach(util => {
                  listaHTML += `<li>${util.nombre} x${util.cantidad}</li>`;
                });
                listaHTML += "</ul>";
                descripcionHTML = listaHTML;
              } else {
                descripcionHTML = "Sin detalles de útiles";
              }
            }

          } catch (error) {
            console.error("Error cargando detalle:", error);
            descripcionHTML = "Error cargando útiles";
          }
        }

        tabla.innerHTML += `
          <tr>
            <td>${d.id}</td>
            <td>${new Date(d.fecha).toLocaleDateString()}</td>
            <td>${tipoNormalizado}</td>
            <td>${descripcionHTML}</td>
            <td><span class="estado ${estadoClass}">${d.estado || "Pendiente"}</span></td>
          </tr>
        `;
      }

    } catch (err) {
      console.error("Error cargando donaciones:", err);
    }
  }

    // =====================================================
    // 6️⃣ Manejo tipo donación 
    // =====================================================


    const tipoSelect = document.getElementById("tipoDonacion");
    const utilesDiv = document.getElementById("utilesDiv");
    const modalDinero = document.getElementById("modalDinero");
    const modalConfirmacion = document.getElementById("modalConfirmacion");
    const inputMonto = document.getElementById("inputMonto");
    const btnConfirmarMonto = document.getElementById("confirmarMonto");
    const btnCancelarMonto = document.getElementById("cancelarMonto");


    // ===============================
    // CAMBIO DE TIPO DE DONACIÓN
    // ===============================
    tipoSelect.addEventListener("change", () => {

      if (tipoSelect.value === "dinero") {

        utilesDiv.style.display = "none";

        // 🔥 REINICIAR VALORES
        inputMonto.value = "";
        montoSeleccionado = null;

        // Abrir modal dinero
        modalDinero.style.display = "flex";

        // Enfocar input automáticamente
        inputMonto.focus();

      } else if (tipoSelect.value === "utiles") {

        utilesDiv.style.display = "block";

      } else {

        utilesDiv.style.display = "none";
      }

    });


    // ===============================
    // BOTÓN CONTINUAR (DINERO)
    // ===============================
    btnConfirmarMonto.addEventListener("click", () => {

      const monto = parseFloat(inputMonto.value);

      if (!monto || monto <= 0) {
        mostrarToast("Ingrese un monto válido");
        return;
      }

      montoSeleccionado = monto;

      // Cerrar modal dinero
      modalDinero.style.display = "none";

      // Abrir modal confirmación
      modalConfirmacion.classList.remove("oculto");
      modalConfirmacion.style.display = "flex";
    });


    // ===============================
    // BOTÓN CANCELAR (DINERO)
    // ===============================
    btnCancelarMonto.addEventListener("click", () => {

      inputMonto.value = "";
      montoSeleccionado = null;

      modalDinero.style.display = "none";
    });


    // =====================================================
    // Modal para ingresar dinero
    // =====================================================

    let montoSeleccionado = null;

    document.getElementById("confirmarMonto").addEventListener("click", () => {

      const monto = document.getElementById("inputMonto").value;
    
      if (!monto || monto <= 0) {
        mostrarToast("Ingresa una cantidad válida");
        return;
      }
    
      montoSeleccionado = monto;
    
      // Cerrar modal dinero
      document.getElementById("modalDinero").style.display = "none";
    
      // 🔥 Abrir correctamente modalConfirmacion
      document.getElementById("modalConfirmacion").classList.remove("oculto");
    
    });
    

    document.getElementById("cancelarMonto").addEventListener("click", () => {
      modalDinero.style.display = "none";
    });


  // ===============================
  // 🆕 SISTEMA COMPLETO DE ÚTILES CON FILTRO (con JWT)
  // ===============================

  let carritoDonacion = [];

  // Abrir modal de útiles
  document.getElementById("abrirModalUtiles").addEventListener("click", () => {
    document.getElementById("modalUtiles").classList.remove("oculto");
    cargarUtiles();
  });

  // Cerrar modal
  document.getElementById("cerrarModal").addEventListener("click", () => {
    document.getElementById("modalUtiles").classList.add("oculto");
  });

  // Cargar útiles desde backend con token
  async function cargarUtiles() {
    try {

      const token = localStorage.getItem("token");

      if (!token) {
        window.location.href = "../menu/Menu.html";
        return;
      }

      const res = await fetch("http://localhost:3000/api/utiles", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.clear();
        window.location.href = "../menu/Menu.html";
        return;
      }

      if (!res.ok) {
        console.error("Error backend:", res.status);
        return;
      }

      const utiles = await res.json();

      const contenedor = document.getElementById("contenedorUtiles");
      const filtros = document.getElementById("filtrosCategorias");

      contenedor.innerHTML = "";
      filtros.innerHTML = "";

      const categorias = {};
      utiles.forEach(util => {
        if (!categorias[util.categoria]) categorias[util.categoria] = [];
        categorias[util.categoria].push(util);
      });

      const botonTodos = document.createElement("button");
      botonTodos.textContent = "Todos";
      botonTodos.dataset.categoria = "Todos";
      filtros.appendChild(botonTodos);

      for (const categoria in categorias) {
        const btn = document.createElement("button");
        btn.textContent = categoria;
        btn.dataset.categoria = categoria;
        filtros.appendChild(btn);
      }

      function mostrarCategoria(categoria) {
        const bloques = document.querySelectorAll("#contenedorUtiles > div.bloque-categoria");
        bloques.forEach(bloque => {
          bloque.style.display =
            categoria === "Todos" || bloque.dataset.categoria === categoria
              ? "block"
              : "none";
        });
      }

      filtros.querySelectorAll("button").forEach(btn => {
        btn.addEventListener("click", () =>
          mostrarCategoria(btn.dataset.categoria)
        );
      });

      for (const categoria in categorias) {
        const bloque = document.createElement("div");
        bloque.classList.add("bloque-categoria");
        bloque.dataset.categoria = categoria;
        bloque.innerHTML = `<h4>${categoria}</h4>`;

        categorias[categoria].forEach(util => {
          bloque.innerHTML += `
            <div class="item-util">
              <label>
                <input type="checkbox"
                      data-id="${util.id}"
                      data-nombre="${util.nombre}"
                      onchange="seleccionarUtil(this)">
                ${util.nombre}
              </label>
            </div>
          `;
        });

        contenedor.appendChild(bloque);
      }

      mostrarCategoria("Todos");

    } catch (error) {
      console.error("Error cargando útiles:", error);
    }
    }

    // -------------------------
    // 1️⃣ Seleccionar útil
    // -------------------------
    function seleccionarUtil(checkbox) {
      const id_util = parseInt(checkbox.dataset.id);
      const nombre = checkbox.dataset.nombre;

      if (checkbox.checked) {
        if (!carritoDonacion.find(item => item.id_util === id_util)) {
          carritoDonacion.push({ id_util, nombre, cantidad: 1 });
        }
      } else {
        carritoDonacion = carritoDonacion.filter(item => item.id_util !== id_util);
      }

      actualizarVistaCantidades();
    }
    window.seleccionarUtil = seleccionarUtil;

    // -------------------------
    // 2️⃣ Actualizar cantidad
    // -------------------------
    function cambiarCantidad(id_util, input) {
      const item = carritoDonacion.find(i => i.id_util === id_util);
      if (!item) return;
      const nuevaCantidad = parseInt(input.value);
      item.cantidad = (nuevaCantidad > 0) ? nuevaCantidad : 1;
      input.value = item.cantidad;
    }
    window.cambiarCantidad = cambiarCantidad;

    // -------------------------
    // 3️⃣ Actualizar inputs cantidad visibles
    // -------------------------
    function actualizarVistaCantidades() {
      document.querySelectorAll(".input-cantidad").forEach(div => div.style.display = "none");
      carritoDonacion.forEach(item => {
        const div = document.querySelector(`.input-cantidad[data-id="${item.id_util}"]`);
        if (div) {
          div.style.display = "block";
          div.querySelector("input").value = item.cantidad;
        }
      });
    }

    // -------------------------
    // 4️⃣ Abrir resumen
    // -------------------------
    function abrirResumen() {
      if (carritoDonacion.length === 0) {
        mostrarToast("Selecciona al menos un útil");
        return;
      }
      const lista = document.getElementById("listaResumenUtiles");
      lista.innerHTML = "";
      carritoDonacion.forEach(item => {
        lista.innerHTML += `
          <div class="item-resumen">
            <span>${item.nombre}</span>
            <input type="number"
                  min="1"
                  value="${item.cantidad}"
                  onchange="cambiarCantidadResumen(${item.id_util}, this)">
            <button onclick="eliminarDelResumen(${item.id_util})">Eliminar</button>
          </div>
        `;
      });
      document.getElementById("modalResumen").classList.remove("oculto");
    }
    window.abrirResumen = abrirResumen;

    // =====================================================
    // 🔹 BOTÓN CONTINUAR → ABRIR MODAL RESUMEN
    // =====================================================
    document.getElementById("confirmarUtiles").addEventListener("click", () => {

      // Validar que haya útiles seleccionados
      if (carritoDonacion.length === 0) {
        mostrarToast("Selecciona al menos un útil para continuar");
        return;
      }

      // Cerrar modal de selección de útiles
      document.getElementById("modalUtiles").classList.add("oculto");

      // Abrir modal de resumen
      abrirResumen();

    });

    // -------------------------
    // 🔹 BOTÓN VOLVER → REGRESAR AL CATÁLOGO
    // -------------------------
    document.getElementById("volverSeleccion").addEventListener("click", () => {

      // Cerrar modal resumen
      document.getElementById("modalResumen").classList.add("oculto");

      // Abrir nuevamente el modal de útiles
      document.getElementById("modalUtiles").classList.remove("oculto");

    });

    // -------------------------
    // 🔹 CERRAR MODAL RESUMEN (X)
    // -------------------------
    document.getElementById("cerrarResumen").addEventListener("click", () => {
      document.getElementById("modalResumen").classList.add("oculto");
    });

    // -------------------------
    // 5️⃣ Cambiar cantidad desde resumen
    // -------------------------
    function cambiarCantidadResumen(id_util, input) {
      const item = carritoDonacion.find(i => i.id_util === id_util);
      if (!item) return;
      const nuevaCantidad = parseInt(input.value);
      item.cantidad = (nuevaCantidad > 0) ? nuevaCantidad : 1;
      input.value = item.cantidad;
    }
    window.cambiarCantidadResumen = cambiarCantidadResumen;

    // -------------------------
    // 6️⃣ Eliminar del resumen
    // -------------------------
    function eliminarDelResumen(id_util) {
      carritoDonacion = carritoDonacion.filter(item => item.id_util !== id_util);
      abrirResumen();
    }
    window.eliminarDelResumen = eliminarDelResumen;

    // -------------------------
    // 🔹 BOTÓN DONAR → ABRIR MODAL CONFIRMACIÓN
    // -------------------------
    document.getElementById("btnDonarResumen").addEventListener("click", () => {

      if (carritoDonacion.length === 0) {
        mostrarToast("No hay útiles seleccionados");
        return;
      }

      // Cerrar modal resumen
      document.getElementById("modalResumen").classList.add("oculto");

      // Abrir modal confirmación
      document.getElementById("modalConfirmacion").classList.remove("oculto");

    });

    // -------------------------
    // 7️⃣ Confirmar donación (FINAL) con JWT
    // -------------------------

    async function confirmarDonacion() {
      const id_beneficiario = document.getElementById("beneficiario").value;
      const tipo = document.getElementById("tipoDonacion").value;

      if (!id_beneficiario) {
        mostrarToast("Selecciona un beneficiario");
        return;
      }

      try {
        const token = localStorage.getItem("token"); // 🔑 Obtener JWT

        // =============================
        // 🔥 DONACIÓN DE DINERO
        // =============================
        if (tipo === "dinero") {
          if (!montoSeleccionado || montoSeleccionado <= 0) {
            mostrarToast("Monto inválido");
            return;
          }

          const res = await fetch("http://localhost:3000/api/donaciones", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}` // ✅ Incluir JWT
            },
            body: JSON.stringify({
              id_donador: idDonador,
              id_beneficiario,
              tipo: "dinero",
              cantidad: montoSeleccionado
            })
          });

          const data = await res.json();

          if (data.success) {
            mostrarToast("¡Donación enviada correctamente!");
            document.getElementById("modalConfirmacion").classList.add("oculto");
            await cargarDonaciones();
          }

          return; // 🔥 Salir para no ejecutar útiles
        }

        // =============================
        // 📦 DONACIÓN DE ÚTILES
        // =============================
        if (carritoDonacion.length === 0) {
          mostrarToast("No hay útiles seleccionados");
          return;
        }

        const res = await fetch("http://localhost:3000/api/donaciones", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}` // ✅ Incluir JWT
          },
          body: JSON.stringify({
            id_donador: idDonador,
            id_beneficiario,
            tipo: "utiles",
            utiles: carritoDonacion
          })
        });

        const data = await res.json();

        if (data.success) {
          mostrarToast("¡Donación enviada correctamente!");
          carritoDonacion = [];
          document.getElementById("modalConfirmacion").classList.add("oculto");
          document.getElementById("modalResumen").classList.add("oculto");
          document.getElementById("modalUtiles").classList.add("oculto");
          await cargarDonaciones();
        } else {
          mostrarToast("Error al enviar donación");
        }

      } catch (error) {
        console.error(error);
        mostrarToast("Error al enviar donación");
      }
    }

    window.confirmarDonacion = confirmarDonacion;


    // -------------------------
    // 🔹 BOTÓN CONFIRMAR FINAL → ENVIAR A BD
    // -------------------------
    document.getElementById("confirmarDonacionFinal").addEventListener("click", () => {
      confirmarDonacion();
    });


    // -------------------------
    // 🔹 CERRAR MODAL CONFIRMACIÓN
    // -------------------------
    function cerrarModalConfirmacion() {
      document.getElementById("modalConfirmacion").classList.add("oculto");
    }
    
    document.getElementById("cerrarConfirmacion")?.addEventListener("click", cerrarModalConfirmacion);
    document.getElementById("cancelarDonacion")?.addEventListener("click", cerrarModalConfirmacion);

    // =====================================================
    // 7️⃣ Perfil: edición y actualización (VERSIÓN LIMPIA)
    // =====================================================

    document.addEventListener("click", async function (e) {

    const usuarioLogueado = JSON.parse(localStorage.getItem("usuario"));
    const token = localStorage.getItem("token");

    // ================================
    // 🔹 BOTÓN EDITAR
    // ================================
    if (e.target.id === "btnEditarPerfil") {

      if (!usuarioLogueado) return;

      document.getElementById("inputNombre").value = usuarioLogueado.nombre || "";
      document.getElementById("inputCorreo").value = usuarioLogueado.correo || "";
      document.getElementById("inputInstitucion").value = usuarioLogueado.institucion || "";

      document.getElementById("datosPerfil").classList.add("oculto");
      document.getElementById("editarPerfil").classList.remove("oculto");

      e.target.style.display = "none";
    }

    // ================================
    // 🔹 BOTÓN CANCELAR
    // ================================
    if (e.target.id === "cancelarEdicion") {

      document.getElementById("editarPerfil").classList.add("oculto");
      document.getElementById("datosPerfil").classList.remove("oculto");

      document.getElementById("btnEditarPerfil").style.display = "inline-block";
      document.getElementById("mensajePerfil").textContent = "";
    }

    // ================================
    // 🔹 BOTÓN GUARDAR
    // ================================
    if (e.target.id === "btnGuardar") {

      if (!usuarioLogueado || !token) {
        localStorage.clear();
        window.location.href = "../menu/Menu.html";
        return;
      }

      const nombre = document.getElementById("inputNombre").value.trim();
      const correo = document.getElementById("inputCorreo").value.trim();
      const institucion = document.getElementById("inputInstitucion").value.trim();
      const password = document.getElementById("inputPassword").value.trim();

      const mensajePerfil = document.getElementById("mensajePerfil");

      if (!nombre || !correo || !institucion) {
        mensajePerfil.style.color = "red";
        mensajePerfil.textContent = "Completa todos los campos obligatorios";
        return;
      }

      try {

        const res = await fetch(
          `http://localhost:3000/api/usuarios/${usuarioLogueado.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              nombre,
              correo,
              institucion,
              password: password || undefined
            })
          }
        );

        if (res.status === 401 || res.status === 403) {
          localStorage.clear();
          window.location.href = "../menu/Menu.html";
          return;
        }

        const data = await res.json();

        if (res.ok) {

          mensajePerfil.style.color = "green";
          mensajePerfil.textContent = data.mensaje || "Perfil actualizado correctamente";

          usuarioLogueado.nombre = nombre;
          usuarioLogueado.correo = correo;
          usuarioLogueado.institucion = institucion;

          localStorage.setItem("usuario", JSON.stringify(usuarioLogueado));

          document.getElementById("perfilNombre").textContent = nombre;
          document.getElementById("perfilCorreo").textContent = correo;
          document.getElementById("perfilInstitucion").textContent = institucion;

          document.getElementById("editarPerfil").classList.add("oculto");
          document.getElementById("datosPerfil").classList.remove("oculto");
          document.getElementById("btnEditarPerfil").style.display = "inline-block";

        } else {
          mensajePerfil.style.color = "red";
          mensajePerfil.textContent = data.error || "Error al actualizar";
        }

      } catch (err) {
        console.error("Error actualizando perfil:", err);
        mensajePerfil.style.color = "red";
        mensajePerfil.textContent = "Error de conexión con el servidor";
      }
    }

    });

    // =====================================================
    // 8️⃣ Sistema de niveles
    // =====================================================
    let nivelAnterior = "";

    function calcularNivel(totalDonaciones) {
      let nivel = "👣 Primer Paso";
      let siguienteNivel = "Bronce 🥉";
      let min = 0;
      let max = 5;

      if (totalDonaciones >= 5 && totalDonaciones <= 9) {
        nivel = "Bronce 🥉";
        siguienteNivel = "Plata 🥈";
        min = 5; max = 10;
      }
      else if (totalDonaciones >= 10 && totalDonaciones <= 19) {
        nivel = "Plata 🥈";
        siguienteNivel = "Oro 🥇";
        min = 10; max = 20;
      }
      else if (totalDonaciones >= 20 && totalDonaciones <= 29) {
        nivel = "Oro 🥇";
        siguienteNivel = "Platino 💎";
        min = 20; max = 30;
      }
      else if (totalDonaciones >= 30 && totalDonaciones <= 49) {
        nivel = "Platino 💎";
        siguienteNivel = "👑 Leyenda Solidaria";
        min = 30; max = 50;
      }
      else if (totalDonaciones >= 50) {
        nivel = "👑 Leyenda Solidaria";
        min = 50; max = 50;
      }

      const nivelElemento = document.getElementById("nivelDonador");
      const progresoElemento = document.getElementById("progresoNivel");
      const barraElemento = document.getElementById("barraNivel");

      if (nivelAnterior && nivelAnterior !== nivel) {
        mostrarNotificacion(nivel);
      }

      nivelAnterior = nivel;

      if (nivelElemento) nivelElemento.textContent = nivel;

      if (progresoElemento) {
        if (totalDonaciones >= 50) {
          progresoElemento.textContent =
            `Donaciones: ${totalDonaciones} | Nivel máximo alcanzado 👑`;
        } else {
          const faltan = max - totalDonaciones;
          progresoElemento.textContent =
            `Donaciones: ${totalDonaciones} / ${max} — Te faltan ${faltan} para subir a ${siguienteNivel}`;
        }
      }

      if (barraElemento) {
        let porcentaje = 100;
        if (max !== min) {
          porcentaje = ((totalDonaciones - min) / (max - min)) * 100;
        }
        barraElemento.style.width = porcentaje + "%";
      }
    }

    function mostrarNotificacion(nuevoNivel) {
      const notificacion = document.getElementById("notificacionNivel");
      const texto = document.getElementById("textoNotificacion");

      texto.textContent = `🎉 ¡Felicidades! Has subido a ${nuevoNivel}`;
      notificacion.classList.add("mostrar");

      setTimeout(() => {
        notificacion.classList.remove("mostrar");
      }, 4000);
    }

    // =====================================================
    // 9️⃣ Gráfica
    // =====================================================
    let graficaInstance = null;

    function crearGrafica(donaciones) {
      if (!Array.isArray(donaciones)) return;

      let dinero = 0;
      let utiles = 0;

      donaciones.forEach(d => {
        if (d.tipo.toLowerCase() === "dinero") dinero++;
        if (d.tipo.toLowerCase() === "utiles") utiles++;
      });

      const ctx = document.getElementById('graficaDonaciones');
      if (!ctx) return;

      if (graficaInstance) graficaInstance.destroy();

      graficaInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Dinero 💰', 'Útiles 📦'],
          datasets: [{
            data: [dinero, utiles],
            backgroundColor: ['#4CAF50', '#2196F3']
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    }

    // ===============================
    // SISTEMA DE NOTIFICACIONES TOAST
    // ===============================
    function mostrarToast(mensaje, tipo = "success", duracion = 6000) {

      const container = document.getElementById("toast-container");

      const toast = document.createElement("div");
      toast.classList.add("toast", tipo);
      toast.textContent = mensaje;

      container.appendChild(toast);

      // Eliminar después del tiempo indicado
      setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-6px)";
        
        setTimeout(() => {
          toast.remove();
        }, 300);
        
      }, duracion);
    }
    // =====================================================
    // 🔟 Inicializar
    // =====================================================
    async function init() {
      document.getElementById("nombreDonador").textContent = usuarioLogueado.nombre;
      document.getElementById("perfilNombre").textContent = usuarioLogueado.nombre;
      document.getElementById("perfilCorreo").textContent = usuarioLogueado.correo;
      document.getElementById("perfilInstitucion").textContent = usuarioLogueado.institucion;
      document.getElementById("perfilRol").textContent = usuarioLogueado.rol;

      await cargarBeneficiarios();
      await cargarDonaciones();
    }

    init();





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
          div.classList.add(msg.remitente_id === idDonador ? "own" : "other");
    
          // 🔹 Texto del mensaje
          const texto = document.createElement("span");
          texto.textContent = msg.mensaje;
          div.appendChild(texto);
    
          // 🔹 Check de mensaje leído (solo para propios)
          if (msg.remitente_id === idDonador) {
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
          const usuariosFiltrados = data.filter(u => u.id !== idDonador);

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