variable "project_id" {
  description = "The GCP project that holds the Claude Code telemetry."
  type        = string
  default     = "agentic-claude-004680"
}

variable "billing_account" {
  description = "The billing account linked to the project."
  type        = string
  default     = "01EA94-3472F5-3FEAE9"
}

variable "region" {
  description = "Where the data lives."
  type        = string
  default     = "europe-central2"
}
