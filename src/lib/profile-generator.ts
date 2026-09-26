export interface CertificateConfig {
  name: string;
  data: string; // Base64-encoded certificate data (PEM content without headers)
}

// Domains that should bypass encrypted DNS and use the network's default
// resolver. These defaults cover Apple captive-portal detection and carrier
// voicemail (VVM), which can break if forced through encrypted DNS.
export const DEFAULT_EXCLUDED_DOMAINS = [
  "captive.apple.com",
  "dav.orange.fr",
  "vvm.mobistar.be",
  "vvm.mstore.msg.t-mobile.com",
  "tma.vvm.mone.pan-net.eu",
  "vvm.ee.co.uk",
];

export interface ProfileConfig {
  profileName: string;
  organizationName: string;
  profileIdentifier: string;
  dnsProtocol: "HTTPS" | "TLS";
  serverUrl: string;
  serverIps: string[];
  excludedSsids: string[];
  excludedDomains: string[];
  encryptedOnly: boolean;
  payloadScope: "System" | "User";
  certificates: CertificateConfig[];
}

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16).toUpperCase();
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function extractBase64FromPem(pem: string): string {
  // Remove PEM headers/footers and whitespace
  return pem
    .replace(/-----BEGIN CERTIFICATE-----/g, "")
    .replace(/-----END CERTIFICATE-----/g, "")
    .replace(/\s/g, "");
}

export function generateMobileConfig(config: ProfileConfig): string {
  const profileUUID = generateUUID();
  const payloadUUID = generateUUID();

  const serverAddressesXml =
    config.serverIps.length > 0
      ? `
      <key>ServerAddresses</key>
      <array>
        ${config.serverIps
          .map((ip) => `<string>${escapeXml(ip.trim())}</string>`)
          .join("\n        ")}
      </array>`
      : "";

  const dnsSettingsPayload =
    config.dnsProtocol === "HTTPS"
      ? `
      <key>DNSProtocol</key>
      <string>HTTPS</string>
      <key>ServerURL</key>
      <string>${escapeXml(config.serverUrl)}</string>${serverAddressesXml}`
      : `
      <key>DNSProtocol</key>
      <string>TLS</string>
      <key>ServerName</key>
      <string>${escapeXml(config.serverUrl)}</string>${serverAddressesXml}`;

  // Exclude specific Wi-Fi networks: on a matching SSID, encrypted DNS is not
  // applied and the device falls back to the network's default resolver. This
  // rule must come first because OnDemandRules are first-match-wins and the
  // EvaluateConnection rule below has no match criteria (it matches everything).
  const ssidExclusionRule =
    config.excludedSsids.length > 0
      ? `
          <dict>
            <key>Action</key>
            <string>Disconnect</string>
            <key>InterfaceTypeMatch</key>
            <string>WiFi</string>
            <key>SSIDMatch</key>
            <array>
              ${config.excludedSsids
                .map((ssid) => `<string>${escapeXml(ssid.trim())}</string>`)
                .join("\n              ")}
            </array>
          </dict>`
      : "";

  // Resolve the listed domains with the network's default DNS instead of the
  // encrypted server (NeverConnect). Omitted entirely when the list is empty,
  // since an EvaluateConnection rule with no domains would be meaningless.
  const excludedDomainsRule =
    config.excludedDomains.length > 0
      ? `
          <dict>
            <key>Action</key>
            <string>EvaluateConnection</string>
            <key>ActionParameters</key>
            <array>
              <dict>
                <key>DomainAction</key>
                <string>NeverConnect</string>
                <key>Domains</key>
                <array>
                  ${config.excludedDomains
                    .map((domain) => `<string>${escapeXml(domain.trim())}</string>`)
                    .join("\n                  ")}
                </array>
              </dict>
            </array>
          </dict>`
      : "";

  // Generate certificate payloads
  const certificatePayloads = config.certificates
    .map((cert, index) => {
      const certUUID = generateUUID();
      const certData = extractBase64FromPem(cert.data);
      return `
      <dict>
        <key>PayloadCertificateFileName</key>
        <string>${escapeXml(cert.name)}.cer</string>
        <key>PayloadContent</key>
        <data>${certData}</data>
        <key>PayloadDisplayName</key>
        <string>${escapeXml(cert.name)}</string>
        <key>PayloadIdentifier</key>
        <string>${escapeXml(config.profileIdentifier)}.cert.${index}</string>
        <key>PayloadType</key>
        <string>com.apple.security.pem</string>
        <key>PayloadUUID</key>
        <string>${certUUID}</string>
        <key>PayloadVersion</key>
        <integer>1</integer>
      </dict>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>PayloadDisplayName</key>
    <string>${escapeXml(config.profileName)}</string>
    <key>PayloadDescription</key>
    <string>Configures encrypted DNS (${
      config.dnsProtocol === "HTTPS" ? "DNS over HTTPS" : "DNS over TLS"
    }) for secure DNS resolution.</string>
    <key>PayloadIdentifier</key>
    <string>${escapeXml(config.profileIdentifier)}</string>${
    config.organizationName
      ? `
    <key>PayloadOrganization</key>
    <string>${escapeXml(config.organizationName)}</string>`
      : ""
  }
    <key>PayloadContent</key>
    <array>
      <dict>
        <key>DNSSettings</key>
        <dict>${dnsSettingsPayload}
        </dict>
        <key>OnDemandRules</key>
        <array>${ssidExclusionRule}${excludedDomainsRule}
          <dict>
            <key>Action</key>
            <string>Connect</string>
          </dict>
        </array>
        <key>PayloadDisplayName</key>
        <string>${escapeXml(config.profileName)}</string>
        <key>PayloadIdentifier</key>
        <string>${escapeXml(config.profileIdentifier)}.dns</string>${
    config.organizationName
      ? `
          <key>PayloadOrganization</key>
          <string>${escapeXml(config.organizationName)}</string>`
      : ""
  }      
        <key>PayloadType</key>
        <string>com.apple.dnsSettings.managed</string>
        <key>PayloadUUID</key>
        <string>${payloadUUID}</string>
        <key>PayloadVersion</key>
        <integer>1</integer>
        <key>ProhibitDisablement</key>
        <${config.encryptedOnly}/>
      </dict>${certificatePayloads}
    </array>
    <key>PayloadRemovalDisallowed</key>
    <false/>
    <key>PayloadScope</key>
    <string>${config.payloadScope}</string>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>${profileUUID}</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
  </dict>
</plist>`;

  return xml;
}

export function downloadProfile(xml: string, filename: string): void {
  const blob = new Blob([xml], { type: "application/x-apple-aspen-config" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".mobileconfig")
    ? filename
    : `${filename}.mobileconfig`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
