import type { MetadataRoute } from 'next';

// Deixa a MIRA instalável: no Android, o Chrome oferece "Instalar app".
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MIRA',
    short_name: 'MIRA',
    description: 'Traduz o que você já faz para a língua das vagas e mostra o caminho grátis até elas.',
    lang: 'pt-BR',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FFFFFF',
    theme_color: '#4338CA',
    icons: [
      { src: '/icones/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icones/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icones/icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
