const crearBtn = document.getElementById('crearBtn');
const salidaEl = document.getElementById('salida');

function mostrarSalida(texto) {
  salidaEl.style.display = 'block';
  salidaEl.textContent = texto;
}

// --------------------------------------------
// CACHÉ localStorage (gea_eventos_cache)
// --------------------------------------------
function leerCache() {
  const data = localStorage.getItem('gea_eventos_cache');
  return data ? JSON.parse(data) : [];
}

function guardarCache(eventos) {
  localStorage.setItem('gea_eventos_cache', JSON.stringify(eventos));
}

function actualizarEventoEnCache(eventoEstandar) {
  const eventos = leerCache();
  const idx = eventos.findIndex(e => e.id === eventoEstandar.id);
  if (idx !== -1) {
    eventos[idx] = eventoEstandar;
  } else {
    eventos.push(eventoEstandar);
  }
  guardarCache(eventos);
}

function eliminarEventoDeCache(id) {
  const eventos = leerCache().filter(e => e.id !== id);
  guardarCache(eventos);
}

// --------------------------------------------
// Mapeo: evento de Google Calendar -> formato estándar del caché
// (id, titulo, fecha, hora, descripcion, tipo)
// --------------------------------------------
function mapearEventoAEstandar(eventoGoogle) {
  const fechaHora = eventoGoogle.start?.dateTime || eventoGoogle.start?.date || '';
  const [fecha, horaConZona] = fechaHora.split('T');
  const hora = horaConZona ? horaConZona.substring(0, 5) : '';

  return {
    id: eventoGoogle.id,
    titulo: eventoGoogle.summary || '(sin título)',
    fecha: fecha || '',
    hora: hora || '',
    descripcion: eventoGoogle.description || '',
    tipo: eventoGoogle.extendedProperties?.private?.tipo || 'general'
  };
}

// --------------------------------------------
// LISTAR EVENTOS (GET) - se llama automático desde auth.js tras login
// --------------------------------------------
function listarEventos() {
  if (!AppState.accessToken) {
    mostrarSalida('Primero haz login.');
    return Promise.reject('no auth');
  }

  return fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${AppState.accessToken}`
    }
  })
    .then(res => res.json().then(data => ({ status: res.status, data })))
    .then(({ status, data }) => {
      if (status !== 200) {
        console.log('ERROR DE GOOGLE (listar):', data);
        throw new Error(JSON.stringify(data));
      }
      const eventosEstandar = (data.items || []).map(mapearEventoAEstandar);
      guardarCache(eventosEstandar);
      return eventosEstandar;
    });
}

// --------------------------------------------
// CREAR EVENTO (POST)
// --------------------------------------------
function crearEvento(nuevoEvento) {
  if (!AppState.accessToken) {
    mostrarSalida('Primero haz login.');
    return Promise.reject('no auth');
  }

  return fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AppState.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(nuevoEvento)
  })
    .then(res => res.json().then(data => ({ status: res.status, data })))
    .then(({ status, data }) => {
      if (status !== 200) {
        console.log('ERROR DE GOOGLE (crear):', data);
        throw new Error(JSON.stringify(data));
      }
      const eventoEstandar = mapearEventoAEstandar(data);
      actualizarEventoEnCache(eventoEstandar);
      return eventoEstandar;
    });
}

crearBtn.addEventListener('click', () => {
  const nuevoEvento = {
    summary: "Evento de prueba desde VS Code",
    start: { dateTime: "2026-08-02T10:00:00-05:00" },
    end: { dateTime: "2026-08-02T11:00:00-05:00" },
    extendedProperties: {
      private: { tipo: "general" }
    }
  };

  crearEvento(nuevoEvento)
    .then(evento => {
      mostrarSalida('Evento creado:\n' + JSON.stringify(evento, null, 2));
      renderizarEventos();
    })
    .catch(err => mostrarSalida('Error: ' + err));
});

// --------------------------------------------
// EDITAR EVENTO (PATCH)
// --------------------------------------------
function editarEvento(eventoId, cambios) {
  if (!AppState.accessToken) {
    mostrarSalida('Primero haz login.');
    return Promise.reject('no auth');
  }

  return fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventoId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${AppState.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(cambios)
  })
    .then(res => res.json().then(data => ({ status: res.status, data })))
    .then(({ status, data }) => {
      if (status !== 200) {
        console.log('ERROR DE GOOGLE (editar):', data);
        throw new Error(JSON.stringify(data));
      }
      const eventoEstandar = mapearEventoAEstandar(data);
      actualizarEventoEnCache(eventoEstandar);
      return eventoEstandar;
    });
}

// --------------------------------------------
// ELIMINAR EVENTO (DELETE)
// --------------------------------------------
function eliminarEvento(eventoId) {
  if (!AppState.accessToken) {
    mostrarSalida('Primero haz login.');
    return Promise.reject('no auth');
  }

  return fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventoId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${AppState.accessToken}` }
  })
    .then(res => {
      if (res.status === 204 || res.ok) {
        eliminarEventoDeCache(eventoId);
        return true;
      }
      throw new Error('Status: ' + res.status);
    });
}