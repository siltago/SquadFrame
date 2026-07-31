namespace SquadEngineer.Core;

public sealed record ProjectFile(
    string Id,
    string Name,
    string SourcePath,
    string VersionDirectory);

public sealed record FileVersion(
    ProjectFile ProjectFile,
    int Revision,
    string RevisionLabel,
    string VersionPath,
    DateTimeOffset CreatedAt,
    long FileSize,
    VersionMetadata Metadata);

public sealed record EditingSession(
    string ProjectFileId,
    string ComputerName,
    string UserName,
    DateTimeOffset StartedAt,
    DateTimeOffset? LastActivityAt = null);

public enum SyncStatus
{
    AgentOffline,
    LocalOnly,
    Pending,
    Synchronizing,
    Synchronized,
    Conflict,
    Failed
}

public sealed record VersionMetadata(
    int Revision,
    string RevisionLabel,
    string SourcePath,
    string VersionPath,
    DateTimeOffset CreatedAt,
    string WindowsUser,
    string Computer,
    long FileSize);

public interface ILocalVersionRepository
{
    string VersionRoot { get; }
    Task<IReadOnlyList<FileVersion>> ListAsync(CancellationToken cancellationToken = default);
}

public sealed record EngineeringFile(
    string Name,
    string FullPath,
    string RelativePath,
    string Extension,
    long Size,
    DateTimeOffset LastModifiedAt);

public interface IEngineeringFileRepository
{
    Task<IReadOnlyList<EngineeringFile>> ListAsync(
        string rootPath,
        CancellationToken cancellationToken = default);
}

public interface IEngineerSettingsStore
{
    Task<string?> GetServerRootAsync(CancellationToken cancellationToken = default);
    Task SaveServerRootAsync(string rootPath, CancellationToken cancellationToken = default);
}

public static class AgentPipeContract
{
    public const string PipeName = "SquadEngineer.Agent.v1";
    public const int ProtocolVersion = 1;
}
