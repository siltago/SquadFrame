package com.squadsystem.squadmeasure

import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import org.junit.Rule
import org.junit.Test

class ComposeFieldTest {@get:Rule val compose=createComposeRule();@Test fun pendingAndErrorStatesAreVisible(){compose.setContent{MaterialTheme{SyncCard("Ambiente","ERROR","Falha de validação",null){}}};compose.onNodeWithText("ERROR").assertIsDisplayed();compose.onNodeWithText("Falha de validação").assertIsDisplayed()}}
