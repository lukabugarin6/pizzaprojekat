import clsx from 'clsx';
import styles from './sta-su-e-menice.module.scss';
import Container from '@/components/ui/container';
import Grid from '@/components/ui/grid';
import GridItem from '@/components/ui/grid-item';
import Slider from '@/components/ui/slider';
import type { StaSuEmeniceDict } from '@/app/[lang]/dictionaries';

type Props = {
  t: StaSuEmeniceDict;
};

export default function StaSuEMenice({ t }: Props) {
  const slides = [
    <div key="slide-1">
      <img src="/images/1.jpg" alt="Slide 1" style={{ width: '100%' }} />
    </div>,
    <div key="slide-2">
      <img src="/images/2.jpg" alt="Slide 2" style={{ width: '100%' }} />
    </div>,
    <div key="slide-3">
      <img src="/images/3.jpg" alt="Slide 3" style={{ width: '100%' }} />
    </div>,
    <div key="slide-4">
      <img src="/images/4.jpg" alt="Slide 4" style={{ width: '100%' }} />
    </div>,
    <div key="slide-5">
      <img src="/images/5.jpg" alt="Slide 5" style={{ width: '100%' }} />
    </div>,
    <div key="slide-6">
      <img src="/images/6.jpg" alt="Slide 6" style={{ width: '100%' }} />
    </div>,
  ];

  return (
    <div
      className={clsx(
        styles.outerWrapper,
        'section',
        'dark',
        'section-dark',
        'two'
      )}
    >
      <div className={clsx(styles.wrapper)}>
        <Container>
          <h2>{t.title}</h2>
        </Container>
        <Container>
          <Grid style={{ alignItems: 'flex-end' }}>
            <GridItem s={4} m={3} xl={4}>
              {t.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </GridItem>
            <GridItem s={4} sRowStart={1} xl={7} xlColStart={6}>
              <div className={clsx(styles.sliderWrapper)}>
                <Slider slides={slides} />
              </div>
            </GridItem>
          </Grid>
        </Container>
      </div>
    </div>
  );
}
