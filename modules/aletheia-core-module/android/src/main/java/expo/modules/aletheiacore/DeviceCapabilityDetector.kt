package expo.modules.aletheiacore

import android.app.ActivityManager
import android.content.Context
import android.os.Build

/// Device capability detector for local inference.
/// Checks if the device has sufficient resources to run Qwen3.5-2B.
/// minSdkVersion = 26 (Android O) — pre-O compatibility branches removed.
object DeviceCapabilityDetector {
    private const val MIN_RAM_MB: Int = LocalInferenceEngine.REQUIRED_RAM_MB
    private const val MIN_CPU_CORES: Int = 4
    private const val MIN_SDK_VERSION: Int = Build.VERSION_CODES.O // API 26

    fun detect(context: Context): Map<String, Any?> {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager

        val memoryInfo = ActivityManager.MemoryInfo()
        activityManager?.getMemoryInfo(memoryInfo)
        val availableRamMb = (memoryInfo.availMem / (1024 * 1024)).toInt()
        val totalRamMb = (memoryInfo.totalMem / (1024 * 1024)).toInt()

        val cpuCores = Runtime.getRuntime().availableProcessors()
        val hasSimd = checkSimdSupport()
        val sdkVersion = Build.VERSION.SDK_INT
        val isLowEnd = activityManager?.isLowRamDevice ?: true
        val estimatedTps = estimateInferenceSpeed(cpuCores, totalRamMb, isLowEnd)

        val unsupportedReasons = mutableListOf<String>()
        if (availableRamMb < MIN_RAM_MB) {
            unsupportedReasons.add("Insufficient RAM: ${availableRamMb}MB available, need ${MIN_RAM_MB}MB")
        }
        if (cpuCores < MIN_CPU_CORES) {
            unsupportedReasons.add("Insufficient CPU cores: $cpuCores cores, need $MIN_CPU_CORES")
        }
        if (sdkVersion < MIN_SDK_VERSION) {
            unsupportedReasons.add("Android version too old: API $sdkVersion, need API $MIN_SDK_VERSION")
        }

        return mapOf(
            "supported" to unsupportedReasons.isEmpty(),
            "available_ram_mb" to availableRamMb,
            "cpu_cores" to cpuCores,
            "has_simd" to hasSimd,
            "estimated_tps" to estimatedTps,
            "unsupported_reason" to unsupportedReasons.takeIf { it.isNotEmpty() }?.joinToString("; ")
        )
    }

    private fun checkSimdSupport(): Boolean {
        return try {
            val cpuInfo = java.io.File("/proc/cpuinfo")
            if (cpuInfo.exists()) {
                val content = cpuInfo.bufferedReader().use { it.readText() }
                content.contains("neon", ignoreCase = true) ||
                    content.contains("asimd", ignoreCase = true)
            } else {
                true // All ARM64 devices (our minSdk target) have SIMD
            }
        } catch (e: Exception) {
            true
        }
    }

    private fun estimateInferenceSpeed(cpuCores: Int, totalRamMb: Int, isLowEnd: Boolean): Float {
        return when {
            cpuCores >= 8 && totalRamMb >= 4096 && !isLowEnd -> 10.0f
            cpuCores >= 6 && totalRamMb >= 3072 -> 5.0f
            else -> 2.0f
        }
    }
}
