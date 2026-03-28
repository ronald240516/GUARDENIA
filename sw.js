// Cambiamos a v3 para obligar al celular a descargar los nuevos diseños
const NOMBRE_CACHE = 'guardiania-cache-v3';

// Aquí le decimos qué archivos exactos debe guardar en el celular
const archivosAGuardar = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    // ¡NUEVO! Guardamos la tipografía elegante y los íconos para que funcionen sin internet
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap',
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200'
];

// Instalación: Guarda los archivos la primera vez
self.addEventListener('install', (evento) => {
    evento.waitUntil(
        caches.open(NOMBRE_CACHE)
            .then((cache) => {
                console.log('Archivos cacheados exitosamente');
                return cache.addAll(archivosAGuardar);
            })
    );
});

// ¡NUEVO! Activación: Borra la caché vieja (v2, v1) para no ocupar memoria basura en el celular
self.addEventListener('activate', (evento) => {
    evento.waitUntil(
        caches.keys().then((nombresDeCache) => {
            return Promise.all(
                nombresDeCache.map((nombreCache) => {
                    if (nombreCache !== NOMBRE_CACHE) {
                        console.log('Borrando caché antigua:', nombreCache);
                        return caches.delete(nombreCache);
                    }
                })
            );
        })
    );
});

// Interceptor: Cuando no hay internet, saca los archivos del celular
self.addEventListener('fetch', (evento) => {
    evento.respondWith(
        caches.match(evento.request)
            .then((respuesta) => {
                // Si lo encuentra en la memoria del celular, lo devuelve. Si no, lo busca en internet.
                return respuesta || fetch(evento.request);
            })
    );
});