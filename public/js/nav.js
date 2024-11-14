const navMenu = document.getElementById('nav-menu'),
      navToggle = document.getElementById('nav-toggle'),
      navClose = document.getElementById('nav-close')

/* menu aberto */
navToggle.addEventListener('click', () =>{
   navMenu.classList.add('show-menu')
})

/* menu escondido */
navClose.addEventListener('click', () =>{
   navMenu.classList.remove('show-menu')
})

/* pesquisar */
const search = document.getElementById('search'),
      searchBtn = document.getElementById('search-btn'),
      searchClose = document.getElementById('search-close')

/* pesquisar aberto */
searchBtn.addEventListener('click', () =>{
   search.classList.add('show-search')
})

/* pesquisar esocndido */
searchClose.addEventListener('click', () =>{
   search.classList.remove('show-search')
})

/* login */
const login = document.getElementById('login'),
      loginBtn = document.getElementById('login-btn'),
      loginClose = document.getElementById('login-close')

/* login aberto */
loginBtn.addEventListener('click', () =>{
   login.classList.add('show-login')
})

/* login escondido */
loginClose.addEventListener('click', () =>{
   login.classList.remove('show-login')
})

