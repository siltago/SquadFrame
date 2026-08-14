package com.squadsystem.squadmeasure

import com.squadsystem.squadmeasure.core.database.*
import com.squadsystem.squadmeasure.core.model.*
import org.junit.Assert.*
import org.junit.Test

class FieldLogicTest {
 @Test fun commaDecimal(){assertEquals(12.5,(parseDecimal(" 12,5 ","largura") as Result.Success).value,0.0)}
 @Test fun dotDecimal(){assertEquals(12.5,(parseDecimal("12.5","largura") as Result.Success).value,0.0)}
 @Test fun zeroIsValid(){assertEquals(0.0,(parseDecimal("0","largura") as Result.Success).value,0.0)}
 @Test fun negativeIsRejectedForWidth(){assertTrue(parseDecimal("-1","largura") is Result.Failure)}
 @Test fun negativeIsAllowedForLevel(){assertEquals(-1.0,(parseDecimal("-1","nivel") as Result.Success).value,0.0)}
 @Test fun hugeAndEmptyAreRejected(){assertTrue(parseDecimal("","altura") is Result.Failure);assertTrue(parseDecimal("1000000000","altura") is Result.Failure)}
 @Test fun everySyncStateIsDistinct(){assertEquals(7,SyncState.entries.map{it.name}.toSet().size)}
 @Test fun parentMustBeConfirmed(){assertTrue(parentAllowsSync("SYNCED"));assertFalse(parentAllowsSync("PENDING"));assertFalse(parentAllowsSync(null))}
 @Test fun visitTransitionsAreConservative(){assertTrue(visitActionAllowed(VisitStatus.em_andamento,"pause"));assertTrue(visitActionAllowed(VisitStatus.pausada,"resume"));assertFalse(visitActionAllowed(VisitStatus.concluida,"start"))}
 @Test fun localEntitiesUseDeviceUuidAndPendingState(){val now="2026-08-06T00:00:00Z";val env=EnvironmentEntity("device-id","owner","visit","Sala",createdAt=now,updatedAt=now,syncState=SyncState.PENDING.name);assertEquals("device-id",env.id);assertEquals("PENDING",env.syncState);assertEquals(0,env.version)}
 @Test fun duplicateStructureStartsWithoutConfirmedValues(){val now="2026-08-06T00:00:00Z";val source=MeasurementEntity("a","owner","visit","element",type="largura",name="Largura",value=123.0,unit="mm",state="confirmada",measuredAt=now,createdAt=now,updatedAt=now,syncState="SYNCED");val copy=source.copy(id="b",value=0.0,state="provisoria",syncState="PENDING");assertEquals(0.0,copy.value,0.0);assertEquals("provisoria",copy.state)}
 @Test fun pendingMutationRetainsRetryAndConflictData(){val m=PendingMutationEntity("m","owner","visit","element","e","UPDATE","{}",1,"CONFLICT",3,"now","later","VERSION_CONFLICT","alterado");assertEquals(3,m.attemptCount);assertEquals("VERSION_CONFLICT",m.lastErrorCode)}
 @Test fun observationHasOnlyOneSpecificTarget(){val now="now";val observation=ObservationEntity("o","owner","visit",elementId="element",category="risco",text="Conferir",important=true,createdAt=now,updatedAt=now,syncState="PENDING");assertEquals(1,listOf(observation.environmentId,observation.elementId,observation.measurementId).count{it!=null})}
}
