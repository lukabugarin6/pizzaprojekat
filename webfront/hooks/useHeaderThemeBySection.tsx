import { useEffect, useState } from 'react';

export function useHeaderThemeBySection(offset: number = 0) {
  const [headerClass, setHeaderClass] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      window.requestAnimationFrame(() => {
        const sections = document.querySelectorAll<HTMLElement>('.section');
        if (!sections.length) {
          ticking = false;
          return;
        }

        let activeSection: HTMLElement | null = null;
        let closestTop = -Infinity;

        sections.forEach((section) => {
          const rect = section.getBoundingClientRect();
          const topWithOffset = rect.top - offset;

          // tražimo sekciju čiji je TOP prošao vrh ekrana (<= 0)
          // i koja je NAJVIŠE, tj. najbliža 0
          if (topWithOffset <= 0 && topWithOffset > closestTop) {
            closestTop = topWithOffset;
            activeSection = section;
          }
        });

        // ako nijedna nije prošla vrh (na samom smo vrhu stranice),
        // proglasi prvu sekciju aktivnom
        if (!activeSection) {
          activeSection = document.querySelector<HTMLElement>('.section');
        }

        if (activeSection) {
          let newClass = '';

          if (activeSection.classList.contains('dark')) {
            newClass = 'header-light';
          } else if (activeSection.classList.contains('light')) {
            newClass = 'header-dark';
          }

          if (activeSection.classList.contains('hero')) {
            document.documentElement.style.setProperty(
              'background-color',
              'var(--nbs-blue)'
            );
          } else if (activeSection.classList.contains('two')) {
            document.documentElement.style.setProperty(
              'background-color',
              'var(--white)'
            );
          }
          // menjaj samo ako je stvarno drugačije
          setHeaderClass((prev) => (prev === newClass ? prev : newClass));
        }

        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // inicijalno stanje

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [offset]);

  return headerClass;
}
