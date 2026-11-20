# The project itself was created with gcloud; Terraform links its billing and owns what is inside it.
resource "google_billing_project_info" "this" {
  project         = var.project_id
  billing_account = var.billing_account
}

resource "google_project_service" "storage" {
  project            = var.project_id
  service            = "storage.googleapis.com"
  disable_on_destroy = false

  depends_on = [google_billing_project_info.this]
}

# Claude Code telemetry and session files, synced from the laptop.
resource "google_storage_bucket" "telemetry" {
  name                        = "${var.project_id}-telemetry"
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  depends_on = [google_project_service.storage]
}
