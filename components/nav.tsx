import Link from 'next/link';
export function Nav(){return <header className="top"><Link className="brand" href="/">LIMNE<span>XA</span></Link><nav aria-label="Main navigation"><Link href="/report">Report</Link><Link href="/evidence">Evidence</Link><Link href="/operations">Operations</Link><Link href="/monitoring">Monitoring</Link><Link href="/interoperability">Interoperability</Link></nav></header>}
export function Footer(){return <footer className="footer"><div className="shell">Limnexa · Traceable freshwater evidence · Synthetic demonstration data is clearly marked.</div></footer>}
