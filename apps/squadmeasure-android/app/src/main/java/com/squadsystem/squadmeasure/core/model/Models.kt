package com.squadsystem.squadmeasure.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

enum class SyncState { LOCAL_ONLY,PENDING,SYNCING,SYNCED,ERROR,CONFLICT,DELETED_PENDING }
enum class MutationOperation { CREATE,UPDATE,ARCHIVE,RESTORE,REORDER,RESOLVE,REOPEN,STATUS_CHANGE }
@Serializable enum class VisitStatus { agendada,disponivel_offline,em_deslocamento,em_andamento,pausada,aguardando_sincronizacao,aguardando_revisao,correcao_solicitada,concluida,cancelada }
@Serializable enum class VisitPriority { baixa,normal,alta,urgente }
@Serializable enum class MeasurementType { largura,altura,profundidade,diagonal_1,diagonal_2,espessura,folga,nivel,prumo,distancia,raio,angulo,quantidade,personalizada }
@Serializable enum class MeasurementUnit { mm,cm,m,graus,unidade }
@Serializable enum class MeasurementState { provisoria,confirmada,revisar,invalidada }
@Serializable enum class ObservationCategory { informacao,atencao,impedimento,decisao_cliente,pendencia,risco,revisao_necessaria }

data class MeasureVisit(val id:String,val workId:String,val workName:String,val clientName:String?,val address:String?,val responsibleName:String?,val status:VisitStatus,val priority:VisitPriority,val scheduledAt:String?,val progress:Int,val notes:String?,val version:Int,val syncState:SyncState)
sealed interface AppError { data object AuthenticationRequired:AppError;data object UserNotFound:AppError;data object PermissionDenied:AppError;data object NotFound:AppError;data object InvalidStatusTransition:AppError;data object EntityLocked:AppError;data class VersionConflict(val expected:Int=0,val actual:Int=0):AppError;data class Validation(val fields:Map<String,List<String>>):AppError;data object Database:AppError;data object RlsDenied:AppError;data object NetworkUnavailable:AppError;data object ServerUnavailable:AppError;data class Configuration(val missing:List<String>):AppError;data class Unknown(val cause:Throwable?):AppError }
sealed interface Result<out T>{data class Success<T>(val value:T):Result<T>;data class Failure(val error:AppError):Result<Nothing>}

@Serializable data class AuthResponse(@SerialName("access_token") val accessToken:String,@SerialName("refresh_token") val refreshToken:String,@SerialName("expires_in") val expiresIn:Long)
@Serializable data class BootstrapDto(val user:UserDto,val permissions:List<String>,val visits:List<VisitDto>,val minimumAppVersion:Int,val features:Map<String,Boolean>)
@Serializable data class UserDto(val id:String,val name:String,val email:String)
@Serializable data class VisitDto(val id:String,val workId:String,val workName:String,val clientName:String?=null,val address:String?=null,val responsibleName:String?=null,val status:VisitStatus,val priority:VisitPriority,val scheduledAt:String?=null,val progress:Int,val notes:String?=null,val version:Int=1)
@Serializable data class MutationResponse(val id:String,val version:Int=1)
@Serializable data class ErrorDto(val code:String,val fields:Map<String,List<String>>?=null)

fun parseDecimal(raw:String,type:String):Result<Double>{val cleaned=raw.trim().replace(',','.');val value=cleaned.toDoubleOrNull()?:return Result.Failure(AppError.Validation(mapOf("value" to listOf("Informe um número válido."))));if(!value.isFinite()||kotlin.math.abs(value)>999_999_999)return Result.Failure(AppError.Validation(mapOf("value" to listOf("Valor fora do limite permitido."))));if(value<0&&type !in setOf("nivel","prumo"))return Result.Failure(AppError.Validation(mapOf("value" to listOf("Valor negativo permitido apenas para nível ou prumo."))));return Result.Success(value)}
fun parentAllowsSync(parentState:String?)=parentState==SyncState.SYNCED.name
fun visitActionAllowed(status:VisitStatus,action:String)=when(action){"start"->status in setOf(VisitStatus.agendada,VisitStatus.disponivel_offline,VisitStatus.em_deslocamento);"pause"->status==VisitStatus.em_andamento;"resume"->status==VisitStatus.pausada;"submit_review"->status in setOf(VisitStatus.em_andamento,VisitStatus.correcao_solicitada);else->false}
