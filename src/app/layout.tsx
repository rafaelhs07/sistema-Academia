import type { Metadata } from 'next';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow/700.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import './globals.css';
export const metadata:Metadata={title:{default:'Academia · Administración',template:'%s · Academia'},description:'Administración interna de academias de artes marciales.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>;}
