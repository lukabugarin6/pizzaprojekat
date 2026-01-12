'use client';

import { useState } from 'react';
import clsx from 'clsx';
import styles from './accordion.module.scss';
import { AnimatePresence, motion } from 'framer-motion';

export type AccordionItem = {
  question: string;
  answer: string | string[]; // ← DODATO: može niz
};

type AccordionProps = {
  items: AccordionItem[];
  defaultOpenIndex?: number | null;
};

export default function Accordion({
  items,
  defaultOpenIndex = null,
}: AccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(defaultOpenIndex);

  const toggle = (i: number) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  return (
    <div className={styles.accordion}>
      {items.map((item, i) => {
        const isOpen = openIndex === i;

        return (
          <div
            key={i}
            className={clsx(styles.item, isOpen && styles.opened)}
            onClick={() => toggle(i)}
            aria-expanded={isOpen}
          >
            {/* TITLE */}
            <p className={styles.title}>
              {i + 1}. {item.question}
            </p>

            {/* ANSWER – GRID CELL (uvek zauzima širinu) */}
            <div className={styles.answerGridCell}>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="answer"
                    className={styles.answerMotion}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    <div className={styles.answer}>
                      {Array.isArray(item.answer) ? (
                        item.answer.map((para, idx) => <p key={idx}>{para}</p>)
                      ) : (
                        <p>{item.answer}</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ICON */}
            <div className={styles.iconWrapper}>
              {isOpen ? (
                // MINUS ICON
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="19"
                  height="2"
                  viewBox="0 0 19 2"
                  fill="none"
                >
                  <path
                    d="M17.3368 0.75H0.75"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                // PLUS ICON
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                >
                  <path
                    d="M24.5868 15.7578H8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M16.2891 24.5233V7"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
