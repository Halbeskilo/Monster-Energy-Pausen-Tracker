variable "cloudflare_api_token" {
  description = "Cloudflare API Token (mit Berechtigungen: Account -> D1:Edit und Workers Scripts:Edit)"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Deine Cloudflare Account-ID (steht rechts in der Übersicht auf dash.cloudflare.com unter 'Workers & Pages')"
  type        = string
}

variable "d1_database_name" {
  description = "Name der Cloudflare D1 Datenbank"
  type        = string
  default     = "monster-db"
}

variable "worker_name" {
  description = "Name des Cloudflare Workers"
  type        = string
  default     = "monster-pausen-api"
}

variable "workers_dev_subdomain" {
  description = "Deine Cloudflare Workers Subdomain (z.B. 'halbeskilo' für https://monster-pausen-api.halbeskilo.workers.dev)"
  type        = string
  default     = "DEIN-SUBDOMAIN-NAME"
}

variable "create_deploy_token" {
  description = "Legt zusätzlich einen API-Token für GitHub Actions an (benötigt 'Account API Tokens Write')"
  type        = bool
  default     = false
}
