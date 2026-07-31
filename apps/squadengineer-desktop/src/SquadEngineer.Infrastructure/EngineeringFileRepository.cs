using SquadEngineer.Core;

namespace SquadEngineer.Infrastructure;

public sealed class EngineeringFileRepository : IEngineeringFileRepository
{
    public Task<IReadOnlyList<EngineeringFile>> ListAsync(
        string rootPath,
        CancellationToken cancellationToken = default)
    {
        return Task.Run<IReadOnlyList<EngineeringFile>>(
            () => Enumerate(rootPath, cancellationToken), cancellationToken);
    }

    private static IReadOnlyList<EngineeringFile> Enumerate(
        string rootPath,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(rootPath)) return [];
        if (!Directory.Exists(rootPath))
            throw new DirectoryNotFoundException($"A pasta do servidor não está acessível: {rootPath}");

        var root = Path.GetFullPath(rootPath);
        var result = new List<EngineeringFile>();
        var pending = new Stack<string>();
        pending.Push(root);

        while (pending.Count > 0)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var directory = pending.Pop();

            try
            {
                foreach (var child in Directory.EnumerateDirectories(directory)) pending.Push(child);
                foreach (var path in Directory.EnumerateFiles(directory))
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    try
                    {
                        var info = new FileInfo(path);
                        result.Add(new EngineeringFile(
                            info.Name,
                            info.FullName,
                            Path.GetRelativePath(root, info.FullName),
                            info.Extension.TrimStart('.').ToUpperInvariant(),
                            info.Length,
                            info.LastWriteTime));
                    }
                    catch (IOException) { }
                    catch (UnauthorizedAccessException) { }
                }
            }
            catch (IOException) { }
            catch (UnauthorizedAccessException) { }
        }

        return result.OrderBy(file => file.RelativePath, StringComparer.CurrentCultureIgnoreCase).ToArray();
    }
}
