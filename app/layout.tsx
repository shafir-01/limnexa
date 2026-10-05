import type { Metadata } from 'next';
import './style.css';
import { Providers } from './providers';
import {PwaRegistration} from '@/components/pwa';
export const metadata: Metadata = { title: 'Limnexa | Evidence to action', description: 'Traceable freshwater evidence and accountable action' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a><Providers>{children}<PwaRegistration/></Providers></body></html> }
