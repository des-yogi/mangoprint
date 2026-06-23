(function () {
  const tabLinks = document.querySelectorAll('.js-tab-link');

  if (!tabLinks.length) return;

  tabLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();

      const tabTrigger = document.getElementById(link.dataset.tab);

      if (!tabTrigger) return;

      // Activate tab via Bootstrap 5 API
      bootstrap.Tab.getOrCreateInstance(tabTrigger).show();

      // Scroll to tabs
      const tabsContainer = document.getElementById('addInfoTab');
      if (tabsContainer) {
        tabsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

}());
