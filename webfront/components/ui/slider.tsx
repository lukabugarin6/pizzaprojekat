'use client';

import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';

import 'swiper/css';

import { Pagination, Autoplay } from 'swiper/modules';

export default function Slider({ slides }: { slides?: React.ReactNode[] }) {
  const pagination = {
    clickable: true,
    renderBullet: function (index: number, className: string) {
      return '<span class="' + className + '">' + '</span>';
    },
  };

  return (
    <>
      <Swiper
        pagination={pagination}
        modules={[Pagination, Autoplay]} // ← Dodaj Autoplay ovde
        className="mySwiper"
        loop={true}
        autoplay={{
          delay: 2000,
          disableOnInteraction: false,
        }}
      >
        {slides?.map((slide, index) => (
          <SwiperSlide key={index}>{slide}</SwiperSlide>
        ))}
      </Swiper>
    </>
  );
}
