// Estado compartido con calendar.js (y más adelante sheets.js, eventos.js, etc.)
const AppState = {
  accessToken: null
};

// Scopes mínimos necesarios para esta prueba
const SCOPES = [
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/spreadsheets"
];

const loginButton = document.getElementById('loginButton');
const resultadoDiv = document.getElementById('resultado');
const calendarBotones = document.getElementById('calendarBotones');

loginButton.addEventListener('click', () => {
  google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES.join(' '),
    callback: (response) => {
      if (response.error) {
        resultadoDiv.style.display = 'block';
        resultadoDiv.innerHTML = `<p>Error: ${response.error}</p>`;
      } else {
        AppState.accessToken = response.access_token;

        fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
          headers: {
            'Authorization': `Bearer ${response.access_token}`
          }
        }).then(res => res.json()).then(data => {
          resultadoDiv.style.display = 'block';
          resultadoDiv.innerHTML = `
            <img src="${data.picture}" alt="avatar">
            <strong>${data.name}</strong><br>
            ${data.email}
          `;

          // Ya que hay token, mostramos los botones de Calendar
          calendarBotones.style.display = 'block';

          // Login exitoso -> listar eventos automáticamente
          listarEventos()
            .then(eventos => {
              mostrarSalida('Eventos:\n' + JSON.stringify(eventos, null, 2));
              renderizarEventos();
            })
            .catch(err => mostrarSalida('Error: ' + err));
        });
      }
    },
  }).requestAccessToken();
});