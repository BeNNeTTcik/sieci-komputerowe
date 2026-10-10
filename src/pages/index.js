import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './index.module.css';

// --- Małe grafiki (inline SVG) -------------------------------------------
// Działają od razu, bez plików w static/. Jeśli wolisz własny obrazek,
// wrzuć go do static/img/ i podaj w kursie pole `img: '/img/plik.png'`
// — wtedy zamiast ikony pokaże się obrazek.

function IconSieci() {
  return (
    <svg viewBox="0 0 64 64" width="96" height="96" aria-hidden="true">
      <line x1="32" y1="14" x2="14" y2="46" stroke="currentColor" strokeWidth="3" />
      <line x1="32" y1="14" x2="50" y2="46" stroke="currentColor" strokeWidth="3" />
      <line x1="14" y1="46" x2="50" y2="46" stroke="currentColor" strokeWidth="3" />
      <circle cx="32" cy="14" r="8" fill="currentColor" />
      <circle cx="14" cy="46" r="8" fill="currentColor" />
      <circle cx="50" cy="46" r="8" fill="currentColor" />
    </svg>
  );
}

function IconAdministrowanie() {
  return (
    <svg viewBox="0 0 64 64" width="96" height="96" aria-hidden="true">
      <rect x="8" y="10" width="48" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="3" />
      <rect x="8" y="30" width="48" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="16" cy="17" r="2.5" fill="currentColor" />
      <circle cx="16" cy="37" r="2.5" fill="currentColor" />
      <line x1="26" y1="17" x2="48" y2="17" stroke="currentColor" strokeWidth="3" />
      <line x1="26" y1="37" x2="48" y2="37" stroke="currentColor" strokeWidth="3" />
      <line x1="32" y1="44" x2="32" y2="54" stroke="currentColor" strokeWidth="3" />
      <line x1="20" y1="54" x2="44" y2="54" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

// --- Lista kursów ---------------------------------------------------------
// Nowy kurs = nowy obiekt w tablicy. `to` to ścieżka BEZ baseUrl
// (bez /sieci-komputerowe) — skopiuj ją z paska adresu po kliknięciu
// kursu w górnym menu.

const courses = [
  {
    title: 'Sieci komputerowe',
    desc: 'Ćwiczenia laboratoryjne z sieci komputerowych — podstawy.',
    to: '/sieci/intro',
    Icon: IconSieci,
    img: '/img/sieci.png',
  },
  {
    title: 'Administrowanie sieciami',
    desc: 'Ćwiczenia laboratoryjne z administrowania sieciami.',
    to: '/administrowanie-sieciami/intro',
    Icon: IconAdministrowanie,
    img: '/img/administrowanie-sieciami.png',
  },
];

function CourseCard({title, desc, to, Icon, img}) {
  const imgUrl = useBaseUrl(img || '');
  return (
    <Link
      to={to}
      className={styles.card}
      style={{width: '300px', maxWidth: '100%', display: 'flex', flexDirection: 'column'}}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.desc}>{desc}</p>
      <div className={styles.thumb}>
        {img ? <img src={imgUrl} alt="" /> : Icon ? <Icon /> : null}
      </div>
    </Link>
  );
}

export default function Home() {
  return (
    <Layout title="Moje kursy" description="Ćwiczenia laboratoryjne — Uniwersytet Morski w Gdyni">
      <main className={styles.main}>

        {/* Karty OBOK SIEBIE: każda ma stałą szerokość 300 px i zawijają
            się do nowego rzędu dopiero, gdy zabraknie miejsca. Styl wpisany
            tutaj, a nie w CSS, żeby układ działał nawet przy starym pliku CSS. */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'stretch',
            gap: '24px',
          }}>
          {courses.map((c) => (
            <CourseCard key={c.to} {...c} />
          ))}
        </div>
      </main>
    </Layout>
  );
}
