// @ts-check

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Moje kursy',
  tagline: 'Instrukcje laboratoryjne i materiały dydaktyczne',
  favicon: 'img/favicon.ico',

  url: 'https://TWOJ-LOGIN.github.io',
  baseUrl: '/sieci-komputerowe/',       // musi = nazwa repozytorium
  organizationName: 'TWOJ-LOGIN',
  projectName: 'sieci-komputerowe',
  trailingSlash: false,

  onBrokenLinks: 'warn',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
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
          id: 'sieci',
          path: 'docs-sieci',
          routeBasePath: 'sieci',                 
          sidebarPath: './sidebars-sieci.js',
        },
        blog: false,
        theme: { customCss: './src/css/custom.css' },
      }),
    ],
  ],

  plugins: [
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'administrowanie-sieciami',
        path: 'docs-po-adm-sieci',
        routeBasePath: 'administrowanie-sieciami',
        sidebarPath: './sidebars-po-adm-sieci.js',
      },
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'Moje kursy',
        items: [
          { to: '/', label: 'Start', position: 'left' },
          { type: 'docSidebar', docsPluginId: 'sieci', sidebarId: 'cwiczeniaSidebar', label: 'Sieci komputerowe', position: 'left' },
          { type: 'docSidebar', docsPluginId: 'administrowanie-sieciami', sidebarId: 'administrowanie-sieciamiSidebar', label: 'Administrowanie sieciami', position: 'left' },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Kursy',
            items: [
              { label: 'Strona główna', to: '/' },
              { label: 'Sieci komputerowe', to: '/sieci/intro' },
              { label: 'Administrowanie sieciami', to: '/administrowanie-sieciami/intro' },
            ],
          },
        ],
        copyright: `© ${new Date().getFullYear()} Mateusz Dampc. Materiały własne — wszystkie prawa zastrzeżone. Cytowane źródła zewnętrzne pozostają własnością ich autorów (patrz bibliografia przy każdym ćwiczeniu).`,
      },
      prism: {
        additionalLanguages: ['bash', 'diff', 'json'],
      },
    }),
};

module.exports = config;