import clsx from 'clsx';
import styles from './faq-template.module.scss';
import Container from '@/components/ui/container';
import type { FaqDict } from '@/app/[lang]/dictionaries';
import Accordion from '@/components/ui/accordion/accordion';

type HeroProps = {
  t: FaqDict;
};

export default function FaqTemplate({ t }: HeroProps) {
  return (
    <div className={clsx(styles.outerWrapper)}>
      <div className={clsx(styles.hero, 'section', 'light')}>
        <Container>
          <h1>{t.title}</h1>
        </Container>
      </div>
      <div className={clsx(styles.faqContainer, 'section', 'light')}>
        <Accordion items={t.data} />
      </div>
    </div>
  );
}
