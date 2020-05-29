package it.airgap.wallet.plugin

import com.getcapacitor.NativePlugin
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import it.airgap.wallet.BuildConfig
import it.airgap.wallet.util.applicationContext
import it.airgap.wallet.util.resolveWithData

@NativePlugin
class AppInfo : Plugin() {

    @PluginMethod
    fun get(call: PluginCall) {
        with (applicationContext) {
            call.resolveWithData(
                Key.APP_NAME to applicationInfo.loadLabel(packageManager),
                Key.PACKAGE_NAME to BuildConfig.APPLICATION_ID,
                Key.VERSION_NAME to BuildConfig.VERSION_NAME,
                Key.VERSION_CODE to BuildConfig.VERSION_CODE
            )
        }
    }

    private object Key {
        const val APP_NAME = "appName"
        const val PACKAGE_NAME = "packageName"
        const val VERSION_NAME = "versionName"
        const val VERSION_CODE = "versionCode"
    }
}