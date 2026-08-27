package com.squadmeasure;

import android.app.Application;
import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactHost;
import com.facebook.react.defaults.DefaultReactHost;
import java.util.Collections;
import kotlin.Unit;
import kotlin.jvm.functions.Function1;
import static com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative;

public class MainApplication extends Application implements ReactApplication {
  private ReactHost reactHost;

  private ReactHost createReactHost() {
    return DefaultReactHost.getDefaultReactHost(
        this,
        new PackageList(this).getPackages(),
        "index",
        "index.android.bundle",
        null,
        null,
        BuildConfig.DEBUG,
        Collections.emptyList(),
        (Function1<Exception, Unit>) exception -> { throw new RuntimeException(exception); },
        null);
  }

  @Override
  public synchronized ReactHost getReactHost() {
    if (reactHost == null) {
      reactHost = createReactHost();
    }
    return reactHost;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    loadReactNative(this);
    reactHost = createReactHost();
  }
}
