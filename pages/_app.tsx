import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { NextIntlClientProvider } from 'next-intl';
import 'maplibre-gl/dist/maplibre-gl.css';
import '../styles/globals.css';
import { DesignConfigProvider } from '../context/DesignConfigContext';
import enMessages from '../locales/en.json';
import koMessages from '../locales/ko.json';
import jaMessages from '../locales/ja.json';

const messages = {
  en: enMessages,
  ko: koMessages,
  ja: jaMessages,
} as const;

type Locale = keyof typeof messages;

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const locale = (router.locale ?? 'en') as Locale;

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages[locale] ?? messages.en}
      timeZone="Asia/Seoul"
    >
      <DesignConfigProvider>
        <Component {...pageProps} />
      </DesignConfigProvider>
    </NextIntlClientProvider>
  );
}
