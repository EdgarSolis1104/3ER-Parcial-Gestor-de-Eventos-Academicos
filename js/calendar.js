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

   const fechaHoraFin = eventoGoogle.end?.dateTime || eventoGoogle.end?.date || '';
  const [fechaFin] = fechaHoraFin.split('T');

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
  const token = obtenerTokenValido();
  if (!token) {
    mostrarSalida('Tu sesión ya no es válida. Inicia sesión de nuevo.');
    return Promise.reject('no auth');
  }

  return fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
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
  const token = obtenerTokenValido();
  if (!token) {
    mostrarSalida('Tu sesión ya no es válida. Inicia sesión de nuevo.');
    return Promise.reject('no auth');
  }

  return fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(nuevoEvento)
  })
    .then(res => res.json().then(data => ({ status: res.status, data })))
    .then(({ status, data }) => {
        if (status === 401) {
          sesionExpirada();
          throw new Error('Sesión expirada');
        }
        if (status !== 200) {
        console.log('ERROR DE GOOGLE (crear):', data);
        throw new Error(JSON.stringify(data));
      }
      const eventoEstandar = mapearEventoAEstandar(data);
      actualizarEventoEnCache(eventoEstandar);
      return eventoEstandar;
    });
}

const modalCrear = document.getElementById('modalCrear');
const formCrearEvento = document.getElementById('formCrearEvento');
const btnCancelar = document.getElementById('btnCancelar');
const modalTitulo = document.getElementById('modalTitulo');
const btnModalCrear = document.getElementById('btnModalCrear');

const campoFechaInicio = document.getElementById('campoFechaInicio');
const campoHoraInicio = document.getElementById('campoHoraInicio');
const campoFechaFinal = document.getElementById('campoFechaFinal');
const campoHoraFinal = document.getElementById('campoHoraFinal');
const errorFormulario = document.getElementById('errorFormulario');

let eventoEnEdicion = null;

// Marca visualmente que la fecha/hora final no puede ir antes de la inicial.
function actualizarLimitesFecha() {
  campoFechaFinal.min = campoFechaInicio.value;

  const mismaFecha = campoFechaFinal.value && campoFechaFinal.value === campoFechaInicio.value;
  campoHoraFinal.min = mismaFecha ? campoHoraInicio.value : '';
}

function mostrarErrorFormulario(texto) {
  errorFormulario.textContent = texto;
  errorFormulario.style.display = 'block';
}

function ocultarErrorFormulario() {
  errorFormulario.textContent = '';
  errorFormulario.style.display = 'none';
}

function cerrarModalCrear() {
  modalCrear.classList.remove('abierto');
  formCrearEvento.reset();
  eventoEnEdicion = null;
  modalTitulo.textContent = 'Crear Evento';
  btnModalCrear.textContent = 'Crear Evento';
  ocultarErrorFormulario();
}

function abrirModalCrear() {
  eventoEnEdicion = null;
  modalTitulo.textContent = 'Crear Evento';
  btnModalCrear.textContent = 'Crear Evento';
  formCrearEvento.reset();
  ocultarErrorFormulario();
  actualizarLimitesFecha();
  modalCrear.classList.add('abierto');
}

function abrirModalEditar(evento) {
  eventoEnEdicion = evento;
  modalTitulo.textContent = 'Editar Evento';
  btnModalCrear.textContent = 'Guardar Cambios';

  const [fechaInicio, horaInicio] = evento.fechaHoraInicio ? evento.fechaHoraInicio.split('T') : [evento.fecha, evento.hora];
  const [fechaFinal, horaFinal] = evento.fechaHoraFin ? evento.fechaHoraFin.split('T') : [evento.fecha, evento.hora];

  document.getElementById('campoTitulo').value = evento.titulo;
  document.getElementById('campoDescripcion').value = evento.descripcion;
  campoFechaInicio.value = fechaInicio;
  campoHoraInicio.value = horaInicio ? horaInicio.substring(0, 5) : '';
  campoFechaFinal.value = fechaFinal;
  campoHoraFinal.value = horaFinal ? horaFinal.substring(0, 5) : '';
  document.getElementById('campoTipo').value = evento.tipo;

  ocultarErrorFormulario();
  actualizarLimitesFecha();
  modalCrear.classList.add('abierto');
}

campoFechaInicio.addEventListener('input', actualizarLimitesFecha);
campoHoraInicio.addEventListener('input', actualizarLimitesFecha);
campoFechaFinal.addEventListener('input', actualizarLimitesFecha);

crearBtn.addEventListener('click', abrirModalCrear);

btnCancelar.addEventListener('click', cerrarModalCrear);
modalCrear.addEventListener('click', (e) => {
  if (e.target === modalCrear) cerrarModalCrear();
});

formCrearEvento.addEventListener('submit', (e) => {
  e.preventDefault();

  const titulo = document.getElementById('campoTitulo').value.trim();
  if (!titulo) {
    mostrarErrorFormulario('El título no puede estar vacío.');
    return;
  }

  const descripcion = document.getElementById('campoDescripcion').value.trim();
  const fechaInicio = campoFechaInicio.value;
  const horaInicio = campoHoraInicio.value;
  const fechaFinal = campoFechaFinal.value;
  const horaFinal = campoHoraFinal.value;
  const tipo = document.getElementById('campoTipo').value;

  const inicio = fechaInicio + 'T' + horaInicio;
  const fin = fechaFinal + 'T' + horaFinal;
  if (fin < inicio) {
    mostrarErrorFormulario('La fecha final no puede ser anterior a la de inicio.');
    return;
  }

  ocultarErrorFormulario();

  const datosEvento = {
    summary: titulo,
    description: descripcion,
    start: { dateTime: `${inicio}:00-05:00` },
    end: { dateTime: `${fin}:00-05:00` },
    extendedProperties: {
      private: { tipo }
    }
  };

  // Evita que el doble clic en "Guardar" duplique el evento
  btnModalCrear.disabled = true;

  const guardar = eventoEnEdicion
    ? editarEvento(eventoEnEdicion.id, datosEvento)
    : crearEvento(datosEvento);

  guardar
    .then(() => {
      renderizarEventos();
      cerrarModalCrear();
    })
    .catch(err => mostrarSalida('Error: ' + err))
    .finally(() => {
      btnModalCrear.disabled = false;
    });
});

// --------------------------------------------
// EDITAR EVENTO (PATCH)
// --------------------------------------------
function editarEvento(eventoId, cambios) {
  const token = obtenerTokenValido();
  if (!token) {
    mostrarSalida('Tu sesión ya no es válida. Inicia sesión de nuevo.');
    return Promise.reject('no auth');
  }

  return fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventoId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(cambios)
  })
    .then(res => res.json().then(data => ({ status: res.status, data })))
    .then(({ status, data }) => {
    if (status === 410) {
      eliminarEventoDeCache(eventoId);
      throw new Error("evento no encontrado");
    }
    if (status === 404) {
      eliminarEventoDeCache(eventoId);
      throw new Error("Sesión ya no existe");
    }
    if (status === 401) {
        sesionExpirada();
        throw new Error('Sesión expirada');
      }
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
  
  const token = obtenerTokenValido();
  if (!token) {
    mostrarSalida('Tu sesión ya no es válida. Inicia sesión de nuevo.');
    return Promise.reject('no auth');
  }

  return fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventoId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => {
      if (res.status === 410) {
       eliminarEventoDeCache(eventoId);
        throw new Error("evento no encontrado");
      }

      if (res.status === 404) {
        eliminarEventoDeCache(eventoId);
        throw new Error("Sesión ya no existe");
      }
      if (res.status === 401) {
        sesionExpirada();
        throw new Error('Sesión expirada');
      }
      if (res.status === 204 || res.ok) {
        eliminarEventoDeCache(eventoId);
        return true;
      }
      throw new Error('Status: ' + res.status);
    });
}

function sesionExpirada() {
  mostrarSalida('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
  
  localStorage.removeItem('gea_token');
  AppState.accessToken = null;

  mostrarPantallaLogin();

  document.getElementById('loginButton').style.display = 'flex';
  document.getElementById('logoutBtn').style.display = 'none';
  document.getElementById('crearBtn').style.display = 'none';
  document.getElementById('calendarBotones').style.display = '';
}