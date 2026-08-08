param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('staging', 'production')]
  [string]$Target
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ProjectRoot = Split-Path -Parent $Root
$Source = Join-Path $Root "environments/$Target.env"

if (-not (Test-Path $Source)) {
  throw "Missing $Source — copy $Target.env.example first."
}

$lines = Get-Content $Source | Where-Object {
  $_ -match '^\s*EXPO_PUBLIC_' -or $_ -match '^\s*#' -or $_ -match '^\s*$'
}

$header = @(
  "# RR Basket — $Target (from supabase/environments/$Target.env)"
  ""
)
($header + $lines) | Set-Content (Join-Path $ProjectRoot '.env') -Encoding utf8
Write-Host "Wrote $ProjectRoot\.env from $Target"
