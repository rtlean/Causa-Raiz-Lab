import App from '@/components/App';

// Proteção no servidor: sem sessão válida, o HTML do app nem chega ao navegador.
export const dynamic = 'force-dynamic';

export default async function Home() {
  return <App />;
}
