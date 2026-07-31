using Autodesk.AutoCAD.Runtime;
namespace SquadEngineering.Plugin;
public sealed class Commands { [CommandMethod("SQUADENGINEERING",CommandFlags.Modal)] public void Show()=>EngineeringPalette.Show(); [CommandMethod("SQUADSTATUS",CommandFlags.Modal)] public void Refresh(){EngineeringPalette.Show();EngineeringPalette.Refresh();} }
