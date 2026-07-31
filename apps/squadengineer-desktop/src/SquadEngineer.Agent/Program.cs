using SquadEngineer.Core;

using SquadEngineer.Infrastructure;

if (args.Contains("--scan", StringComparer.OrdinalIgnoreCase))
{
    var repository = new LocalVersionRepository();
    var versions = await repository.ListAsync();
    Console.WriteLine($"{versions.Count} revisão(ões) encontrada(s) em {repository.VersionRoot}");
    foreach (var version in versions.Take(5)) Console.WriteLine($"{version.RevisionLabel} | {version.ProjectFile.Name} | {version.CreatedAt:O}");
    return;
}

Console.WriteLine($"SquadEngineer Agent preparado. Pipe reservado: {AgentPipeContract.PipeName}");
Console.WriteLine("Sincronização e servidor Named Pipes ainda não foram ativados nesta fase.");
