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

// NOTA: el bloque que antes vivía aquí (leer 'accessToken' de localStorage
// y restaurar la sesión apenas se cargaba este archivo) se movió a
// ui.js -> iniciarApp() / restaurarSesion(). Tenerlo en dos lugares
// era la causa de que se disparara la verificación de sesión dos veces
// al recargar la página (Issue 2 de la revisión de ayer).

loginButton.addEventListener('click', () => {
  google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES.join(' '),
    callback: (response) => {
      if (response.error) {
        resultadoDiv.style.display = 'block';
        resultadoDiv.innerHTML = `<p>Error: ${response.error}</p>`;
        return;
      }

      AppState.accessToken = response.access_token;
      localStorage.setItem('accessToken', response.access_token);
      // NOTA: cuando resolvamos el Issue 1, esto cambia a guardar
      // 'gea_token' como objeto { access_token, expira_en }.

      fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
        headers: {
          'Authorization': `Bearer ${response.access_token}`
        }
      })
        .then(res => res.json())
        .then(datosUsuario => {
          // Reutilizamos las funciones de ui.js en vez de repetir
          // el innerHTML y los display aquí también.
          mostrarPantallaApp(datosUsuario);
          cargarEventosIniciales();
        });
    },
  }).requestAccessToken({ prompt: 'consent' });
  // NOTA: forzar 'consent' siempre es parte de lo que corrige el
  // Issue 2 (evitar pantallas de permiso innecesarias).
});

logoutBtn.addEventListener('click', () => {
  const token = AppState.accessToken;
  if (!token) return;

  google.accounts.oauth2.revoke(token, () => {
    localStorage.removeItem('accessToken');
    AppState.accessToken = null;
    mostrarPantallaLogin();
    limpiarEventos();
  });
});
