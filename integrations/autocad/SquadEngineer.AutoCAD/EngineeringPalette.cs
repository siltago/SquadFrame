using Autodesk.AutoCAD.Windows;
namespace SquadEngineering.Plugin;
internal static class EngineeringPalette
{
 private static readonly Guid Id=new("7E76FE0D-1D40-43C6-A85E-99D669BA6182");private static PaletteSet? _palette;private static EngineeringPanel? _panel;
 public static void Show(){if(_palette is null){_panel=new();_palette=new("SquadEngineering",Id){MinimumSize=new(320,500),Size=new(360,650),Style=PaletteSetStyles.ShowAutoHideButton|PaletteSetStyles.ShowCloseButton|PaletteSetStyles.ShowPropertiesMenu};_palette.Add("Projeto atual",_panel);}Refresh();_palette.Visible=true;}
 public static void Refresh()=>_panel?.RefreshDrawingInformation();public static void ShowVersionCreated(LocalVersionInfo v)=>_panel?.ShowVersionCreated(v);public static void ShowVersionError(string m)=>_panel?.ShowVersionError(m);public static void DisposePalette(){_palette?.Dispose();_palette=null;_panel=null;}
}
