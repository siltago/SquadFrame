package com.squadsystem.squadmeasure
import android.app.Application
import com.squadsystem.squadmeasure.data.AppContainer
class SquadMeasureApp:Application(){lateinit var container:AppContainer;override fun onCreate(){super.onCreate();container=AppContainer(this)}}
