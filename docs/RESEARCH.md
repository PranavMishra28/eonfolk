# EONFOLK research map

**Purpose:** Preserve the primary research and official technical sources that materially shaped EONFOLK's executable architecture.

**Status:** ACTIVE — living bibliography for V1

**Authority boundary:** This file owns the compact research map and [root BibTeX bibliography](../references.bib). The [source ledger](research/SOURCE_LEDGER.md) owns claim-level access dates, source classes, confidence, consumers, and reopen conditions. Product and engineering authorities own decisions.

**Related documents:** [authority index](INDEX.md), [source ledger](research/SOURCE_LEDGER.md), [systems research](research/SYSTEMS_RESEARCH.md), [cognition research](research/FOUNDER_ALPHA_COGNITION_RESEARCH.md), [world-as-product research](research/WORLD_AS_PRODUCT_RESEARCH.md).

## How evidence is used

- **VERIFIED FACT** means a claim supported by an opened, dated source-ledger row; it does not mean a result replicated for EONFOLK.
- **INFERENCE** connects verified facts to this architecture and remains falsifiable.
- **PRODUCT HYPOTHESIS** requires executable or player evidence.
- **UNRESOLVED** records a material unknown without silently converting it to future scope.

`references.bib` is the durable citation catalog. `docs/research/SOURCE_LEDGER.md` is the operational evidence index. Research files retain bounded interpretation and measurements; accepted behavior belongs in the mapped authority document.

## Primary research spine

<!-- bibliography-keys: park2023generative sumers2024coala wang2023voyager altera2024projectsid piao2026agentsociety nau2003shop2 silver2010pomcp lamport2002specifying -->

| Area | Primary sources | EONFOLK use and limit |
|---|---|---|
| Agent memory and reflection | `park2023generative`, `sumers2024coala` | Motivates typed episodic/semantic/social memory and reflection; does not establish human fidelity or authorize prose as truth |
| Embodied open-ended agents | `wang2023voyager` | Supports compositional plans and environment feedback; executable code generation and external tool authority are rejected |
| Agent societies | `altera2024projectsid`, `piao2026agentsociety` | Demonstrates research interest in many-agent social simulation; neither establishes EONFOLK's consumer loop, calibration, or reproducibility |
| Deterministic task planning | `nau2003shop2` | Supports hierarchical decomposition with explicit methods; EONFOLK keeps bounded search over actor-visible facts and legal affordances |
| Partial-observability planning | `silver2010pomcp` | Defines the generative-model requirement that supports V1 non-promotion decision D-016 |
| Formal specification | `lamport2002specifying` | Supports bounded model checking of high-value persistence/authority protocols; not every mechanic is formalized |

## Official technology spine

The source ledger carries exact access dates and selected versions for PlayCanvas, Recast Navigation, Vite, pnpm, GitHub Actions, IndexedDB, SQLite/OPFS, Ollama, llama.cpp, MLX/MLX-LM, and Cloudflare. These are capability and behavior sources, not product-quality evidence. Version-sensitive claims must be re-opened on cohort changes.

## Update rule

Add a bibliography entry only when a source changes a decision, test, implementation contract, benchmark, or reopen trigger. Prefer papers, standards, official repositories, model cards, and official documentation. Do not use the bibliography as a generic reading list or cite a source for claims it did not test.
