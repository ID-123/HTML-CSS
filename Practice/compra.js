const button = document.getElementById('purchase');
const textTag = document.getElementById('phrase');

function changeText(){
    textTag.innerText = 'Thanks for your purchase!'
    textTag.style.color = 'green'
}

button.addEventListener('click', changeText )