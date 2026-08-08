param(
  [ValidateSet('staging', 'production')]
  [string]$Environment = 'staging',
  [ValidateSet('sync', 'bootstrap', 'verify')]
  [string]$Mode = 'sync'
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ProjectRoot = Split-Path -Parent $Root
$EnvFile = Join-Path $Root "environments/$Environment.env"

function Import-EnvironmentFile {
  if (-not (Test-Path $EnvFile)) {
    throw "Missing $EnvFile — copy $Environment.env.example first."
  }
  Get-Content $EnvFile | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    $eq = $line.IndexOf('=')
    if ($eq -lt 1) { return }
    Set-Item -Path "env:$($line.Substring(0, $eq).Trim())" -Value $line.Substring($eq + 1).Trim()
  }
  Write-Host "Environment: $Environment"
}

function Invoke-SqlFile {
  param([string]$FilePath)
  if (-not $env:SUPABASE_DB_URL) { throw "SUPABASE_DB_URL not set in $EnvFile" }
  Write-Host "Running $FilePath ..."
  Push-Location $ProjectRoot
  try {
    npx supabase db query --db-url $env:SUPABASE_DB_URL -f $FilePath
    if ($LASTEXITCODE -ne 0) { throw "SQL failed: $FilePath" }
  } finally { Pop-Location }
}

Import-EnvironmentFile

switch ($Mode) {
  'sync' { Invoke-SqlFile (Join-Path $Root 'production/sync-production.sql') }
  'bootstrap' {
    Get-ChildItem (Join-Path $Root 'migrations') -Filter '*.sql' | Sort-Object Name | ForEach-Object {
      Invoke-SqlFile $_.FullName
    }
    Invoke-SqlFile (Join-Path $Root 'production/sync-production.sql')
  }
  'verify' { Invoke-SqlFile (Join-Path $Root 'production/verify-production.sql') }
}

Write-Host "Done ($Mode on $Environment)."
