(function() {
  var btn = document.getElementById('toTop');
  if (!btn) return;

  var isAnimating = false;

  // Функция управления видимостью
  function updateVisibility() {
    // Если мы сейчас анимируем скролл — игнорируем любые проверки
    if (isAnimating) return;

    if (window.pageYOffset >= 500) {
      btn.classList.add('to-top--visible');
    } else {
      btn.classList.remove('to-top--visible');
    }
  }

  // Обработка клика
  btn.addEventListener('click', function(e) {
    e.preventDefault();
    if (isAnimating) return;

    isAnimating = true;

    // 1. Вешаем атрибут для CSS-блокировки и убираем класс видимости
    btn.setAttribute('data-scrolling', 'true');
    btn.classList.remove('to-top--visible');

    // 2. Нативный плавный скролл
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

    // 3. Следим за окончанием скролла
    var checkArrival = setInterval(function() {
      if (window.pageYOffset === 0) {
        clearInterval(checkArrival);

        // Разблокируем только когда приехали наверх
        btn.removeAttribute('data-scrolling');
        isAnimating = false;

        // На всякий случай обновляем видимость (наверху кнопка скроется)
        updateVisibility();
      }
    }, 100);
  }, false);

  // Слушаем скролл
  window.addEventListener('scroll', updateVisibility);

  // Инициализация при загрузке
  updateVisibility();
}());
