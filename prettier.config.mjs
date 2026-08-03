/** @type {import("prettier").Config} */
export default {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  arrowParens: 'always',
  endOfLine: 'lf',
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindStylesheet: './packages/ui/src/styles/globals.css',
  overrides: [
    {
      files: ['*.md', '*.mdx'],
      options: { proseWrap: 'always' },
    },
    {
      files: '*.prisma',
      options: { tabWidth: 2 },
    },
  ],
};
