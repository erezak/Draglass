---
id: lumen-038
fqn: demo.lumen.playbook.calibrate-a-sensor
type: Playbook
subtype: RUNBOOK
description: Check a sensor against a known reference before field use.
tags:
- lumen/playbook
relationships:
- relation: uses
  target: '[[Concepts/Validated observation]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Calibrate a sensor uses Validated observation.
- relation: enforces
  target: '[[Policies/Observation retention]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Calibrate a sensor enforces Observation retention.
- relation: owned_by
  target: '[[People/Imani Okafor]]'
  sources:
  - ref: '[[Sources/Design review]]'
    locator: Recorded assertions
    quote: Calibrate a sensor owned by Imani Okafor.
- relation: sourced_from
  target: '[[Sources/Design review]]'
steps: Compare the reference, record the source, review the readings.
---

# Calibrate a sensor

Check a sensor against a known reference before field use.

All names, organizations and evidence in this scenario are fictional.

## Explore

Follow [[Playbooks/Release Beacon]] or return to [[Welcome]]. Open the local graph to compare wiki links with named property relationships.

## Checklist

- [ ] Compare with the reference sample
- [ ] Record the original source identifier
- [x] Identify the instrument owner
