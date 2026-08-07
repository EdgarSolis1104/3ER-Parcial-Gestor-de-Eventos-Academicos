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
const logoutBtn = document.getElementById('logoutBtn');

   const tokenGuardado = localStorage.getItem('accessToken');
    if (tokenGuardado) {
      AppState.accessToken = tokenGuardado;
      calendarBotones.style.display = 'block';
      loginButton.style.display = 'none';
}
  fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
    headers: { 'Authorization': `Bearer ${tokenGuardado}` }
  })
    .then(res => {
      if (!res.ok) throw new Error('Token expirado');
      return res.json();
    })
    .then(data => {
      resultadoDiv.style.display = 'block';
      resultadoDiv.innerHTML = `
        <img src="${data.picture}" alt="avatar">
        <strong>${data.name}</strong><br>
        ${data.email}
      `;
      calendarBotones.style.display = 'block';
      loginButton.style.display = 'none';
    })
    .catch(() => {
      localStorage.removeItem('accessToken');
      AppState.accessToken = null;
      calendarBotones.style.display = 'none';
    });

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
        localStorage.setItem('accessToken', response.access_token);

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
          loginButton.style.display = 'none';
        });
      }
    },
  }).requestAccessToken({ prompt: 'consent' });
});
logoutBtn.addEventListener('click', () => {
  console.log('boton presionado');
  
  const token = AppState.accessToken;
  console.log('token es:', token);

  if (!token) {
    console.log('no hay token, saliendo');
    return;
  }

  console.log('voy a llamar a revoke');

  google.accounts.oauth2.revoke(token, () => {
    console.log('revoke termino, limpiando todo');
    localStorage.removeItem('accessToken');
    AppState.accessToken = null;
    resultadoDiv.style.display = 'none';
    resultadoDiv.innerHTML = '';
    calendarBotones.style.display = 'none';
    loginButton.style.display = 'block';
    console.log('listo, todo limpio');
  });
});