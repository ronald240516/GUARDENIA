// ==========================================
// 1. CONEXIÓN A LA BASE DE DATOS (FIREBASE)
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, enableIndexedDbPersistence, query, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCUF_oOiCvemfIyvCgcvaezIno96aHNvN8",
    authDomain: "control-guardiania-2026.firebaseapp.com",
    projectId: "control-guardiania-2026",
    storageBucket: "control-guardiania-2026.firebasestorage.app",
    messagingSenderId: "851162724793",
    appId: "1:851162724793:web:e1211cd7df34d26553de68"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==========================================
// ACTIVAR EL MODO SÚPER RÁPIDO (Caché Offline)
// ==========================================
enableIndexedDbPersistence(db).catch(function(err) {
    if (err.code == 'failed-precondition') {
        console.log("Caché falló: Múltiples pestañas.");
    } else if (err.code == 'unimplemented') {
        console.log("Navegador no soporta caché offline.");
    }
});

// ==========================================
// 2. VARIABLES GLOBALES DE LA BASE DE DATOS
// ==========================================
let listaAlumnosBD = []; 
let salonesUnicos = [];  

const tarifaMensual = 4; 
let totalCalculado = 0;
let memoriaScrollAlumnos = 0;  

// ==========================================
// 2.5 DESCARGAR DATOS AL INICIAR LA APP
// ==========================================
async function cargarDatosDesdeFirebase() {
    contenedor.innerHTML = "<p class='text-center w-100 text-secondary'>Conectando con la base de datos...</p>";

    try {
        const consulta = await getDocs(collection(db, "Alumnos"));
        listaAlumnosBD = [];
        salonesUnicos = [];

        consulta.forEach(function(documento) {
            const alumno = documento.data(); 
            alumno.idFirebase = documento.id; 
            
            listaAlumnosBD.push(alumno); 

            if (!salonesUnicos.includes(alumno.AULA)) {
                salonesUnicos.push(alumno.AULA);
            }
        });

        salonesUnicos.sort();
        mostrarSalones(salonesUnicos);
        
    } catch (error) {
        console.error("Error al descargar:", error);
        contenedor.innerHTML = "<p class='text-center text-danger w-100'>Error de conexión.</p>";
    }
}

// ==========================================
// 2. CAPTURAMOS LOS ELEMENTOS DEL HTML (DOM)
// ==========================================
const pantallaInicio = document.getElementById('pantalla-inicio');
const pantallaRegistro = document.getElementById('pantalla-registro');
const pantallaDashboard = document.getElementById('pantalla-dashboard');
const contenedor = document.getElementById('contenedor-salones');
const buscador = document.getElementById('buscador');
const checkboxes = document.querySelectorAll('.mes-checkbox'); 
const textoTotal = document.getElementById('total-cobrar');
const botonGuardar = document.getElementById('btn-guardar');
const inputTicket = document.getElementById('numero-ticket');
const pantallaAlumnos = document.getElementById('pantalla-alumnos');
const pantallaReporte = document.getElementById('pantalla-reporte');

// ==========================================
// 3. LÓGICA DE NAVEGACIÓN
// ==========================================
window.cambiarPantalla = function(pantallaDestino, guardarHistorial = true) {
    
    pantallaInicio.classList.add('oculto');
    pantallaRegistro.classList.add('oculto');
    pantallaAlumnos.classList.add('oculto');
    pantallaReporte.classList.add('oculto');
    pantallaDashboard.classList.add('oculto');

    if (pantallaDestino === 'registro') {
        pantallaRegistro.classList.remove('oculto');
    } else if (pantallaDestino === 'alumnos') {
        pantallaAlumnos.classList.remove('oculto');
        
        // ¡NUEVO! Le damos 10 milisegundos al navegador para que dibuje la pantalla 
        // y luego restauramos el scroll a la posición memorizada.
        setTimeout(() => {
            document.getElementById('contenedor-alumnos').scrollTop = memoriaScrollAlumnos;
        }, 10);
    } else if (pantallaDestino === 'reporte') {
        pantallaReporte.classList.remove('oculto');
    } else if (pantallaDestino === 'dashboard') {
        pantallaDashboard.classList.remove('oculto');
    } else if (pantallaDestino === 'inicio') {
        pantallaInicio.classList.remove('oculto');
        
        inputTicket.value = "";
        checkboxes.forEach(function(cb) { cb.checked = false; });
        totalCalculado = 0;
        if(textoTotal) textoTotal.innerText = `S/. 0.00`;

        buscador.value = "";
        mostrarSalones(salonesUnicos);
    }

    if (guardarHistorial) {
        history.pushState({ pantalla: pantallaDestino }, "", "");
    }
}

window.addEventListener('popstate', function(evento) {
    if (evento.state && evento.state.pantalla) {
        cambiarPantalla(evento.state.pantalla, false);
    } else {
        cambiarPantalla('inicio', false);
    }
});

history.replaceState({ pantalla: 'inicio' }, "", "");

// ==========================================
// 4. LÓGICA DE PANTALLA DE INICIO (Salones)
// ==========================================
function mostrarSalones(lista) {
    contenedor.innerHTML = ""; 
    const salonesPresentes = lista;
    const ordenEdadesValidas = ["3 AÑOS", "4 AÑOS", "5 AÑOS"];

    ordenEdadesValidas.forEach(function(edadAEvaluar) {
        const salonesDeEstaEdad = salonesPresentes.filter(function(nombreSalon) {
            const datosAlumno = listaAlumnosBD.find(function(alumnoEnBD) {
                return alumnoEnBD.AULA === nombreSalon;
            });
            return datosAlumno && datosAlumno.EDAD === edadAEvaluar;
        });

        if (salonesDeEstaEdad.length > 0) {
            contenedor.innerHTML += `<div class="col-12"><div class="edad-header">${edadAEvaluar}</div></div>`;
            salonesDeEstaEdad.forEach(function(salon) {
                
                // TRUCO DE DISEÑO: Capitalizamos el nombre (De "ALEGRÍA" a "Alegría")
                const salonCapitalizado = salon.charAt(0).toUpperCase() + salon.slice(1).toLowerCase();

                const tarjetaHTML = `
                    <div class="col-6"> 
                        <div class="card tarjeta-salon shadow-sm bg-white p-3 text-center text-primary fw-bold" onclick="mostrarAlumnosPorSalon('${salon}')">
                            ${salonCapitalizado}
                        </div>
                    </div>
                `;
                contenedor.innerHTML += tarjetaHTML;
            });
        }
    });
}

// ==========================================
// MOSTRAR ALUMNOS DE UN SALÓN
// ==========================================
window.mostrarAlumnosPorSalon = function(nombreSalon) {
    document.getElementById('titulo-salon').innerText = `Aula: ${nombreSalon}`;
    
    const alumnosDelSalon = listaAlumnosBD.filter(function(alumno) {
        return alumno.AULA === nombreSalon;
    });

    alumnosDelSalon.sort((a, b) => a.ALUMNO.localeCompare(b.ALUMNO));

    const contenedorAlumnos = document.getElementById('contenedor-alumnos');
    const contenedorProfesora = document.getElementById('profesora-salon-card');
    contenedorAlumnos.innerHTML = "";
    contenedorProfesora.innerHTML = "";

    if (alumnosDelSalon.length > 0) {
        const itemProfesoraHTML = `
            <div class="d-flex align-items-center justify-content-center bg-light rounded-pill py-2 px-3 mb-1 mx-auto text-secondary" style="max-width: max-content; font-size: 0.85rem;">
                <span class="material-symbols-outlined me-2" style="font-size: 1.2rem;">school</span>
                <span class="fw-bold"> Prof. ${alumnosDelSalon[0].DOCENTE}</span>
            </div>
        `;
        contenedorProfesora.innerHTML = itemProfesoraHTML;
    }

    alumnosDelSalon.forEach(function(alumno) {
        const inicial = alumno.ALUMNO.charAt(0).toUpperCase();
        const itemHTML = `
            <button class="list-group-item list-group-item-action md-list-item d-flex align-items-center w-100 text-start" 
                    onclick="prepararRegistro('${alumno.ALUMNO}', '${alumno.AULA}')">
                <div class="md-avatar me-3 shadow-sm flex-shrink-0">${inicial}</div>
                <div class="flex-grow-1 overflow-hidden">
                    <div class="fw-bold text-dark fs-6 text-truncate">${alumno.ALUMNO}</div>
                </div>
                <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ms-2" style="width: 36px; height: 36px; background-color: #f3f4f6;">
                        <span class="material-symbols-outlined text-secondary" style="font-size: 1.2rem;">chevron_right</span>
                </div>
            </button>
        `;
        contenedorAlumnos.innerHTML += itemHTML;
    });
    
    // ==========================================
    // ¡NUEVO! RESETEO DE SCROLL PARA AULA NUEVA
    // ==========================================
    // 1. Borramos la memoria para que empiece desde arriba
    memoriaScrollAlumnos = 0; 
    
    // 2. Forzamos físicamente a la caja de alumnos a ir al tope (Posición 0)
    document.getElementById('contenedor-alumnos').scrollTop = 0;

    cambiarPantalla('alumnos');
}

// ==========================================
// PREPARAR REGISTRO DE COBRO
// ==========================================
window.prepararRegistro = async function(nombre, aula) {
    const datosAlumno = listaAlumnosBD.find(a => a.ALUMNO === nombre);
    const docente = datosAlumno ? datosAlumno.DOCENTE : "Desconocida";

    document.getElementById('nombre-alumno').innerText = nombre;
    document.getElementById('aula-alumno').innerText = `Aula ${aula}`;

    const contenedorDocente = document.getElementById('docente-alumno-container');
    const itemDocenteHTML = `
        <div class="d-flex align-items-center bg-light rounded-pill py-1 px-2 mt-2 text-secondary" style="max-width: max-content; font-size: 0.8rem;">
            <span class="material-symbols-outlined me-1" style="font-size: 1rem;">school</span>
            <span class="fw-bold"> Prof. ${docente}</span>
        </div>
    `;
    contenedorDocente.innerHTML = itemDocenteHTML;
    
    totalCalculado = 0;
    textoTotal.innerText = `S/. 0.00`;
    inputTicket.value = "";
    
    checkboxes.forEach(function(cb) {
        cb.disabled = false;
        cb.checked = false;
        const label = document.querySelector(`label[for="${cb.id}"]`);
        label.innerText = cb.value; 
        label.classList.remove('btn-primary', 'active', 'opacity-50'); 
        label.classList.add('btn-outline-secondary'); 
    });
    
    // ¡NUEVO! Memorizamos dónde está el scroll de la lista
    memoriaScrollAlumnos = document.getElementById('contenedor-alumnos').scrollTop;
    
    cambiarPantalla('registro');
    botonGuardar.disabled = true;
    botonGuardar.innerText = "Verificando...";

    try {
        const busqueda = query(collection(db, "Registro_Pagos"), where("alumno", "==", nombre));
        const resultados = await getDocs(busqueda);

        let mesesYaPagados = [];
        resultados.forEach(function(documento) {
            mesesYaPagados = mesesYaPagados.concat(documento.data().meses);
        });

        checkboxes.forEach(function(cb) {
            if (mesesYaPagados.includes(cb.value)) {
                cb.disabled = true; 
                const label = document.querySelector(`label[for="${cb.id}"]`);
                label.innerText = `✓ ${cb.value}`; 
                label.classList.remove('btn-outline-secondary');
                label.classList.add('btn-primary', 'active', 'opacity-50'); 
            }
        });
    } catch (error) {
        console.error("Error al verificar:", error);
    } finally {
        botonGuardar.disabled = false;
        botonGuardar.innerText = "Registrar Pago";
    }
}

cargarDatosDesdeFirebase();

// ==========================================
// BUSCADOR INTELIGENTE
// ==========================================
// ==========================================
// EL BUSCADOR INTELIGENTE (OPTIMIZADO PARA VELOCIDAD EXTREMA)
// ==========================================
let temporizadorBuscador; // Variable para el efecto "Debounce"

buscador.addEventListener('input', function(evento) {
    // 1. Si sigue escribiendo rápido, cancelamos la búsqueda anterior para no saturar
    clearTimeout(temporizadorBuscador); 

    // 2. Esperamos una fracción de segundo (150ms) antes de accionar
    temporizadorBuscador = setTimeout(() => {
        const textoBuscado = evento.target.value.toLowerCase().trim(); 
        
        if (textoBuscado === "") {
            mostrarSalones(salonesUnicos);
            return; 
        }

        // 3. Filtramos los datos en memoria (Esto toma 0.001 segundos)
        const salonesFiltrados = salonesUnicos.filter(salon => salon.toLowerCase().includes(textoBuscado));
        const alumnosFiltrados = listaAlumnosBD.filter(alumno => 
            alumno.ALUMNO.toLowerCase().includes(textoBuscado) || 
            alumno.DOCENTE.toLowerCase().includes(textoBuscado)
        );

        // 4. EL SECRETO: Creamos una variable de texto vacía. 
        // No tocamos la pantalla real todavía.
        let htmlAcumulado = ""; 

        // 5. Acumulamos los salones en nuestra variable invisible
        salonesFiltrados.forEach(function(salon) {
            htmlAcumulado += `
                <div class="col-6"> 
                    <div class="card tarjeta-salon shadow-sm bg-white p-3 text-center text-primary fw-bold" 
                         onclick="mostrarAlumnosPorSalon('${salon}')">
                         ${salon}
                    </div>
                </div>
            `;
        });

        // 6. Acumulamos los alumnos (Ya incluye tu nuevo diseño de flecha redonda)
        alumnosFiltrados.forEach(function(alumno) {
            const inicial = alumno.ALUMNO.charAt(0).toUpperCase();
            htmlAcumulado += `
                <div class="col-12 mt-1">
                    <button class="list-group-item list-group-item-action d-flex align-items-center w-100 text-start shadow-sm border-0 mb-2" 
                            style="border-radius: 16px; padding: 1rem 1.2rem; background: white;"
                            onclick="prepararRegistro('${alumno.ALUMNO}', '${alumno.AULA}')">
                        <div class="md-avatar me-3 shadow-sm flex-shrink-0">${inicial}</div>
                        <div class="flex-grow-1 overflow-hidden">
                            <div class="fw-bold text-dark fs-6 text-truncate" style="letter-spacing: -0.3px;">${alumno.ALUMNO}</div>
                            <div class="mt-1" style="font-size: 0.8rem; font-weight: 500; color: #6c757d;">
                                <div class="text-primary fw-bold opacity-75 mb-1">Aula ${alumno.AULA}</div>
                                <div class="text-truncate">Prof. ${alumno.DOCENTE}</div>
                            </div>
                        </div>
                        <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ms-2" style="width: 36px; height: 36px; background-color: #f3f4f6;">
                            <span class="material-symbols-outlined text-secondary" style="font-size: 1.2rem;">chevron_right</span>
                        </div>
                    </button>
                </div>
            `;
        });

        // Si no hay nada, ponemos el mensaje de vacío
        if (salonesFiltrados.length === 0 && alumnosFiltrados.length === 0) {
            htmlAcumulado = "<p class='text-center text-muted w-100 mt-4'>Sin resultados.</p>";
        }

        // 7. ¡LA MAGIA! Ahora sí, le mandamos todo el bloque armado a la pantalla UNA SOLA VEZ.
        contenedor.innerHTML = htmlAcumulado;

    }, 150); // El tiempo de espera en milisegundos
});

// ==========================================
// REGISTRO DE COBRO (CON VENTANA DE CONFIRMACIÓN)
// ==========================================
function calcularTotal() {
    const cantidadMeses = document.querySelectorAll('.mes-checkbox:checked').length; 
    totalCalculado = cantidadMeses * tarifaMensual;
    textoTotal.innerText = `S/. ${totalCalculado}.00`;
}

checkboxes.forEach(cb => cb.addEventListener('change', calcularTotal));

// Variables para el Modal
const modalConfirmacion = document.getElementById('modal-confirmacion');
const btnConfirmarPago = document.getElementById('btn-confirmar-pago');
let reciboPendiente = null; 

// Función para cerrar la ventana sin guardar
window.cerrarModalConfirmacion = function() {
    modalConfirmacion.classList.add('oculto');
}

// Función global para mostrar el error elegante
window.mostrarError = function(mensaje) {
    const snackbar = document.getElementById('snackbar-error');
    document.getElementById('texto-snackbar-error').innerText = mensaje;
    snackbar.classList.add('mostrar');
    
    // Lo ocultamos automáticamente después de 3 segundos
    setTimeout(() => {
        snackbar.classList.remove('mostrar');
    }, 3000);
}

// 1. PRIMER PASO: Valida y muestra el modal
botonGuardar.addEventListener('click', function() {
   // USAMOS LA NUEVA ALERTA EN VEZ DEL ALERT() NATIVO
    if (totalCalculado === 0) {
        mostrarError("Selecciona al menos un mes a pagar.");
        return; 
    }
    
    const ticket = inputTicket.value.trim();
    if (ticket === "") {
        mostrarError("Por favor, ingresa el número de ticket.");
        return; 
    }

    const mesesPagados = Array.from(document.querySelectorAll('.mes-checkbox:checked')).map(cb => cb.value);
    const nombreAlumno = document.getElementById('nombre-alumno').innerText;

    // Llenamos la ventana flotante con la información resumida
    document.getElementById('modal-alumno').innerText = nombreAlumno;
    document.getElementById('modal-meses').innerText = mesesPagados.join(', ');
    document.getElementById('modal-ticket').innerText = `#${ticket}`;
    document.getElementById('modal-total').innerText = `S/. ${totalCalculado}.00`;

    // Armamos el paquete de datos, pero NO lo enviamos todavía
    reciboPendiente = {
        alumno: nombreAlumno,
        meses: mesesPagados,
        montoTotal: totalCalculado,
        numeroTicket: ticket,
        fechaRegistro: new Date()
    };

    // Mostramos la ventana flotante
    modalConfirmacion.classList.remove('oculto');
});

// 2. SEGUNDO PASO: Guarda en Firebase desde el Modal
btnConfirmarPago.addEventListener('click', async function() {
    if (!reciboPendiente) return; 

    try {
        btnConfirmarPago.innerText = "Guardando...";
        btnConfirmarPago.disabled = true;

        await addDoc(collection(db, "Registro_Pagos"), reciboPendiente);
        
        cerrarModalConfirmacion();
        
        const modalExito = document.getElementById('modal-exito');
        modalExito.classList.remove('oculto');

        setTimeout(() => {
            modalExito.classList.add('oculto'); 
            cambiarPantalla('inicio');          
        }, 2000);

    } catch (error) {
        mostrarError("Error al guardar en la base de datos.");
    } finally {
        btnConfirmarPago.innerText = "Sí, Registrar";
        btnConfirmarPago.disabled = false;
        reciboPendiente = null; 
    }
});

// ==========================================
// REPORTE MATRIZ (TABLA AULA)
// ==========================================
window.generarReporteAula = async function() {
    const nombreAula = document.getElementById('titulo-salon').innerText.replace("Aula: ", "").trim();
    
    document.getElementById('titulo-reporte-aula').innerText = `Reporte: ${nombreAula}`;
    const cuerpoTabla = document.getElementById('cuerpo-tabla-reporte');
    cuerpoTabla.innerHTML = "<tr><td colspan='11' class='text-center py-4'>Cargando... ⏳</td></tr>";
    
    cambiarPantalla('reporte');

    try {
        const alumnosDelSalon = listaAlumnosBD.filter(a => a.AULA === nombreAula).sort((a, b) => a.ALUMNO.localeCompare(b.ALUMNO));

        if (alumnosDelSalon.length > 0) {
            const docente = alumnosDelSalon[0].DOCENTE || "Desconocida";
            let edad = "3 AÑOS";
            const aulaUpper = nombreAula.toUpperCase();
            if (["AMOROSOS", "COMPAÑERISMO", "DULZURA", "ESPERANZA", "GENEROSOS", "TALENTOSOS"].includes(aulaUpper)) edad = "4 AÑOS";
            if (["AMABLES", "CARIÑOSITOS", "RESPETUOSOS", "RESPONSABLES", "SOLIDARIOS"].includes(aulaUpper)) edad = "5 AÑOS";
            document.getElementById('info-extra-reporte').innerText = `${edad} • Prof. ${docente}`;
        }

        const consultaPagos = await getDocs(collection(db, "Registro_Pagos"));
        const todosLosPagos = [];
        consultaPagos.forEach(doc => todosLosPagos.push(doc.data()));

        const meses = ["Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        cuerpoTabla.innerHTML = ""; 

        alumnosDelSalon.forEach(function(alumno) {
            const pagosDelNiño = todosLosPagos.filter(pago => pago.alumno === alumno.ALUMNO);
            let mesesPagadosPorNiño = [];
            pagosDelNiño.forEach(pago => mesesPagadosPorNiño = mesesPagadosPorNiño.concat(pago.meses));

            let filaHTML = `<tr><td class="fw-bold text-secondary text-start ps-2">${alumno.ALUMNO}</td>`;
            meses.forEach(function(mes) {
                filaHTML += mesesPagadosPorNiño.includes(mes) ? `<td class="text-success fw-bold text-center bg-success bg-opacity-10">✅</td>` : `<td></td>`;
            });
            filaHTML += `</tr>`;
            cuerpoTabla.innerHTML += filaHTML;
        });

    } catch (error) {
        cuerpoTabla.innerHTML = "<tr><td colspan='11' class='text-danger'>Error de carga.</td></tr>";
    }
}

// ==========================================
// DASHBOARD (REPORTES GENERALES)
// ==========================================
let recibosDashboard = []; 

window.abrirDashboard = async function() {
    cambiarPantalla('dashboard');
    document.getElementById('lista-dashboard').innerHTML = "<p class='text-center text-secondary my-4'>Descargando... ⏳</p>";
    document.getElementById('total-dashboard').innerText = "Calculando...";

    const selectAula = document.getElementById('filtro-aula');
    selectAula.innerHTML = '<option value="TODAS">Todas las Aulas</option>';
    salonesUnicos.forEach(aula => selectAula.innerHTML += `<option value="${aula}">${aula}</option>`);

    try {
        const consulta = await getDocs(collection(db, "Registro_Pagos"));
        recibosDashboard = [];
        
        consulta.forEach(doc => {
            let data = doc.data();
            let alumnoInfo = listaAlumnosBD.find(a => a.ALUMNO === data.alumno);
            data.aula = alumnoInfo ? alumnoInfo.AULA : "Desconocida";
            recibosDashboard.push(data);
        });

        recibosDashboard.sort((a, b) => b.fechaRegistro.toDate() - a.fechaRegistro.toDate());
        aplicarFiltros(); 
    } catch (error) {
        console.error("Error dashboard:", error);
    }
}

window.aplicarFiltros = function() {
    const filtroAula = document.getElementById('filtro-aula').value;
    const filtroDia = document.getElementById('filtro-dia').value; 
    const filtroMes = document.getElementById('filtro-mes').value; 

    let sumaTotal = 0;
    const contenedor = document.getElementById('lista-dashboard');
    contenedor.innerHTML = "";

    let filtrados = recibosDashboard.filter(recibo => {
        let fecha = recibo.fechaRegistro.toDate();
        let cumpleAula = (filtroAula === "TODAS" || recibo.aula === filtroAula);
        let cumpleDia = true;
        
        if (filtroDia !== "") {
            let mesStr = String(fecha.getMonth() + 1).padStart(2, '0');
            let diaStr = String(fecha.getDate()).padStart(2, '0');
            let fechaLocalStr = `${fecha.getFullYear()}-${mesStr}-${diaStr}`;
            cumpleDia = (fechaLocalStr === filtroDia);
        }

        let cumpleMes = true;
        if (filtroMes !== "TODOS" && filtroDia === "") { 
            cumpleMes = (fecha.getMonth().toString() === filtroMes);
        }

        return cumpleAula && cumpleDia && cumpleMes;
    });

    if (filtrados.length === 0) {
        contenedor.innerHTML = "<p class='text-center text-muted my-4'>No hay ingresos.</p>";
    } else {
        filtrados.forEach(recibo => {
            sumaTotal += recibo.montoTotal;
            const fechaFormateada = recibo.fechaRegistro.toDate().toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
            
            const itemHTML = `
                <div class="list-group-item list-group-item-action py-3">
                    <div class="d-flex w-100 justify-content-between align-items-center mb-1">
                        <strong class="text-dark mb-0">👤 ${recibo.alumno}</strong>
                        <span class="badge bg-dark rounded-pill fs-6">+ S/. ${recibo.montoTotal}.00</span>
                    </div>
                    <div class="d-flex w-100 justify-content-between">
                        <small class="text-secondary">Aula: ${recibo.aula} • Tkt #${recibo.numeroTicket}</small>
                        <small class="text-muted fw-bold">📅 ${fechaFormateada}</small>
                    </div>
                </div>
            `;
            contenedor.innerHTML += itemHTML;
        });
    }

    document.getElementById('total-dashboard').innerText = `S/. ${sumaTotal}.00`;
    document.getElementById('contador-tickets').innerText = `${filtrados.length} tickets`;
}

document.getElementById('filtro-aula').addEventListener('change', aplicarFiltros);

// ==========================================
// FLUJO INTELIGENTE DE FILTROS MUTUAMENTE EXCLUYENTES
// ==========================================
document.getElementById('filtro-dia').addEventListener('change', function() {
    const selectMes = document.getElementById('filtro-mes');
    selectMes.value = "TODOS";
    selectMes.classList.remove('filtro-activo');
    aplicarFiltros();
});

document.getElementById('filtro-mes').addEventListener('change', function() {
    const inputDia = document.getElementById('filtro-dia');
    inputDia.value = "";
    inputDia.type = "text"; 
    inputDia.classList.remove('filtro-activo');
    aplicarFiltros();
});

window.limpiarFiltros = function() {
    document.querySelectorAll('.input-filtro').forEach(input => input.classList.remove('filtro-activo'));
    document.getElementById('filtro-dia').type = 'text';
    document.getElementById('filtro-dia').value = "";
    document.getElementById('filtro-aula').value = "TODAS";
    document.getElementById('filtro-mes').value = "TODOS";
    aplicarFiltros();
}

// PINTAR FILTROS ACTIVOS
document.querySelectorAll('.input-filtro').forEach(input => {
    input.addEventListener('change', function() {
        if (this.value !== "" && this.value !== "TODAS" && this.value !== "TODOS") {
            this.classList.add('filtro-activo');
        } else {
            this.classList.remove('filtro-activo');
        }
    });
});