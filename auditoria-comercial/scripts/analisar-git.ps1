$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$out = Join-Path $PSScriptRoot 'git-gerado.json'
Push-Location $repo
try {
  $raw = git log --all --date=iso-strict --pretty=format:'%H%x1f%aI%x1f%an%x1f%ae%x1f%s%x1f%b%x1e'
} finally { Pop-Location }
$commits = @()
foreach ($record in ($raw -split [char]0x1e)) {
  if ([string]::IsNullOrWhiteSpace($record)) { continue }
  $p = $record.Trim() -split [char]0x1f,6
  if ($p.Count -lt 5) { continue }
  $commits += [pscustomobject]@{hash=$p[0]; data=[datetimeoffset]::Parse($p[1]); autor=$p[2]; email=$p[3]; assunto=$p[4]; corpo=if($p.Count-ge 6){$p[5]}else{''}}
}
$ordered = @($commits | Sort-Object data)
$days = @($ordered | Group-Object {$_.data.ToString('yyyy-MM-dd')})
$weeks = @($ordered | Group-Object { $cal=[Globalization.CultureInfo]::InvariantCulture.Calendar; "$($_.data.Year)-W$($cal.GetWeekOfYear($_.data.DateTime,[Globalization.CalendarWeekRule]::FirstFourDayWeek,[DayOfWeek]::Monday).ToString('00'))" })
$months = @($ordered | Group-Object {$_.data.ToString('yyyy-MM')})

function Sessions($gapHours,$beforeMinutes,$minimumMinutes) {
  $sessions=@(); $current=@()
  foreach($c in $ordered){if($current.Count-eq 0 -or ($c.data-$current[-1].data).TotalHours -le $gapHours){$current+=,$c}else{$sessions+=,@($current);$current=@($c)}}
  if($current.Count){$sessions+=,@($current)}
  $minutes=0.0
  foreach($s in $sessions){$duration=if($s.Count-gt 1){($s[-1].data-$s[0].data).TotalMinutes+$beforeMinutes}else{$beforeMinutes};$minutes += [Math]::Max($duration,$minimumMinutes)}
  [ordered]@{ horas=[Math]::Round($minutes/60,1); sessoes=$sessions.Count; media_horas_sessao=if($sessions.Count){[Math]::Round(($minutes/60)/$sessions.Count,2)}else{0}; media_dia_ativo=if($days.Count){[Math]::Round(($minutes/60)/$days.Count,2)}else{0}; media_semana=if($weeks.Count){[Math]::Round(($minutes/60)/$weeks.Count,2)}else{0}; media_mes=if($months.Count){[Math]::Round(($minutes/60)/$months.Count,2)}else{0} }
}

$dates=@($days.Name | Sort-Object | ForEach-Object {[datetime]::ParseExact($_,'yyyy-MM-dd',$null)})
$maxStreak=0;$streak=0;$previous=$null;$maxGap=0
foreach($d in $dates){if($null-ne$previous){$delta=($d-$previous).Days;if($delta-eq 1){$streak++}else{$streak=1};$maxGap=[Math]::Max($maxGap,$delta-1)}else{$streak=1};$maxStreak=[Math]::Max($maxStreak,$streak);$previous=$d}
$night=@($ordered|Where-Object{$_.data.Hour-ge 22 -or $_.data.Hour-lt 6}).Count
$weekend=@($ordered|Where-Object{$_.data.DayOfWeek -in [DayOfWeek]::Saturday,[DayOfWeek]::Sunday}).Count
$coauthored=@($ordered|Where-Object{$_.corpo -match '(?im)^Co-authored-by:'}).Count

$themes=[ordered]@{arquitetura='arquitet|architecture|refactor';banco='migration|sql|supabase|schema|rls|rpc';ui='ui|layout|design|css|visual|responsiv';backend='api|server|action|service|backend';autenticacao='auth|login|senha|convite';permissoes='permiss|papel|cargo|rls';compras='compra|pedido|fornecedor|solicita';estoque='stock|estoque|material|recebimento';producao='produ|pacote|lote|tipologia';kanban='kanban|board|card|trello';integracoes='whatsapp|twilio|push|realtime|xml|pdf|dxf';correcoes='fix|corrig|bug';deploy='deploy|vercel|cron';seguranca='security|seguran|rls|policy';documentacao='docs|readme|document'}
$themeCounts=[ordered]@{}
foreach($entry in $themes.GetEnumerator()){$themeCounts[$entry.Key]=@($ordered|Where-Object{$_.assunto -match $entry.Value}).Count}

$result=[ordered]@{
  commits=$ordered.Count
  primeiro_commit=if($ordered.Count){$ordered[0].data.ToString('o')}else{$null}
  ultimo_commit=if($ordered.Count){$ordered[-1].data.ToString('o')}else{$null}
  periodo_dias=if($ordered.Count){[Math]::Floor(($ordered[-1].data-$ordered[0].data).TotalDays)+1}else{0}
  dias_ativos=$days.Count; semanas_ativas=$weeks.Count; meses_ativos=$months.Count
  media_commits_dia_ativo=if($days.Count){[Math]::Round($ordered.Count/$days.Count,2)}else{0}
  media_commits_semana=if($weeks.Count){[Math]::Round($ordered.Count/$weeks.Count,2)}else{0}
  maior_sequencia_dias=$maxStreak; maior_intervalo_sem_atividade_dias=$maxGap
  commits_noturnos=$night; commits_fim_semana=$weekend; commits_coautoria=$coauthored
  autores=@($ordered|Group-Object autor|Sort-Object Count -Descending|ForEach-Object{[ordered]@{autor=$_.Name;commits=$_.Count}})
  por_mes=@($months|Sort-Object Name|ForEach-Object{[ordered]@{mes=$_.Name;commits=$_.Count}})
  por_semana=@($weeks|Sort-Object Name|ForEach-Object{[ordered]@{semana=$_.Name;commits=$_.Count}})
  por_dia=@($days|Sort-Object Name|ForEach-Object{[ordered]@{dia=$_.Name;commits=$_.Count}})
  por_dia_semana=@($ordered|Group-Object {$_.data.ToString('dddd',[Globalization.CultureInfo]::GetCultureInfo('pt-BR'))}|Sort-Object Count -Descending|ForEach-Object{[ordered]@{dia=$_.Name;commits=$_.Count}})
  por_faixa_horario=@(
    [ordered]@{faixa='00-05';commits=@($ordered|Where-Object{$_.data.Hour-lt 6}).Count},
    [ordered]@{faixa='06-11';commits=@($ordered|Where-Object{$_.data.Hour-ge 6-and$_.data.Hour-lt 12}).Count},
    [ordered]@{faixa='12-17';commits=@($ordered|Where-Object{$_.data.Hour-ge 12-and$_.data.Hour-lt 18}).Count},
    [ordered]@{faixa='18-21';commits=@($ordered|Where-Object{$_.data.Hour-ge 18-and$_.data.Hour-lt 22}).Count},
    [ordered]@{faixa='22-23';commits=@($ordered|Where-Object{$_.data.Hour-ge 22}).Count}
  )
  temas=$themeCounts
  cenarios=[ordered]@{conservador=Sessions 1 30 30;provavel=Sessions 2 45 60;ampliado=Sessions 3 60 90}
}
$result|ConvertTo-Json -Depth 8|Set-Content -LiteralPath $out -Encoding utf8
Write-Output $out
