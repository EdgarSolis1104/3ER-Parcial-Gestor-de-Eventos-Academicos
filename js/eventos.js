comprobarSesion();

function comprobarSesion() {
    const sesion = localStorage.getItem('sesionActual');

    if (!sesion) {
        window.location.href = 'index.html';
    }
}

function salir() {
    localStorage.removeItem('sesionActual');
    window.location.href = 'index.html';
}

function obtenerEventos() {
    const datos = localStorage.getItem('eventos');
    return datos ? JSON.parse(datos) : [];
}

function guardarEventos(eventos) {
    localStorage.setItem('eventos', JSON.stringify(eventos));
}

const listaEventos = document.getElementById('listaEventos');

const sesion = JSON.parse(localStorage.getItem('sesionActual'));
if (sesion) {
    document.getElementById('usuarioLogueado').textContent =
        'Bienvenido: ' + sesion.nombre;
}

mostrarEventos();

function mostrarEventos() {
    const eventos = obtenerEventos();
    const sinEventos = document.getElementById('sinEventos');

    listaEventos.innerHTML = ''; 

    if (eventos.length === 0) {
        sinEventos.style.display = 'block';
        return;
    }

    sinEventos.style.display = 'none';

    eventos.forEach(function(evento, indice) {
        const tarjeta = document.createElement('div');
        tarjeta.className = 'tarjeta-evento';

        tarjeta.innerHTML =
            '<span class="etiqueta-tipo">' + evento.tipo + '</span>' +
            '<h3>' + evento.titulo + '</h3>' +
            '<p class="fecha-evento">📅 Del ' + evento.fechaInicio + ' al ' + evento.fechaFin + '</p>' +
            '<p class="fecha-evento">🕐 De ' + evento.horaInicio + ' a ' + evento.horaFin + '</p>' +
            '<p>📍 ' + (evento.localizacion || 'Sin localizacion') + '</p>' +
            '<p>' + (evento.descripcion || 'Sin descripcion') + '</p>' +
            '<div class="botones-tarjeta">' +
                '<button class="btn-calendar" onclick="agregarACalendar(' + indice + ')">Agregar a Calendar</button>' +
                '<button class="btn-eliminar" onclick="eliminarEvento(' + indice + ')">Eliminar</button>' +
            '</div>';

        listaEventos.appendChild(tarjeta);
    });
}

function eliminarEvento(indice) {
    if (!confirm('¿Seguro que quieres eliminar este evento?')) return;

    const eventos = obtenerEventos();
    eventos.splice(indice, 1); 
    guardarEventos(eventos);

    mostrarEventos();
}

let tokenCliente = null;

function agregarACalendar(indice) {
    localStorage.setItem('eventoACalendar', indice);

    if (!tokenCliente) {
        tokenCliente = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: GOOGLE_SCOPES,
            callback: crearEventoEnCalendar
        });
    }

    tokenCliente.requestAccessToken();
}

function crearEventoEnCalendar(respuesta) {
    const indice = Number(localStorage.getItem('eventoACalendar'));
    const evento = obtenerEventos()[indice];

    const datosEvento = {
        summary: evento.titulo,
        location: evento.localizacion || evento.tipo,
        description: evento.descripcion || '',
        start: { dateTime: evento.fechaInicio + 'T' + evento.horaInicio + ':00' },
        end:   { dateTime: evento.fechaFin    + 'T' + evento.horaFin    + ':00' }
    };

    fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + respuesta.access_token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(datosEvento)
    })
    .then(function(respuestaServidor) {
        return respuestaServidor.json();
    })
    .then(function(datos) {
        if (datos.id) {
            alert('Evento creado en tu calendario: ' + datos.htmlLink);
        } else {
            alert('Error: ' + datos.error.message);
        }
    });
}

// ============================================
// Logica del formulario de CREAR EVENTO
// ============================================

comprobarSesion();

function comprobarSesion() {
    const sesion = localStorage.getItem('sesionActual');

    if (!sesion) {
        window.location.href = 'index.html';
    }
}

function obtenerEventos() {
    const datos = localStorage.getItem('eventos');
    return datos ? JSON.parse(datos) : [];
}

function guardarEventos(eventos) {
    localStorage.setItem('eventos', JSON.stringify(eventos));
}

const formEvento = document.getElementById('formEvento');

if (formEvento) {
    formEvento.addEventListener('submit', function(e) {
        e.preventDefault();

        const titulo       = document.getElementById('titulo').value.trim();
        const fechaInicio  = document.getElementById('fechaInicio').value.trim();
        const fechaFin     = document.getElementById('fechaFin').value.trim();
        const horaInicio   = document.getElementById('horaInicio').value.trim();
        const horaFin      = document.getElementById('horaFin').value.trim();
        const localizacion = document.getElementById('localizacion').value.trim();
        const descripcion  = document.getElementById('descripcion').value.trim();
        const tipo         = document.getElementById('tipo').value;
        const mensaje      = document.getElementById('mensaje');

        if (!titulo || !fechaInicio || !fechaFin || !horaInicio || !horaFin) {
            mostrarMensaje(mensaje, 'Titulo, fechas y horas son obligatorios.', 'error');
            return;
        }

        if (fechaFin < fechaInicio) {
            mostrarMensaje(mensaje, 'La fecha de finalizacion no puede ser antes que la de inicio.', 'error');
            return;
        }

        const evento = {
            titulo: titulo,
            fechaInicio: fechaInicio,
            fechaFin: fechaFin,
            horaInicio: horaInicio,
            horaFin: horaFin,
            localizacion: localizacion,
            descripcion: descripcion,
            tipo: tipo
        };

        const eventos = obtenerEventos();
        eventos.push(evento); 
        guardarEventos(eventos);

        mostrarMensaje(mensaje, 'Evento creado correctamente.', 'exito');

        setTimeout(function() {
            window.location.href = 'events.html';
        }, 1000);
    });
}

function mostrarMensaje(elemento, texto, tipo) {
    elemento.textContent = texto;
    elemento.className   = tipo;
}

