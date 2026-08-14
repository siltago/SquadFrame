$commits = git log --all --no-merges --format="%aI" |
    ForEach-Object { [DateTimeOffset]::Parse($_) } |
    Sort-Object

if ($commits.Count -eq 0) {
    Write-Host "Nenhum commit encontrado."
    exit
}

# Parâmetros da estimativa
$intervaloMaximoHoras = 2
$tempoInicialSessaoHoras = 0.75
$tempoMinimoSessaoHoras = 1

$sessoes = @()
$inicioSessao = $commits[0]
$ultimoCommit = $commits[0]

for ($i = 1; $i -lt $commits.Count; $i++) {
    $commitAtual = $commits[$i]
    $intervalo = ($commitAtual - $ultimoCommit).TotalHours

    if ($intervalo -gt $intervaloMaximoHoras) {
        $duracao = ($ultimoCommit - $inicioSessao).TotalHours +
                   $tempoInicialSessaoHoras

        if ($duracao -lt $tempoMinimoSessaoHoras) {
            $duracao = $tempoMinimoSessaoHoras
        }

        $sessoes += [PSCustomObject]@{
            Inicio  = $inicioSessao.LocalDateTime
            Fim     = $ultimoCommit.LocalDateTime
            Horas   = [Math]::Round($duracao, 2)
        }

        $inicioSessao = $commitAtual
    }

    $ultimoCommit = $commitAtual
}

# Registra a última sessão
$duracao = ($ultimoCommit - $inicioSessao).TotalHours +
           $tempoInicialSessaoHoras

if ($duracao -lt $tempoMinimoSessaoHoras) {
    $duracao = $tempoMinimoSessaoHoras
}

$sessoes += [PSCustomObject]@{
    Inicio = $inicioSessao.LocalDateTime
    Fim    = $ultimoCommit.LocalDateTime
    Horas  = [Math]::Round($duracao, 2)
}

$totalHoras = ($sessoes | Measure-Object -Property Horas -Sum).Sum
$diasAtivos = $commits |
    ForEach-Object { $_.LocalDateTime.Date } |
    Sort-Object -Unique

Write-Host ""
Write-Host "========== RESULTADO =========="
Write-Host "Commits analisados: $($commits.Count)"
Write-Host "Dias com commits: $($diasAtivos.Count)"
Write-Host "Sessões estimadas: $($sessoes.Count)"
Write-Host "Horas estimadas: $([Math]::Round($totalHoras, 1)) h"
Write-Host "Média por dia ativo: $([Math]::Round($totalHoras / $diasAtivos.Count, 1)) h"
Write-Host "Primeiro commit: $($commits[0].LocalDateTime)"
Write-Host "Último commit: $($commits[-1].LocalDateTime)"
Write-Host "==============================="
Write-Host ""

$sessoes | Format-Table -AutoSize