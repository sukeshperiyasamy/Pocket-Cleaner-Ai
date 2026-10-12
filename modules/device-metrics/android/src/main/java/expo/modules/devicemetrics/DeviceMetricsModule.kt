package expo.modules.devicemetrics

import android.app.ActivityManager
import android.content.ContentUris
import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.StatFs
import android.provider.MediaStore
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class DeviceMetricsModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("React application context is not available")

  override fun definition() = ModuleDefinition {
    Name("DeviceMetrics")

    /**
     * getStorageSummary
     * Returns real device storage metrics measured using Android StatFs.
     * Accurately distinguishes between total filesystem capacity and available space.
     */
    AsyncFunction("getStorageSummary") {
      val dataDir = Environment.getDataDirectory()
      val statFs = StatFs(dataDir.path)

      val blockSize = statFs.blockSizeLong
      val totalBlocks = statFs.blockCountLong
      val availableBlocks = statFs.availableBlocksLong

      val totalBytes = totalBlocks * blockSize
      val availableBytes = availableBlocks * blockSize
      val usedBytes = (totalBytes - availableBytes).coerceAtLeast(0L)

      // Measure primary external storage (shared internal flash mounted under /sdcard or /storage/emulated/0)
      var externalTotalBytes = 0L
      var externalAvailableBytes = 0L
      try {
        val extDir = Environment.getExternalStorageDirectory()
        if (extDir != null && extDir.exists()) {
          val extStatFs = StatFs(extDir.path)
          externalTotalBytes = extStatFs.blockCountLong * extStatFs.blockSizeLong
          externalAvailableBytes = extStatFs.availableBlocksLong * extStatFs.blockSizeLong
        }
      } catch (e: Exception) {
        // Fallback to internal storage if external cannot be queried
      }

      val sdf = SimpleDateFormat("h:mm a", Locale.getDefault())
      val formattedTime = sdf.format(Date())

      mapOf(
        "totalBytes" to totalBytes.toDouble(),
        "availableBytes" to availableBytes.toDouble(),
        "usedBytes" to usedBytes.toDouble(),
        "externalTotalBytes" to (if (externalTotalBytes > 0L) externalTotalBytes.toDouble() else totalBytes.toDouble()),
        "externalAvailableBytes" to (if (externalAvailableBytes > 0L) externalAvailableBytes.toDouble() else availableBytes.toDouble()),
        "isAppAccessibleOnly" to false,
        "storagePath" to dataDir.absolutePath,
        "measurementTimestamp" to System.currentTimeMillis().toDouble(),
        "formattedTimestamp" to "Today, $formattedTime",
        "isMock" to false
      )
    }

    /**
     * getMemorySummary
     * Returns real system RAM telemetry queried via ActivityManager.MemoryInfo.
     */
    AsyncFunction("getMemorySummary") {
      val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
      val memoryInfo = ActivityManager.MemoryInfo()
      activityManager?.getMemoryInfo(memoryInfo)

      val totalBytes = memoryInfo.totalMem
      val availableBytes = memoryInfo.availMem
      val usedBytes = (totalBytes - availableBytes).coerceAtLeast(0L)
      val thresholdBytes = memoryInfo.threshold
      val isLowMemory = memoryInfo.lowMemory

      // Current application process heap consumption
      val runtime = Runtime.getRuntime()
      val appUsageBytes = (runtime.totalMemory() - runtime.freeMemory()).coerceAtLeast(0L)

      val pressurePercentage = if (totalBytes > 0L) {
        Math.round((usedBytes.toDouble() / totalBytes.toDouble()) * 100.0).toInt().coerceIn(0, 100)
      } else {
        0
      }

      val pressureLevel = when {
        isLowMemory || pressurePercentage >= 85 -> "critical"
        pressurePercentage >= 70 -> "moderate"
        else -> "normal"
      }

      val sdf = SimpleDateFormat("h:mm a", Locale.getDefault())
      val formattedTime = sdf.format(Date())

      mapOf(
        "totalBytes" to totalBytes.toDouble(),
        "availableBytes" to availableBytes.toDouble(),
        "usedBytes" to usedBytes.toDouble(),
        "thresholdBytes" to thresholdBytes.toDouble(),
        "isLowMemory" to isLowMemory,
        "appUsageBytes" to appUsageBytes.toDouble(),
        "pressureLevel" to pressureLevel,
        "pressurePercentage" to pressurePercentage,
        "measurementTimestamp" to System.currentTimeMillis().toDouble(),
        "lastUpdated" to "Measured at $formattedTime",
        "isMock" to false
      )
    }

    /**
     * checkStoragePermissions
     * Verifies if the app currently has permission to read device media via MediaStore.
     */
    AsyncFunction("checkStoragePermissions") {
      val hasPermission = checkMediaPermissions()
      mapOf(
        "hasPermission" to hasPermission,
        "sdkVersion" to Build.VERSION.SDK_INT
      )
    }

    /**
     * findLargeFiles
     * Discovers large files using Android's MediaStore with pagination and bounding.
     * Queries Videos, Images, Audio, and Downloads without loading file contents.
     */
    AsyncFunction("findLargeFiles") { minSizeBytes: Double, maxResults: Int ->
      val hasPermission = checkMediaPermissions()
      if (!hasPermission) {
        return@AsyncFunction mapOf(
          "hasPermission" to false,
          "files" to emptyList<Map<String, Any>>()
        )
      }

      val fileList = mutableListOf<Map<String, Any>>()
      val minBytesLong = minSizeBytes.toLong().coerceAtLeast(0L)
      val limit = maxResults.coerceIn(1, 100)

      val queryUris = mutableListOf<Pair<Uri, String>>(
        Pair(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, "videos"),
        Pair(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, "images"),
        Pair(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, "audio")
      )

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        queryUris.add(Pair(MediaStore.Downloads.EXTERNAL_CONTENT_URI, "downloads"))
      }

      val projection = arrayOf(
        MediaStore.MediaColumns._ID,
        MediaStore.MediaColumns.DISPLAY_NAME,
        MediaStore.MediaColumns.SIZE,
        MediaStore.MediaColumns.DATE_MODIFIED,
        MediaStore.MediaColumns.MIME_TYPE
      )

      val selection = "${MediaStore.MediaColumns.SIZE} >= ?"
      val selectionArgs = arrayOf(minBytesLong.toString())
      val sortOrder = "${MediaStore.MediaColumns.SIZE} DESC"

      val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())

      for ((uri, category) in queryUris) {
        try {
          context.contentResolver.query(
            uri,
            projection,
            selection,
            selectionArgs,
            sortOrder
          )?.use { cursor ->
            val idColumn = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns._ID)
            val nameColumn = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.DISPLAY_NAME)
            val sizeColumn = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.SIZE)
            val dateColumn = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.DATE_MODIFIED)
            val mimeColumn = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.MIME_TYPE)

            var categoryCount = 0
            while (cursor.moveToNext() && categoryCount < limit) {
              categoryCount++
              val id = cursor.getLong(idColumn)
              val name = cursor.getString(nameColumn) ?: "Unnamed_File"
              val size = cursor.getLong(sizeColumn)
              val dateModifiedSeconds = cursor.getLong(dateColumn)
              val mimeType = cursor.getString(mimeColumn) ?: ""

              val contentUri = ContentUris.withAppendedId(uri, id).toString()
              val ext = name.substringAfterLast('.', mimeType.substringAfterLast('/', "bin"))
              val formattedDate = if (dateModifiedSeconds > 0) {
                sdf.format(Date(dateModifiedSeconds * 1000L))
              } else {
                "Recent"
              }

              fileList.add(
                mapOf(
                  "id" to contentUri,
                  "name" to name,
                  "path" to contentUri,
                  "contentUri" to contentUri,
                  "sizeBytes" to size.toDouble(),
                  "category" to category,
                  "extension" to ext.lowercase(Locale.ROOT),
                  "lastModified" to formattedDate,
                  "isSafeToReview" to true,
                  "description" to "Real device file ($mimeType)",
                  "isMock" to false
                )
              )
            }
          }
        } catch (e: Exception) {
          // Gracefully continue to other categories if a specific table is restricted
        }
      }

      // Sort combined list descending by size and bound to maxResults
      val sortedResults = fileList
        .sortedByDescending { (it["sizeBytes"] as? Double) ?: 0.0 }
        .take(limit)

      mapOf(
        "hasPermission" to true,
        "files" to sortedResults
      )
    }

    /**
     * getCategoryBreakdown
     * Aggregates real file count and size totals across media categories.
     */
    AsyncFunction("getCategoryBreakdown") {
      val hasPermission = checkMediaPermissions()
      if (!hasPermission) {
        return@AsyncFunction mapOf(
          "hasPermission" to false,
          "categories" to emptyList<Map<String, Any>>()
        )
      }

      val categoriesList = mutableListOf<Map<String, Any>>()
      val targets = listOf(
        Triple(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, "videos", "Videos"),
        Triple(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, "images", "Images"),
        Triple(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, "audio", "Audio")
      )

      val projection = arrayOf(MediaStore.MediaColumns.SIZE)

      for ((uri, key, name) in targets) {
        var totalSize = 0L
        var count = 0

        try {
          context.contentResolver.query(uri, projection, null, null, null)?.use { cursor ->
            val sizeCol = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.SIZE)
            while (cursor.moveToNext()) {
              totalSize += cursor.getLong(sizeCol)
              count++
            }
          }
        } catch (e: Exception) {
          // Table query failed
        }

        categoriesList.add(
          mapOf(
            "category" to key,
            "name" to name,
            "sizeBytes" to totalSize.toDouble(),
            "fileCount" to count
          )
        )
      }

      mapOf(
        "hasPermission" to true,
        "categories" to categoriesList
      )
    }
  }

  private fun checkMediaPermissions(): Boolean {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      val images = context.checkSelfPermission(android.Manifest.permission.READ_MEDIA_IMAGES) == PackageManager.PERMISSION_GRANTED
      val video = context.checkSelfPermission(android.Manifest.permission.READ_MEDIA_VIDEO) == PackageManager.PERMISSION_GRANTED
      val audio = context.checkSelfPermission(android.Manifest.permission.READ_MEDIA_AUDIO) == PackageManager.PERMISSION_GRANTED
      images || video || audio
    } else {
      context.checkSelfPermission(android.Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED
    }
  }
}
