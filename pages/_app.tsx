import type { AppProps } from 'next/app';
import 'maplibre-gl/dist/maplibre-gl.css';
import '../styles/globals.css';
import { DesignConfigProvider } from '../context/DesignConfigContext';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <DesignConfigProvider>
      <Component {...pageProps} />
    </DesignConfigProvider>
  );
}