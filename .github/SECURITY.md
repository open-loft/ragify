# Security Policy

## Supported Versions

Security fixes are applied to the latest released version on `main`. If you are self-hosting, stay current with the latest tagged release and dependency updates.

## Reporting a Vulnerability

Please do not open public issues for suspected vulnerabilities.

Instead, use GitHub's private security advisory flow:

- https://github.com/open-loft/ragify/security/advisories/new

If private advisories are unavailable for your environment, contact the maintainer through the repository profile and include:

- a clear description of the issue;
- affected endpoints or components;
- reproduction steps or proof of concept;
- estimated severity and impact;
- any suggested mitigation.

## Disclosure Expectations

- We aim to acknowledge reports within 5 business days.
- We aim to provide a remediation or mitigation plan after triage.
- Please avoid sharing exploit details publicly until a fix or mitigation is available.

## Self-Hosting Security Checklist

- Put the API behind HTTPS and a reverse proxy.
- Restrict CORS to trusted frontend origins.
- Keep MongoDB, Redis, and Qdrant private to the deployment network.
- Rotate OpenAI keys and other secrets regularly.
- Back up MongoDB, Qdrant, and uploaded files together.
- Consider adding authentication before exposing the API to untrusted users.
