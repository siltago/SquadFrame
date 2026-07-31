using Autodesk.AutoCAD.Runtime;
using AcadApplication = Autodesk.AutoCAD.ApplicationServices.Application;
[assembly: ExtensionApplication(typeof(SquadEngineering.Plugin.PluginEntry))]
[assembly: CommandClass(typeof(SquadEngineering.Plugin.Commands))]
namespace SquadEngineering.Plugin;
public sealed class PluginEntry : IExtensionApplication { public void Initialize(){SaveEventManager.Initialize();AcadApplication.DocumentManager.MdiActiveDocument?.Editor.WriteMessage("\nSquadEngineering carregado com versionamento local. Digite SQUADENGINEERING para abrir o painel.");} public void Terminate(){SaveEventManager.Terminate();EngineeringPalette.DisposePalette();} }
