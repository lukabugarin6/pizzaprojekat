import clsx from 'clsx';
import styles from './prednosti-e-menica.module.scss';
import Container from '@/components/ui/container';
import Grid from '@/components/ui/grid';
import GridItem from '@/components/ui/grid-item';
import type { AdvantagesEmeniceDict } from '@/app/[lang]/dictionaries';

type Props = {
  t: AdvantagesEmeniceDict;
};

export default function PrednostiEMenica({ t }: Props) {
  return (
    <div
      className={clsx(
        styles.outerWrapper,
        'section',
        'light',
        'section-dark',
        'hero'
      )}
    >
      <div className={clsx(styles.wrapper)}>
        {/* GORNJI DEO */}
        <div className={clsx(styles.wrapper__top)}>
          <Container>
            <h2>{t.title}</h2>
          </Container>
          <Container>
            <Grid>
              {t.top.paragraphs.map((p, idx) => (
                <GridItem s={4} m={3} xl={4} key={idx}>
                  <p className={clsx(idx === 0 && styles.first)}>{p}</p>
                </GridItem>
              ))}
            </Grid>
          </Container>
        </div>

        {/* DONJI DEO */}
        <div className={clsx(styles.wrapper__bottom)}>
          <Container variant="without-margin">
            <div className={clsx(styles.flexWrapper)}>
              {/* LEVA KARTICA – KORISNICI */}
              <div className={clsx(styles.wrapper__bottom__left, styles.card)}>
                <div className={clsx(styles.listItem)}>
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 28 28"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect width="28" height="28" rx="14" fill="#343434" />
                    <path
                      d="M16.4915 6V20.5455H13.4162V8.91903H13.331L10 11.0071V8.27983L13.6009 6H16.4915Z"
                      fill="#CDD6D9"
                    />
                  </svg>

                  <h2>{t.forUsers.title}</h2>
                </div>

                <ul>
                  {t.forUsers.items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* DESNI BLOK – BANKE + DRŽAVA */}
              <div className={clsx(styles.wrapper__bottom__right)}>
                {/* ZA BANKE */}
                <div
                  className={clsx(
                    styles.wrapper__bottom__right__top,
                    styles.card
                  )}
                >
                  <div className={clsx(styles.listItem)}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="28"
                      height="28"
                      viewBox="0 0 28 28"
                      fill="none"
                    >
                      <circle cx="14" cy="14" r="14" fill="#343434" />
                      <path
                        d="M8.87642 21.0002V18.7843L14.054 13.9902C14.4943 13.5641 14.8636 13.1806 15.1619 12.8397C15.465 12.4988 15.6946 12.165 15.8509 11.8382C16.0071 11.5068 16.0852 11.1493 16.0852 10.7658C16.0852 10.3397 15.9882 9.97272 15.794 9.66495C15.5999 9.35245 15.3348 9.11334 14.9986 8.94762C14.6624 8.77717 14.2812 8.69194 13.8551 8.69194C13.41 8.69194 13.0218 8.7819 12.6903 8.96183C12.3589 9.14175 12.1032 9.3998 11.9233 9.73597C11.7434 10.0721 11.6534 10.4722 11.6534 10.9363H8.73438C8.73438 9.98455 8.94981 9.15832 9.38068 8.45756C9.81155 7.75681 10.4152 7.21467 11.1918 6.83114C11.9683 6.44762 12.8632 6.25586 13.8764 6.25586C14.9181 6.25586 15.8248 6.44052 16.5966 6.80984C17.3731 7.17442 17.9768 7.68105 18.4077 8.32972C18.8385 8.9784 19.054 9.72177 19.054 10.5598C19.054 11.1091 18.9451 11.6512 18.7273 12.1863C18.5142 12.7213 18.133 13.3155 17.5838 13.9689C17.0346 14.6176 16.2604 15.3965 15.2614 16.3056L13.1378 18.3865V18.486H19.2457V21.0002H8.87642Z"
                        fill="#CDD6D9"
                      />
                    </svg>
                    <h2>{t.forBanks.title}</h2>
                  </div>
                  <ul>
                    {t.forBanks.items.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* ZA DRŽAVU */}
                <div
                  className={clsx(
                    styles.wrapper__bottom__right__bottom,
                    styles.card
                  )}
                >
                  <div className={clsx(styles.listItem)}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="28"
                      height="28"
                      viewBox="0 0 28 28"
                      fill="none"
                    >
                      <circle cx="14" cy="14" r="14" fill="#343434" />
                      <path
                        d="M13.9638 21.199C12.9032 21.199 11.9586 21.0168 11.13 20.6522C10.3061 20.2828 9.65507 19.7762 9.17685 19.1323C8.70336 18.4836 8.45952 17.7355 8.44531 16.888H11.5419C11.5608 17.2431 11.6768 17.5556 11.8899 17.8255C12.1077 18.0906 12.3965 18.2966 12.7564 18.4434C13.1162 18.5901 13.5211 18.6635 13.9709 18.6635C14.4396 18.6635 14.8539 18.5807 15.2138 18.415C15.5736 18.2492 15.8553 18.0196 16.0589 17.726C16.2625 17.4325 16.3643 17.0939 16.3643 16.7104C16.3643 16.3221 16.2554 15.9789 16.0376 15.6806C15.8246 15.3775 15.5168 15.1408 15.1143 14.9703C14.7166 14.7999 14.2431 14.7147 13.6939 14.7147H12.3374V12.4561H13.6939C14.1579 12.4561 14.5675 12.3757 14.9226 12.2147C15.2824 12.0537 15.5618 11.8311 15.7607 11.5471C15.9595 11.2582 16.0589 10.9221 16.0589 10.5385C16.0589 10.1739 15.9714 9.85434 15.7962 9.57972C15.6257 9.30037 15.3842 9.08256 15.0717 8.92631C14.764 8.77006 14.4041 8.69194 13.9922 8.69194C13.5755 8.69194 13.1944 8.7677 12.8487 8.91921C12.5031 9.06599 12.2261 9.27669 12.0178 9.55131C11.8094 9.82593 11.6982 10.1479 11.6839 10.5172H8.73651C8.75071 9.67916 8.98982 8.94052 9.45384 8.30131C9.91785 7.66211 10.5429 7.16258 11.3288 6.80273C12.1196 6.43815 13.0121 6.25586 14.0064 6.25586C15.0102 6.25586 15.8885 6.43815 16.6413 6.80273C17.3942 7.16732 17.9789 7.65974 18.3956 8.28001C18.817 8.89554 19.0253 9.58683 19.0206 10.3539C19.0253 11.1683 18.772 11.8477 18.2607 12.3922C17.754 12.9367 17.0935 13.2824 16.2791 13.4292V13.5428C17.3492 13.6801 18.1636 14.0518 18.7223 14.6578C19.2857 15.2592 19.5651 16.012 19.5604 16.9164C19.5651 17.745 19.326 18.4812 18.843 19.1252C18.3648 19.7691 17.7043 20.2757 16.8615 20.6451C16.0187 21.0144 15.0528 21.199 13.9638 21.199Z"
                        fill="#CDD6D9"
                      />
                    </svg>
                    <h2>{t.forState.title}</h2>
                  </div>
                  <ul>
                    {t.forState.items.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </Container>
        </div>
      </div>
    </div>
  );
}
