# Toolchain decisions

The web application uses Next.js 16.3.8, React 19, TypeScript strict mode, `noUncheckedIndexedAccess`, Tailwind 4, and the generated SpacetimeDB 2.10.2 SDK bindings. Native controls are used for accessible forms where a component library would not add functionality.

`exactOptionalPropertyTypes` was tested and is disabled: SDK 2.10 generated schema constraints expose `name: string | undefined` where its public generic constraint expects an optional string. Enabling the flag invalidates the schema type and collapses reducer types. This is a verified upstream compatibility limitation; generated bindings are not hand-edited to mask it. Zod validates untrusted command and HTTP inputs.

The Windows sandbox prevents Workflow's esbuild package resolver from reading parent paths. Local build/dev commands required approved execution outside that filesystem restriction. The same code builds normally on Vercel's Linux builder.

Workflow's transitive `devalue` and `nanoid` advisories were resolved with compatible patch overrides. Production dependency auditing reports zero advisories. Vercel CLI/compiler tooling can carry upstream development-only advisories; its dependency graph is separately audited and does not ship as a browser or request-time package.

The initial empty Maincloud module was extended through additive migrations with data deletion forbidden. Historical v1 rows remain inspectable, while their old mutation reducers now reject calls. Real rule activation requires an immutable sourced policy assigned to a site and administrator-enrolled source lineages. Synthetic inputs remain explicitly marked and pass through the same capture, validation, rules, lifecycle, and outbox paths.
