[CmdletBinding()]
param(
  [string]$ApiBaseUrl = $env:INBLUE_API_BASE_URL,
  [string]$AccessToken = $env:INBLUE_ACCESS_TOKEN,
  [string]$SourcePath = "docs/JD_UPDATE_SKILL_TAG_REQUESTS.md"
)

$ErrorActionPreference = "Stop"
$expectedIds = @(73, 72, 70, 69, 68, 67, 66, 65, 64, 63, 62, 59, 58, 57, 56, 55, 54, 53, 34, 28, 27, 18, 17, 16)

if ([string]::IsNullOrWhiteSpace($ApiBaseUrl)) {
  $envPath = Join-Path (Split-Path -Parent $PSScriptRoot) ".env"
  if (Test-Path -LiteralPath $envPath -PathType Leaf) {
    $apiLine = Get-Content -LiteralPath $envPath | Where-Object { $_ -match '^VITE_API_BASE_URL=' } | Select-Object -First 1
    if ($apiLine) { $ApiBaseUrl = ($apiLine -split '=', 2)[1].Trim().Trim('"').Trim("'") }
  }
}

if ([string]::IsNullOrWhiteSpace($ApiBaseUrl)) {
  throw "Missing API base URL. Set INBLUE_API_BASE_URL or pass -ApiBaseUrl."
}
if ([string]::IsNullOrWhiteSpace($AccessToken)) {
  throw "Missing bearer token. Set INBLUE_ACCESS_TOKEN or pass -AccessToken."
}
if (-not (Test-Path -LiteralPath $SourcePath -PathType Leaf)) {
  throw "Source file not found: $SourcePath"
}

$ApiBaseUrl = $ApiBaseUrl.TrimEnd("/")
$markdown = Get-Content -Raw -LiteralPath $SourcePath
$matches = [regex]::Matches($markdown, '(?s)```json\s*(\{.*?\})\s*```')
$payloads = @($matches | ForEach-Object { $_.Groups[1].Value | ConvertFrom-Json })
$actualIds = @($payloads | ForEach-Object { [int]$_.id })

if ($payloads.Count -ne 24) { throw "Expected 24 payloads, found $($payloads.Count)." }
if ((Compare-Object $expectedIds $actualIds).Count -ne 0) { throw "JD ID set is incorrect." }
if (($actualIds | Select-Object -Unique).Count -ne 24) { throw "Duplicate JD IDs found." }
if (@($payloads | Where-Object { -not $_.skillTags -or $_.skillTags.Count -eq 0 }).Count -ne 0) {
  throw "At least one JD has no skill tags."
}

$headers = @{ Authorization = "Bearer $AccessToken"; Accept = "application/json" }

# Fail before the first mutation if the token or any documented JD is invalid.
foreach ($payload in $payloads) {
  Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/api/job-descriptions/$($payload.id)" -Headers $headers | Out-Null
}

$completed = [System.Collections.Generic.List[int]]::new()
foreach ($payload in $payloads) {
  try {
    $body = $payload | ConvertTo-Json -Depth 20 -Compress
    Invoke-RestMethod -Method Put -Uri "$ApiBaseUrl/api/job-descriptions" `
      -Headers $headers -ContentType "application/json; charset=utf-8" -Body $body | Out-Null
    $completed.Add([int]$payload.id)
    Write-Host "Updated JD $($payload.id) ($($completed.Count)/24)"
  }
  catch {
    throw "Stopped at JD $($payload.id). Completed IDs: $($completed -join ', '). Error: $($_.Exception.Message)"
  }
}

foreach ($payload in $payloads) {
  $response = Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/api/job-descriptions/$($payload.id)" -Headers $headers
  $job = if ($null -ne $response.data) { $response.data } else { $response }
  $expectedTags = @($payload.skillTags | ForEach-Object { [string]$_ })
  $actualTags = @($job.skillTags | ForEach-Object { [string]$_ })
  if ((Compare-Object $expectedTags $actualTags).Count -ne 0) {
    throw "Verification failed for JD $($payload.id): skillTags differ from the source payload."
  }
}

Write-Host "Verified skillTags for all 24 JDs: $($completed -join ', ')"
Write-Warning "The REST response does not expose skillEmbedding. Verify non-null embeddings in the backend database or service logs."
