output "d1_database_id" {
  description = "UUID der erstellten Cloudflare D1 Datenbank"
  value       = cloudflare_d1_database.monster_db.id
}

output "worker_name" {
  description = "Name des deployten Cloudflare Workers"
  value       = cloudflare_workers_script.monster_api.name
}

output "worker_api_url" {
  description = "Deine fertige API-URL für data/monsters.json (apiUrl)"
  value       = "https://${cloudflare_workers_script.monster_api.name}.${var.workers_dev_subdomain}.workers.dev"
}
