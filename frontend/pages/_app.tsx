import '../styles/globals.css';
import { AppProps } from 'next/app';
import { StacksProvider } from '@/contexts/StacksContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <StacksProvider>
      <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-gradient-to-b from-white via-white to-[#ffe6d8]">
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute -top-24 right-[-10%] h-64 w-64 rounded-full bg-[#fc6432]/10 blur-3xl" />
          <div className="absolute top-1/2 left-[-20%] h-72 w-72 rounded-full bg-[#fc6432]/15 blur-3xl" />
          <div className="absolute bottom-[-15%] right-[10%] h-60 w-60 rounded-full bg-[#fc6432]/8 blur-3xl" />
        </div>
        <Header />
        <main className="relative z-10 flex-1 pb-16">
          <Component {...pageProps} />
        </main>
        <Footer />
      </div>
    </StacksProvider>
  );
}
