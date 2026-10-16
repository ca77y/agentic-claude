---
type: tool_order
before: { tool: Agent, input_match: '"subagent_type"\s*:\s*"slopify:writer"' }
after: { tool: Agent, input_match: '"subagent_type"\s*:\s*"slopify:auditor"' }
---
