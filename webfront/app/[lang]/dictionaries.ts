import 'server-only';

const dictionaries = {
  'sr-Latn': () => import('./dictionaries/sr-Latn.json').then((m) => m.default),
  'sr-Cyrl': () => import('./dictionaries/sr-Cyrl.json').then((m) => m.default),
};

export type Lang = keyof typeof dictionaries;
export type Dictionary = Awaited<ReturnType<(typeof dictionaries)[Lang]>>;

export async function getDictionary(lang: Lang): Promise<Dictionary> {
  return dictionaries[lang]();
}

// export type NavbarDict = Dictionary['navbar'];
// export type HeroDict = Dictionary['hero'];
// export type StaSuEmeniceDict = Dictionary['whatAreEmenice'];
// export type WhatIsCremDict = Dictionary['whatIsCrem'];
// export type HowEmeniceWorkDict = Dictionary['howEmeniceWork'];
// export type AdvantagesEmeniceDict = Dictionary['advantagesEmenice'];
// export type FooterDict = Dictionary['footer'];
// export type FaqDict = Dictionary['faq'];
// export type BanksTableDict = Dictionary['banksTable'];
