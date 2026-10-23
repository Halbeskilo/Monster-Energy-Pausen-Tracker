output "d1_database_id" {
  description = "UUID der erstellten Cloudflare D1 Datenbank"
  value       = cloudflare_d1_database.monster_db.id
}

output "worker_name" {
  description = "Name des deployten Cloudflare Workers"
  value       = cloudflare_workers_script.monster_api.script_name
}

output "worker_api_url" {
  description = "Deine fertige API-URL für data/monsters.json (apiUrl)"
  value       = "https://${cloudflare_workers_script.monster_api.script_name}.${var.workers_dev_subdomain}.workers.dev"
}

output "deploy_token" {
  description = "Token für das GitHub-Secret CLOUDFLARE_API_TOKEN (nur mit create_deploy_token = true)"
  value       = try(cloudflare_account_token.deploy[0].value, null)
  sensitive   = true
}
