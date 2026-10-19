// Opcjonalnie: rejestruje <NetworkSimulator /> globalnie, aby w plikach .mdx nie trzeba było go importować.
import MDXComponents from '@theme-original/MDXComponents';
import NetworkSimulator from '../components/NetworkSimulator';

export default {
  ...MDXComponents,
  NetworkSimulator,
};
