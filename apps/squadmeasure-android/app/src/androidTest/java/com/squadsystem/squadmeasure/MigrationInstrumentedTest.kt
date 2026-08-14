package com.squadsystem.squadmeasure

import androidx.room.testing.MigrationTestHelper
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.squadsystem.squadmeasure.core.database.MeasureDatabase
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class) class MigrationInstrumentedTest {
 @get:Rule val helper=MigrationTestHelper(InstrumentationRegistry.getInstrumentation(),MeasureDatabase::class.java)
 @Test fun migrate1To2(){helper.createDatabase(1).apply{close()};helper.runMigrationsAndValidate(2,listOf(MeasureDatabase.MIGRATION_1_2)).close()}
}
