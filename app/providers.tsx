'use client';
import { useMemo } from 'react';
import { SpacetimeDBProvider } from 'spacetimedb/react';
import { DbConnection } from '@/lib/spacetime/bindings';

export function Providers({ children }: { children: React.ReactNode }) {
  const connectionBuilder = useMemo(() => {
    const builder = DbConnection.builder()
      .withUri(process.env.NEXT_PUBLIC_SPACETIMEDB_SERVER || 'wss://maincloud.spacetimedb.com')
      .withDatabaseName(process.env.NEXT_PUBLIC_SPACETIMEDB_DATABASE || 'limnexa-jltls')
      .onConnect((_connection, _identity, token) => {
        try { window.localStorage.setItem('limnexa-spacetime-token', token); } catch { /* storage may be disabled */ }
      });
    try { if (typeof window !== 'undefined') builder.withToken(window.localStorage.getItem('limnexa-spacetime-token') || undefined); } catch { /* anonymous connection */ }
    return builder;
  }, []);
  return <SpacetimeDBProvider connectionBuilder={connectionBuilder}>{children}</SpacetimeDBProvider>;
}
