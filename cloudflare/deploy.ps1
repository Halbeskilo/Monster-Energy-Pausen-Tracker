# Vollautomatisches Setup-Skript (Windows PowerShell Äquivalent zum Ansible Playbook)
# Richtet Cloudflare D1, das SQL-Schema (31 Monster), den Worker und die URL in GitHub Pages mit 1 Befehl ein!

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$CloudflareDir = $PSScriptRoot
$DbName = "monster-db"
$WorkerName = "monster-pausen-api"

Write-Host "=== 1. Prüfe Cloudflare Login (Wrangler) ===" -ForegroundColor Cyan
Push-Location $CloudflareDir
try {
    npx --yes wrangler whoami 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Öffne Browser für einmaligen Cloudflare-Login..." -ForegroundColor Yellow
        npx --yes wrangler login
    }

    Write-Host "`n=== 2. Erstelle / Prüfe Cloudflare D1 Datenbank '$DbName' ===" -ForegroundColor Cyan
    $d1ListRaw = npx --yes wrangler d1 list --json
    $d1List = $d1ListRaw | ConvertFrom-Json
    $existingDb = $d1List | Where-Object { $_.name -eq $DbName } | Select-Object -First 1

    if (-not $existingDb) {
        Write-Host "Erstelle neue D1 Datenbank '$DbName'..." -ForegroundColor Green
        npx --yes wrangler d1 create $DbName
        $d1ListRaw = npx --yes wrangler d1 list --json
        $d1List = $d1ListRaw | ConvertFrom-Json
        $existingDb = $d1List | Where-Object { $_.name -eq $DbName } | Select-Object -First 1
    }

    $DbId = $existingDb.uuid
    Write-Host "Gefundene D1 Database-ID: $DbId" -ForegroundColor Green

    Write-Host "`n=== 3. Schreibe wrangler.toml mit D1-Binding ===" -ForegroundColor Cyan
    $wranglerContent = @"
name = "$WorkerName"
main = "worker.js"
compatibility_date = "2024-10-01"

[[d1_databases]]
binding = "DB"
database_name = "$DbName"
database_id = "$DbId"
"@
    Set-Content -Path (Join-Path $CloudflareDir "wrangler.toml") -Value $wranglerContent -Encoding UTF8

    Write-Host "`n=== 4. Spiele SQL-Schema & alle 31 Monster in D1 ein ===" -ForegroundColor Cyan
    npx --yes wrangler d1 execute $DbName --remote --file=schema.sql

    Write-Host "`n=== 5. Deploye Cloudflare Worker '$WorkerName' ===" -ForegroundColor Cyan
    $deployOut = (npx --yes wrangler deploy | Out-String)
    Write-Host $deployOut

    $match = [regex]::Match($deployOut, 'https://[a-zA-Z0-9.-]+\.workers\.dev')
    if (-not $match.Success) {
        throw "Worker-URL konnte nicht aus der Ausgabe gelesen werden."
    }
    $WorkerUrl = $match.Value
    Write-Host "Live Worker-URL: $WorkerUrl" -ForegroundColor Green

    Write-Host "`n=== 6. Trage Worker-URL in data/monsters.json & app.js ein ===" -ForegroundColor Cyan
    node -e "
      const fs = require('fs');
      const url = '$WorkerUrl';
      const jsonPath = '../data/monsters.json';
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      data.meta.apiUrl = url;
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n', 'utf8');

      const appPath = '../app.js';
      let appJs = fs.readFileSync(appPath, 'utf8');
      appJs = appJs.replace(/apiUrl:\s*['""][^'""]*['""]/, 'apiUrl: ""' + url + '""');
      fs.writeFileSync(appPath, appJs, 'utf8');
    "

    Write-Host "`n=== 7. Pushe Konfiguration zu GitHub Pages ===" -ForegroundColor Cyan
    Set-Location $ProjectRoot
    git add data/monsters.json app.js cloudflare/wrangler.toml
    git commit -m "chore: configure live Cloudflare D1 worker URL"
    git push origin main

    Write-Host "`n✅ FERTIG! Deine D1-Datenbank + Worker laufen und sind mit GitHub Pages verbunden!" -ForegroundColor Green
    Write-Host "Worker API: $WorkerUrl" -ForegroundColor Green
    Write-Host "Webseite:   https://halbeskilo.github.io/Monster-Energy-Pausen-Tracker/" -ForegroundColor Green
}
finally {
    Pop-Location
}
