export type PublicPage =
  | 'home'
  | 'services'
  | 'about'
  | 'contact'
  | 'quote'
  | 'quote-success'
  | 'moving'
  | 'junk-removal'
  | 'light-demo'
  | 'terms'
  | 'privacy';

export interface PublicPageProps {
  onNavigate: (page: PublicPage) => void;
  onLogin: () => void;
}
