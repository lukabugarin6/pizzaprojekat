import clsx from 'clsx';
import styles from './banke-ucesnici-template.module.scss';
import Container from '@/components/ui/container';
import type { BanksTableDict } from '@/app/[lang]/dictionaries';

type BankeUcesniciTemplateProps = {
  t: BanksTableDict;
};

export default function BankeUcesniciTemplate({
  t,
}: BankeUcesniciTemplateProps) {
  const headers = t.headers;
  const rows = t.data;

  return (
    <div className={clsx(styles.outerWrapper)}>
      {/* HERO */}
      <div className={clsx(styles.hero, 'section', 'light')}>
        <Container>
          <h1>{t.title}</h1>
        </Container>
      </div>

      {/* TABLE */}
      <div className={clsx(styles.tableContainer, 'section', 'light')}>
        {/* HEADERS */}
        <div className={styles.tableHeader}>
          <div className={styles.cell}>
            <p>
              <span className={clsx(styles.legendLabel)}>
                {t.legend.b}:&nbsp;
              </span>
              {headers.name}
            </p>
          </div>
          <div className={styles.cell}>
            <p>
              <span className={clsx(styles.legendLabel)}>
                {t.legend.d}:&nbsp;
              </span>
              {headers.activationDate}
            </p>
          </div>
          <div className={styles.cell}>
            <p>
              <span className={clsx(styles.legendLabel)}>
                {t.legend.c}:&nbsp;
              </span>
              {headers.status}
            </p>
          </div>
        </div>

        {/* BODY */}
        <div className={styles.tableBody}>
          {rows.map((bank, index) => {
            const isActive =
              bank.status === 'Aktivan' || bank.status === 'Активан';

            return (
              <div className={styles.tableRow} key={index}>
                <div className={styles.cell}>
                  <p>
                    <span className={clsx(styles.legendLabel)}>
                      {t.legend.b}:&nbsp;
                    </span>
                    {bank.name}
                  </p>
                </div>
                <div className={styles.cell}>
                  <p>
                    <span className={clsx(styles.legendLabel)}>
                      {t.legend.d}:&nbsp;
                    </span>
                    {bank.activationDate}
                  </p>
                </div>

                <div className={clsx(styles.cell, styles.statusCell)}>
                  <span className={clsx(styles.legendLabel, 'legendLabel')}>
                    {t.legend.c}:{' '}
                  </span>
                  <span className={styles.statusIcon}>
                    {isActive ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                      >
                        <circle cx="7" cy="7" r="7" fill="#67B765" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                      >
                        <circle cx="7" cy="7" r="7" fill="#E69260" />
                      </svg>
                    )}
                  </span>

                  {/* STATUS TEXT */}
                  <p>{bank.status}</p>
                  <div></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
