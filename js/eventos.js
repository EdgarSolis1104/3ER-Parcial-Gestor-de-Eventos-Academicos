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

function agregarACalendar(indice) {
    const evento = obtenerEventos()[indice];

    const fechaIni = evento.fechaInicio.replace(/-/g, '');
    const horaIni  = evento.horaInicio.replace(/:/g, '') + '00';
    const fechaFin = evento.fechaFin.replace(/-/g, '');
    const horaFin  = evento.horaFin.replace(/:/g, '') + '00';

    const inicio = fechaIni + 'T' + horaIni;
    const fin    = fechaFin + 'T' + horaFin;

    const url = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
        '&text='     + encodeURIComponent(evento.titulo) +
        '&dates='    + inicio + '/' + fin +
        '&details='  + encodeURIComponent(evento.descripcion || '') +
        '&location=' + encodeURIComponent(evento.localizacion || evento.tipo);

    window.open(url, '_blank');
}
