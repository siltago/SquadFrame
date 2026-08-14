import java.util.Properties

plugins { id("com.android.application"); id("org.jetbrains.kotlin.plugin.compose"); id("com.google.devtools.ksp"); id("org.jetbrains.kotlin.plugin.serialization"); id("androidx.room") }

val localProperties = Properties().apply {
    val file = rootProject.file("local.properties")
    if (file.exists()) file.inputStream().use { load(it) }
}
fun local(name: String): String = providers.gradleProperty(name).orNull ?: localProperties.getProperty(name, "")
android {
    namespace = "com.squadsystem.squadmeasure"
    compileSdk { version = release(37) }
    defaultConfig { applicationId = "com.squadsystem.squadmeasure"; minSdk = 26; targetSdk = 37; versionCode = 1; versionName = "0.1.0"; testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"; buildConfigField("String", "SUPABASE_URL", "\"${local("SQUADMEASURE_SUPABASE_URL")}\""); buildConfigField("String", "SUPABASE_ANON_KEY", "\"${local("SQUADMEASURE_SUPABASE_ANON_KEY")}\""); buildConfigField("String", "API_BASE_URL", "\"${local("SQUADMEASURE_API_BASE_URL")}\"") }
    buildFeatures { compose = true; buildConfig = true }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    buildTypes { debug { applicationIdSuffix = ".debug" }; release { isMinifyEnabled = true; proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro") } }
    packaging { resources.excludes += "/META-INF/{AL2.0,LGPL2.1}" }
}
kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) } }
room { schemaDirectory("$projectDir/schemas") }

dependencies {
    implementation(platform("androidx.compose:compose-bom:2026.05.00")); androidTestImplementation(platform("androidx.compose:compose-bom:2026.05.00"))
    implementation("androidx.activity:activity-compose:1.12.3"); implementation("androidx.compose.material3:material3"); implementation("androidx.compose.material:material-icons-extended"); implementation("androidx.navigation:navigation-compose:2.9.7"); implementation("androidx.lifecycle:lifecycle-runtime-compose:2.10.0"); implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.10.0")
    implementation("androidx.room:room-runtime:2.8.4"); implementation("androidx.room:room-ktx:2.8.4"); ksp("androidx.room:room-compiler:2.8.4")
    implementation("androidx.security:security-crypto:1.1.0"); implementation("androidx.work:work-runtime-ktx:2.11.1")
    implementation("com.squareup.retrofit2:retrofit:3.0.0"); implementation("com.squareup.okhttp3:logging-interceptor:5.3.2"); implementation("com.jakewharton.retrofit:retrofit2-kotlinx-serialization-converter:1.0.0"); implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.9.0"); implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    testImplementation("junit:junit:4.13.2"); testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.10.2"); testImplementation("androidx.room:room-testing:2.8.4"); testImplementation("com.squareup.okhttp3:mockwebserver:5.3.2")
    androidTestImplementation("androidx.test.ext:junit:1.3.0"); androidTestImplementation("androidx.test:core-ktx:1.7.0"); androidTestImplementation("androidx.test.espresso:espresso-core:3.7.0"); androidTestImplementation("androidx.compose.ui:ui-test-junit4"); androidTestImplementation("androidx.room:room-testing:2.8.4"); debugImplementation("androidx.compose.ui:ui-test-manifest")
}
