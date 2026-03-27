(function () {
  function initAgreementToggle(form) {
    if (!form) return;

    const agreementCheckbox = form.querySelector('input[type="checkbox"][name="agreement"]');
    const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');

    if (!agreementCheckbox || !submitButton) return;

    function updateSubmitState() {
      if (agreementCheckbox.checked) {
        submitButton.removeAttribute('disabled');
        submitButton.disabled = false;
      } else {
        submitButton.setAttribute('disabled', 'disabled');
        submitButton.disabled = true;
      }
    }

    updateSubmitState();
    agreementCheckbox.addEventListener('change', updateSubmitState);
  }

  function initAllForms() {
    const forms = document.querySelectorAll('form');

    for (let i = 0; i < forms.length; i++) {
      initAgreementToggle(forms[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllForms);
  } else {
    initAllForms();
  }
})();
