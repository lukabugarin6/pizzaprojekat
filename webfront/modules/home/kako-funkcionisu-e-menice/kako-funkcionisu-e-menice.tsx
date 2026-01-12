import clsx from 'clsx';
import styles from './kako-funkcionisu-e-menice.module.scss';
import Container from '@/components/ui/container';
import type { HowEmeniceWorkDict } from '@/app/[lang]/dictionaries';

const icons = [
  <svg
    key="icon-1"
    xmlns="http://www.w3.org/2000/svg"
    width="30"
    height="24"
    viewBox="0 0 30 24"
    fill="none"
  >
    <path
      d="M22 13.5264L22 9.52637L-1.74846e-07 9.52637L0 13.5264L22 13.5264Z"
      fill="var(--black)"
    />
    <path
      d="M14.7734 22.0526L18.2375 20.0526L7.23754 1L3.77344 3L14.7734 22.0526Z"
      fill="var(--black)"
    />
    <path
      d="M7.22656 22.0526L3.76246 20.0526L14.7625 1L18.2266 3L7.22656 22.0526Z"
      fill="var(--black)"
    />
  </svg>,
  <svg
    key="icon-2"
    xmlns="http://www.w3.org/2000/svg"
    width="30"
    height="24"
    viewBox="0 0 30 24"
    fill="none"
  >
    <path d="M0 22.9847V23H18.6946V18.9766H0V18.9988" fill="var(--black)" />
    <path
      d="M1.38599 13.5336L0.0923552 17.5441L4.14861 16.3715L17.8777 3.33947L14.8888 0.246486L1.38599 13.5336Z"
      fill="var(--black)"
    />
  </svg>,
  <svg
    key="icon-3"
    xmlns="http://www.w3.org/2000/svg"
    width="30"
    height="24"
    viewBox="0 0 30 24"
    fill="none"
  >
    <path
      d="M22.0078 10L22.0078 6L12.0078 6L12.0078 10L22.0078 10Z"
      fill="#343434"
    />
    <path
      d="M16.0078 18L16.0078 14L7.00781 14L7.00781 18L16.0078 18Z"
      fill="#343434"
    />
    <path
      d="M0.00683632 16.001L8.00781 24.002L8.00781 19.0783L8.00781 16.001L8.00781 12.9237L8.00781 8L0.00683632 16.001Z"
      fill="#343434"
    />
    <path
      d="M28.0088 8.00098L20.0078 16.002L20.0078 11.0783L20.0078 8.00098L20.0078 4.92368L20.0078 0L28.0088 8.00098Z"
      fill="#343434"
    />
  </svg>,
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="24"
    viewBox="0 0 20 24"
    fill="none"
  >
    <path
      d="M9.9707 0.000976562C11.693 -0.0266478 13.4678 0.568503 14.8223 1.86719C16.2002 3.18837 17 5.09899 17 7.42188H13C13 6.05018 12.5499 5.22971 12.0537 4.75391C11.5342 4.25602 10.8106 3.98763 10.0352 4C8.54029 4.02407 7.00872 5.06623 7.01172 7.41895C7.01264 8.14673 7.00829 8.80773 7.00488 9.42188H20L19.9824 23.3984V23.4219H0L0.0175781 9.42188H3.00488C3.00829 8.78715 3.01261 8.12184 3.01172 7.42383C3.00571 2.71039 6.46903 0.0573585 9.9707 0.000976562ZM10 14.4219C8.89543 14.4219 8 15.3173 8 16.4219C8 17.5264 8.89543 18.4219 10 18.4219C11.1046 18.4219 12 17.5264 12 16.4219C12 15.3173 11.1046 14.4219 10 14.4219Z"
      fill="#343434"
    />
  </svg>,
  <svg
    key="icon-5"
    xmlns="http://www.w3.org/2000/svg"
    width="26"
    height="20"
    viewBox="0 0 26 20"
    fill="none"
  >
    <path
      d="M26 20H0V0H26V20ZM4 4V8H8V4H4ZM11 4V8H15V4H11ZM18 4V8H22V4H18Z"
      fill="#343434"
    />
  </svg>,
  <svg
    key="icon-6"
    xmlns="http://www.w3.org/2000/svg"
    width="30"
    height="24"
    viewBox="0 0 30 24"
    fill="none"
  >
    <path
      d="M0.0140729 -1.7423e-07L-0.00115776 -1.74896e-07L-0.00115859 18.9834L4 18.9834L4 0L3.97792 -9.65358e-10"
      fill="#343434"
    />
    <path
      d="M7.02189 -1.7423e-07L7.00665 -1.74896e-07L7.00665 18.9834L11.0078 18.9834L11.0078 0L10.9857 -9.65358e-10"
      fill="#343434"
    />
    <path
      d="M14.0221 -5.6728e-07L14.0069 -5.67946e-07L14.0069 18.9834L27 19L27 0.0165872L26.9779 0.0165872"
      fill="#343434"
    />
  </svg>,
];

type Props = {
  t: HowEmeniceWorkDict;
};

export default function KakoFunkcionisuEMenice({ t }: Props) {
  return (
    <div
      className={clsx(styles.outerWrapper, 'section', 'section-light', 'light')}
    >
      <div className={clsx(styles.wrapper)}>
        <Container>
          <h2>{t.title}</h2>
        </Container>
        <Container>
          <div className={clsx(styles.cardsWrapper)}>
            {t.cards.map((card, index) => (
              <div key={index} className={clsx(styles.cardsWrapper__card)}>
                {icons[index]}
                <p className={clsx(styles.cardsWrapper__card__heading, 'bold')}>
                  {card.heading}
                </p>
                <p className={clsx(styles.cardsWrapper__card__description)}>
                  {card.description}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </div>
    </div>
  );
}
