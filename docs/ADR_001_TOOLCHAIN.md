# Toolchain decisions

The web application uses Next.js 16.3.8, React 19, TypeScript strict mode, `noUncheckedIndexedAccess`, Tailwind 4, and the generated SpacetimeDB 2.10.2 SDK bindings. Native controls are used for accessible forms where a component library would not add functionality.

TypeScript strict mode and `noUncheckedIndexedAccess` apply across the application. Zod validates every untrusted command and HTTP input, while generated database bindings remain source-controlled artifacts rather than hand-edited code.

The dependency baseline uses compatible patch overrides where required by the workflow runtime. Production dependency auditing is part of the release gate, and developer tooling remains outside browser and request-time bundles.

The initial empty Maincloud module was extended through additive migrations with data deletion forbidden. Historical v1 rows remain inspectable, while their old mutation reducers now reject calls. Real rule activation requires an immutable sourced policy assigned to a site and administrator-enrolled source lineages. Synthetic inputs remain explicitly marked and pass through the same capture, validation, rules, lifecycle, and outbox paths.
