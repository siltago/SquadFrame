using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Runtime.CompilerServices;
using System.Windows;
using System.Windows.Input;
using System.Windows.Media;
using Microsoft.Win32;
using SquadEngineer.Core;
using SquadEngineer.Infrastructure;

namespace SquadEngineer.Desktop;

public partial class MainWindow : Window, INotifyPropertyChanged
{
    private readonly LocalVersionRepository _versionRepository = new();
    private readonly EngineeringFileRepository _fileRepository = new();
    private readonly EngineerSettingsStore _settingsStore = new();
    private string _serverRoot = "Nenhuma pasta do servidor configurada";
    private string _serverStatus = "Selecione a pasta compartilhada que contém os arquivos de engenharia.";
    private Brush _serverStatusColor = Brushes.DimGray;

    public ObservableCollection<FileVersion> Versions { get; } = [];
    public ObservableCollection<EngineeringFile> ServerFiles { get; } = [];
    public ObservableCollection<FileTreeNode> ServerTree { get; } = [];
    public FileTreeNode? SelectedServerNode { get; private set; }
    public string CurrentFile { get; private set; } = "Nenhum arquivo selecionado";
    public string CurrentRevision { get; private set; } = "—";
    public string LatestVersion { get; private set; } = "Nenhuma versão local";
    public string VersionRoot => _versionRepository.VersionRoot;
    public string ServerRoot { get => _serverRoot; private set => SetField(ref _serverRoot, value); }
    public string ServerStatus { get => _serverStatus; private set => SetField(ref _serverStatus, value); }
    public Brush ServerStatusColor { get => _serverStatusColor; private set => SetField(ref _serverStatusColor, value); }

    public event PropertyChangedEventHandler? PropertyChanged;

    public MainWindow()
    {
        InitializeComponent();
        DataContext = this;
        Loaded += async (_, _) => await InitializeAsync();
    }

    private async Task InitializeAsync()
    {
        await LoadVersionsAsync();
        var savedRoot = await _settingsStore.GetServerRootAsync();
        if (!string.IsNullOrWhiteSpace(savedRoot)) { ServerRoot = savedRoot; await LoadServerFilesAsync(); }
    }

    private async Task LoadVersionsAsync()
    {
        Versions.Clear();
        foreach (var version in await _versionRepository.ListAsync()) Versions.Add(version);
        var latest = Versions.FirstOrDefault();
        if (latest is null) return;
        CurrentFile = latest.ProjectFile.Name; CurrentRevision = latest.RevisionLabel;
        LatestVersion = latest.CreatedAt.LocalDateTime.ToString("dd/MM/yyyy HH:mm:ss");
        OnPropertyChanged(nameof(CurrentFile)); OnPropertyChanged(nameof(CurrentRevision)); OnPropertyChanged(nameof(LatestVersion));
    }

    private async Task LoadServerFilesAsync()
    {
        ServerStatus = "Lendo arquivos do servidor..."; ServerStatusColor = Brushes.SteelBlue;
        ServerFiles.Clear(); ServerTree.Clear();
        try
        {
            foreach (var file in await _fileRepository.ListAsync(ServerRoot)) ServerFiles.Add(file);
            BuildServerTree();
            ServerStatus = $"{ServerFiles.Count:N0} arquivo(s) encontrado(s), preservando a estrutura de pastas.";
            ServerStatusColor = Brushes.ForestGreen;
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        { ServerStatus = exception.Message; ServerStatusColor = Brushes.Firebrick; }
    }

    private void BuildServerTree()
    {
        var rootName = new DirectoryInfo(ServerRoot).Name;
        if (string.IsNullOrWhiteSpace(rootName)) rootName = ServerRoot;
        var root = FileTreeNode.Directory(rootName, ServerRoot);
        ServerTree.Add(root);

        foreach (var file in ServerFiles)
        {
            var current = root;
            var directory = Path.GetDirectoryName(file.RelativePath);
            if (!string.IsNullOrWhiteSpace(directory))
            {
                foreach (var segment in directory.Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar))
                {
                    if (string.IsNullOrWhiteSpace(segment)) continue;
                    var child = current.Children.FirstOrDefault(node => node.IsDirectory && string.Equals(node.Name, segment, StringComparison.CurrentCultureIgnoreCase));
                    if (child is null) { child = FileTreeNode.Directory(segment, Path.Combine(current.FullPath, segment)); current.Children.Add(child); }
                    current = child;
                }
            }
            current.Children.Add(FileTreeNode.FromFile(file));
        }
        root.SortRecursively();
    }

    private async void SelectServerFolder_Click(object sender, RoutedEventArgs e)
    {
        var dialog = new OpenFolderDialog { Title = "Selecione a pasta de engenharia no servidor", Multiselect = false };
        if (Directory.Exists(ServerRoot)) dialog.InitialDirectory = ServerRoot;
        if (dialog.ShowDialog(this) != true) return;
        ServerRoot = dialog.FolderName;
        await _settingsStore.SaveServerRootAsync(ServerRoot);
        await LoadServerFilesAsync();
    }

    private async void RefreshServerFiles_Click(object sender, RoutedEventArgs e) => await LoadServerFilesAsync();
    private void ServerTree_SelectedItemChanged(object sender, RoutedPropertyChangedEventArgs<object> e) => SelectedServerNode = e.NewValue as FileTreeNode;

    private void ServerTree_DoubleClick(object sender, MouseButtonEventArgs e)
    {
        if (SelectedServerNode?.File is not { } file) return;
        try { Process.Start(new ProcessStartInfo(file.FullPath) { UseShellExecute = true }); }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException or Win32Exception)
        { ServerStatus = $"Não foi possível abrir o arquivo: {exception.Message}"; ServerStatusColor = Brushes.Firebrick; }
    }

    private void OnPropertyChanged([CallerMemberName] string? name = null) => PropertyChanged?.Invoke(this, new(name));
    private void SetField<T>(ref T field, T value, [CallerMemberName] string? name = null) { if (EqualityComparer<T>.Default.Equals(field, value)) return; field = value; OnPropertyChanged(name); }
}

public sealed class FileTreeNode
{
    private FileTreeNode(string name, string fullPath, EngineeringFile? file) { Name = name; FullPath = fullPath; File = file; }
    public string Name { get; }
    public string FullPath { get; }
    public EngineeringFile? File { get; }
    public bool IsDirectory => File is null;
    public string Icon => IsDirectory ? "📁" : "📄";
    public FontWeight FontWeight => IsDirectory ? FontWeights.SemiBold : FontWeights.Normal;
    public string Details => File is null ? string.Empty : $"{File.Extension}  •  {FormatSize(File.Size)}  •  {File.LastModifiedAt:dd/MM/yyyy HH:mm}";
    public ObservableCollection<FileTreeNode> Children { get; } = [];
    public static FileTreeNode Directory(string name, string fullPath) => new(name, fullPath, null);
    public static FileTreeNode FromFile(EngineeringFile file) => new(file.Name, file.FullPath, file);
    public void SortRecursively() { foreach (var child in Children.Where(node => node.IsDirectory)) child.SortRecursively(); var ordered = Children.OrderByDescending(node => node.IsDirectory).ThenBy(node => node.Name, StringComparer.CurrentCultureIgnoreCase).ToArray(); Children.Clear(); foreach (var child in ordered) Children.Add(child); }
    private static string FormatSize(long bytes) => bytes switch { >= 1_073_741_824 => $"{bytes / 1_073_741_824d:N1} GB", >= 1_048_576 => $"{bytes / 1_048_576d:N1} MB", >= 1024 => $"{bytes / 1024d:N1} KB", _ => $"{bytes} bytes" };
}
