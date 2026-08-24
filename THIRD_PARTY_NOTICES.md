# Third-party notices and license scope

Copyright 2026 Pranav Mishra.

Unless a file or section below says otherwise, original EONFOLK source code,
tests, configuration, and documentation are licensed under the
[Apache License 2.0](LICENSE).

## Reserved project materials

The Apache License does not grant rights in the EONFOLK name, word mark, or logo
except for reasonable use when describing the origin of the software.

The following creative materials are not offered under a standalone content or
asset license:

- `apps/web/public/eonfolk-mark.svg`;
- captured gameplay images and recordings under `docs/media/`; and
- `apps/web/public/assets/generated/eonfolk-folk-proxy.gltf` plus its derived
  `.glb` delivery file.

The generated asset manifest records the proxy's repository-authored origin,
hashes, deterministic conversion, and absence of third-party inputs. Keeping it
in a source distribution permits running and evaluating this project; it does
not grant a general right to reuse the asset outside EONFOLK. Contact the
copyright owner before separate reuse.

## Runtime dependency notices

The lockfile is authoritative for exact dependency versions. The production
dependency graph currently contains:

| Component | Version | License | Project |
|---|---:|---|---|
| React | 19.2.8 | MIT | <https://react.dev/> |
| React DOM | 19.2.8 | MIT | <https://react.dev/> |
| Scheduler | 0.27.0 | MIT | <https://react.dev/> |
| PlayCanvas Engine | 2.21.4 | MIT | <https://playcanvas.com/> |
| PlayCanvas React | 0.11.5 | MIT | <https://developer.playcanvas.com/user-manual/react/> |
| dedent | 1.7.2 | MIT | <https://github.com/dmnd/dedent> |
| WebXR type definitions | 0.5.24 | MIT | <https://github.com/DefinitelyTyped/DefinitelyTyped> |
| WebGPU type definitions | 0.1.72 | BSD-3-Clause | <https://github.com/gpuweb/types> |

These components remain under their own licenses. Their inclusion does not
change the EONFOLK license, and the EONFOLK license does not replace their terms.
Development and CI dependencies are likewise recorded in `pnpm-lock.yaml` and
remain under their respective licenses.

Run `pnpm license:check` after any dependency change. It fails if a production
dependency introduces a license outside the reviewed allowlist; a passing check
does not replace human review of notices, bundled assets, or changed terms.
