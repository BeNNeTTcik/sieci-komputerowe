// Opcjonalnie: rejestruje <NetworkSimulator /> globalnie, aby w plikach .mdx nie trzeba było go importować.
// @ts-expect-error Docusaurus resolves this alias at build time.
import MDXComponents from '@theme-original/MDXComponents';
import NetworkSimulator from '../components/NetworkSimulator';

export default {
  ...MDXComponents,
  NetworkSimulator,
};
