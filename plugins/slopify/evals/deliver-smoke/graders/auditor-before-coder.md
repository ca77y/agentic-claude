---
type: tool_order
before: { tool: Agent, input_match: '"subagent_type"\s*:\s*"slopify:auditor"' }
after: { tool: Agent, input_match: '"subagent_type"\s*:\s*"slopify:coder"' }
---
