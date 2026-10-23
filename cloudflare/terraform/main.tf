terraform {
  required_version = ">= 1.5.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.40"
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

# 1. Kostenlose Cloudflare D1 SQL-Datenbank erstellen
resource "cloudflare_d1_database" "monster_db" {
  account_id = var.cloudflare_account_id
  name       = var.d1_database_name
}

# 2. Cloudflare Worker Script inkl. D1 Datenbank-Binding ("DB") deployen
resource "cloudflare_workers_script" "monster_api" {
  account_id         = var.cloudflare_account_id
  name               = var.worker_name
  content            = file("${path.module}/../worker.js")
  module             = true
  compatibility_date = "2024-10-01"

  d1_database_binding {
    name        = "DB"
    database_id = cloudflare_d1_database.monster_db.id
  }
}

# 3. Öffentliche *.workers.dev Subdomain für den Worker aktivieren
resource "cloudflare_workers_domain" "note" {
  count = 0
}

# 4. SQL-Schema (Tabellen + 31 Monster) nach dem Erstellen der D1-Datenbank einspielen
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
