$node = 'C:\Program Files\nodejs\node.exe'

if(-not (Test-Path $node)){
  Write-Error "Node.js niet gevonden op $node"
  exit 1
}

& $node server.js
