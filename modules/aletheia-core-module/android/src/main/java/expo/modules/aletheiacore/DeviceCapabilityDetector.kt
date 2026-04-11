package expo.modules.aletheiacore

import android.app.ActivityManager
import android.content.Context
import android.os.Build
import android.os.Process

/// Device capability detector for local inference
/// Checks if the device has sufficient resources to run Gemma 3n E2B
object DeviceCapabilityDetector {
    /// Minimum RAM required for local inference (2GB)
    private const val MIN_RAM_MB: Int = 2048
    
    /// Minimum CPU cores for acceptable performance
    private const val MIN_CPU_CORES: Int = 4
    
    /// Minimum Android version for good ML performance
    private const val MIN_SDK_VERSION: Int = Build.VERSION_CODES.O // API 26

    /// Detect device capability for local inference
    fun detect(context: Context): Map<String, Any?> {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
        
        // Get available RAM
        val memoryInfo = ActivityManager.MemoryInfo()
        activityManager?.getMemoryInfo(memoryInfo)
        val availableRamMb = (memoryInfo.availMem / (1024 * 1024)).toInt()
        val totalRamMb = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
            (memoryInfo.totalMem / (1024 * 1024)).toInt()
        } else {
            // Fallback for older devices
            val memInfoFile = java.io.File("/proc/meminfo")
            if (memInfoFile.exists()) {
                try {
                    val reader = java.io.BufferedReader(java.io.FileReader(memInfoFile))
                    val line = reader.readLine() ?: ""
                    reader.close()
                    // Parse "MemTotal: XXXXX kB"
                    val match = Regex("MemTotal:\\s+(\\d+)").find(line)
                    match?.groupValues?.get(1)?.toInt()?.div(1024) ?: 0
                } catch (e: Exception) {
                    0
                }
            } else {
                0
            }
        }
        
        // Get CPU cores
        val cpuCores = Runtime.getRuntime().availableProcessors()
        
        // Check for NEON support (ARM SIMD)
        val hasSimd = checkSimdSupport()
        
        // Check Android version
        val sdkVersion = Build.VERSION.SDK_INT
        
        // Check if device is low-end (affects inference speed)
        val isLowEnd = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            activityManager?.isLowRamDevice ?: true
        } else {
            totalRamMb < 2048
        }
        
        // Estimate inference speed based on device class
        val estimatedTps = estimateInferenceSpeed(cpuCores, totalRamMb, isLowEnd)
        
        // Determine if device is supported
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
        
        val supported = unsupportedReasons.isEmpty()
        
        return mapOf(
            "supported" to supported,
            "available_ram_mb" to availableRamMb,
            "cpu_cores" to cpuCores,
            "has_simd" to hasSimd,
            "estimated_tps" to estimatedTps,
            "unsupported_reason" to if (unsupportedReasons.isNotEmpty()) {
                unsupportedReasons.joinToString("; ")
            } else {
                null
            }
        )
    }
    
    /// Check for SIMD (NEON) support on ARM processors
    private fun checkSimdSupport(): Boolean {
        return try {
            // Check if NEON is supported via CPU features
            val cpuInfo = java.io.File("/proc/cpuinfo")
            if (cpuInfo.exists()) {
                val reader = java.io.BufferedReader(java.io.FileReader(cpuInfo))
                val content = reader.readText()
                reader.close()
                // Check for NEON in Features
                content.contains("neon", ignoreCase = true) || 
                    content.contains("asimd", ignoreCase = true) // ARMv8 SIMD
            } else {
                // Assume modern ARM devices have SIMD
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP
            }
        } catch (e: Exception) {
            // Default to true for modern devices
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP
        }
    }
    
    /// Estimate inference speed in tokens per second
    private fun estimateInferenceSpeed(cpuCores: Int, totalRamMb: Int, isLowEnd: Boolean): Float {
        // Base speed estimation
        // High-end: 8+ cores, 4GB+ RAM, not low-end -> ~10 tps
        // Mid-range: 6 cores, 3GB RAM -> ~5 tps
        // Low-end: 4 cores, 2GB RAM -> ~2 tps
        
        return when {
            cpuCores >= 8 && totalRamMb >= 4096 && !isLowEnd -> 10.0f
            cpuCores >= 6 && totalRamMb >= 3072 -> 5.0f
            else -> 2.0f
        }
    }
}
