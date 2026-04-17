
/* Tarjetas interactivas */
const cards = document.querySelectorAll(".itemExample");

cards.forEach(card => {
    const demoBox = card.querySelector(".demoBox");
    const buttons = card.querySelectorAll(".controls button");
    const property = card.dataset.property;

    buttons.forEach(button => {
        button.addEventListener("click", () => {
            const value = button.textContent.trim();
            demoBox.style[property] = value;
        });
    });
});

/* Menu responsive */
const menuButton = document.getElementById("sideMenuAccess");
const sideMenu = document.getElementById("sideMenu");
const overlay = document.getElementById("overlay");

menuButton.addEventListener("click", () => {
    sideMenu.classList.toggle("show");
    overlay.classList.toggle("active");
});

/* Cerrar al tocar fondo oscuro */
overlay.addEventListener("click", () => {
    sideMenu.classList.remove("show");
    overlay.classList.remove("active");
});