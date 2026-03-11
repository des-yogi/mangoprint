/*(function(){
  const langSwitcher = document.getElementById('lang-switcher');
  const text = langSwitcher.querySelector('span');
  let page = document.documentElement;
  let lang = ucFirst(page.lang);

  if (langSwitcher) {
    const langChangeHandler = function () {
      text.textContent = lang;
    }();
  }

  function ucFirst(str) {
    if (!str) return str; // Проверка на пустую строку
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}());*/
