// @ts-check
// UWAGA: zmień poniższe trzy pola (url, organizationName, projectName)
// tak, aby pasowały do Twojego konta i repozytorium na GitHub.

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Sieci komputerowe',
  tagline: 'Instrukcje laboratoryjne — model ISO/OSI i konfiguracja sieci',
  favicon: 'img/favicon.ico',

  // === USTAWIENIA GITHUB PAGES — DOSTOSUJ DO SIEBIE ===
  // Jeśli repo nazywa się np. "sieci-komputerowe", a Twój login GitHub
  // to "jan-kowalski", strona będzie dostępna pod:
  // https://jan-kowalski.github.io/sieci-komputerowe/
  url: 'https://TWOJ-LOGIN.github.io',
  baseUrl: '/sieci-komputerowe/',
  organizationName: 'TWOJ-LOGIN',       // Twoja nazwa użytkownika/organizacji na GitHub
  projectName: 'sieci-komputerowe',     // nazwa repozytorium
  trailingSlash: false,

  onBrokenLinks: 'warn',
  
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',   // ← nowe miejsce
    },
  },

  i18n: {
    defaultLocale: 'pl',
    locales: ['pl'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/', // dokumentacja jako strona główna
          sidebarPath: './sidebars.js',
          editUrl: undefined,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'Sieci komputerowe',
        logo: {
          alt: 'Logo kursu',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'cwiczeniaSidebar',
            position: 'left',
            label: 'Ćwiczenia',
          },
          {
            href: 'https://github.com/TWOJ-LOGIN/sieci-komputerowe',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Kurs',
            items: [
              { label: 'Strona główna', to: '/' },
              { label: 'Ćwiczenie 1', to: '/cwiczenie-01' },
            ],
          },
        ],
        copyright: `Materiały dydaktyczne — Sieci komputerowe.`,
      },
      prism: {
        additionalLanguages: ['bash', 'diff', 'json'],
      },
    }),
};

module.exports = config;
