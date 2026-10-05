import {defineConfig,globalIgnores} from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
export default defineConfig([...nextVitals,...nextTs,globalIgnores(['.next/**','.vercel/**','.tools/**','app/.well-known/workflow/**','lib/spacetime/bindings/**','spacetimedb/spacetimedb/dist/**']),{rules:{'@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_',varsIgnorePattern:'^ignored|^_'}]}}]);
