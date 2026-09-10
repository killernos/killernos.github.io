# Phase 15B — Public Source Archaeology

Phase 15B preserves reproducible public Git history as research metadata without treating repository artifacts as hardware evidence or exploit proof.

## Evidence boundary

All records in `source-archaeology-records.js` are `SOURCE_CONFIRMED`. They do **not** become `HARDWARE_OBSERVED`, do not increase reproduction counts, and do not promote a dashboard row to a kernel candidate by themselves.

A Git blob SHA establishes the identity of file bytes stored by Git. Matching blob SHAs establish byte-for-byte identity for those repository objects. They do not establish that two firmware kernels are identical or that an artifact executes successfully on either firmware.

## Audited snapshot

The Phase 15B source record was checked directly against the public `mansoor0x/polpNO` Git tree at commit `499fb0d86311b3af1af86d758810797ef2a94cab` and against the relevant cleanup/deletion commits.

Verified artifact metadata in that snapshot:

| Firmware | Path | Git blob SHA | Size |
| --- | --- | --- | ---: |
| 13.00 | `patches/1300.bin` | `093f6be6d4a741f88d0e63396768ee7a9928d544` | 314 |
| 13.02 | `patches/1302.bin` | `ae341fcb9006d15706df3c73b163368c66b9e089` | 712 |
| 13.04 | `patches/1304.bin` | `ae341fcb9006d15706df3c73b163368c66b9e089` | 712 |
| 13.50 | `patches/1350.bin` | `6b3733654376075927d1910631e3c20ce7b8be89` | 712 |
| 13.52 | `patches/1352.bin` | `0e94f18748fa90c936407f724a375ee7eff77110` | 712 |

The captured `ps4_offsets.js` transition is also Git-tree verified:

- Before cleanup: blob `d130414d37b3e05afd9e28604e98d0a6ed50eaa2`, 49,028 bytes.
- After commit `e2e5fb597216a1f6cd0cf0589d1c314aa766913f`: blob `2bc5563bb36089caaef26a3b74f87e7b9a1a309b`, 17,527 bytes.
- Commit metadata records 0 additions and 675 deletions.

The `payload.bin` replacement is also preserved as source-history context:

- Removed blob: `ff498f3b9335b079f899ac0facf6393c83f97f5c`, 242,716 bytes.
- Re-added blob: `0130e4dffc4438f1cd2f7ac8731b5030c661109a`, 499,776 bytes.

## Preserved finding

The captured public history records `patches/1302.bin` and `patches/1304.bin` with the same Git blob SHA (`ae341fcb9006d15706df3c73b163368c66b9e089`) and the same size (712 bytes). Phase 15B therefore records an `IDENTICAL_GIT_BLOB` relationship between those two historical artifacts.

The 13.00 artifact has a different blob SHA and size. The 13.50 and 13.52 artifacts also have distinct blob SHAs.

## Timeline interpretation

The source history also records a large `ps4_offsets.js` cleanup, a `payload.bin` replacement, and deletion of several higher-firmware patch artifacts in a short interval. Phase 15B treats this as repository-cleanup context. It does not infer why the developer removed the files and does not characterize deletion as evidence of a private or hidden exploit.

## Safety / research locks

Phase 15B adds no patch bytes, exploit trigger, shellcode, kernel read/write primitive, kexec path, HEN/GoldHEN loader, or automatic evidence promotion. `affectsPromotion` remains false.

Hardware claims must continue through NEXT's strict hardware-observation path and its provenance validation. Source archaeology can guide which firmware differences deserve testing, but cannot substitute for hardware observations.
