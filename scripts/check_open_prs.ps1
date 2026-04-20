param()

$token = $env:GITHUB_TOKEN
if (-not $token) {
  Write-Output "NO_GITHUB_TOKEN"
  exit 1
}

$headers = @{ Authorization = "Bearer $token"; Accept = 'application/vnd.github+json' }
try {
  $prs = Invoke-RestMethod -Uri "https://api.github.com/repos/AI-LLM-World/AI-Tools-Library/pulls?state=open&per_page=100" -Headers $headers -Method Get -ErrorAction Stop
} catch {
  Write-Output ("ERROR: " + $_.Exception.Message)
  exit 1
}

if ($prs -is [System.Array]) {
  if ($prs.Count -eq 0) { Write-Output "No open PRs"; exit 0 }
  $prs | ForEach-Object { Write-Output ("#{0} {1} {2} {3}" -f $_.number, $_.state, $_.title, $_.html_url) }
} elseif ($prs) {
  Write-Output ("#{0} {1} {2} {3}" -f $prs.number, $prs.state, $prs.title, $prs.html_url)
} else {
  Write-Output "No open PRs"
}
