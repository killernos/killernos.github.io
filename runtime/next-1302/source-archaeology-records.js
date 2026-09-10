// Phase 15B: non-executing public-source archaeology metadata.
// Git blob identity proves file-byte identity only. It does not establish
// kernel identity, exploitability, kernel R/W, kernel execution, or jailbreak.

const clone = value => JSON.parse(JSON.stringify(value));

export const SOURCE_ARCHAEOLOGY_REPORT = Object.freeze({
  reportType: 'NEXT_SOURCE_ARCHAEOLOGY_REPORT',
  schemaVersion: 1,
  evidenceClass: 'SOURCE_CONFIRMED',
  source: {
    owner: 'mansoor0x',
    repository: 'polpNO',
    snapshotCommit: '499fb0d86311b3af1af86d758810797ef2a94cab',
    snapshotAt: '2026-09-04T20:24:37Z',
    auditMethod: 'GITHUB_GIT_TREE_AND_COMMIT_METADATA'
  },
  boundaries: {
    hardwareObserved: false,
    exploitProven: false,
    kernelRead: false,
    kernelWrite: false,
    kernelExecution: false,
    hen: false,
    automaticPromotion: false
  },
  artifacts: [
    { firmware: '13.00', path: 'patches/1300.bin', blobSha: '093f6be6d4a741f88d0e63396768ee7a9928d544', size: 314, presentInSnapshot: true },
    { firmware: '13.02', path: 'patches/1302.bin', blobSha: 'ae341fcb9006d15706df3c73b163368c66b9e089', size: 712, presentInSnapshot: true, deletedCommit: '50ca911d629a47776cf180a6746caaa203919c50', deletedAt: '2026-09-04T21:26:57Z' },
    { firmware: '13.04', path: 'patches/1304.bin', blobSha: 'ae341fcb9006d15706df3c73b163368c66b9e089', size: 712, presentInSnapshot: true, deletedCommit: '34debda95fe3d2490e37c1acda99412524c6a04b', deletedAt: '2026-09-04T21:27:12Z' },
    { firmware: '13.50', path: 'patches/1350.bin', blobSha: '6b3733654376075927d1910631e3c20ce7b8be89', size: 712, presentInSnapshot: true, deletedCommit: '71d18bea2c06b3dfadf8562af28b2590ed3d4013', deletedAt: '2026-09-04T21:27:43Z' },
    { firmware: '13.52', path: 'patches/1352.bin', blobSha: '0e94f18748fa90c936407f724a375ee7eff77110', size: 712, presentInSnapshot: true, deletedCommit: '019f8ec8d4f11f066673345c2972784c0b3dd944', deletedAt: '2026-09-04T21:27:29Z' }
  ],
  relationships: [
    {
      id: 'NEXT-ARCH-1302-1304-BLOB',
      kind: 'IDENTICAL_GIT_BLOB',
      firmwares: ['13.02', '13.04'],
      blobSha: 'ae341fcb9006d15706df3c73b163368c66b9e089',
      size: 712,
      finding: 'Historical patches/1302.bin and patches/1304.bin referenced the same Git blob and were byte-for-byte identical in the captured public snapshot.',
      doesNotEstablish: ['kernel identity', 'kernel exploit', 'kernel read/write', 'kernel execution', 'jailbreak']
    },
    {
      id: 'NEXT-ARCH-1300-1302-DIFFERENT',
      kind: 'DIFFERENT_GIT_BLOB',
      firmwares: ['13.00', '13.02'],
      finding: 'The 13.00 patch artifact differs from the 13.02/13.04 artifact in Git blob SHA and size.',
      doesNotEstablish: ['reason for format difference', 'exploit compatibility']
    },
    {
      id: 'NEXT-ARCH-BROAD-CLEANUP',
      kind: 'TIMELINE_CONTEXT',
      firmwares: ['13.02', '13.04', '13.50', '13.52'],
      finding: 'The higher-firmware deletions occurred during a broader repository cleanup. Deletion alone is not evidence that a working exploit was hidden.',
      doesNotEstablish: ['developer intent', 'private exploit status']
    }
  ],
  sourceTransitions: [
    {
      path: 'ps4_offsets.js',
      beforeCommit: '499fb0d86311b3af1af86d758810797ef2a94cab',
      beforeBlobSha: 'd130414d37b3e05afd9e28604e98d0a6ed50eaa2',
      beforeSize: 49028,
      cleanupCommit: 'e2e5fb597216a1f6cd0cf0589d1c314aa766913f',
      afterBlobSha: '2bc5563bb36089caaef26a3b74f87e7b9a1a309b',
      afterSize: 17527,
      cleanupAt: '2026-09-04T20:52:48Z',
      additions: 0,
      deletions: 675
    },
    {
      path: 'payload.bin',
      deletedCommit: '6bb767b85b04a3169c6febbe2331771f61b74035',
      deletedAt: '2026-09-04T21:20:26Z',
      oldBlobSha: 'ff498f3b9335b079f899ac0facf6393c83f97f5c',
      oldSize: 242716,
      readdedCommit: '8bf23edbe94c710f7c1f54ef901f44437125b804',
      readdedAt: '2026-09-04T21:24:43Z',
      newBlobSha: '0130e4dffc4438f1cd2f7ac8731b5030c661109a',
      newSize: 499776
    }
  ],
  timeline: [
    { at: '2026-09-04T20:24:37Z', commit: '499fb0d86311b3af1af86d758810797ef2a94cab', event: 'Public snapshot contained the recorded higher-firmware artifacts.' },
    { at: '2026-09-04T20:52:48Z', commit: 'e2e5fb597216a1f6cd0cf0589d1c314aa766913f', event: 'ps4_offsets.js cleanup removed 675 lines with no additions.' },
    { at: '2026-09-04T21:20:26Z', commit: '6bb767b85b04a3169c6febbe2331771f61b74035', event: 'payload.bin deleted.' },
    { at: '2026-09-04T21:24:43Z', commit: '8bf23edbe94c710f7c1f54ef901f44437125b804', event: 'payload.bin re-added with a different Git blob.' },
    { at: '2026-09-04T21:26:57Z', commit: '50ca911d629a47776cf180a6746caaa203919c50', event: 'patches/1302.bin deleted.' },
    { at: '2026-09-04T21:27:12Z', commit: '34debda95fe3d2490e37c1acda99412524c6a04b', event: 'patches/1304.bin deleted.' },
    { at: '2026-09-04T21:27:29Z', commit: '019f8ec8d4f11f066673345c2972784c0b3dd944', event: 'patches/1352.bin deleted.' },
    { at: '2026-09-04T21:27:43Z', commit: '71d18bea2c06b3dfadf8562af28b2590ed3d4013', event: 'patches/1350.bin deleted.' }
  ]
});

export function getSourceArchaeologyReport() {
  return clone(SOURCE_ARCHAEOLOGY_REPORT);
}

export function archaeologyForFirmware(firmware) {
  const fw = String(firmware ?? '').trim();
  return {
    firmware: fw,
    evidenceClass: SOURCE_ARCHAEOLOGY_REPORT.evidenceClass,
    artifacts: SOURCE_ARCHAEOLOGY_REPORT.artifacts.filter(x => x.firmware === fw).map(clone),
    relationships: SOURCE_ARCHAEOLOGY_REPORT.relationships.filter(x => x.firmwares.includes(fw)).map(clone),
    affectsPromotion: false
  };
}
