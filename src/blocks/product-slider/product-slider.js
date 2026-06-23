(function(){
  const prevBtn = document.querySelector('.product-slider .swiper-button-prev');
  const nextBtn = document.querySelector('.product-slider .swiper-button-next');

  const thumbs = new Swiper(".product-slider__thumbs", {
    //loop: true,
    spaceBetween: 8,
    slidesPerView: 'auto',
    direction: 'vertical',
    freeMode: true,
    watchSlidesProgress: true,
  });

  const main = new Swiper(".product-slider__main", {
    //loop: true,
    spaceBetween: 16,
    slidesPerView: 1,
    navigation: {
      addIcons: false,
      nextEl: nextBtn,
      prevEl: prevBtn,
      lockClass: 'btn-locked',
    },
    thumbs: {
      swiper: thumbs,
    },
    keyboard: {
      enabled: true,
    },
  });

  Fancybox.bind("[data-fancybox=product]", {
    // custom options
    Carousel: {
      Toolbar: {
        display: {
          left: [""],//"counter"
          // middle: [
          //   "zoomIn",
          //   "zoomOut",
          //   "toggle1to1",
          //   "rotateCCW",
          //   "rotateCW",
          //   "flipX",
          //   "flipY",
          //   "reset",
          // ],
          right: ["close"],// "toggleFull", "autoplay", "fullscreen",
        },
      },
      Thumbs: {
        showOnStart: false,
      },
    },
  });
}());
