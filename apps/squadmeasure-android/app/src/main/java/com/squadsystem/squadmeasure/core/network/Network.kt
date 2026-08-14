package com.squadsystem.squadmeasure.core.network

import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import com.squadsystem.squadmeasure.BuildConfig
import com.squadsystem.squadmeasure.core.model.*
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.http.*
import java.time.Duration
import java.util.UUID

interface SessionStore{fun accessToken():String?;fun refreshToken():String?;fun ownerId():String?;fun save(access:String,refresh:String);fun saveOwner(id:String);fun clear()}
class AuthInterceptor(private val session:SessionStore):Interceptor{override fun intercept(chain:Interceptor.Chain):okhttp3.Response{val builder=chain.request().newBuilder().header("X-Request-ID",UUID.randomUUID().toString());session.accessToken()?.let{builder.header("Authorization","Bearer $it")};return chain.proceed(builder.build())}}
interface SupabaseAuthApi{@POST("auth/v1/token?grant_type=password")suspend fun login(@Body body:Map<String,String>):AuthResponse;@POST("auth/v1/token?grant_type=refresh_token")suspend fun refresh(@Body body:Map<String,String>):AuthResponse}
interface MobileApi{
 @GET("api/squadmeasure/mobile/bootstrap")suspend fun bootstrap():BootstrapDto
 @GET("api/squadmeasure/mobile/visits/{id}")suspend fun visit(@Path("id")id:String):JsonObject
 @POST("api/squadmeasure/mobile/environments")suspend fun createEnvironment(@Body body:JsonObject):Response<MutationResponse>
 @PATCH("api/squadmeasure/mobile/environments")suspend fun updateEnvironment(@Body body:JsonObject):Response<MutationResponse>
 @POST("api/squadmeasure/mobile/elements")suspend fun createElement(@Body body:JsonObject):Response<MutationResponse>
 @PATCH("api/squadmeasure/mobile/elements")suspend fun updateElement(@Body body:JsonObject):Response<MutationResponse>
 @POST("api/squadmeasure/mobile/measurements")suspend fun createMeasurement(@Body body:JsonObject):Response<MutationResponse>
 @PATCH("api/squadmeasure/mobile/measurements")suspend fun updateMeasurement(@Body body:JsonObject):Response<MutationResponse>
 @POST("api/squadmeasure/mobile/observations")suspend fun createObservation(@Body body:JsonObject):Response<MutationResponse>
 @PATCH("api/squadmeasure/mobile/observations")suspend fun updateObservation(@Body body:JsonObject):Response<MutationResponse>
 @POST("api/squadmeasure/mobile/visits/{id}/transition")suspend fun transition(@Path("id")id:String,@Body body:JsonObject):Response<MutationResponse>
}
data class ConfigurationState(val valid:Boolean,val missing:List<String>)
object NetworkFactory{
 val json=Json{ignoreUnknownKeys=true;explicitNulls=false}
 fun configuration():ConfigurationState{val missing=buildList{if(!validUrl(BuildConfig.SUPABASE_URL))add("URL do Supabase");if(BuildConfig.SUPABASE_ANON_KEY.isBlank())add("chave anônima do Supabase");if(!validUrl(BuildConfig.API_BASE_URL))add("URL da API")};return ConfigurationState(missing.isEmpty(),missing)}
 private fun validUrl(value:String)=value.trim().let{it.startsWith("https://")||BuildConfig.DEBUG&&it.startsWith("http://")}
 private fun baseUrl(value:String)=value.trim().takeIf(::validUrl)?.trimEnd('/')?.plus("/")?:"https://invalid.local/"
 private fun client(session:SessionStore)=OkHttpClient.Builder().connectTimeout(Duration.ofSeconds(15)).readTimeout(Duration.ofSeconds(30)).addInterceptor(AuthInterceptor(session)).addInterceptor{chain->val b=chain.request().newBuilder();if(BuildConfig.SUPABASE_ANON_KEY.isNotBlank())b.header("apikey",BuildConfig.SUPABASE_ANON_KEY);chain.proceed(b.build())}.build()
 fun auth(session:SessionStore)=Retrofit.Builder().baseUrl(baseUrl(BuildConfig.SUPABASE_URL)).client(client(session)).addConverterFactory(json.asConverterFactory("application/json".toMediaType())).build().create(SupabaseAuthApi::class.java)
 fun mobile(session:SessionStore)=Retrofit.Builder().baseUrl(baseUrl(BuildConfig.API_BASE_URL)).client(client(session)).addConverterFactory(json.asConverterFactory("application/json".toMediaType())).build().create(MobileApi::class.java)
}
