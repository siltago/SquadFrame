$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$out = Join-Path $PSScriptRoot 'metricas-geradas.json'

$excludedDirs = @('.git', 'node_modules', '.next', 'dist', 'build', 'coverage', 'bin', 'obj', '.vercel')
$binaryExt = @('.png','.jpg','.jpeg','.gif','.webp','.ico','.pdf','.dwg','.dxf','.zip','.dll','.exe','.pdb','.woff','.woff2','.ttf','.mp4','.mov')
$dependencyFiles = @('package-lock.json','yarn.lock','pnpm-lock.yaml','npm-shrinkwrap.json','tsconfig.tsbuildinfo')

$files = Get-ChildItem -LiteralPath $repo -Recurse -File -Force | Where-Object {
  $relative = $_.FullName.Substring($repo.Length).TrimStart([char[]]'\/')
  $parts = $relative -split '[\\/]'
  -not ($parts | Where-Object { $excludedDirs -contains $_ }) -and
  -not ($dependencyFiles -contains $_.Name) -and
  $_.FullName -notlike "*\auditoria-comercial\*"
}

$textFiles = $files | Where-Object { $binaryExt -notcontains $_.Extension.ToLowerInvariant() }
$codeExtensions = @('.ts','.tsx','.js','.jsx','.css','.sql','.ps1','.json','.mjs','.cjs')
$codeFiles = $textFiles | Where-Object { $codeExtensions -contains $_.Extension.ToLowerInvariant() }

$extensions = $files | Group-Object { if ([string]::IsNullOrEmpty($_.Extension)) {'[sem extensão]'} else {$_.Extension.ToLowerInvariant()} } |
  Sort-Object Count -Descending | ForEach-Object { [ordered]@{ extensao=$_.Name; arquivos=$_.Count } }

$languages = @{}
foreach ($file in $codeFiles) {
  $ext = $file.Extension.ToLowerInvariant()
  $language = switch ($ext) { '.ts' {'TypeScript'} '.tsx' {'TypeScript/TSX'} '.js' {'JavaScript'} '.jsx' {'JavaScript/JSX'} '.css' {'CSS'} '.sql' {'SQL'} '.ps1' {'PowerShell'} '.json' {'JSON'} '.mjs' {'JavaScript'} '.cjs' {'JavaScript'} }
  if (-not $languages.ContainsKey($language)) { $languages[$language] = [ordered]@{ arquivos=0; linhas=0; uteis=0; comentarios=0; brancas=0 } }
  $lines = @(Get-Content -LiteralPath $file.FullName -ErrorAction SilentlyContinue)
  $inBlock = $false; $useful=0; $comments=0; $blank=0
  foreach ($line in $lines) {
    $trim = $line.Trim()
    if ([string]::IsNullOrWhiteSpace($trim)) { $blank++; continue }
    if ($inBlock) { $comments++; if ($trim -match '\*/') {$inBlock=$false}; continue }
    if ($trim -match '^/\*') { $comments++; if ($trim -notmatch '\*/') {$inBlock=$true}; continue }
    if ($trim -match '^(//|--|#(?![A-Za-z0-9_-]+\s*[:=]))') { $comments++; continue }
    $useful++
  }
  $languages[$language].arquivos++; $languages[$language].linhas += $lines.Count
  $languages[$language].uteis += $useful; $languages[$language].comentarios += $comments; $languages[$language].brancas += $blank
}

$allContent = @{}
function Content([IO.FileInfo]$file) { if (-not $allContent.ContainsKey($file.FullName)) {$allContent[$file.FullName]=Get-Content -Raw -LiteralPath $file.FullName -ErrorAction SilentlyContinue}; $allContent[$file.FullName] }
$tsFiles = $textFiles | Where-Object { $_.Extension -in '.ts','.tsx' }
$sqlFiles = $textFiles | Where-Object Extension -eq '.sql'
$sqlText = ($sqlFiles | ForEach-Object { Content $_ }) -join "`n"
$serverActions = 0
foreach ($file in $tsFiles) { $c=Content $file; if ($c -match '["'']use server["'']') {$serverActions += ([regex]::Matches($c,'export\s+(?:async\s+)?function\s+\w+|export\s+const\s+\w+\s*=\s*async')).Count} }

$folders = Get-ChildItem -LiteralPath $repo -Recurse -Directory -Force | Where-Object {
  $relative=$_.FullName.Substring($repo.Length).TrimStart([char[]]'\/'); $parts=$relative -split '[\\/]';
  -not ($parts | Where-Object { $excludedDirs -contains $_ }) -and $_.FullName -notlike "*\auditoria-comercial\*"
}

$result = [ordered]@{
  gerado_em = (Get-Date).ToString('o')
  metodo = 'Varredura do filesystem, excluindo dependências, builds, binários, lockfiles e a própria auditoria.'
  arquivos_total = $files.Count
  pastas_total = $folders.Count
  extensoes = $extensions
  linguagens = @($languages.GetEnumerator() | Sort-Object Name | ForEach-Object { [ordered]@{ linguagem=$_.Name; arquivos=$_.Value.arquivos; linhas=$_.Value.linhas; uteis=$_.Value.uteis; comentarios=$_.Value.comentarios; brancas=$_.Value.brancas } })
  linhas_codigo_total = (($languages.GetEnumerator() | ForEach-Object {$_.Value.linhas}) | Measure-Object -Sum).Sum
  linhas_uteis_total = (($languages.GetEnumerator() | ForEach-Object {$_.Value.uteis}) | Measure-Object -Sum).Sum
  linhas_comentarios_total = (($languages.GetEnumerator() | ForEach-Object {$_.Value.comentarios}) | Measure-Object -Sum).Sum
  linhas_brancas_total = (($languages.GetEnumerator() | ForEach-Object {$_.Value.brancas}) | Measure-Object -Sum).Sum
  componentes = @($tsFiles | Where-Object { $_.Extension -eq '.tsx' -and $_.FullName -match '[\\/]components[\\/]' }).Count
  paginas = @($files | Where-Object Name -eq 'page.tsx').Count
  rotas_api = @($files | Where-Object Name -eq 'route.ts').Count
  layouts = @($files | Where-Object Name -eq 'layout.tsx').Count
  hooks = @($tsFiles | Where-Object { $_.Name -match '^use[-A-Z_].*\.tsx?$' -or $_.FullName -match '[\\/]hooks[\\/]' }).Count
  servicos = @($tsFiles | Where-Object { $_.FullName -match '[\\/]services[\\/]' -or $_.Name -match 'service\.ts$' }).Count
  utilitarios = @($tsFiles | Where-Object { $_.FullName -match '[\\/](utils|lib)[\\/]' }).Count
  server_actions = $serverActions
  migrations = @($sqlFiles | Where-Object FullName -match '[\\/]supabase[\\/]migrations[\\/]').Count
  sql = [ordered]@{
    tabelas = ([regex]::Matches($sqlText,'(?im)^\s*create\s+table\s+(?:if\s+not\s+exists\s+)?')).Count
    views = ([regex]::Matches($sqlText,'(?im)^\s*create\s+(?:or\s+replace\s+)?(?:materialized\s+)?view\s+')).Count
    funcoes = ([regex]::Matches($sqlText,'(?im)^\s*create\s+(?:or\s+replace\s+)?function\s+')).Count
    triggers = ([regex]::Matches($sqlText,'(?im)^\s*create\s+trigger\s+')).Count
    indices = ([regex]::Matches($sqlText,'(?im)^\s*create\s+(?:unique\s+)?index\s+')).Count
    policies = ([regex]::Matches($sqlText,'(?im)^\s*create\s+policy\s+')).Count
    enums = ([regex]::Matches($sqlText,"(?im)create\s+type\s+.+?\s+as\s+enum")).Count
  }
  tipos_typescript = (($tsFiles | ForEach-Object { [regex]::Matches((Content $_),'(?m)^\s*(?:export\s+)?(?:type|interface|enum)\s+\w+').Count }) | Measure-Object -Sum).Sum
  schemas_validacao = @($tsFiles | Where-Object { $_.FullName -match '[\\/]schemas[\\/]' -or $_.Name -match 'schema' }).Count
  testes = @($files | Where-Object { $_.Name -match '(\.test|\.spec)\.(ts|tsx|js|jsx)$' -or $_.FullName -match '[\\/](tests|__tests__)[\\/]' }).Count
  documentacao = @($files | Where-Object Extension -eq '.md').Count
}
$result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $out -Encoding utf8
Write-Output $out
