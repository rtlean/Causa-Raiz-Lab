'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha }),
    });
    setEnviando(false);
    if (!res.ok) {
      setErro('Senha incorreta');
      return;
    }
    router.replace('/');
    router.refresh();
  }

  return (
    <main className="login">
      <div className="card">
        <h1>Causa Raiz Lab</h1>
        <p>Informe a senha para continuar.</p>
        <form onSubmit={entrar} className="grid">
          <label className="largo">
            Senha
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoFocus
              required
            />
          </label>
          <div className="largo">
            <button className="primario" type="submit" disabled={enviando || !senha}>
              {enviando ? 'Entrando…' : 'Entrar'}
            </button>
          </div>
        </form>
        {erro && <div className="erro">{erro}</div>}
      </div>
    </main>
  );
}
