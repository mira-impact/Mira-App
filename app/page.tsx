'use client';
// O app inteiro roda no navegador (o estado fica no celular). Sem renderização no servidor.
import dynamic from 'next/dynamic';

const App = dynamic(() => import('@/components/App'), { ssr: false, loading: () => <div className="stage" /> });

export default function Page() {
  return <App />;
}
