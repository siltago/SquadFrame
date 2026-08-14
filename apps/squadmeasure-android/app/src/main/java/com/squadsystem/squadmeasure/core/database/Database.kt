package com.squadsystem.squadmeasure.core.database

import android.content.Context
import androidx.room.*
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import kotlinx.coroutines.flow.Flow

@Entity(tableName="visits",indices=[Index("ownerId"),Index("scheduledAt")])
data class VisitEntity(@PrimaryKey val id:String,val ownerId:String,val workId:String,val workName:String,val clientName:String?,val address:String?,val responsibleName:String?,val status:String,val priority:String,val scheduledAt:String?,val progress:Int,val notes:String?,val version:Int,val syncState:String,val lastSyncAt:String?)

@Entity(tableName="environments",indices=[Index("ownerId"),Index("visitId"),Index("syncState"),Index("deletedAt"),Index(value=["visitId","sequence"]),Index("updatedAt")])
data class EnvironmentEntity(@PrimaryKey val id:String,val ownerId:String,val visitId:String,val name:String,val code:String?=null,val floor:String?=null,val description:String?=null,val sequence:Int=0,val status:String="pendente",val notes:String?=null,val version:Int=0,val createdAt:String,val updatedAt:String,val deletedAt:String?=null,val syncState:String,val lastSyncAt:String?=null,val lastErrorCode:String?=null,val lastErrorMessage:String?=null)

@Entity(tableName="elements",indices=[Index("ownerId"),Index("visitId"),Index("environmentId"),Index("syncState"),Index("deletedAt"),Index(value=["environmentId","sequence"]),Index("updatedAt")])
data class ElementEntity(@PrimaryKey val id:String,val ownerId:String,val visitId:String,val environmentId:String,val name:String,val code:String?=null,val type:String,val quantity:Int=1,val description:String?=null,val sequence:Int=0,val status:String="pendente",val attention:Boolean=false,val responsibleId:String?=null,val version:Int=0,val createdAt:String,val updatedAt:String,val deletedAt:String?=null,val syncState:String,val lastSyncAt:String?=null,val lastErrorCode:String?=null,val lastErrorMessage:String?=null)

@Entity(tableName="measurements",indices=[Index("ownerId"),Index("visitId"),Index("elementId"),Index("syncState"),Index("deletedAt"),Index("updatedAt")])
data class MeasurementEntity(@PrimaryKey val id:String,val ownerId:String,val visitId:String,val elementId:String,val groupName:String?=null,val type:String,val name:String,val position:String?=null,val value:Double,val unit:String,val tolerance:Double?=null,val state:String="provisoria",val note:String?=null,val origin:String="manual",val measuredAt:String,val version:Int=0,val createdAt:String,val updatedAt:String,val deletedAt:String?=null,val syncState:String,val lastSyncAt:String?=null,val lastErrorCode:String?=null,val lastErrorMessage:String?=null)

@Entity(tableName="observations",indices=[Index("ownerId"),Index("visitId"),Index("environmentId"),Index("elementId"),Index("measurementId"),Index("syncState"),Index("deletedAt"),Index("updatedAt")])
data class ObservationEntity(@PrimaryKey val id:String,val ownerId:String,val visitId:String,val environmentId:String?=null,val elementId:String?=null,val measurementId:String?=null,val category:String,val text:String,val important:Boolean=false,val responsibleName:String?=null,val resolvedAt:String?=null,val version:Int=0,val createdAt:String,val updatedAt:String,val deletedAt:String?=null,val syncState:String,val lastSyncAt:String?=null,val lastErrorCode:String?=null,val lastErrorMessage:String?=null)

@Entity(tableName="metadata") data class MetadataEntity(@PrimaryKey val key:String,val value:String)
@Entity(tableName="pending_mutations",indices=[Index("ownerId"),Index("entityType"),Index("entityId"),Index("status"),Index("createdAt")])
data class PendingMutationEntity(@PrimaryKey val id:String,val ownerId:String,val visitId:String,val entityType:String,val entityId:String,val operation:String,val payload:String,val expectedVersion:Int?=null,val status:String="PENDING",val attemptCount:Int=0,val createdAt:String,val lastAttemptAt:String?=null,val lastErrorCode:String?=null,val lastErrorMessage:String?=null)

@Dao interface MeasureDao {
 @Query("SELECT * FROM visits WHERE ownerId=:owner ORDER BY scheduledAt") fun visits(owner:String):Flow<List<VisitEntity>>
 @Query("SELECT * FROM visits WHERE id=:id AND ownerId=:owner") fun visit(id:String,owner:String):Flow<VisitEntity?>
 @Insert(onConflict=OnConflictStrategy.REPLACE) suspend fun upsertVisits(rows:List<VisitEntity>)
 @Insert(onConflict=OnConflictStrategy.REPLACE) suspend fun upsertEnvironment(row:EnvironmentEntity)
 @Insert(onConflict=OnConflictStrategy.REPLACE) suspend fun upsertElement(row:ElementEntity)
 @Insert(onConflict=OnConflictStrategy.REPLACE) suspend fun upsertMeasurement(row:MeasurementEntity)
 @Insert(onConflict=OnConflictStrategy.REPLACE) suspend fun upsertObservation(row:ObservationEntity)
 @Query("SELECT * FROM environments WHERE visitId=:visitId AND ownerId=:owner AND deletedAt IS NULL ORDER BY sequence") fun environments(visitId:String,owner:String):Flow<List<EnvironmentEntity>>
 @Query("SELECT * FROM elements WHERE environmentId=:id AND ownerId=:owner AND deletedAt IS NULL ORDER BY sequence") fun elements(id:String,owner:String):Flow<List<ElementEntity>>
 @Query("SELECT * FROM measurements WHERE elementId=:id AND ownerId=:owner AND deletedAt IS NULL ORDER BY groupName,name") fun measurements(id:String,owner:String):Flow<List<MeasurementEntity>>
 @Query("SELECT * FROM observations WHERE visitId=:id AND ownerId=:owner AND deletedAt IS NULL ORDER BY createdAt DESC") fun observations(id:String,owner:String):Flow<List<ObservationEntity>>
 @Query("SELECT * FROM environments WHERE id=:id AND ownerId=:owner") suspend fun environment(id:String,owner:String):EnvironmentEntity?
 @Query("SELECT * FROM elements WHERE id=:id AND ownerId=:owner") suspend fun element(id:String,owner:String):ElementEntity?
 @Query("SELECT * FROM measurements WHERE id=:id AND ownerId=:owner") suspend fun measurement(id:String,owner:String):MeasurementEntity?
 @Query("SELECT * FROM observations WHERE id=:id AND ownerId=:owner") suspend fun observation(id:String,owner:String):ObservationEntity?
 @Insert(onConflict=OnConflictStrategy.REPLACE) suspend fun enqueue(row:PendingMutationEntity)
 @Query("SELECT * FROM pending_mutations WHERE ownerId=:owner AND status IN ('PENDING','ERROR') ORDER BY createdAt LIMIT :limit") suspend fun nextMutations(owner:String,limit:Int=30):List<PendingMutationEntity>
 @Query("SELECT * FROM pending_mutations WHERE ownerId=:owner ORDER BY createdAt") fun mutations(owner:String):Flow<List<PendingMutationEntity>>
 @Query("UPDATE pending_mutations SET status=:status,attemptCount=attemptCount+:attempt,lastAttemptAt=:at,lastErrorCode=:code,lastErrorMessage=:message WHERE id=:id") suspend fun mutationState(id:String,status:String,attempt:Int,at:String?,code:String?,message:String?)
 @Query("DELETE FROM pending_mutations WHERE id=:id") suspend fun deleteMutation(id:String)
 @Query("SELECT COUNT(*) FROM pending_mutations WHERE ownerId=:owner AND visitId=:visitId") suspend fun pendingCount(owner:String,visitId:String):Int
 @Query("UPDATE environments SET syncState=:state,version=:version,lastSyncAt=:at,lastErrorCode=:code,lastErrorMessage=:message WHERE id=:id") suspend fun environmentSync(id:String,state:String,version:Int,at:String?,code:String?,message:String?)
 @Query("UPDATE elements SET syncState=:state,version=:version,lastSyncAt=:at,lastErrorCode=:code,lastErrorMessage=:message WHERE id=:id") suspend fun elementSync(id:String,state:String,version:Int,at:String?,code:String?,message:String?)
 @Query("UPDATE measurements SET syncState=:state,version=:version,lastSyncAt=:at,lastErrorCode=:code,lastErrorMessage=:message WHERE id=:id") suspend fun measurementSync(id:String,state:String,version:Int,at:String?,code:String?,message:String?)
 @Query("UPDATE observations SET syncState=:state,version=:version,lastSyncAt=:at,lastErrorCode=:code,lastErrorMessage=:message WHERE id=:id") suspend fun observationSync(id:String,state:String,version:Int,at:String?,code:String?,message:String?)
 @Insert(onConflict=OnConflictStrategy.REPLACE) suspend fun metadata(row:MetadataEntity)
 @Query("SELECT value FROM metadata WHERE `key`=:key") fun metadataValue(key:String):Flow<String?>
 @Query("DELETE FROM visits WHERE ownerId=:owner") suspend fun clearVisits(owner:String)
 @Query("DELETE FROM environments WHERE ownerId=:owner") suspend fun clearEnvironments(owner:String)
 @Query("DELETE FROM elements WHERE ownerId=:owner") suspend fun clearElements(owner:String)
 @Query("DELETE FROM measurements WHERE ownerId=:owner") suspend fun clearMeasurements(owner:String)
 @Query("DELETE FROM observations WHERE ownerId=:owner") suspend fun clearObservations(owner:String)
 @Query("DELETE FROM pending_mutations WHERE ownerId=:owner") suspend fun clearMutations(owner:String)
}

@Database(entities=[VisitEntity::class,EnvironmentEntity::class,ElementEntity::class,MeasurementEntity::class,ObservationEntity::class,MetadataEntity::class,PendingMutationEntity::class],version=2,exportSchema=true)
abstract class MeasureDatabase:RoomDatabase(){abstract fun dao():MeasureDao;companion object{
 val MIGRATION_1_2=object:Migration(1,2){override fun migrate(db:SupportSQLiteDatabase){
  db.execSQL("DROP TABLE IF EXISTS pending_operations")
  db.execSQL("ALTER TABLE environments RENAME TO legacy_environments")
  db.execSQL("DROP TABLE IF EXISTS measurements");db.execSQL("DROP TABLE IF EXISTS elements");db.execSQL("DROP TABLE IF EXISTS observations")
  db.execSQL("CREATE TABLE IF NOT EXISTS environments (id TEXT NOT NULL PRIMARY KEY, ownerId TEXT NOT NULL, visitId TEXT NOT NULL, name TEXT NOT NULL, code TEXT, floor TEXT, description TEXT, sequence INTEGER NOT NULL, status TEXT NOT NULL, notes TEXT, version INTEGER NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT, syncState TEXT NOT NULL, lastSyncAt TEXT, lastErrorCode TEXT, lastErrorMessage TEXT)")
  db.execSQL("CREATE TABLE IF NOT EXISTS elements (id TEXT NOT NULL PRIMARY KEY, ownerId TEXT NOT NULL, visitId TEXT NOT NULL, environmentId TEXT NOT NULL, name TEXT NOT NULL, code TEXT, type TEXT NOT NULL, quantity INTEGER NOT NULL, description TEXT, sequence INTEGER NOT NULL, status TEXT NOT NULL, attention INTEGER NOT NULL, responsibleId TEXT, version INTEGER NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT, syncState TEXT NOT NULL, lastSyncAt TEXT, lastErrorCode TEXT, lastErrorMessage TEXT)")
  db.execSQL("CREATE TABLE IF NOT EXISTS measurements (id TEXT NOT NULL PRIMARY KEY, ownerId TEXT NOT NULL, visitId TEXT NOT NULL, elementId TEXT NOT NULL, groupName TEXT, type TEXT NOT NULL, name TEXT NOT NULL, position TEXT, value REAL NOT NULL, unit TEXT NOT NULL, tolerance REAL, state TEXT NOT NULL, note TEXT, origin TEXT NOT NULL, measuredAt TEXT NOT NULL, version INTEGER NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT, syncState TEXT NOT NULL, lastSyncAt TEXT, lastErrorCode TEXT, lastErrorMessage TEXT)")
  db.execSQL("CREATE TABLE IF NOT EXISTS observations (id TEXT NOT NULL PRIMARY KEY, ownerId TEXT NOT NULL, visitId TEXT NOT NULL, environmentId TEXT, elementId TEXT, measurementId TEXT, category TEXT NOT NULL, text TEXT NOT NULL, important INTEGER NOT NULL, responsibleName TEXT, resolvedAt TEXT, version INTEGER NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT, syncState TEXT NOT NULL, lastSyncAt TEXT, lastErrorCode TEXT, lastErrorMessage TEXT)")
  db.execSQL("CREATE TABLE IF NOT EXISTS pending_mutations (id TEXT NOT NULL PRIMARY KEY, ownerId TEXT NOT NULL, visitId TEXT NOT NULL, entityType TEXT NOT NULL, entityId TEXT NOT NULL, operation TEXT NOT NULL, payload TEXT NOT NULL, expectedVersion INTEGER, status TEXT NOT NULL, attemptCount INTEGER NOT NULL, createdAt TEXT NOT NULL, lastAttemptAt TEXT, lastErrorCode TEXT, lastErrorMessage TEXT)")
  db.execSQL("INSERT INTO environments(id,ownerId,visitId,name,floor,sequence,status,version,createdAt,updatedAt,syncState) SELECT e.id,v.ownerId,e.visitId,e.name,e.floor,e.sequence,e.status,0,datetime('now'),datetime('now'),CASE WHEN e.syncState='SYNCED' THEN 'SYNCED' ELSE 'LOCAL_ONLY' END FROM legacy_environments e JOIN visits v ON v.id=e.visitId")
  db.execSQL("DROP TABLE legacy_environments")
  listOf(
   "CREATE INDEX IF NOT EXISTS index_environments_ownerId ON environments(ownerId)","CREATE INDEX IF NOT EXISTS index_environments_visitId ON environments(visitId)","CREATE INDEX IF NOT EXISTS index_environments_syncState ON environments(syncState)","CREATE INDEX IF NOT EXISTS index_environments_deletedAt ON environments(deletedAt)","CREATE INDEX IF NOT EXISTS index_environments_visitId_sequence ON environments(visitId,sequence)","CREATE INDEX IF NOT EXISTS index_environments_updatedAt ON environments(updatedAt)",
   "CREATE INDEX IF NOT EXISTS index_elements_ownerId ON elements(ownerId)","CREATE INDEX IF NOT EXISTS index_elements_visitId ON elements(visitId)","CREATE INDEX IF NOT EXISTS index_elements_environmentId ON elements(environmentId)","CREATE INDEX IF NOT EXISTS index_elements_syncState ON elements(syncState)","CREATE INDEX IF NOT EXISTS index_elements_deletedAt ON elements(deletedAt)","CREATE INDEX IF NOT EXISTS index_elements_environmentId_sequence ON elements(environmentId,sequence)","CREATE INDEX IF NOT EXISTS index_elements_updatedAt ON elements(updatedAt)",
   "CREATE INDEX IF NOT EXISTS index_measurements_ownerId ON measurements(ownerId)","CREATE INDEX IF NOT EXISTS index_measurements_visitId ON measurements(visitId)","CREATE INDEX IF NOT EXISTS index_measurements_elementId ON measurements(elementId)","CREATE INDEX IF NOT EXISTS index_measurements_syncState ON measurements(syncState)","CREATE INDEX IF NOT EXISTS index_measurements_deletedAt ON measurements(deletedAt)","CREATE INDEX IF NOT EXISTS index_measurements_updatedAt ON measurements(updatedAt)",
   "CREATE INDEX IF NOT EXISTS index_observations_ownerId ON observations(ownerId)","CREATE INDEX IF NOT EXISTS index_observations_visitId ON observations(visitId)","CREATE INDEX IF NOT EXISTS index_observations_environmentId ON observations(environmentId)","CREATE INDEX IF NOT EXISTS index_observations_elementId ON observations(elementId)","CREATE INDEX IF NOT EXISTS index_observations_measurementId ON observations(measurementId)","CREATE INDEX IF NOT EXISTS index_observations_syncState ON observations(syncState)","CREATE INDEX IF NOT EXISTS index_observations_deletedAt ON observations(deletedAt)","CREATE INDEX IF NOT EXISTS index_observations_updatedAt ON observations(updatedAt)",
   "CREATE INDEX IF NOT EXISTS index_pending_mutations_ownerId ON pending_mutations(ownerId)","CREATE INDEX IF NOT EXISTS index_pending_mutations_entityType ON pending_mutations(entityType)","CREATE INDEX IF NOT EXISTS index_pending_mutations_entityId ON pending_mutations(entityId)","CREATE INDEX IF NOT EXISTS index_pending_mutations_status ON pending_mutations(status)","CREATE INDEX IF NOT EXISTS index_pending_mutations_createdAt ON pending_mutations(createdAt)"
  ).forEach(db::execSQL)
 }}
 fun create(context:Context)=Room.databaseBuilder(context,MeasureDatabase::class.java,"measure.db").addMigrations(MIGRATION_1_2).build()
}}
