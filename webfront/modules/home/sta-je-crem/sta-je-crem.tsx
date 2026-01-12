import clsx from 'clsx';
import styles from './sta-je-crem.module.scss';
import Cta from '@/components/ui/cta';
import Link from 'next/link';
import type { WhatIsCremDict, Lang } from '@/app/[lang]/dictionaries';

type Props = {
  t: WhatIsCremDict;
};

export default function StaJeCRem({ t }: Props) {
  return (
    <div
      className={clsx(styles.outerWrapper, 'section', 'light', 'section-light')}
    >
      <div className={clsx(styles.wrapper)}>
        {/* LEVA STRANA */}
        <div className={clsx(styles.wrapper__left)}>
          <div className={clsx(styles.wrapper__left__inner)}>
            <h2>{t.left.title}</h2>
            <p>{t.left.intro}</p>
            <ul>
              {t.left.list.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
            <div dangerouslySetInnerHTML={{ __html: t.left.outro }}></div>
            <Link href={`/sta-su-e-menice`}>
              <Cta>{t.left.ctaLabel}</Cta>
            </Link>
          </div>
        </div>

        {/* DESNA STRANA */}
        <div className={clsx(styles.wrapper__right)}>
          <div className={clsx(styles.wrapper__right__inner)}>
            <div>
              <h2>{t.right.title}</h2>
              <ul>
                {t.right.list.map((item, idx) => (
                  <li key={idx} dangerouslySetInnerHTML={{ __html: item }}></li>
                ))}
              </ul>
              <div dangerouslySetInnerHTML={{ __html: t.right.outro }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
