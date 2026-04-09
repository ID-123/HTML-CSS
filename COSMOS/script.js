/* ================================================
   COSMOS — Revista de Astronomía | script.js
   
   ÍNDICE:
   1. Filtro de galaxias
   2. Contador animado (con Intersection Observer)
   3. Formulario de contacto
   4. Animación de entrada al hacer scroll
   ================================================ */


/* ================================================
   1. FILTRO DE GALAXIAS
   
   Concepto: Event Delegation
   En lugar de poner un listener en cada botón,
   lo ponemos en el PADRE y preguntamos quién fue clickeado.
   ================================================ */

// Paso 1 — SELECCIONAR el contenedor de botones y el grid
const contenedorFiltros = document.getElementById('filtros');
const todasLasGalaxias  = document.querySelectorAll('.galaxia-item');
// querySelectorAll devuelve una NodeList (similar a un array)

// Paso 2 — ESCUCHAR clics en el contenedor
contenedorFiltros.addEventListener('click', function(evento) {
  // "evento" es un objeto con info sobre lo que ocurrió
  // evento.target = el elemento EXACTO que fue clickeado

  // Si el clic no fue en un botón de filtro, ignoramos
  if (!evento.target.classList.contains('filtro-btn')) return;

  const botonClickeado = evento.target;
  const filtroSeleccionado = botonClickeado.dataset.filtro;
  // dataset.filtro lee el atributo data-filtro="..." del HTML

  // Paso 3 — REACCIONAR

  // A) Actualizar estado visual de los botones
  // Quitamos .activo de TODOS los botones...
  document.querySelectorAll('.filtro-btn').forEach(function(btn) {
    btn.classList.remove('activo');
  });
  // ...y lo ponemos solo en el que fue clickeado
  botonClickeado.classList.add('activo');

  // B) Mostrar u ocultar galaxias según el filtro
  todasLasGalaxias.forEach(function(galaxia) {
    const tipoDeGalaxia = galaxia.dataset.tipo; // data-tipo="espiral" etc.

    if (filtroSeleccionado === 'todas' || tipoDeGalaxia === filtroSeleccionado) {
      // classList.remove elimina la clase → el elemento vuelve a ser visible
      galaxia.classList.remove('oculto');
    } else {
      // classList.add agrega la clase → CSS lo oculta con display:none
      galaxia.classList.add('oculto');
    }
  });

});


/* ================================================
   2. CONTADOR ANIMADO
   
   Concepto: Intersection Observer API
   En lugar de animar siempre, esperamos a que el elemento
   sea VISIBLE en la pantalla. Más eficiente y elegante.
   ================================================ */

const elementoContador = document.getElementById('contador');
const objetivo = 2000; // Número hasta el que contaremos visualmente
let yaAnimo = false;   // Bandera para no animar dos veces

// Función que hace la animación del contador
function animarContador() {
  const duracion  = 2500;   // Milisegundos que dura la animación
  const inicio    = Date.now();

  function actualizar() {
    const tiempoTranscurrido = Date.now() - inicio;
    const progreso = Math.min(tiempoTranscurrido / duracion, 1);
    // Math.min asegura que progreso nunca supere 1 (100%)

    // Función de easing: hace que la animación desacelere al final
    // En lugar de lineal, usamos una curva cuadrática
    const progresoSuave = 1 - Math.pow(1 - progreso, 3);

    const valorActual = Math.floor(progresoSuave * objetivo);
    elementoContador.textContent = valorActual.toLocaleString('es-ES');
    // toLocaleString formatea el número: 2000 → "2.000"

    if (progreso < 1) {
      requestAnimationFrame(actualizar);
      // requestAnimationFrame: repite la función en el próximo frame
      // (~60 veces por segundo) — mejor que setInterval para animaciones
    }
  }

  requestAnimationFrame(actualizar);
}

// Creamos el observador
// Se activa cuando el elemento entra en el viewport
const observador = new IntersectionObserver(function(entradas) {
  entradas.forEach(function(entrada) {
    // entrada.isIntersecting = true cuando el elemento es visible
    if (entrada.isIntersecting && !yaAnimo) {
      yaAnimo = true;
      animarContador();
      observador.unobserve(elementoContador); // Dejamos de observar
    }
  });
}, {
  threshold: 0.5 // Se activa cuando el 50% del elemento es visible
});

observador.observe(elementoContador);


/* ================================================
   3. FORMULARIO DE CONTACTO
   
   Concepto: Manejo del evento 'submit'
   Interceptamos el envío ANTES de que el navegador
   recargue la página (comportamiento por defecto)
   ================================================ */

const formulario    = document.getElementById('form-contacto');
const confirmacion  = document.getElementById('confirmacion');

formulario.addEventListener('submit', function(evento) {
  // preventDefault() cancela el comportamiento por defecto
  // Sin esto, el navegador recargaría la página
  evento.preventDefault();

  // Tomamos los valores de los campos
  const nombre  = document.getElementById('nombre').value.trim();
  const email   = document.getElementById('email').value.trim();
  const mensaje = document.getElementById('mensaje').value.trim();

  // Validación básica — trim() elimina espacios al inicio y al final
  if (!nombre || !email) {
    alert('Por favor completa al menos tu nombre y email.');
    return; // Salimos de la función sin continuar
  }

  // Aquí iría una llamada a un servidor (fetch/axios)
  // Por ahora simulamos con un timeout
  console.log('Datos del formulario:', { nombre, email, mensaje });

  // Ocultamos el formulario y mostramos la confirmación
  formulario.classList.add('oculto');
  confirmacion.classList.remove('oculto');

  // El mensaje de confirmacion ya tiene su estilo en CSS
});


/* ================================================
   4. ANIMACIONES DE ENTRADA AL HACER SCROLL
   
   Concepto: Observer + clases CSS
   Usamos IntersectionObserver para detectar cuándo
   los elementos son visibles y les añadimos una clase
   que dispara la animación de CSS.
   ================================================ */

// Seleccionamos todos los elementos que queremos animar
const elementosAnimables = document.querySelectorAll(
  '.card, .galaxia-item, .seccion-header'
);

// Añadimos estilo inicial (invisible) vía JS para no afectar
// a usuarios sin JS (mejora progresiva)
elementosAnimables.forEach(function(el) {
  el.style.opacity    = '0';
  el.style.transform  = 'translateY(30px)';
  el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
});

const observadorEntrada = new IntersectionObserver(function(entradas) {
  entradas.forEach(function(entrada) {
    if (entrada.isIntersecting) {
      // Restauramos la visibilidad → la transición CSS hace el resto
      entrada.target.style.opacity   = '1';
      entrada.target.style.transform = 'translateY(0)';
      observadorEntrada.unobserve(entrada.target); // Solo una vez
    }
  });
}, {
  threshold: 0.15 // Se activa cuando el 15% del elemento es visible
});

// Registramos cada elemento en el observador
elementosAnimables.forEach(function(el) {
  observadorEntrada.observe(el);
});
