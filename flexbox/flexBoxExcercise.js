
/* Se reciben los valores del documento HTML */
const menuButton = document.querySelector('#sideMenuAccess')
const sideMenu = document.querySelector('#sideMenu')
const overlay = document.querySelector('#overlay')

const sideOption = document.querySelectorAll('.sideOption')


/* Se crea el evento para abrir */
menuButton.addEventListener('click', function(){
    sideMenu.classList.toggle('open')
    overlay.classList.toggle('active')
})

/* Se crea el evento para cerrar */
overlay.addEventListener('click', function(){
    sideMenu.classList.remove('open')
    overlay.classList.remove('active')
})

sideOption.addEventListener('click', function(){
    this.nextElementSibling.toggle('active')
})