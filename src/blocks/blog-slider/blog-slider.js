document.addEventListener('DOMContentLoaded', function () {
  const blogCarousel = new Swiper('.blog-slider__container', {
    speed: 400,
    slidesPerView: 1,
    spaceBetween: 8,
    breakpoints: {
      768: {
        slidesPerView: 2
      },
      1280: {
        slidesPerView: 3
      },
      1920: {
        slidesPerView: 4
      },
      2540: {
        slidesPerView: 5
      }
    }
  });
});
