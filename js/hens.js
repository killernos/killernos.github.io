"use strict";

(function () {
  window.NEXTHENRegistry = [
    {
      id: "none",
      family: "none",
      displayName: "No HEN",
      version: null,
      payloadPath: null,
      loader: "skip",
      supportedFirmware: [],
      evidence: "SOURCE-CONFIRMED",
      enabled: true,
      notes: "Skip HEN loading entirely."
    },
    {
      id: "goldhen-2.4b18.5",
      family: "goldhen",
      displayName: "GoldHEN v2.4b18.5",
      version: "2.4b18.5",
      payloadPath: "payloads/goldhen/goldhen-2.4b18.5.bin",
      loader: "payload-bin",
      supportedFirmware: ["12.00", "12.02"],
      evidence: "SOURCE-CONFIRMED",
      enabled: true,
      notes: "Registered only because the payload binary exists locally."
    },
    {
      id: "goldhen-2.4b18.6",
      family: "goldhen",
      displayName: "GoldHEN v2.4b18.6",
      version: "2.4b18.6",
      payloadPath: "payloads/goldhen/goldhen-2.4b18.6.bin",
      loader: "payload-bin",
      supportedFirmware: ["12.00", "12.02"],
      evidence: "SOURCE-CONFIRMED",
      enabled: true,
      notes: "Registered only because the payload binary exists locally."
    },
    {
      id: "goldhen-2.4b18.7",
      family: "goldhen",
      displayName: "GoldHEN v2.4b18.7",
      version: "2.4b18.7",
      payloadPath: "payloads/goldhen/goldhen-2.4b18.7.bin",
      loader: "payload-bin",
      supportedFirmware: ["12.00", "12.02", "12.50", "12.52"],
      evidence: "SOURCE-CONFIRMED",
      enabled: true,
      notes: "Registered only because the payload binary exists locally."
    },
    {
      id: "goldhen-2.4b18.8",
      family: "goldhen",
      displayName: "GoldHEN v2.4b18.8",
      version: "2.4b18.8",
      payloadPath: "payloads/goldhen/goldhen-2.4b18.8.bin",
      loader: "payload-bin",
      supportedFirmware: ["12.00", "12.02", "12.50", "12.52"],
      evidence: "SOURCE-CONFIRMED",
      enabled: true,
      notes: "Registered only because the payload binary exists locally."
    },
    {
      id: "goldhen-2.4b18.9",
      family: "goldhen",
      displayName: "GoldHEN v2.4b18.9",
      version: "2.4b18.9",
      payloadPath: "payloads/goldhen/goldhen-2.4b18.9.bin",
      loader: "payload-bin",
      supportedFirmware: ["12.00", "12.02", "12.50", "12.52", "13.00"],
      evidence: "SOURCE-CONFIRMED",
      enabled: true,
      notes: "Registered only because the payload binary exists locally."
    },
    {
      id: "goldhen-2.4b18.10",
      family: "goldhen",
      displayName: "GoldHEN v2.4b18.10",
      version: "2.4b18.10",
      payloadPath: "payloads/goldhen/goldhen-2.4b18.10.bin",
      loader: "payload-bin",
      supportedFirmware: ["12.00", "12.02", "12.50", "12.52", "13.00"],
      evidence: "SOURCE-CONFIRMED",
      enabled: true,
      defaultSelection: false,
      notes: "Registered only because the payload binary exists locally."
    },
    {
      id: "goldhen-2.4b18.11",
      family: "goldhen",
      displayName: "GoldHEN v2.4b18.11",
      version: "2.4b18.11",
      payloadPath: "payloads/goldhen/goldhen-2.4b18.11.bin",
      loader: "payload-bin",
      supportedFirmware: ["13.02", "13.04", "13.50", "13.52"],
      evidence: "HARDWARE-REPORTED",
      enabled: true,
      defaultSelection: false,
      notes: "Experimental 13.x payload. Availability does not imply equal stability on every console."
    },
    {
      id: "goldhen-2.4b18.12",
      family: "goldhen",
      displayName: "GoldHEN v2.4b18.12",
      version: "2.4b18.12",
      payloadPath: "payloads/goldhen/goldhen-2.4b18.12.bin",
      loader: "payload-bin",
      supportedFirmware: ["13.02", "13.04", "13.50", "13.52"],
      evidence: "SOURCE-CONFIRMED",
      enabled: true,
      defaultSelection: true,
      notes: "Latest registered 13.x payload binary available locally."
    }
  ];
})();