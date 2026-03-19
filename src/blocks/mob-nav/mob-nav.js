(function() {
  // Добавление/удаление модификаторов при клике на переключение видимости
  var toggler = document.getElementById('mob-nav-toggler');
  if (toggler) {
    toggler.addEventListener('click', mobNavVisibleToggle);

    function mobNavVisibleToggle(e) {
      e.preventDefault();
      toggler.classList.toggle('burger--close'); // модификатор иконки (должен быть .burger)
      //document.getElementById('main-nav').classList.toggle('main-nav--open');
    }
  }
}());
