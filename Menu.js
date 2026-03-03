// Menu.js - Frontend actualizado sin estilos

// -------------------------
// Elementos principales
// -------------------------
const container = document.getElementById("container");
const registerBtn = document.getElementById("register");
const loginBtn = document.getElementById("login");
const formRegistro = document.getElementById("formRegistro");
const formLogin = document.getElementById("formLogin");

// Seguridad: si algún elemento no existe, evitamos errores
const safeAddListener = (el, ev, fn) => { if (el) el.addEventListener(ev, fn); };

// Toggle panels (botones del panel lateral)
safeAddListener(registerBtn, "click", () => container?.classList.add("active"));
safeAddListener(loginBtn, "click", () => container?.classList.remove("active"));


// -------------------------
// mostrarToast 
// -------------------------
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

    // Quitar después de 3 segundos
    setTimeout(() => toast.remove(), 3000);

  } catch (e) {
    console.error("mostrarToast error:", e);
    alert(mensaje); // fallback visible
  }
}

// -------------------------
// REGISTRO
// -------------------------
safeAddListener(formRegistro, "submit", async (event) => {
  event.preventDefault();

  const institucion = (document.getElementById("regInstitucion") || {}).value?.trim() || "";
  const correo = (document.getElementById("regCorreo") || {}).value?.trim() || "";
  const pass = (document.getElementById("regPass") || {}).value?.trim() || "";
  const rol = (document.getElementById("rol") || {}).value || "";

  if (!institucion || !correo || !pass || !rol) {
    mostrarToast("Completa todos los campos", "error");
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: institucion, correo, password: pass, institucion, rol })
    });

    let data = {};
    try {
      data = await res.json();
    } catch (e) {
      const t = await res.text().catch(() => "");
      data = { mensaje: t || (res.ok ? "Registro exitoso" : "Error al registrar"), tipo: res.ok ? "success" : "error" };
    }

    mostrarToast(data.mensaje || "Respuesta recibida", data.tipo || (res.ok ? "success" : "error"));

    if ((data.tipo === "success" || res.ok) && data.tipo !== "error") {
      container?.classList.remove("active");
      formRegistro.reset();
    }

  } catch (networkErr) {
    console.error("Fetch error (register):", networkErr);
    mostrarToast("Error de conexión con el servidor", "error");
  }
});


// -------------------------
// LOGIN
// -------------------------
safeAddListener(formLogin, "submit", async (event) => {
  event.preventDefault();
  const correo = (document.getElementById("loginCorreo") || {}).value?.trim() || "";
  const pass = (document.getElementById("loginPass") || {}).value?.trim() || "";

  if (!correo || !pass) {
    mostrarToast("Completa todos los campos", "error");
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo, password: pass })
    });

    let data = {};
    try {
      data = await res.json();
    } catch {
      const t = await res.text().catch(() => "");
      data = { error: t || "Error al iniciar sesión" };
    }

    if (!res.ok || data.error) {
      mostrarToast(data.error || data.mensaje || "Error al iniciar sesión", "error");
      return;
    }

    const usuario = data.usuario;
    const rol = usuario?.rol;

    // 🔥 GUARDAR TOKEN
    localStorage.setItem("token", data.token);

    // Guardar usuario en localStorage
    localStorage.setItem("usuario", JSON.stringify(usuario));

    mostrarToast(`Bienvenido ${usuario?.institucion || usuario?.nombre || ""}`, "success");

    // 🔥 Redirección según rol (agregado Administrador)
    if (rol === "Administrador") {
      setTimeout(() => {
        window.location.href = "../Admin Dashboard/admin.html";
      }, 1000);

    } else if (rol === "Donador") {
      setTimeout(() => {
        window.location.href = "../Donador/donador.html";
      }, 1000);

    } else if (rol === "Beneficiario") {
      setTimeout(() => {
        window.location.href = "../Beneficiario/beneficiario.html";
      }, 1000);

    } else {
      // Rol desconocido
      setTimeout(() => {
        window.location.href = "../Donador/donador.html";
      }, 1000);
    }

  } catch (err) {
    console.error("Fetch error (login):", err);
    mostrarToast("Error de conexión con el servidor", "error");
  }
});


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




