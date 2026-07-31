using Autodesk.AutoCAD.ApplicationServices;
using Autodesk.AutoCAD.DatabaseServices;
using AcadApplication=Autodesk.AutoCAD.ApplicationServices.Application;
namespace SquadEngineering.Plugin;
internal static class SaveEventManager
{
 private static bool _initialized;
 public static void Initialize(){if(_initialized)return;var docs=AcadApplication.DocumentManager;docs.DocumentCreated+=Created;foreach(Document doc in docs)Subscribe(doc);_initialized=true;}
 public static void Terminate(){if(!_initialized)return;var docs=AcadApplication.DocumentManager;docs.DocumentCreated-=Created;foreach(Document doc in docs)doc.Database.SaveComplete-=Saved;_initialized=false;}
 private static void Created(object sender,DocumentCollectionEventArgs e)=>Subscribe(e.Document);
 private static void Subscribe(Document doc){doc.Database.SaveComplete-=Saved;doc.Database.SaveComplete+=Saved;}
 private static void Saved(object sender,DatabaseIOEventArgs e){if(sender is not Database db||string.IsNullOrWhiteSpace(e.FileName)||!e.FileName.EndsWith(".dwg",StringComparison.OrdinalIgnoreCase))return;var path=File.Exists(e.FileName)?e.FileName:db.Filename;if(string.IsNullOrWhiteSpace(path)||!File.Exists(path))return;try{EngineeringPalette.ShowVersionCreated(LocalVersionService.CreateVersion(path));}catch(Exception ex){EngineeringPalette.ShowVersionError(ex.Message);}}
}
