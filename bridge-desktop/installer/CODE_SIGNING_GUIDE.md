# SimPilot Bridge — Windows Code-Signing Guide

> Goal: ship `SimPilotBridge-Setup-X.Y.Z.exe` so Windows users **never see the
> "Windows protected your PC" SmartScreen warning**, and so your publisher name
> ("SimPilot.AI") appears in the UAC prompt.

There are two tiers of certificate. Pick one before you spend money.

---

## 1. Which certificate should you buy?

| Certificate type | Cost (1 yr) | SmartScreen behavior | Recommended? |
|---|---|---|---|
| **OV (Organization Validated)** | ~$200–400 | Builds reputation slowly. **First few hundred downloads still get flagged.** Once enough users run it without complaint, SmartScreen warming clears. | ❌ Skip |
| **EV (Extended Validation)** | ~$300–700 | **Instant SmartScreen reputation** — zero warnings from day one. Required for kernel drivers. | ✅ **Yes — buy this** |

> ⚠️ Microsoft has been deprecating EV-on-USB-token in favor of cloud HSM EV
> certs. As of 2024, EV certs ship as either:
> - **USB hardware token** (legacy — physical FIPS-140-2 dongle mailed to you)
> - **Cloud HSM** (Azure Key Vault, DigiCert KeyLocker, SSL.com eSigner, etc.)
> The cloud HSM option is **strongly preferred** for CI builds — the USB token
> requires physically plugging it into a Windows machine for every signature.

### Recommended vendors (EV, cloud HSM)

| Vendor | Product | Yearly cost (≈) | Notes |
|---|---|---|---|
| **SSL.com** | EV Code Signing + eSigner | $349 | Cheapest, REST API friendly, fast validation (1–3 days) |
| **DigiCert** | EV Code Signing + KeyLocker | $599 | Industry standard, best support, slowest validation (5–10 days) |
| **Sectigo** | EV Code Signing | $499 | Solid middle option |
| **Certum** | Open Source EV | $129 (3-yr) | Discounted for OSS projects — apply if SimPilot Bridge is MIT/Apache |

> 💡 If SimPilot Bridge stays open-source on GitHub, **apply for Certum's open-source EV cert first** — it's $129 for 3 years and gives the same instant SmartScreen reputation as the $349+ commercial certs.

### What you'll need to validate

EV validation is a real legal/identity check. Expect to provide:
- **Articles of incorporation / DUNS number** for SimPilot.AI (D&B free at dnb.com)
- **Phone number listed in a public business directory** (Google Business profile counts)
- **Notarized identity documents** for the signing officer (driver's license + passport)
- A **callback to your business phone** during business hours

Plan ~1 week from purchase to having a usable cert.

---

## 2. Set up the cert in GitHub Actions (cloud HSM path)

The CI workflow at `.github/workflows/build-installer.yml` already has an
optional signing step. Wire it up like this:

### A. Export your cert as a PFX

If you bought a **USB token** (legacy): you cannot export — see the USB section
below instead.

If you bought a **cloud HSM** product (SSL.com, DigiCert KeyLocker, Azure Key
Vault), the vendor will let you download a PFX file containing the public cert
+ a *credential* that lets `signtool` reach back to the HSM for the actual
signing operation.

### B. Encode the PFX as a GitHub secret

```bash
# On macOS / Linux:
base64 -i SimPilot-EV.pfx | pbcopy

# On Windows (PowerShell):
[Convert]::ToBase64String([IO.File]::ReadAllBytes("SimPilot-EV.pfx")) | Set-Clipboard
```

Then in GitHub:
1. Repo → **Settings → Secrets and variables → Actions → New repository secret**
2. Add **`SIGN_CERT_PFX_BASE64`** = (paste the base64 blob)
3. Add **`SIGN_CERT_PASSWORD`** = (the PFX password your CA gave you)

That's it — the workflow auto-detects the secret and signs every build.

### C. Verify the signature

After CI runs, download the installer and:

```powershell
Get-AuthenticodeSignature .\SimPilotBridge-Setup-1.0.0.exe
```

You want to see:
- `Status        : Valid`
- `SignerCertificate.Subject` containing `O=SimPilot.AI` (or your legal entity)
- `TimeStamperCertificate` — present (proves the signature outlives the cert)

---

## 3. USB token path (only if you went the legacy route)

You **cannot use GitHub-hosted runners** with a USB token. Options:

### Option 1: Self-hosted Windows runner with the token plugged in
1. Set up a Windows machine at home/office
2. Install the GitHub Actions runner (Settings → Actions → Runners → New)
3. Plug in the USB token, install the vendor's middleware (SafeNet Authentication Client, etc.)
4. Tag the runner `self-hosted, windows, signing` and update the workflow's `runs-on:` to match

### Option 2: Sign manually after each release
Download the unsigned `.exe` from the release, then on your Windows machine with the token plugged in:

```powershell
& "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe" `
  sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 `
  /a /n "SimPilot.AI" `
  SimPilotBridge-Setup-1.0.0.exe
```

Then re-upload the signed `.exe` over the existing release asset.

---

## 4. After you have signing set up — what changes?

Before signing:
- **First-run UAC prompt:** "Unknown Publisher" in red ⚠️
- **SmartScreen:** Big blue "Windows protected your PC" wall, user must click "More info → Run anyway"
- **Browser download:** Edge/Chrome flag the file as "uncommonly downloaded"

After signing with EV:
- **First-run UAC prompt:** "Verified Publisher: SimPilot.AI" in blue ✅
- **SmartScreen:** Silent, no warning at all
- **Browser download:** No warning

This is **the single biggest UX improvement** you can make for a Windows
desktop app. It's also a one-time setup — once the secret is in GitHub, every
future release is signed automatically.

---

## 5. Cost summary for SimPilot Bridge

| Item | Cost | Recurring |
|---|---|---|
| Certum Open Source EV (recommended if OSS) | $129 | every 3 years |
| OR SSL.com EV + eSigner | $349 | yearly |
| DUNS number | $0 | one-time, free from D&B |
| GitHub Actions minutes (windows-latest) | $0–10 | per release |
| **Total year 1 (Certum path)** | **~$129** | — |
| **Total year 1 (SSL.com path)** | **~$349** | — |

---

## 6. Reference links

- [Microsoft SmartScreen reputation policy](https://learn.microsoft.com/en-us/windows/security/threat-protection/microsoft-defender-smartscreen/microsoft-defender-smartscreen-overview)
- [SSL.com EV Code Signing](https://www.ssl.com/certificates/ev-code-signing/)
- [DigiCert KeyLocker](https://www.digicert.com/signing/code-signing-certificates)
- [Certum Open Source Code Signing](https://shop.certum.eu/data-safety/code-signing-certificates/certum-open-source-code-signing.html)
- [signtool.exe documentation](https://learn.microsoft.com/en-us/windows/win32/seccrypto/signtool)
