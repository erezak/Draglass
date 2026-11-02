# Knowledge ontology

This is the vocabulary used by Draglass entity templates and ontology tools. It describes knowledge, people and actionable work without depending on a particular organization. Examples use the fictional Lumen field station. Source notes supply provenance; they do not make unsupported claims true.

## Common properties

Notes may omit entity metadata. Classified notes use `type` and `subtype`; `kind` is not a classification alias. Suggested subtypes and relationship rules guide creation without restricting custom knowledge.

| Property | Meaning |
|---|---|
| id | Stable entity identifier; new templates generate a UUID |
| fqn | Stable initial type/subtype/name identifier, retained on moves |
| name | Human-readable display name |
| type / subtype | Entity class and suggested specialization |
| tags | Freeform classifications |
| created_at / updated_at | Creation and last edit timestamps |
| sources / source_urls | Recorded provenance anchors and original URLs |
| confidence | Optional assessment; drafts leave this unset |
| realization_status | Entity lifecycle; new templates start DRAFT |
| relationships | Named targets with optional source collections |

Confidence, status and freshness are separate concepts. A provider name does not establish accuracy. No source-specific confidence weights, automatic ingestion gates or expiry rules are implied.

## Entity classes and templates

There are eleven knowledge classes and the actionable Task extension. The following fields and sections match the shipped template definitions.

### Task

An actionable commitment with status, planning dates and optional knowledge relationships.

Suggested subtypes: `ACTION`, `MILESTONE`.

Template fields beyond common properties: `status`, `priority`, `due`, `scheduled`, `start`.

Body sections: Details; Progress.

### System

A business system, application or service.

Suggested subtypes: `APPLICATION`, `SERVICE`, `PLATFORM`, `EXTERNAL`, `PRODUCT`.

Template fields beyond common properties: `description`, `tech_stack`, `business_domain`.

Body sections: Purpose; Architecture; Dependencies; Notes.

### Component

An internal structural element of a system.

Suggested subtypes: `DATABASE`, `QUEUE`, `MODULE`, `LAYER`, `CONTAINER`, `FUNCTION`, `CACHE`, `GATEWAY`.

Template fields beyond common properties: `description`, `tech_stack`, `data_ownership`.

Body sections: Responsibilities; Interfaces and data; Notes.

### Source

A provenance anchor or information source, including code, documents and communication.

Suggested subtypes: `GITHUB`, `SHAREPOINT`, `CONFLUENCE`, `GITLAB`, `AZURE_DEVOPS`, `APPLICATION_CATALOG`, `GIT`, `DOCUMENT`, `WEB_PAGE`, `EMAIL`, `CHAT`, `MEETING`, `DATASET`, `M365_REPORT`.

Template fields beyond common properties: `url`, `format`.

Body sections: Original evidence; Provenance and coverage; Extracted knowledge.

### Concept

A unit of technical, business or organizational knowledge.

Suggested subtypes: `API`, `BUSINESS_TERM`, `TECHNOLOGY`, `PATTERN`, `SERVICE_NAME`, `DIAGRAM`, `INTERFACE`, `REQUIREMENT`, `CONVENTION`, `CONSTRAINT`, `PROCESS_RULE`, `MARKET_INSIGHT`, `BUSINESS_INTELLIGENCE`, `STRATEGIC_INTENT`, `COMPETITIVE_ANALYSIS`.

Template fields beyond common properties: `description`.

Body sections: Knowledge; Context; Evidence.

### Identity

An actor or organizational identity, including people, teams, divisions and companies.

Suggested subtypes: `PERSON`, `TEAM`, `DIVISION`, `COMPANY`, `SERVICE_ACCOUNT`, `MECH_ID`.

Template fields beyond common properties: `email`.

Body sections: Context; Responsibilities; Notes.

### Behavior

A behavioral specification or scenario, including Given/When/Then conditions.

Suggested subtypes: `SCENARIO`, `ACCEPTANCE_CRITERION`, `BUSINESS_RULE`.

Template fields beyond common properties: `feature`, `scenario`, `given`, `when`, `then`, `status`.

Body sections: Given; When; Then; Acceptance evidence.

### DecisionRecord

A recorded decision with context, alternatives, outcome and consequences.

Suggested subtypes: `ARCHITECTURAL`, `TECHNICAL`, `PRODUCT`, `ORGANIZATIONAL`.

Template fields beyond common properties: `status`, `context`, `options_considered`, `outcome`, `consequences`.

Body sections: Context; Options considered; Decision; Consequences.

### Playbook

A repeatable process, skill, runbook or procedure.

Suggested subtypes: `ARCHETYPE`, `SKILL`, `RUNBOOK`, `SOP`, `PIPELINE`.

Template fields beyond common properties: `description`, `version`, `status`, `domain`, `steps`.

Body sections: Purpose; Steps; Validation.

### Policy

A governance rule or requirement, including security, compliance and regulation.

Suggested subtypes: `SECURITY`, `COMPLIANCE`, `DATA_GOVERNANCE`, `OPERATIONAL`, `REGULATION`.

Template fields beyond common properties: `description`, `enforcement_level`, `effective_date`, `review_date`, `scope`, `compliance_framework`, `governing_body`.

Body sections: Requirement; Scope; Enforcement; Review.

### Objective

A goal or desired outcome with success measures.

Suggested subtypes: `STRATEGIC`, `TACTICAL`, `OPERATIONAL`.

Template fields beyond common properties: `description`, `target_metric`, `target_value`, `deadline`.

Body sections: Outcome; Success measures; Progress.

### Capability

A business or technical ability delivered by systems.

Suggested subtypes: `STRATEGIC`, `TACTICAL`, `OPERATIONAL`, `BUSINESS`, `TECHNICAL`.

Template fields beyond common properties: `description`, `maturity`, `domain`.

Body sections: Scope; Delivery; Maturity and gaps.

## Relationships and inverses

Each relationship has a `relation` and a `target`. Its optional `sources` collection may include a local source note or original URL, a locator, quotation and observed timestamp. Quotes must match recorded evidence. Missing targets remain visible hollow nodes; plain wikilinks stay unnamed connections.

| Relationship | Inverse |
|---|---|
| mentions | mentioned_by |
| waiting_on | awaited_by |
| discuss_with | discussion_for |
| resolves | resolved_by |
| employed_by | employs |
| member_of | has_member |
| reports_to | manages |
| part_of | has_part |
| leads | led_by |
| owned_by | owns |
| composed_of | component_of |
| implemented_by | implements_system |
| depends_on | dependency_of |
| calls | called_by |
| associated_with | associated_with |
| sourced_from | source_for |
| implements | implemented_in |
| supersedes | superseded_by |
| informed_by | informs |
| uses | used_by |
| enforces | enforced_by |
| governed_by | governs |
| supports | supported_by |
| parent_of | child_of |
| delivered_by | delivers |

### Suggested endpoint patterns

These are suggestions rather than restrictions. Identity membership, employment, management and organizational containment are distinct relationships.

| Relation | From | To |
|---|---|---|
| mentions | Task | Identity (PERSON) |
| waiting_on | Task | Identity (PERSON) |
| discuss_with | Task | Identity (PERSON) |
| resolves | Task | DecisionRecord |
| employed_by | Identity (PERSON) | Identity (COMPANY) |
| member_of | Identity (PERSON) | Identity (TEAM) |
| reports_to | Identity (PERSON) | Identity (PERSON) |
| part_of | Identity (TEAM, DIVISION, COMPANY) | Identity (TEAM, DIVISION, COMPANY) |
| leads | Identity (PERSON) | Identity (TEAM, DIVISION, COMPANY) |
| owned_by | * | Identity (PERSON, TEAM) |
| composed_of | System / Component | Component |
| implemented_by | System | Source (GITHUB, GIT, GITLAB, AZURE_DEVOPS) |
| depends_on | System / Component / Task | System / Component / Task |
| calls | System | System |
| associated_with | Concept | System / Component |
| sourced_from | * | Source |
| implements | Behavior | Concept (REQUIREMENT, CONVENTION) |
| supersedes | DecisionRecord / Playbook / Policy | DecisionRecord / Playbook / Policy |
| informed_by | DecisionRecord | Concept |
| uses | Playbook | Concept |
| enforces | Playbook | Policy |
| governed_by | System / Component / Concept | Policy |
| supports | * | Objective |
| parent_of | Objective / Capability | Objective / Capability |
| delivered_by | Capability | System |

## Fictional relationship example

```yaml
type: Identity
subtype: PERSON
name: Mara Chen
relationships:
  - relation: member_of
    target: "[[Teams/Platform team]]"
    sources:
      - ref: "[[Sources/Design review]]"
        quote: "Mara Chen member of Platform team."
```

The bundled demo contains the corresponding fictional source and connected notes. Membership and leadership are separate predicates. Relationships do not inherit evidence merely because another edge shares a target.

## Source examples

Platform and material format are distinct: a Source may be GITHUB, SHAREPOINT or another supported subtype, with an optional `format` such as git, PDF or transcript. The neutral APPLICATION_CATALOG subtype represents an application inventory. Example URLs are illustrative, never operational endpoints.

```yaml
type: Source
subtype: GITHUB
name: Beacon repository
url: https://example.invalid/lumen/beacon
format: git
relationships: []
```

## Task extension

Checkbox tasks and Task notes share actionable status and planning dates. Task notes use ACTION or MILESTONE subtypes. Task-to-person context uses `waiting_on` for an evidenced dependency, `discuss_with` for an evidenced discussion action, and `mentions` for a neutral association. `depends_on` connects tasks and `resolves` can connect a task to an incomplete DecisionRecord. A context-note link records context rather than evidence.

See [ontology usage](ONTOLOGY.md), [entity templates](ENTITY_TEMPLATES.md) and the shipped definitions in `core/plugins/ontology.cjs` and `core/plugins/entity-templates.cjs` for application behavior.
