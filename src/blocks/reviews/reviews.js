document.addEventListener('DOMContentLoaded', function () {
  const prevBtn = document.querySelector('.reviews .swiper-button-prev');
  const nextBtn = document.querySelector('.reviews .swiper-button-next');

  const reviews = new Swiper('.reviews__slider', {
    speed: 400,
    spaceBetween: 8,
    breakpoints: {
      320: {
        slidesPerView: 'auto',
        navigation: {
          enabled: false
        }
      },
      1280: {
        slidesPerView: 3,
        navigation: {
          enabled: true
        }
      },
      1920: {
        slidesPerView: 4
      }
    },
    navigation: {
      nextEl: nextBtn,
      prevEl: prevBtn,
    },
    a11y: {
      prevSlideMessage: 'Попередній відгук',
      nextSlideMessage: 'Наступний відгук',
    },
    observer: true,
  });
});

