$node = 'C:\Program Files\nodejs\node.exe'

if(-not (Test-Path $node)){
  Write-Error "Node.js niet gevonden op $node"
  exit 1
}

& $node --check js\storage.js
if($LASTEXITCODE -ne 0){ exit $LASTEXITCODE }

& $node --check js\app.js
if($LASTEXITCODE -ne 0){ exit $LASTEXITCODE }

& $node --check js\supabase.js
if($LASTEXITCODE -ne 0){ exit $LASTEXITCODE }

& $node --check server.js
exit $LASTEXITCODE
