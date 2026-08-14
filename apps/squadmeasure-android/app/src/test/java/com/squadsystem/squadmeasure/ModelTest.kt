package com.squadsystem.squadmeasure
import com.squadsystem.squadmeasure.core.model.*
import kotlinx.serialization.json.Json
import org.junit.Assert.*
import org.junit.Test
class ModelTest {
 @Test fun backendEnumsRemainCompatible(){assertEquals("aguardando_revisao",VisitStatus.aguardando_revisao.name);assertEquals("revisao_necessaria",ObservationCategory.revisao_necessaria.name)}
 @Test fun bootstrapIgnoresFutureFields(){val json="""{"user":{"id":"1","name":"A","email":"a@a.com"},"permissions":["squadmeasure.visualizar"],"visits":[],"minimumAppVersion":1,"features":{"photos":false},"future":true}""";assertEquals("1",Json{ignoreUnknownKeys=true}.decodeFromString<BootstrapDto>(json).user.id)}
 @Test fun syncStateNeverAliasesSynced(){assertNotEquals(SyncState.SYNCED,SyncState.LOCAL_ONLY);assertNotEquals(SyncState.SYNCED,SyncState.ERROR)}
}
