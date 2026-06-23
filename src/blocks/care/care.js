(function () {
  /**
   * Marks the last item in each visual row with a modifier class
   * to hide the divider (::after pseudo-element)
   */
  function updateCareDividers(list) {
    const items = Array.from(list.querySelectorAll('.care__item'));

    // Reset all modifiers
    items.forEach(function (item) {
      item.classList.remove('care__item--no-divider');
    });

    // Mark last item in each visual row
    items.forEach(function (item, index) {
      const next = items[index + 1];
      if (!next || next.offsetTop > item.offsetTop) {
        item.classList.add('care__item--no-divider');
      }
    });
  }

  const careList = document.querySelector('.care__list');

  if (careList) {
    const ro = new ResizeObserver(function () {
      updateCareDividers(careList);
    });
    ro.observe(careList);
  }

}());
