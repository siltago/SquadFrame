using System.Text.Json;
using SquadEngineer.Core;

namespace SquadEngineer.Infrastructure;

public sealed class EngineerSettingsStore : IEngineerSettingsStore
{
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };
    private readonly string _settingsPath;

    public EngineerSettingsStore(string? settingsPath = null)
    {
        _settingsPath = settingsPath ?? Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "SquadSystem", "SquadEngineer", "settings.json");
    }

    public async Task<string?> GetServerRootAsync(CancellationToken cancellationToken = default)
    {
        if (!File.Exists(_settingsPath)) return null;
        try
        {
            await using var stream = File.OpenRead(_settingsPath);
            var settings = await JsonSerializer.DeserializeAsync<Settings>(stream, cancellationToken: cancellationToken);
            return settings?.ServerRoot;
        }
        catch (JsonException) { return null; }
        catch (IOException) { return null; }
        catch (UnauthorizedAccessException) { return null; }
    }

    public async Task SaveServerRootAsync(string rootPath, CancellationToken cancellationToken = default)
    {
        var fullPath = Path.GetFullPath(rootPath);
        var directory = Path.GetDirectoryName(_settingsPath)!;
        Directory.CreateDirectory(directory);
        await using var stream = new FileStream(_settingsPath, FileMode.Create, FileAccess.Write, FileShare.None);
        await JsonSerializer.SerializeAsync(stream, new Settings(fullPath), JsonOptions, cancellationToken);
    }

    private sealed record Settings(string ServerRoot);
}
