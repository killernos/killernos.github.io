import test from "node:test";
import assert from "node:assert/strict";
import {
  createKernelCandidateProbe,
  detectPS4Firmware,
  DEVICE_NODE_ALLOWLIST,
  READ_ONLY_SIGNAL_ALLOWLIST
} from "../runtime/next-1302/kernel-candidate-adapter.js";

test("detects exact PS4 13.02 without accepting other firmware", function () {
  assert.deepEqual(detectPS4Firmware("Mozilla/5.0 (PlayStation 4/13.02)"), {
    firmware: "13.02",
    hardwareDetected: true,
    exact1302: true
  });
  assert.equal(detectPS4Firmware("Mozilla/5.0 (PlayStation 4/12.00)").exact1302, false);
  assert.equal(detectPS4Firmware("Mozilla/5.0").hardwareDetected, false);
});

test("blocks collection until explicit consent", function () {
  const probe = createKernelCandidateProbe({
    buildId: "test",
    firmwareState: { firmware: "13.02", hardwareDetected: true, exact1302: true },
    environment: { window: {} },
    clock: function () { return 0; }
  });
  const report = probe.run({ consent: false });
  assert.equal(report.result, "BLOCKED_NO_CONSENT");
  assert.equal(report.signals.length, 0);
});

test("blocks non-13.02 hardware even with consent", function () {
  const probe = createKernelCandidateProbe({
    buildId: "test",
    firmwareState: { firmware: "12.00", hardwareDetected: true, exact1302: false },
    environment: { window: {} },
    clock: function () { return 0; }
  });
  assert.equal(probe.run({ consent: true }).result, "BLOCKED_WRONG_FIRMWARE");
});

test("collects only the fixed browser signal allowlist", function () {
  const fakeWindow = {
    isSecureContext: true,
    crossOriginIsolated: false,
    SharedArrayBuffer: function SharedArrayBuffer() {},
    Atomics: {},
    BigInt: function BigInt() {},
    WebAssembly: {},
    Worker: function Worker() {},
    performance: { now: function () { return 1; } }
  };
  const probe = createKernelCandidateProbe({
    buildId: "test",
    firmwareState: { firmware: "13.02", hardwareDetected: true, exact1302: true },
    environment: { window: fakeWindow, performance: fakeWindow.performance },
    clock: function () { return 0; }
  });
  const report = probe.run({ consent: true });
  assert.equal(report.result, "READ_ONLY_SIGNALS_COLLECTED");
  assert.deepEqual(report.signals.map(function (item) { return item.id; }), READ_ONLY_SIGNAL_ALLOWLIST);
  assert.deepEqual(DEVICE_NODE_ALLOWLIST, []);
  assert.equal(report.deviceNodePolicy.filesystemEnumeration, false);
  assert.equal(report.deviceNodePolicy.deviceNodeProbingAttempted, false);
  assert.equal(report.prohibitedActions.kernelTrigger, true);
  assert.equal(report.prohibitedActions.kernelRead, true);
  assert.equal(report.prohibitedActions.kernelWrite, true);
  assert.equal(report.prohibitedActions.payloadLaunch, true);
});

test("keeps the event log bounded to 500 records", function () {
  let tick = 0;
  const probe = createKernelCandidateProbe({
    buildId: "test",
    firmwareState: { firmware: "13.02", hardwareDetected: true, exact1302: true },
    environment: { window: {} },
    clock: function () { tick += 1; return tick; }
  });
  for (let index = 0; index < 70; index += 1) probe.run({ consent: true });
  assert.equal(probe.getEvents().length, 500);
});

