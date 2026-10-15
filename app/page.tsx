import { redirect } from 'next/navigation';
import { sessaoAtiva } from '@/lib/sessao';
import App from '@/components/App';

// Proteção no servidor: sem sessão válida, o HTML do app nem chega ao navegador.
export const dynamic = 'force-dynamic';

export default async function Home() {
  if (!(await sessaoAtiva())) redirect('/login');
  return <App />;
}
