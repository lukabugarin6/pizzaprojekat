import clsx from 'clsx';
import styles from './hero.module.scss';
import Container from '@/components/ui/container';
import Grid from '@/components/ui/grid';
import GridItem from '@/components/ui/grid-item';

import type { HeroDict } from '@/app/[lang]/dictionaries';
import HeroLottie from '@/components/lottie/HeroLottie';
type HeroProps = {
  t: HeroDict;
};

export default function Hero({ t }: HeroProps) {
  return (
    <div
      className={clsx(
        styles.outerWrapper,
        'section',
        'light',
        'section-light',
        'hero'
      )}
    >
      <div className={clsx(styles.wrapper)}>
        <Container>
          <Grid style={{ alignItems: 'flex-end' }}>
            <GridItem m={3} xl={5} style={{ height: 'fit-content' }}>
              <HeroLottie />
            </GridItem>

            <GridItem m={3} xl={6} xlColStart={7}>
              <div className={clsx(styles.aligner)}>
                <h1>{t.title}</h1>
                <div
                  className={styles.aligner}
                  dangerouslySetInnerHTML={{ __html: t.body.join('') }}
                />
              </div>
            </GridItem>
          </Grid>
        </Container>
      </div>
    </div>
  );
}
