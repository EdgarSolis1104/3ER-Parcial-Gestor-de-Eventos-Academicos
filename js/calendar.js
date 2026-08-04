const listarBtn = document.getElementById('listarBtn');
const crearBtn = document.getElementById('crearBtn');
const salidaEl = document.getElementById('salida');

function mostrarSalida(texto) {
  salidaEl.style.display = 'block';
  salidaEl.textContent = texto;
}

// --------------------------------------------
// LISTAR EVENTOS (GET)
// --------------------------------------------
listarBtn.addEventListener('click', () => {
  if (!AppState.accessToken) {
    mostrarSalida('Primero haz login.');
    return;
  }

  fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${AppState.accessToken}`
    }
  })
    .then(res => res.json())
    .then(data => {
      mostrarSalida('Eventos:\n' + JSON.stringify(data.items, null, 2));
    })
    .catch(err => mostrarSalida('Error: ' + err));
});

// --------------------------------------------
// CREAR EVENTO DE PRUEBA (POST)
// --------------------------------------------
crearBtn.addEventListener('click', () => {
  if (!AppState.accessToken) {
    mostrarSalida('Primero haz login.');
    return;
  }

  const nuevoEvento = {
    summary: "Evento de prueba desde VS Code",
    start: { dateTime: "2026-08-02T10:00:00-05:00" },
    end: { dateTime: "2026-08-02T11:00:00-05:00" }
  };

  fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AppState.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(nuevoEvento)
  })
    .then(res => res.json())
    .then(data => {
      mostrarSalida('Evento creado:\n' + JSON.stringify(data, null, 2));
    })
    .catch(err => mostrarSalida('Error: ' + err));
});
