terraform {
  required_version = ">= 1.5.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.28"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# 1. D1-Datenbank
resource "cloudflare_d1_database" "monster_db" {
  account_id = var.cloudflare_account_id
  name       = var.d1_database_name
}

# 2. Worker mit D1-Binding "DB"
resource "cloudflare_workers_script" "monster_api" {
  account_id         = var.cloudflare_account_id
  script_name        = var.worker_name
  content            = file("${path.module}/../worker.js")
  main_module        = "worker.js"
  compatibility_date = "2024-10-01"

  bindings = [{
    type = "d1"
    name = "DB"
    id   = cloudflare_d1_database.monster_db.id
  }]
}

# 3. Worker unter *.workers.dev erreichbar machen
resource "cloudflare_workers_script_subdomain" "monster_api" {
  account_id  = var.cloudflare_account_id
  script_name = cloudflare_workers_script.monster_api.script_name
  enabled     = true
}

# 4. Tabellen + 31 Monster einspielen (schema.sql ist idempotent)
resource "null_resource" "seed_d1_schema" {
  depends_on = [cloudflare_d1_database.monster_db]

  triggers = {
    database_id = cloudflare_d1_database.monster_db.id
    schema_hash = filesha256("${path.module}/../schema.sql")
  }

  provisioner "local-exec" {
    working_dir = "${path.module}/.."
    environment = {
      CLOUDFLARE_API_TOKEN  = var.cloudflare_api_token
      CLOUDFLARE_ACCOUNT_ID = var.cloudflare_account_id
    }
    command = "npx --yes wrangler d1 execute ${var.d1_database_name} --remote --file=schema.sql"
  }
}
