// --------------------------------------------
// RENDERIZADO DE LISTA + acciones editar/eliminar
// --------------------------------------------
const listaEventosEl = document.getElementById('listaEventos');

function renderizarEventos() {
  const eventos = leerCache();
  listaEventosEl.innerHTML = '';

  if (eventos.length === 0) {
    listaEventosEl.textContent = 'No hay eventos.';
    return;
  }

  eventos.forEach(evento => {
    const item = document.createElement('div');
    item.className = 'evento-item';

    const info = document.createElement('span');
    info.textContent = `${evento.titulo} — ${evento.fecha} ${evento.hora} (${evento.tipo})`;

    const btnEditar = document.createElement('button');
    btnEditar.textContent = 'Editar';
    btnEditar.addEventListener('click', () => manejarEditar(evento));

    const btnEliminar = document.createElement('button');
    btnEliminar.textContent = 'Eliminar';
    btnEliminar.addEventListener('click', () => manejarEliminar(evento));

    item.appendChild(info);
    item.appendChild(btnEditar);
    item.appendChild(btnEliminar);
    listaEventosEl.appendChild(item);
  });
}

function manejarEditar(evento) {
  const nuevoTitulo = prompt('Nuevo título del evento:', evento.titulo);
  if (nuevoTitulo === null || nuevoTitulo.trim() === '') return;

  editarEvento(evento.id, { summary: nuevoTitulo })
    .then(eventoActualizado => {
      mostrarSalida('Evento editado:\n' + JSON.stringify(eventoActualizado, null, 2));
      renderizarEventos();
    })
    .catch(err => mostrarSalida('Error: ' + err));
}

function manejarEliminar(evento) {
  const confirmar = confirm(`¿Eliminar "${evento.titulo}"?`);
  if (!confirmar) return;

  eliminarEvento(evento.id)
    .then(() => {
      mostrarSalida('Evento eliminado correctamente.');
      renderizarEventos();
    })
    .catch(err => mostrarSalida('Error: ' + err));
}

// Cache-first: pinta lo que ya haya guardado, sin esperar al fetch
document.addEventListener('DOMContentLoaded', renderizarEventos);