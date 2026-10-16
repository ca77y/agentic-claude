---
type: tool_order
before: { tool: Agent, input_match: '"subagent_type"\s*:\s*"slopify:coder"' }
after: { tool: Agent, input_match: '"subagent_type"\s*:\s*"slopify:qa"' }
---
