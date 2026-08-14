// Estado compartido con calendar.js (y más adelante sheets.js, eventos.js, etc.)
const AppState = {
  accessToken: null
};

// Scopes mínimos necesarios para esta prueba
const SCOPES = [
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.metadata.readonly"
];

const loginButton = document.getElementById('loginButton');
const resultadoDiv = document.getElementById('resultado');
const calendarBotones = document.getElementById('calendarBotones');
const logoutBtn = document.getElementById('logoutBtn');

// NUEVO: bandera para saber si ya se está haciendo login, así el botón
// no hace nada si lo aprietan dos veces rápido
let loginEnProceso = false;

// NUEVO: regresa a la pantalla de login y muestra un mensaje normal
// (se usa cuando el token ya expiró, o cuando cierran sesión en otra pestaña)
function cerrarSesionPorExpiracion(mensaje) {
  localStorage.removeItem('gea_token');
  AppState.accessToken = null;
  mostrarPantallaLogin();
  resultadoDiv.style.display = 'block';
  resultadoDiv.innerHTML = `<p>${mensaje}</p>`;
}

// NOTA: el bloque que antes vivía aquí (leer 'accessToken' de localStorage
// y restaurar la sesión apenas se cargaba este archivo) se movió a
// ui.js -> iniciarApp() / restaurarSesion(). Tenerlo en dos lugares
// era la causa de que se disparara la verificación de sesión dos veces
// al recargar la página (Issue 2 de la revisión de ayer).
function obtenerTokenValido() {
  const dato = localStorage.getItem('gea_token');
  if (!dato) return null;
 
  const tokenGuardado = JSON.parse(dato);
 
  // Date.now() da la hora actual en milisegundos. Si ya pasamos
  // la marca de expira_en, el token ya no sirve aunque siga ahí.
  if (Date.now() >= tokenGuardado.expira_en) {
    localStorage.removeItem('gea_token');
    return null;
  }
 
  return tokenGuardado.access_token;
}

loginButton.addEventListener('click', () => {
  // NUEVO: si ya se está haciendo login, no hacemos nada con el segundo clic
  if (loginEnProceso) return;
  loginEnProceso = true;
  loginButton.disabled = true;

  // NUEVO: el try/catch agarra el caso de que el navegador bloquee la ventana de Google
  try {
    const cliente = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES.join(' '),
      callback: (response) => {
        // NUEVO: apagamos la bandera y volvemos a activar el botón
        loginEnProceso = false;
        loginButton.disabled = false;

        if (response.error) {
          resultadoDiv.style.display = 'block';

          // NUEVO: mensajes claros según qué pasó, en vez de mostrar el error de Google tal cual
          if (response.error === 'popup_closed_by_user') {
            resultadoDiv.innerHTML = '<p>Cerraste la ventana de Google antes de terminar. Intenta de nuevo.</p>';
          } else if (response.error === 'access_denied') {
            resultadoDiv.innerHTML = '<p>No diste permiso de acceso. Intenta de nuevo si fue sin querer.</p>';
          } else {
            resultadoDiv.innerHTML = '<p>No se pudo iniciar sesión. Revisa que tu navegador no esté bloqueando las ventanas emergentes e intenta de nuevo.</p>';
          }
          return;
        }

        AppState.accessToken = response.access_token;
        const expira_en = Date.now() + response.expires_in * 1000;
        localStorage.setItem('gea_token', JSON.stringify({
          access_token: response.access_token,
          expira_en
        }));
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
    });
    cliente.requestAccessToken({ prompt: 'consent' });
    // NOTA: forzar 'consent' siempre es parte de lo que corrige el
    // Issue 2 (evitar pantallas de permiso innecesarias).
  } catch (error) {
    // NUEVO: si el navegador bloqueó la ventana emergente, esto avisa
    // en vez de dejar la app como en blanco
    loginEnProceso = false;
    loginButton.disabled = false;
    resultadoDiv.style.display = 'block';
    resultadoDiv.innerHTML = '<p>Tu navegador bloqueó la ventana de inicio de sesión. Habilita las ventanas emergentes para este sitio e intenta de nuevo.</p>';
  }
});

logoutBtn.addEventListener('click', () => {
  const token = AppState.accessToken;
  if (!token) return;

  google.accounts.oauth2.revoke(token, () => {
    localStorage.removeItem('gea_token');
    AppState.accessToken = null;
    mostrarPantallaLogin();
    limpiarEventos();
  });
});

// NUEVO: si el usuario cierra sesión en OTRA pestaña, esta pestaña también se entera.
// El navegador avisa solo a las otras pestañas cuando algo cambia en localStorage
// (a la pestaña que hizo el cambio no le avisa a sí misma).
window.addEventListener('storage', (evento) => {
  if (evento.key === 'gea_token' && !evento.newValue) {
    AppState.accessToken = null;
    mostrarPantallaLogin();
  }
});
// NUEVO: revisa cada 2 segundos si la sesión sigue existiendo en localStorage.
// Esto es un respaldo por si el evento 'storage' de arriba no se dispara
// rápido (por ejemplo si la pestaña está en segundo plano). Así, aunque
// eso pase, esta pestaña se da cuenta sola en máximo 2 segundos, sin
// necesidad de recargar la página.
setInterval(() => {
  // Si esta pestaña cree que hay sesión activa, pero ya no hay token
  // guardado en localStorage, es porque se cerró sesión en otra pestaña
  if (AppState.accessToken && !localStorage.getItem('gea_token')) {
    AppState.accessToken = null;
    mostrarPantallaLogin();
  }
}, 2000);