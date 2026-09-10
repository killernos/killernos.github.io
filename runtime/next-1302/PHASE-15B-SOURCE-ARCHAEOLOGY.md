# Phase 15B — Public Source Archaeology

Phase 15B preserves reproducible public Git history as research metadata without treating repository artifacts as hardware evidence or exploit proof.

## Evidence boundary

All records in `source-archaeology-records.js` are `SOURCE_CONFIRMED`. They do **not** become `HARDWARE_OBSERVED`, do not increase reproduction counts, and do not promote a dashboard row to a kernel candidate by themselves.

A Git blob SHA establishes the identity of file bytes stored by Git. Matching blob SHAs establish byte-for-byte identity for those repository objects. They do not establish that two firmware kernels are identical or that an artifact executes successfully on either firmware.

## Preserved finding

The captured public `mansoor0x/polpNO` history records `patches/1302.bin` and `patches/1304.bin` with the same Git blob SHA (`ae341fcb9006d15706df3c73b163368c66b9e089`) and the same size (712 bytes). Phase 15B therefore records an `IDENTICAL_GIT_BLOB` relationship between those two historical artifacts.

The 13.00 artifact has a different blob SHA and size. The 13.50 and 13.52 artifacts also have distinct blob SHAs.

## Timeline interpretation

The source history also records a large `ps4_offsets.js` cleanup, a `payload.bin` replacement, and deletion of several higher-firmware patch artifacts in a short interval. Phase 15B treats this as repository-cleanup context. It does not infer why the developer removed the files and does not characterize deletion as evidence of a private or hidden exploit.

## Safety / research locks

Phase 15B adds no patch bytes, exploit trigger, shellcode, kernel read/write primitive, kexec path, HEN/GoldHEN loader, or automatic evidence promotion. `affectsPromotion` remains false.

Hardware claims must continue through NEXT's strict hardware-observation path and its provenance validation. Source archaeology can guide which firmware differences deserve testing, but cannot substitute for hardware observations.
