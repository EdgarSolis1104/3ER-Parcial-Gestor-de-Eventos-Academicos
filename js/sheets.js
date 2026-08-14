// ============================================
// sheets.js — Exportación de eventos a Google Sheets
//
// Depende de:
//  - leerCache()          (calendar.js)  -> eventos guardados localmente
//  - obtenerTokenValido() (auth.js)      -> access_token vigente o null
//  - sesionExpirada()     (calendar.js)  -> limpia sesión si el token murió
//  - mostrarSalida()      (calendar.js)  -> muestra mensajes al usuario
//
// Decisiones de diseño (ver ticket "Sheets — Exportar eventos"):
//
//  1) Exportar con la lista vacía NO crea ninguna hoja. Se avisa al
//     usuario y no se llama a la API.
//
//  2) Exportar dos veces seguidas SOBRESCRIBE, no duplica. La hoja de
//     Sheets siempre refleja el estado actual del caché local. Para
//     lograrlo:
//       - la primera vez se crea un spreadsheet y su ID se guarda en
//         localStorage ('gea_sheet_id')
//       - en exports siguientes se reutiliza ese ID: se limpia el
//         rango de datos (values:clear) y se reescribe todo de nuevo
//       - si la hoja guardada ya no existe, o está en la papelera de
//         Drive, se descarta el ID guardado y se crea una hoja nueva
//         automáticamente (usa la API de Drive para chequear `trashed`,
//         porque values:clear NO da error con archivos en la papelera)
//
//  3) Si el token no tiene el scope de Sheets, Google responde 403 con
//     status "PERMISSION_DENIED" y un mensaje que menciona "scope".
//     Se detecta ese caso puntual y se muestra un mensaje claro pidiendo
//     re-login, en vez de mostrar el error crudo de la API.
//
//  4) NUEVO — Sincronización automática después del primer export:
//     Una vez que el usuario le da a "Exportar" manualmente y funciona,
//     se guarda una bandera ('gea_sheets_sync_activo') en localStorage.
//     Desde ese momento, cada vez que se crea, edita o borra un evento
//     (ver calendar.js), se llama a sincronizarSheetsSiCorresponde(),
//     que espera 3 segundos sin más cambios (debounce) antes de mandar
//     todo el caché actualizado a Sheets — así varias ediciones seguidas
//     se agrupan en una sola llamada a la API en vez de una por cambio.
//     Si el usuario nunca exportó manualmente, la bandera no existe y
//     esta función no hace nada: no se toca Sheets para nada.
// ============================================

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3/files';
const NOMBRE_HOJA = 'Eventos';
const ENCABEZADOS = ['Título', 'Fecha', 'Hora', 'Descripción', 'Tipo'];

const SHEETS_SYNC_KEY = 'gea_sheets_sync_activo';
const SHEETS_SYNC_ESPERA_MS = 3000; // 3 segundos de "silencio" antes de sincronizar

let sheetsSyncTimeoutId = null;

function obtenerSheetIdGuardado() {
  return localStorage.getItem('gea_sheet_id');
}

function guardarSheetId(id) {
  localStorage.setItem('gea_sheet_id', id);
}

function olvidarSheetId() {
  localStorage.removeItem('gea_sheet_id');
}

// --------------------------------------------
// Bandera de sincronización automática
// --------------------------------------------
function activarSyncAutomatico() {
  localStorage.setItem(SHEETS_SYNC_KEY, 'true');
}

function syncAutomaticoActivo() {
  return localStorage.getItem(SHEETS_SYNC_KEY) === 'true';
}

// Se llama desde calendar.js después de crear/editar/borrar un evento.
// Si nunca se exportó manualmente, no hace nada. Si ya se exportó,
// espera SHEETS_SYNC_ESPERA_MS sin más cambios antes de mandar todo
// el caché actualizado a Sheets (agrupa cambios seguidos en un solo call).
function sincronizarSheetsSiCorresponde() {
  if (!syncAutomaticoActivo()) return;

  if (sheetsSyncTimeoutId) {
    clearTimeout(sheetsSyncTimeoutId);
  }

  sheetsSyncTimeoutId = setTimeout(() => {
    sheetsSyncTimeoutId = null;
    exportarEventosASheets().catch(err => {
      console.log('ERROR en sincronización automática a Sheets:', err);
    });
  }, SHEETS_SYNC_ESPERA_MS);
}

function eventosAFilas(eventos) {
  return eventos.map(e => [e.titulo, e.fecha, e.hora, e.descripcion, e.tipo]);
}

// Traduce errores comunes de la API de Sheets a mensajes que el usuario
// entiende, y devuelve el Error que hay que lanzar (throw) desde afuera.
function manejarErrorSheets(status, data) {
  if (status === 401) {
    sesionExpirada();
    return new Error('Sesión expirada');
  }

  if (status === 403) {
    const razon = data?.error?.status || '';
    const mensaje = data?.error?.message || '';
    const faltaScope = razon === 'PERMISSION_DENIED' && /scope/i.test(mensaje);

    if (faltaScope) {
      mostrarSalida('Tu sesión no tiene permiso para escribir en Google Sheets. Cierra sesión e inicia de nuevo para aceptar ese permiso.');
      return new Error('Falta el scope de Sheets en el token');
    }

    mostrarSalida('No tienes permiso para realizar esta acción en Google Sheets.');
    return new Error('Permiso denegado por Google Sheets');
  }

  console.log('ERROR DE GOOGLE (sheets):', data);
  mostrarSalida('No se pudo exportar a Sheets. Intenta de nuevo.');
  return new Error(JSON.stringify(data));
}

// Pregunta a la API de Drive si el spreadsheet guardado está en la
// papelera (o ya no es accesible). Necesita el scope
// 'drive.metadata.readonly'. Si no se puede confirmar se trata como
// "en papelera" para forzar la creación de una hoja nueva.
function hojaEnPapelera(token, spreadsheetId) {
  return fetch(`${DRIVE_API_BASE}/${spreadsheetId}?fields=trashed`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => {
      if (res.status === 401) {
        sesionExpirada();
        throw new Error('Sesión expirada');
      }

      if (!res.ok) {
        return true;
      }

      return res.json().then(data => !!data.trashed);
    });
}

// Crea un spreadsheet nuevo con la hoja "Eventos" y encabezados vacíos,
// y guarda su ID para reutilizarlo en próximas exportaciones.
function crearHojaDeSheets(token) {
  return fetch(SHEETS_API_BASE, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: { title: 'Gestor de Eventos Académicos - Exportación' },
      sheets: [{ properties: { title: NOMBRE_HOJA } }]
    })
  })
    .then(res => res.json().then(data => ({ status: res.status, data })))
    .then(({ status, data }) => {
      if (status !== 200) {
        throw manejarErrorSheets(status, data);
      }
      guardarSheetId(data.spreadsheetId);
      return data.spreadsheetId;
    });
}

// Limpia el rango de datos de una hoja existente antes de reescribirla.
function limpiarHojaDeSheets(token, spreadsheetId) {
  return fetch(`${SHEETS_API_BASE}/${spreadsheetId}/values/${NOMBRE_HOJA}:clear`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => {
      if (res.ok) return true;

      if (res.status === 401) {
        sesionExpirada();
        throw new Error('Sesión expirada');
      }

      return res.json().then(data => {
        const razon = data?.error?.status || '';
        const mensaje = data?.error?.message || '';
        const faltaScope = res.status === 403 && /scope/i.test(mensaje) && razon === 'PERMISSION_DENIED';

        if (faltaScope) {
          throw manejarErrorSheets(res.status, data);
        }

        console.log('La hoja guardada ya no es usable, se creará una nueva:', data);
        olvidarSheetId();
        return false;
      });
    });
}

// Escribe encabezados + filas de eventos desde A1 (sobrescribe lo que
// hubiera en ese rango).
function escribirEventosEnSheets(token, spreadsheetId, eventos) {
  const valores = [ENCABEZADOS, ...eventosAFilas(eventos)];

  return fetch(`${SHEETS_API_BASE}/${spreadsheetId}/values/${NOMBRE_HOJA}!A1?valueInputOption=RAW`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values: valores })
  })
    .then(res => res.json().then(data => ({ status: res.status, data })))
    .then(({ status, data }) => {
      if (status !== 200) {
        throw manejarErrorSheets(status, data);
      }
      return data;
    });
}

// --------------------------------------------
// exportarEventosASheets()
// Punto de entrada usado por el botón "Exportar" (ver ui.js) Y por la
// sincronización automática (sincronizarSheetsSiCorresponde()).
// Devuelve una Promise<string|null> con el spreadsheetId, o null si
// no había eventos para exportar.
// --------------------------------------------
function exportarEventosASheets() {
  const eventos = leerCache();

  // Caso borde 1: lista vacía -> no se crea hoja, solo se avisa.
  if (eventos.length === 0) {
    mostrarSalida('No hay eventos para exportar.');
    return Promise.resolve(null);
  }

  const token = obtenerTokenValido();
  if (!token) {
    mostrarSalida('Tu sesión ya no es válida. Inicia sesión de nuevo.');
    return Promise.reject(new Error('no auth'));
  }

  const spreadsheetIdGuardado = obtenerSheetIdGuardado();

  // Caso borde 2: si ya exportamos antes, primero confirmamos con Drive
  // que la hoja NO está en la papelera. Si está en la papelera o ya no
  // existe -> se crea una hoja nueva. Si sigue activa -> se limpia y se
  // reescribe (evita duplicados).
  const obtenerSpreadsheetId = spreadsheetIdGuardado
    ? hojaEnPapelera(token, spreadsheetIdGuardado).then(enPapelera => {
        if (enPapelera) {
          olvidarSheetId();
          return crearHojaDeSheets(token);
        }
        return limpiarHojaDeSheets(token, spreadsheetIdGuardado)
          .then(sigueExistiendo => sigueExistiendo ? spreadsheetIdGuardado : crearHojaDeSheets(token));
      })
    : crearHojaDeSheets(token);

  return obtenerSpreadsheetId
    .then(spreadsheetId =>
      escribirEventosEnSheets(token, spreadsheetId, eventos).then(() => spreadsheetId)
    )
    .then(spreadsheetId => {
      // A partir de un export exitoso (manual o automático), queda
      // activada la sincronización automática para los próximos cambios.
      activarSyncAutomatico();
      mostrarSalida('Eventos exportados a Google Sheets correctamente.');
      return spreadsheetId;
    });
}