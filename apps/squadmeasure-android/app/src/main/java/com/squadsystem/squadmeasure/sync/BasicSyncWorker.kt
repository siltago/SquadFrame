package com.squadsystem.squadmeasure.sync

import android.content.Context
import androidx.work.*
import com.squadsystem.squadmeasure.SquadMeasureApp
import java.util.concurrent.TimeUnit

class BasicSyncWorker(context:Context,params:WorkerParameters):CoroutineWorker(context,params){override suspend fun doWork():Result{val repo=(applicationContext as SquadMeasureApp).container.repository;if(repo.ownerId().isBlank())return Result.success();return when(repo.retrySync()){is com.squadsystem.squadmeasure.core.model.Result.Success->Result.success();is com.squadsystem.squadmeasure.core.model.Result.Failure->if(runAttemptCount<5)Result.retry()else Result.failure()}}}
object SyncScheduler{const val UNIQUE="squadmeasure-basic-sync";private fun constraints()=Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();fun enqueue(context:Context){val request=OneTimeWorkRequestBuilder<BasicSyncWorker>().setConstraints(constraints()).setBackoffCriteria(BackoffPolicy.EXPONENTIAL,30,TimeUnit.SECONDS).build();WorkManager.getInstance(context).enqueueUniqueWork(UNIQUE,ExistingWorkPolicy.KEEP,request)};fun periodic(context:Context){val request=PeriodicWorkRequestBuilder<BasicSyncWorker>(15,TimeUnit.MINUTES).setConstraints(constraints()).setBackoffCriteria(BackoffPolicy.EXPONENTIAL,30,TimeUnit.SECONDS).build();WorkManager.getInstance(context).enqueueUniquePeriodicWork("$UNIQUE-periodic",ExistingPeriodicWorkPolicy.KEEP,request)}}
