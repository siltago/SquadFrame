package com.squadsystem.squadmeasure.ui
import androidx.compose.foundation.layout.*;import androidx.compose.material3.*;import androidx.compose.runtime.Composable;import androidx.compose.ui.Modifier;import androidx.compose.ui.graphics.Color;import androidx.compose.ui.unit.dp
private val Light=lightColorScheme(primary=Color(0xFF247C76),secondary=Color(0xFF3E6864),error=Color(0xFFBA1A1A));private val Dark=darkColorScheme(primary=Color(0xFF80D5CC),secondary=Color(0xFFA3CECA))
@Composable fun SquadTheme(dark:Boolean=false,content: @Composable ()->Unit)=MaterialTheme(colorScheme=if(dark)Dark else Light,content=content)
@Composable fun SquadButton(text:String,onClick:()->Unit,enabled:Boolean=true,modifier:Modifier=Modifier)=Button(onClick=onClick,enabled=enabled,modifier=modifier.heightIn(min=48.dp)){Text(text)}
@Composable fun OfflineBanner(online:Boolean){if(!online)Surface(color=MaterialTheme.colorScheme.errorContainer,modifier=Modifier.fillMaxWidth()){Text("Sem conexão — exibindo dados locais",modifier=Modifier.padding(12.dp))}}
