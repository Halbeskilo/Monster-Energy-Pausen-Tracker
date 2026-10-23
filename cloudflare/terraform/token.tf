# Optional: Deploy-Token für GitHub Actions per Terraform anlegen.
# Voraussetzung: cloudflare_api_token hat zusätzlich das Recht "Account API Tokens Write".
# Aktivieren mit create_deploy_token = true, danach Wert auslesen:
#   terraform output -raw deploy_token
resource "cloudflare_account_token" "deploy" {
  count = var.create_deploy_token ? 1 : 0

  account_id = var.cloudflare_account_id
  name       = "terraform"

  policies = [{
    effect = "allow"
    permission_groups = [
      { id = "09b2857d1c31407795e75e3fed8617a1" },
      { id = "e086da7e2179491d91ee5f35b3ca210a" },
    ]
    resources = jsonencode({
      "com.cloudflare.api.account.${var.cloudflare_account_id}" = "*"
    })
  }]
}
