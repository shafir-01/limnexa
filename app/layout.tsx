import type { Metadata } from 'next';
import './style.css';
import { Providers } from './providers';
export const metadata: Metadata = { title: 'Limnexa | Evidence to action', description: 'Traceable freshwater evidence and accountable action' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body><Providers>{children}</Providers></body></html> }
