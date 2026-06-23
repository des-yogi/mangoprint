(function () {
  const fields = document.querySelectorAll('.field-num');

  fields.forEach(function (field) {
    const input = field.querySelector('.field-num__input');
    const btnMinus = field.querySelector('.field-num__btn--minus');
    const btnPlus = field.querySelector('.field-num__btn--plus');
    const valueMin = input.hasAttribute('min') ? parseInt(input.getAttribute('min')) : -Infinity;
    const valueMax = input.hasAttribute('max') ? parseInt(input.getAttribute('max')) : Infinity;
    const valueStep = input.hasAttribute('step') ? parseInt(input.getAttribute('step')) : 1;

    // Update disabled state of buttons based on current value
    function updateButtons(num) {
      btnMinus.disabled = num <= valueMin;
      btnPlus.disabled = num >= valueMax;
    }

    // Clamp manual input within min/max bounds
    input.addEventListener('change', function () {
      let num = parseInt(input.value);
      if (isNaN(num) || num < valueMin) {
        num = valueMin;
      } else if (num > valueMax) {
        num = valueMax;
      }
      input.value = num;
      updateButtons(num);
    });

    field.addEventListener('click', function (event) {
      if (!event.target.classList.contains('field-num__btn') || input.disabled) return;

      let num = parseInt(input.value);
      if (isNaN(num)) num = 0;

      if (event.target.classList.contains('field-num__btn--plus')) {
        if (num < valueMax) num = num + valueStep;
      }

      if (event.target.classList.contains('field-num__btn--minus')) {
        if (num > valueMin) num = num - valueStep;
      }

      input.value = num;
      updateButtons(num);
    });

    // Set initial state on page load
    updateButtons(parseInt(input.value));
  });
}());
