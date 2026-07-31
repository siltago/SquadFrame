using System.Text.Json;
using System.Text.RegularExpressions;
using SquadEngineer.Core;

namespace SquadEngineer.Infrastructure;

public sealed partial class LocalVersionRepository : ILocalVersionRepository
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public LocalVersionRepository(string? versionRoot = null)
    {
        VersionRoot = versionRoot ?? Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),
            "SquadSystem", "SquadEngineering", "Versoes");
    }

    public string VersionRoot { get; }

    public async Task<IReadOnlyList<FileVersion>> ListAsync(CancellationToken cancellationToken = default)
    {
        if (!Directory.Exists(VersionRoot)) return [];

        var versions = new List<FileVersion>();
        foreach (var jsonPath in Directory.EnumerateFiles(VersionRoot, "*.json", SearchOption.AllDirectories))
        {
            cancellationToken.ThrowIfCancellationRequested();
            var version = await ReadMetadataAsync(jsonPath, cancellationToken).ConfigureAwait(false);
            if (version is not null) versions.Add(version);
        }

        return versions
            .OrderByDescending(version => version.CreatedAt)
            .ThenByDescending(version => version.Revision)
            .ToArray();
    }

    private static async Task<FileVersion?> ReadMetadataAsync(string jsonPath, CancellationToken cancellationToken)
    {
        try
        {
            await using var stream = File.OpenRead(jsonPath);
            var metadata = await JsonSerializer.DeserializeAsync<VersionMetadata>(stream, JsonOptions, cancellationToken)
                .ConfigureAwait(false);
            if (metadata is null || string.IsNullOrWhiteSpace(metadata.VersionPath)) return null;

            var sourceName = Path.GetFileName(metadata.SourcePath);
            var directory = Path.GetDirectoryName(jsonPath)!;
            var projectFile = new ProjectFile(
                CreateStableId(metadata.SourcePath, directory),
                string.IsNullOrWhiteSpace(sourceName) ? Path.GetFileNameWithoutExtension(metadata.VersionPath) : sourceName,
                metadata.SourcePath,
                directory);

            return new FileVersion(projectFile, metadata.Revision, metadata.RevisionLabel,
                metadata.VersionPath, metadata.CreatedAt, metadata.FileSize, metadata);
        }
        catch (JsonException) { return null; }
        catch (IOException) { return null; }
        catch (UnauthorizedAccessException) { return null; }
    }

    private static string CreateStableId(string sourcePath, string directory)
    {
        var match = PathKeyPattern().Match(Path.GetFileName(directory));
        return match.Success ? match.Groups[1].Value : sourcePath.ToUpperInvariant();
    }

    [GeneratedRegex(@"_([0-9A-F]{8})$", RegexOptions.IgnoreCase)]
    private static partial Regex PathKeyPattern();
}

