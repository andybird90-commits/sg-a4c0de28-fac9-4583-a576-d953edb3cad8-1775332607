import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { AppProvider } from "@/contexts/AppContext";
import { Toaster } from "@/components/ui/toaster";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <AppProvider>
        <Component {...pageProps} />
        <Toaster />
      </AppProvider>
    </ThemeProvider>
  );
}