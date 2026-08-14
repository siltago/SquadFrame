package com.squadsystem.squadmeasure

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.squadsystem.squadmeasure.core.database.*
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.*
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class) class DatabaseInstrumentedTest {
 private lateinit var db:MeasureDatabase
 @Before fun open(){db=Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(),MeasureDatabase::class.java).build()}
 @After fun close(){db.close()}
 @Test fun relationsSoftDeleteQueuePersistenceAndOwnerIsolation()=runBlocking{val dao=db.dao();dao.upsertVisits(listOf(visit("v1","a"),visit("v2","b")));val now="now";dao.upsertEnvironment(EnvironmentEntity("e1","a","v1","Sala",createdAt=now,updatedAt=now,syncState="PENDING"));dao.upsertEnvironment(EnvironmentEntity("e2","b","v2","Quarto",createdAt=now,updatedAt=now,syncState="SYNCED"));dao.upsertEnvironment(EnvironmentEntity("deleted","a","v1","Arquivo",createdAt=now,updatedAt=now,deletedAt=now,syncState="DELETED_PENDING"));dao.enqueue(PendingMutationEntity("m","a","v1","environment","e1","CREATE","{}",createdAt=now));Assert.assertEquals(listOf("e1"),dao.environments("v1","a").first().map{it.id});Assert.assertTrue(dao.environments("v1","b").first().isEmpty());Assert.assertEquals("m",dao.nextMutations("a").single().id)}
 private fun visit(id:String,owner:String)=VisitEntity(id,owner,"work","Obra",null,null,null,"agendada","normal",null,0,null,1,"SYNCED",null)
}
