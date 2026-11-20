output "telemetry_bucket" {
  description = "The bucket the laptop syncs Claude Code telemetry and sessions to."
  value       = google_storage_bucket.telemetry.url
}
