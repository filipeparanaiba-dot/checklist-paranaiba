$ErrorActionPreference = "Stop"

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
    Write-Error "Node.js 22 ou superior é necessário. Instale o Node.js e execute novamente."
    exit 1
}

$serverPath = Join-Path -Path $PSScriptRoot -ChildPath "server.mjs"
if (-not (Test-Path -LiteralPath $serverPath -PathType Leaf)) {
    Write-Error "Arquivo server.mjs não encontrado em $PSScriptRoot."
    exit 1
}

& $nodeCommand.Source $serverPath
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
