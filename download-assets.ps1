# Restore pinned browser assets from the upstream deployment.
# Requires original-page.html; run build_ru.py afterwards to apply the translation.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$base = 'https://gridfinity-extended.ostat.com/'
function Download-IfMissing($relative, $destination) {
    if (-not (Test-Path $destination)) {
        New-Item -ItemType Directory -Force -Path (Split-Path $destination) | Out-Null
        Invoke-WebRequest -Uri ($base + $relative) -UserAgent 'Mozilla/5.0' -OutFile $destination
        Write-Output "Downloaded $relative"
    }
}
$html = Get-Content -Raw -Encoding UTF8 'original-page.html'
$workerName = [regex]::Match($html, 'workerUrl: "\./([^"]+)"').Groups[1].Value
$staticName = [regex]::Match($html, 'src="\./(static\.[^/]+)/editor/main.js"').Groups[1].Value
if (-not $workerName -or -not $staticName) { throw 'Cannot locate pinned assets in original-page.html' }
Download-IfMissing $workerName (Join-Path 'site' $workerName)
$modules = @('main','analytics','customization','dom','modelConfig','off','profiles','rendering')
foreach ($module in $modules) {
    $relative = "$staticName/editor/$module.js"
    Download-IfMissing $relative "original-static/editor/$module.js"
    $destination = Join-Path 'site' $relative
    if (-not (Test-Path $destination)) {
        New-Item -ItemType Directory -Force -Path (Split-Path $destination) | Out-Null
        Copy-Item "original-static/editor/$module.js" $destination
    }
}
$worker = Get-Content -Raw -Encoding UTF8 (Join-Path 'site' $workerName)
$files = @('openscad-wasm/openscad.js','openscad-wasm/openscad.wasm') + @([regex]::Matches($worker, '\./(cas/[a-f0-9]+)') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique)
foreach ($file in $files) { Download-IfMissing $file (Join-Path 'site' $file) }
Write-Output 'Pinned assets ready. Run: python build_ru.py'
