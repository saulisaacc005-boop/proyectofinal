require("dotenv").config();

console.log("🔥 Backend iniciando...");

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const jwt = require("jsonwebtoken"); // 👈 nuevo
const app = express();

app.use(cors());
app.use(express.json());


// 🔹 Servir frontend desde /public
app.use(express.static("public")); // mueve admin.html, admin.js, etc. aquí

// ================= CONEXIÓN MYSQL =================
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "sistema"
});
const dbPromise = db.promise();

db.connect(err => {
  if (err) {
    console.log("❌ MySQL error:", err);
    return;
  }
  console.log("✅ MySQL conectado");
});

// ================= REGISTER =================
app.post("/register", (req, res) => {
  const { nombre, correo, password, institucion, rol } = req.body;

  if (!nombre || !correo || !password || !institucion || !rol) {
    return res.status(400).json({ error: "Completa todos los campos", tipo: "error" });
  }

  const sql = `INSERT INTO usuarios (nombre, correo, password, institucion, rol) VALUES (?, ?, ?, ?, ?)`;
  db.query(sql, [nombre, correo, password, institucion, rol], (err) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.json({ mensaje: "Correo ya registrado", tipo: "error" });
      }
      return res.status(500).json({ error: "Error en el servidor", tipo: "error" });
    }
    res.json({ mensaje: "Registro exitoso", tipo: "success" });
  });
});

// ================= LOGIN =================
app.post("/login", (req, res) => {
  const { correo, password } = req.body;

  db.query("SELECT * FROM usuarios WHERE correo=?", [correo], (err, result) => {
    if (err) return res.status(500).json({ error: "Error servidor" });

    if (result.length === 0)
      return res.status(401).json({ error: "Usuario no existe" });

    const user = result[0];

    if (user.password !== password)
      return res.status(401).json({ error: "Contraseña incorrecta" });

    const token = jwt.sign(
      {
        id: user.id,
        rol: user.rol,
        nombre: user.nombre
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      mensaje: "Login exitoso",
      token,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        correo: user.correo,       
        institucion: user.institucion,
        rol: user.rol
      }
    });
  });
});

// ================= MIDDLEWARE JWT =================
function verifyToken(req, res, next) {

  const authHeader = req.headers["authorization"];

  if (!authHeader)
    return res.status(401).json({ error: "Token requerido" });

  const token = authHeader.split(" ")[1];

  if (!token)
    return res.status(401).json({ error: "Token inválido" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {

    if (err)
      return res.status(403).json({ error: "Token no válido o expirado" });

    req.usuario = decoded;
    next();
  });
}

function soloAdministrador(req, res, next) {

  if (!req.usuario?.rol) {
    return res.status(403).json({ error: "Rol no definido en token" });
  }

  const rol = req.usuario.rol.toString().toLowerCase();

  if (rol !== "administrador") {
    return res.status(403).json({ error: "Acceso solo para administradores" });
  }

  next();
}

// ================= USUARIOS =================
// ================= OBTENER TODOS LOS USUARIOS =================
app.get("/api/usuarios", verifyToken, soloAdministrador, async (req, res) => {  try {
    const [rows] = await dbPromise.query("SELECT * FROM usuarios");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

// Endpoint para obtener usuarios simplificados
app.get("/api/usuarios-simple", async (req, res) => {
  try {
    if (!dbPromise) {
      console.error("No hay conexión a la base de datos");
      return res.status(500).json({ error: "No hay conexión a la base de datos" });
    }

    // Ejecutar consulta usando tu conexión existente
    const [rows] = await dbPromise.execute("SELECT id, nombre, rol FROM usuarios");

    if (!Array.isArray(rows)) {
      console.error("Rows no es un array:", rows);
      return res.status(500).json({ error: "Error interno del servidor" });
    }

    // Normaliza los roles a minúsculas para el frontend
    const usuarios = rows.map(u => ({
      id: u.id,
      nombre: u.nombre,
      rol: u.rol.toLowerCase() // "Administrador" -> "administrador"
    }));

    res.json(usuarios);

  } catch (error) {
    console.error("Error en /api/usuarios-simple:", error.message);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

// =================================================================== 
// // ========= Actualiza Perfiles ========= 
// // ===================================================
app.put("/api/usuarios/:id", verifyToken, async (req, res) => {
  const { id } = req.params;

  // 🔐 VALIDACIÓN PRIMERO
  if (
    req.usuario.rol !== "Administrador" &&
    req.usuario.id !== parseInt(id)
  ) {
    return res.status(403).json({ error: "No autorizado" });
  }

  const { nombre, correo, institucion, password } = req.body;

  try {
    let query, params;

    if (password) {
      query = "UPDATE usuarios SET nombre=?, correo=?, institucion=?, password=? WHERE id=?";
      params = [nombre, correo, institucion, password, id];
    } else {
      query = "UPDATE usuarios SET nombre=?, correo=?, institucion=? WHERE id=?";
      params = [nombre, correo, institucion, id];
    }

    const [result] = await dbPromise.query(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ success: true, mensaje: "Perfil actualizado correctamente" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

// Obtener beneficiarios
app.get("/api/beneficiarios", verifyToken, async (req, res) => {  
  try {
    const [rows] = await dbPromise.query(
      "SELECT id, nombre, institucion, correo FROM usuarios WHERE rol='Beneficiario'"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener beneficiarios" });
  }
});

// Obtener un usuario por ID
app.get("/api/usuarios/:id", verifyToken , async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await dbPromise.query(
      "SELECT id, nombre, correo, institucion, rol FROM usuarios WHERE id=?",
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener usuario" });
  }
});

// ================= DONACIONES =================
// Obtener todas las donaciones
app.get("/api/donaciones", verifyToken, (req, res) => {  
  db.query("SELECT * FROM donaciones", (err, results) => {
    if (err) {
      console.error("Error en DB:", err);
      return res.status(500).json({ error: "Error al obtener donaciones" });
    }
    res.json(results);
  });
});

// Obtener donaciones de un donador específico
app.get("/api/donaciones/:idDonador", verifyToken, (req, res) => {

  const { idDonador } = req.params;

  // 🔐 Validación de seguridad
  if (
    req.usuario.rol !== "Administrador" &&
    req.usuario.id !== parseInt(idDonador)
  ) {
    return res.status(403).json({ error: "No autorizado" });
  }

  db.query(
    "SELECT * FROM donaciones WHERE id_donador=?",
    [idDonador],
    (err, results) => {

      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Error al obtener donaciones" });
      }

      res.json(results);
    }
  );
});

// Registrar nueva donación
app.post("/api/donaciones", verifyToken ,async (req, res) => {

  const { id_donador, id_beneficiario, tipo, cantidad, utiles } = req.body;

  try {

    // ================= DONACIÓN DE DINERO =================
    if (tipo === "dinero") {

      const [result] = await dbPromise.query(
        "INSERT INTO donaciones (id_donador, id_beneficiario, tipo, cantidad) VALUES (?,?,?,?)",
        [id_donador, id_beneficiario, "dinero", cantidad]
      );

      return res.json({ success: true, id: result.insertId });
    }

    // ================= DONACIÓN DE ÚTILES =================
    if (tipo === "utiles") {

      if (!utiles || utiles.length === 0) {
        return res.status(400).json({ error: "No se enviaron útiles" });
      }

      // 1️⃣ Crear donación general
      const [donacionResult] = await dbPromise.query(
        "INSERT INTO donaciones (id_donador, id_beneficiario, tipo) VALUES (?,?,?)",
        [id_donador, id_beneficiario, "utiles"]
      );

      const idDonacion = donacionResult.insertId;

      // 2️⃣ Insertar cada útil en detalle
      for (const item of utiles) {

        // Buscar ID del útil
        const [utilRows] = await dbPromise.query(
          "SELECT id FROM utiles WHERE nombre = ?",
          [item.nombre]
        );

        if (utilRows.length === 0) {
          return res.status(400).json({ error: `El útil ${item.nombre} no existe en catálogo` });
        }

        const idUtil = utilRows[0].id;

        await dbPromise.query(
          "INSERT INTO detalle_donacion_utiles (id_donacion, id_util, cantidad) VALUES (?,?,?)",
          [idDonacion, idUtil, item.cantidad]
        );
      }

      return res.json({ success: true });
    }

    return res.status(400).json({ error: "Tipo de donación inválido" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al registrar donación" });
  }
});

app.get("/api/donacion-detalle/:id", verifyToken, async (req, res) => {  
  const { id } = req.params;

  try {

    const [donacionRows] = await dbPromise.query(
      "SELECT * FROM donaciones WHERE id = ?",
      [id]
    );

    if (donacionRows.length === 0) {
      return res.status(404).json({ error: "Donación no encontrada" });
    }

    const donacion = donacionRows[0];

    // Si es dinero → devolver tal cual
    if (donacion.tipo === "dinero") {
      return res.json(donacion);
    }

    // Si es útiles → traer detalle
    const [detalle] = await dbPromise.query(
      `SELECT u.nombre, dd.cantidad
       FROM detalle_donacion_utiles dd
       JOIN utiles u ON dd.id_util = u.id
       WHERE dd.id_donacion = ?`,
      [id]
    );

    res.json({
      ...donacion,
      utiles: detalle
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener donación" });
  }
});


// Total donaciones recibidas por beneficiario BENEFICIARIO DASHBOARD
app.get("/api/donaciones-beneficiario-total/:idBeneficiario", verifyToken, (req, res) => {
  const { idBeneficiario } = req.params;

  db.query(
    `SELECT COUNT(*) AS total
     FROM donaciones
     WHERE id_beneficiario = ?
     AND estado = 'aceptada'`,
    [idBeneficiario],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Error al obtener total de donaciones" });
      }

      res.json({ total: results[0].total });
    }
  );
});

// Total dinero recibido por beneficiario BENEFICIARIO DASHBOARD
app.get("/api/donaciones-beneficiario-dinero/:idBeneficiario", verifyToken,(req, res) => {
  const { idBeneficiario } = req.params;

  db.query(
    `SELECT IFNULL(SUM(cantidad), 0) AS total
     FROM donaciones 
     WHERE id_beneficiario = ?
     AND estado = 'aceptada'
     AND tipo = 'dinero'`,
    [idBeneficiario],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Error al obtener total" });
      }

      res.json({ total: results[0].total });
    }
  );
});

// Donaciones este mes vs histórico BENEFICIARIO DASHBOARD
app.get("/api/donaciones-mes-vs-historico/:idBeneficiario", verifyToken,(req, res) => {
  const { idBeneficiario } = req.params;

  const sql = `
    SELECT 
      COUNT(*) AS totalHistorico,
      SUM(
        CASE 
          WHEN MONTH(fecha) = MONTH(CURRENT_DATE())
          AND YEAR(fecha) = YEAR(CURRENT_DATE())
          THEN 1 ELSE 0
        END
      ) AS totalMes
    FROM donaciones
    WHERE id_beneficiario = ?
    AND estado = 'aceptada'
  `;

  db.query(sql, [idBeneficiario], (err, results) => {
    if (err) {
      console.error("Error en mes vs histórico:", err);
      return res.status(500).json({ error: "Error en consulta" });
    }

    res.json(results[0]);
  });
});

// Promedio donación monetaria por beneficiario BENEFICIARIO DASHBOARD
app.get("/api/promedio-donacion/:idBeneficiario", verifyToken, (req, res) => {
  const { idBeneficiario } = req.params;

  const sql = `
    SELECT AVG(cantidad) AS promedio
    FROM donaciones
    WHERE id_beneficiario = ?
    AND estado = 'aceptada'
    AND tipo = 'dinero'
  `;

  db.query(sql, [idBeneficiario], (err, results) => {
    if (err) {
      console.error("Error obteniendo promedio:", err);
      return res.status(500).json({ error: err.message });
    }

    res.json(results[0]);
  });
});

// Dinero vs Útiles por cantidad de donaciones BENEFICIARIO DASHBOARD
app.get("/api/distribucion-donaciones/:idBeneficiario", verifyToken, (req, res) => {
  const { idBeneficiario } = req.params;

  const sql = `
    SELECT 
      COUNT(CASE WHEN tipo = 'dinero' AND estado = 'aceptada' THEN 1 END) AS totalDinero,
      COUNT(CASE WHEN tipo = 'utiles' AND estado = 'aceptada' THEN 1 END) AS totalUtiles
    FROM donaciones
    WHERE id_beneficiario = ?
  `;

  db.query(sql, [idBeneficiario], (err, results) => {
    if (err) {
      console.error("Error en distribución:", err);
      return res.status(500).json({ error: err.message });
    }

    res.json(results[0]);
  });
});


// ================= ULTIMA ACTUALIZACION INVENTARIO BENEFICIARIO DASHBOARD =================
app.get("/api/inventario/ultima-actualizacion/:idBeneficiario", verifyToken, async (req, res) => {
  const { idBeneficiario } = req.params;

  try {
    const [rows] = await dbPromise.query(`
      SELECT MAX(d.fechaAceptacion) AS ultima
      FROM donaciones d
      WHERE d.id_beneficiario = ?
      AND d.estado = 'aceptada'
    `, [idBeneficiario]);

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error obteniendo fecha" });
  }
});


// ================= INVENTARIO BENEFICIARIO BENEFICIARIO DASHBOARD =================
app.get("/api/inventario/:idBeneficiario", verifyToken, async (req, res) => {

  const { idBeneficiario } = req.params;

  try {

    const [rows] = await dbPromise.query(`
      SELECT 
        u.nombre,
        u.categoria,
        SUM(dd.cantidad) AS total
      FROM detalle_donacion_utiles dd
      JOIN donaciones d ON dd.id_donacion = d.id
      JOIN utiles u ON dd.id_util = u.id
      WHERE d.id_beneficiario = ?
      AND d.estado = 'aceptada'
      GROUP BY u.id
      ORDER BY u.categoria, u.nombre
    `, [idBeneficiario]);

    res.json(rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener inventario" });
  }

});

// DONACIONES RECIBIDAS POR BENEFICIARIO --- BENEFICIARIO DASHBOARD
app.get("/api/donaciones-beneficiario/:idBeneficiario", verifyToken, async (req, res) => {
  const { idBeneficiario } = req.params;

  try {

    // Solo donaciones ACEPTADAS
    const [donaciones] = await dbPromise.query(`
      SELECT d.*, u.nombre AS nombre_donador
      FROM donaciones d
      LEFT JOIN usuarios u ON d.id_donador = u.id
      WHERE d.id_beneficiario = ?
      AND d.estado = 'aceptada'
      ORDER BY d.fechaAceptacion DESC
    `, [idBeneficiario]);

    const resultado = [];

    for (const donacion of donaciones) {

      // Si es dinero
      if (donacion.tipo === "dinero") {
        resultado.push(donacion);
      }

      // Si es útiles → traemos detalle
      if (donacion.tipo === "utiles") {

        const [detalle] = await dbPromise.query(`
          SELECT u.nombre, dd.cantidad
          FROM detalle_donacion_utiles dd
          JOIN utiles u ON dd.id_util = u.id
          WHERE dd.id_donacion = ?
        `, [donacion.id]);

        resultado.push({
          ...donacion,
          utiles: detalle
        });
      }
    }

    res.json(resultado);

  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      error: "Error al obtener donaciones aceptadas del beneficiario" 
    });
  }
});


// ========================================
// OBTENER TODOS LOS ÚTILES
// ========================================
app.get("/api/utiles", verifyToken, async (req, res) => {
  try {

    const [rows] = await dbPromise.query(
      "SELECT * FROM utiles ORDER BY categoria, nombre"
    );

    res.json(rows);

  } catch (error) {
    console.error("Error obteniendo útiles:", error);
    res.status(500).json({ error: "Error al obtener útiles" });
  }
});

// Actualizar estado de una donación ADMIN DASHBOARD
app.put("/api/donaciones/:id", verifyToken, soloAdministrador, async (req, res) => {  
  const { id } = req.params;
  const { estado } = req.body;

  if (!estado) return res.status(400).json({ error: "Debe enviar el nuevo estado" });

  try {
    let query = "UPDATE donaciones SET estado=? WHERE id=?";
    let params = [estado, id];

    // Si el estado es 'aceptada', también actualizamos la fecha de aceptación
    if (estado === "aceptada") {
      query = "UPDATE donaciones SET estado=?, fechaAceptacion=NOW() WHERE id=?";
    }

    const [result] = await dbPromise.query(query, params);

    if (result.affectedRows === 0) return res.status(404).json({ error: "Donación no encontrada" });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar donación" });
  }
});

// Muestra el total de dinero donado en ADMIN DASHBOARD 
app.get('/api/admin/total-dinero', verifyToken, soloAdministrador, async (req, res) => {  
  try {
    const [rows] = await dbPromise.query(`
      SELECT IFNULL(SUM(cantidad), 0) AS total
      FROM donaciones
      WHERE tipo = 'dinero'
      AND estado = 'aceptada'
    `);

    res.json({ total: rows[0].total });

  } catch (error) {
    console.error("Error obteniendo total dinero:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Porcentaje de Donaciones aceptadas ADMIN DASHBOARD
app.get('/api/admin/porcentaje-aprobacion', verifyToken, soloAdministrador, (req, res) => {
  const sql = `
    SELECT 
      COUNT(*) AS total,
      SUM(CASE WHEN estado = 'aceptada' THEN 1 ELSE 0 END) AS aceptadas
    FROM donaciones
  `;

  db.query(sql, (error, results) => {
    if (error) {
      console.error("Error SQL porcentaje:", error);
      return res.status(500).json({ error: "Error en consulta" });
    }

    const total = results[0].total;
    const aceptadas = results[0].aceptadas || 0;

    let porcentaje = 0;

    if (total > 0) {
      porcentaje = (aceptadas / total) * 100;
    }

    res.json({
      total,
      aceptadas,
      porcentaje: porcentaje.toFixed(2)
    });
  });
});

// Usuario con más donaciones aprobadas ADMIN DASHBOARD
app.get('/api/admin/top-donador', verifyToken, soloAdministrador, (req, res) => {
  const sql = `
    SELECT u.nombre, COUNT(d.id) AS total
    FROM donaciones d
    JOIN usuarios u ON d.id_donador = u.id
    WHERE d.estado = 'aceptada'
    GROUP BY d.id_donador
    ORDER BY total DESC
    LIMIT 1
  `;

  db.query(sql, (error, results) => {
    if (error) {
      console.error("Error top donador:", error);
      return res.status(500).json({ error: "Error en consulta" });
    }

    if (results.length === 0) {
      return res.json({
        nombre: "Sin datos",
        total: 0
      });
    }

    res.json(results[0]);
  });
});

// Usuarios ultimo mes ADMIN DASHBOARD
app.get('/api/usuarios-ultimo-mes', verifyToken, soloAdministrador, (req, res) => {
  const query = `
    SELECT COUNT(*) AS total
    FROM usuarios
    WHERE fecha_registro >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
  `;

  db.query(query, (error, results) => {
    if (error) {
      console.error("Error obteniendo usuarios del último mes:", error);
      return res.status(500).json({ error: "Error en servidor" });
    }

    res.json({ total: results[0].total });
  });

});

// Contar solicitudes pendientes para la notificacion ADMIN DASHBOARD
app.get('/api/admin/solicitudes-pendientes', verifyToken, soloAdministrador, (req, res) => {  
  db.query(
    "SELECT COUNT(*) AS pendientes FROM donaciones WHERE estado = 'pendiente'",
    (err, results) => {
      if (err) {
        console.error("Error al contar solicitudes pendientes:", err);
        return res.status(500).json({ error: "Error en servidor" });
      }
      res.json({ pendientes: results[0].pendientes });
    }
  );
});

// Total de instituciones beneficiadas ADMIN DASHBOARD
app.get('/api/admin/total-instituciones', verifyToken, soloAdministrador, (req, res) => {  
  const sql = `
    SELECT COUNT(DISTINCT institucion) AS total
    FROM usuarios
    WHERE rol = 'Beneficiario'
  `;

  db.query(sql, (error, results) => {
    if (error) {
      console.error("Error obteniendo instituciones:", error);
      return res.status(500).json({ error: "Error en consulta" });
    }

    res.json({ total: results[0].total || 0 });
  });
});


// =====================================================
//  Sistema de mensajes 
// =====================================================

// =====================================================
//  Obtener la lista de conversaciones
// =====================================================
app.get('/api/mensajes/conversaciones', verifyToken, async (req, res) => {
  const usuarioId = req.usuario.id;

  try {
    const [conversaciones] = await dbPromise.execute(`
      SELECT u.id AS otro_usuario_id,
             u.nombre AS otro_usuario_nombre,
             MAX(m.creado_en) AS ultima_fecha,
             SUM(CASE WHEN m.leido = 0 AND m.destinatario_id = ? THEN 1 ELSE 0 END) AS no_leidos
      FROM usuarios u
      LEFT JOIN mensajes m 
        ON (m.remitente_id = u.id AND m.destinatario_id = ?) 
           OR (m.remitente_id = ? AND m.destinatario_id = u.id)
      WHERE u.id != ?
      GROUP BY u.id
      ORDER BY ultima_fecha DESC
    `, [usuarioId, usuarioId, usuarioId, usuarioId]);

    res.json({ ok: true, conversaciones });

  } catch (error) {
    console.error("❌ Error al obtener conversaciones:", error.message);
    res.status(500).json({ ok: false, error: 'Error al obtener conversaciones' });
  }
});

// =====================================================
//  Obtener mensajes de una conversación
// =====================================================
app.get('/api/mensajes/:destinatarioId', verifyToken, async (req, res) => {
  const remitenteId = req.usuario.id;
  const destinatarioId = req.params.destinatarioId;

  try {
    const [mensajes] = await dbPromise.execute(`
      SELECT *
      FROM mensajes
      WHERE (remitente_id = ? AND destinatario_id = ?)
         OR (remitente_id = ? AND destinatario_id = ?)
      ORDER BY creado_en ASC
    `, [remitenteId, destinatarioId, destinatarioId, remitenteId]);

    res.json({ ok: true, mensajes });

  } catch (error) {
    console.error("❌ Error al obtener mensajes:", error.message);
    res.status(500).json({ ok: false, error: 'Error al obtener mensajes' });
  }
});

// =====================================================
//  Enviar un mensaje
// =====================================================
app.post('/api/mensajes', verifyToken, async (req, res) => {
  const remitenteId = req.usuario.id;
  const { destinatario_id, mensaje } = req.body;

  if (!destinatario_id || !mensaje) {
    return res.status(400).json({ ok: false, error: 'Faltan datos' });
  }

  try {
    await dbPromise.execute(`
      INSERT INTO mensajes (remitente_id, destinatario_id, mensaje)
      VALUES (?, ?, ?)
    `, [remitenteId, destinatario_id, mensaje]);

    res.json({ ok: true, mensaje: 'Mensaje enviado correctamente' });

  } catch (error) {
    console.error("❌ Error al enviar mensaje:", error.message);
    res.status(500).json({ ok: false, error: 'Error al enviar mensaje' });
  }
});

// =====================================================
// Marcar mensajes como leídos
// =====================================================
app.put('/api/mensajes/leido/:remitenteId', verifyToken, async (req, res) => {
  const destinatarioId = req.usuario.id;
  const remitenteId = req.params.remitenteId;

  try {
    const [resultado] = await dbPromise.execute(
      `UPDATE mensajes
       SET leido = 1
       WHERE remitente_id = ? AND destinatario_id = ? AND leido = 0`,
      [remitenteId, destinatarioId]
    );

    res.json({ ok: true, updated: resultado.affectedRows });
  } catch (error) {
    console.error("❌ Error al marcar mensajes como leídos:", error.message);
    res.status(500).json({ ok: false, error: 'Error al marcar mensajes como leídos' });
  }
});

// ================= RUTA PRUEBA =================
app.get("/", (req, res) => {
  res.send("Backend funcionando 🔥");
});

// ================= SERVIDOR =================
app.listen(3000, () => {
  console.log("✅ Servidor activo en puerto 3000");
});

