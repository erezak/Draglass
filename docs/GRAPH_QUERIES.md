# Graph queries

Filters, exclusions, color groups and vault search share one query language.

| Query | Meaning |
| --- | --- |
| `type:Task` | YAML type contains Task |
| `subtype:PERSON` | YAML subtype contains PERSON |
| `[status:active]` | Any named YAML field contains a value |
| `{type:Task}` | Equivalent brace form |
| `[type:=Task]` | Exact, case-insensitive value |
| `[field]`, `-[field]` | Property exists, or is absent |
| `[active:false]`, `[empty:null]` | Typed YAML boolean or explicit null |
| `[score:>=3]` | Numeric comparison |
| `[due:<2026-11-01]` | ISO date comparison |
| `[profile.team:Platform]` | Nested property |
| `[records.0.name:Ada]` | Explicit array index |
| `[records.*.name:Ada]` | Any array/object entry |
| `["service.name":Beacon]` | Literal field name containing a dot |
| `relation:member_of` | Shorthand for relationships.relation |
| `[relationships.target:"[[Platform team]]"]` | Declared relationship target |
| `[relationships.sources.ref:"Design review"]` | Relationship source field |

Property names match exactly, ignoring case. Text values use case-insensitive substring matching unless prefixed with `=`; quoted phrases, regex and Boolean value expressions also work. Scalar lists and nested structures are searched through their values. Empty lists count as present. Explicit null differs from a missing property. Ordered comparisons accept numbers and ISO dates/timestamps; invalid comparisons report an error. Timestamps without a timezone use UTC for query comparisons.

Array paths implicitly inspect entries, so `[relationships.relation:member_of]` needs no wildcard. Separate predicates are independent and can match different entries. Relationship selectors inspect declared YAML on each note; they do not imply inverse edges or graph traversal.

Existing path/file/tag/content, task scopes, negation, OR and parentheses remain available. For example: `type:Task path:Tasks -[status:done]`. First matching color group wins. In local graphs the current center note remains visible even when it does not match the filter.
