package expo.modules.devicemetrics

import android.app.Activity
import android.app.ActivityManager
import android.content.ContentUris
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.StatFs
import android.provider.DocumentsContract
import android.provider.MediaStore
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

import androidx.core.content.pm.PackageInfoCompat
import androidx.documentfile.provider.DocumentFile
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.Executors

class DeviceMetricsModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("React application context is not available")

  private val DELETE_REQUEST_CODE = 4429
  private val OPEN_TREE_REQUEST_CODE = 4430

  // Deletion request state
  private var pendingDeletePromise: Promise? = null
  private var pendingDeleteMediaStoreCount: Int = 0
  private var pendingDeleteSafCount: Int = 0

  // SAF directory picker state
  private var pendingSafPickerPromise: Promise? = null

  // Background thread executor for non-blocking storage scanning
  private val scanExecutor = Executors.newSingleThreadExecutor()
  private var activeScanFuture: java.util.concurrent.Future<*>? = null

  // In-app media player instance for audio preview
  private var mediaPlayer: MediaPlayer? = null
  private var currentAudioUri: String? = null
  private var currentAudioDurationMs: Int = 0

  override fun definition() = ModuleDefinition {
    Name("DeviceMetrics")

    OnActivityResult { _, payload ->
      if (payload.requestCode == DELETE_REQUEST_CODE) {
        val promise = pendingDeletePromise
        val mediaCount = pendingDeleteMediaStoreCount
        val safCount = pendingDeleteSafCount
        pendingDeletePromise = null
        pendingDeleteMediaStoreCount = 0
        pendingDeleteSafCount = 0

        if (promise != null) {
          val isConfirmed = (payload.resultCode == Activity.RESULT_OK)
          promise.resolve(
            mapOf(
              "success" to isConfirmed,
              "deletedCount" to (if (isConfirmed) mediaCount + safCount else safCount),
              "cancelled" to !isConfirmed,
              "status" to (if (isConfirmed) "success" else "cancelled"),
              "safDeletedCount" to safCount
            )
          )
        }
      } else if (payload.requestCode == OPEN_TREE_REQUEST_CODE) {
        val promise = pendingSafPickerPromise
        pendingSafPickerPromise = null
        if (promise != null) {
          val treeUri = payload.data?.data
          if (payload.resultCode == Activity.RESULT_OK && treeUri != null) {
            val takeFlags = (Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
            try {
              context.contentResolver.takePersistableUriPermission(treeUri, takeFlags)
            } catch (e: Exception) {
              // Not persistable or already granted
            }
            var folderName = treeUri.lastPathSegment ?: "Selected Folder"
            try {
              val docFile = DocumentFile.fromTreeUri(context, treeUri)
              if (docFile != null && docFile.name != null) {
                folderName = docFile.name!!
              }
            } catch (e: Exception) {
              // Fallback
            }
            promise.resolve(
              mapOf(
                "success" to true,
                "treeUri" to treeUri.toString(),
                "name" to folderName,
                "cancelled" to false
              )
            )
          } else {
            promise.resolve(
              mapOf(
                "success" to false,
                "treeUri" to null,
                "name" to null,
                "cancelled" to true
              )
            )
          }
        }
      }
    }

    OnDestroy {
      try {
        mediaPlayer?.release()
        mediaPlayer = null
        currentAudioUri = null
        scanExecutor.shutdown()
      } catch (e: Exception) {
        // Safe cleanup
      }
    }

    /**
     * getStorageSummary
     * Returns real device storage metrics measured using Android StatFs.
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
        // Fallback
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
     */
    AsyncFunction("checkStoragePermissions") {
      val hasPermission = checkMediaPermissions()
      mapOf(
        "hasPermission" to hasPermission,
        "sdkVersion" to Build.VERSION.SDK_INT
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
      val targets = mutableListOf(
        Triple(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, "videos", "Videos"),
        Triple(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, "images", "Photos"),
        Triple(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, "audio", "Audio")
      )

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        targets.add(Triple(MediaStore.Downloads.EXTERNAL_CONTENT_URI, "downloads", "Downloads"))
      }

      val projection = arrayOf(MediaStore.MediaColumns.SIZE)

      for ((uri, key, name) in targets) {
        var totalSize = 0L
        var count = 0

        try {
          context.contentResolver.query(uri, projection, null, null, null)?.use { cursor ->
            val sizeCol = cursor.getColumnIndex(MediaStore.MediaColumns.SIZE)
            while (cursor.moveToNext()) {
              if (sizeCol >= 0 && !cursor.isNull(sizeCol)) {
                totalSize += cursor.getLong(sizeCol)
              }
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

    /**
     * getMediaFiles
     * Phase 3: Category-specific querying with rich metadata (duration, width, height, artist),
     * numeric sorting, deterministic ties, pagination, and diagnostic counts.
     */
    AsyncFunction("getMediaFiles") { category: String, minSizeBytes: Double, limit: Int, offset: Int, sortBy: String, sortOrder: String ->
      val hasPermission = checkMediaPermissions()
      if (!hasPermission) {
        return@AsyncFunction mapOf(
          "hasPermission" to false,
          "category" to category,
          "totalCountInMediaStore" to 0,
          "validMappedCount" to 0,
          "files" to emptyList<Map<String, Any>>(),
          "error" to "Media permissions not granted"
        )
      }

      val safeLimit = limit.coerceIn(1, 500)
      val safeOffset = offset.coerceAtLeast(0)
      val minBytes = minSizeBytes.toLong().coerceAtLeast(0L)

      val queryTargets = mutableListOf<Pair<Uri, String>>()
      when (category.lowercase(Locale.ROOT)) {
        "images", "photos" -> queryTargets.add(Pair(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, "images"))
        "videos" -> queryTargets.add(Pair(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, "videos"))
        "audio" -> queryTargets.add(Pair(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, "audio"))
        "downloads" -> {
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            queryTargets.add(Pair(MediaStore.Downloads.EXTERNAL_CONTENT_URI, "downloads"))
          }
        }
        else -> {
          // "all"
          queryTargets.add(Pair(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, "videos"))
          queryTargets.add(Pair(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, "images"))
          queryTargets.add(Pair(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, "audio"))
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            queryTargets.add(Pair(MediaStore.Downloads.EXTERNAL_CONTENT_URI, "downloads"))
          }
        }
      }

      val sortColumn = when (sortBy.lowercase(Locale.ROOT)) {
        "name" -> MediaStore.MediaColumns.DISPLAY_NAME
        "date" -> MediaStore.MediaColumns.DATE_MODIFIED
        else -> MediaStore.MediaColumns.SIZE
      }
      val direction = if (sortOrder.equals("asc", ignoreCase = true)) "ASC" else "DESC"
      val sqlSortOrder = "$sortColumn $direction, ${MediaStore.MediaColumns._ID} DESC"

      val selection = if (minBytes > 0L) "${MediaStore.MediaColumns.SIZE} >= ?" else null
      val selectionArgs = if (minBytes > 0L) arrayOf(minBytes.toString()) else null

      val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
      val collectedFiles = mutableListOf<Map<String, Any>>()
      var totalFoundInMediaStore = 0

      for ((collectionUri, catName) in queryTargets) {
        val projection = mutableListOf(
          MediaStore.MediaColumns._ID,
          MediaStore.MediaColumns.DISPLAY_NAME,
          MediaStore.MediaColumns.SIZE,
          MediaStore.MediaColumns.DATE_MODIFIED,
          MediaStore.MediaColumns.MIME_TYPE
        )

        if (catName == "videos" || catName == "audio") {
          projection.add(MediaStore.MediaColumns.DURATION)
        }
        if (catName == "videos" || catName == "images") {
          projection.add(MediaStore.MediaColumns.WIDTH)
          projection.add(MediaStore.MediaColumns.HEIGHT)
        }
        if (catName == "audio") {
          projection.add(MediaStore.Audio.AudioColumns.ARTIST)
          projection.add(MediaStore.Audio.AudioColumns.ALBUM)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && catName == "downloads") {
          projection.add(MediaStore.MediaColumns.RELATIVE_PATH)
        }

        try {
          context.contentResolver.query(
            collectionUri,
            projection.toTypedArray(),
            selection,
            selectionArgs,
            sqlSortOrder
          )?.use { cursor ->
            totalFoundInMediaStore += cursor.count

            val idCol = cursor.getColumnIndex(MediaStore.MediaColumns._ID)
            val nameCol = cursor.getColumnIndex(MediaStore.MediaColumns.DISPLAY_NAME)
            val sizeCol = cursor.getColumnIndex(MediaStore.MediaColumns.SIZE)
            val dateCol = cursor.getColumnIndex(MediaStore.MediaColumns.DATE_MODIFIED)
            val mimeCol = cursor.getColumnIndex(MediaStore.MediaColumns.MIME_TYPE)
            val durCol = cursor.getColumnIndex(MediaStore.MediaColumns.DURATION)
            val wCol = cursor.getColumnIndex(MediaStore.MediaColumns.WIDTH)
            val hCol = cursor.getColumnIndex(MediaStore.MediaColumns.HEIGHT)
            val artistCol = cursor.getColumnIndex(MediaStore.Audio.AudioColumns.ARTIST)
            val albumCol = cursor.getColumnIndex(MediaStore.Audio.AudioColumns.ALBUM)
            val relPathCol = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
              cursor.getColumnIndex(MediaStore.MediaColumns.RELATIVE_PATH)
            } else -1

            // In single category mode, we can honor offset & limit in cursor traversal
            var currentPos = 0
            while (cursor.moveToNext()) {
              currentPos++
              // If single category, apply offset here. If multi ("all"), collect candidate records then sort
              if (queryTargets.size == 1 && currentPos <= safeOffset) {
                continue
              }
              if (queryTargets.size == 1 && collectedFiles.size >= safeLimit) {
                break
              }

              val id = if (idCol >= 0 && !cursor.isNull(idCol)) cursor.getLong(idCol) else continue
              val name = if (nameCol >= 0 && !cursor.isNull(nameCol)) cursor.getString(nameCol) ?: "Unnamed_File" else "Unnamed_File"
              val size = if (sizeCol >= 0 && !cursor.isNull(sizeCol)) cursor.getLong(sizeCol) else 0L
              val dateSec = if (dateCol >= 0 && !cursor.isNull(dateCol)) cursor.getLong(dateCol) else 0L
              val mimeType = if (mimeCol >= 0 && !cursor.isNull(mimeCol)) cursor.getString(mimeCol) ?: "" else ""

              val durationMs = if (durCol >= 0 && !cursor.isNull(durCol)) cursor.getLong(durCol) else 0L
              val width = if (wCol >= 0 && !cursor.isNull(wCol)) cursor.getInt(wCol) else 0
              val height = if (hCol >= 0 && !cursor.isNull(hCol)) cursor.getInt(hCol) else 0
              val artist = if (artistCol >= 0 && !cursor.isNull(artistCol)) cursor.getString(artistCol) else null
              val album = if (albumCol >= 0 && !cursor.isNull(albumCol)) cursor.getString(albumCol) else null
              val relPath = if (relPathCol >= 0 && !cursor.isNull(relPathCol)) cursor.getString(relPathCol) else null

              val contentUri = ContentUris.withAppendedId(collectionUri, id).toString()
              val ext = name.substringAfterLast('.', mimeType.substringAfterLast('/', "bin"))
              val formattedDate = if (dateSec > 0) sdf.format(Date(dateSec * 1000L)) else "Recent"

              val fileMap = mutableMapOf<String, Any>(
                "id" to contentUri,
                "name" to name,
                "path" to (relPath ?: contentUri),
                "contentUri" to contentUri,
                "sizeBytes" to size.toDouble(),
                "category" to catName,
                "extension" to ext.lowercase(Locale.ROOT),
                "lastModified" to formattedDate,
                "dateModifiedTimestamp" to (dateSec * 1000L).toDouble(),
                "mimeType" to mimeType,
                "durationMs" to durationMs.toDouble(),
                "width" to width,
                "height" to height,
                "isSafeToReview" to true,
                "description" to "$catName • $mimeType",
                "isMock" to false
              )

              if (!artist.isNullOrBlank()) fileMap["artist"] = artist
              if (!album.isNullOrBlank()) fileMap["album"] = album
              if (!relPath.isNullOrBlank()) fileMap["relativePath"] = relPath

              collectedFiles.add(fileMap)

              // If multi-target ("all"), limit per-category collection to prevent runaway heap
              if (queryTargets.size > 1 && collectedFiles.size >= safeLimit * 2) {
                break
              }
            }
          }
        } catch (e: Exception) {
          // Continue to next collection
        }
      }

      // If querying across all categories, sort numerically by requested criteria and slice
      val finalFiles = if (queryTargets.size > 1) {
        val comparator = when (sortBy.lowercase(Locale.ROOT)) {
          "name" -> Comparator<Map<String, Any>> { a, b ->
            val nameA = (a["name"] as? String) ?: ""
            val nameB = (b["name"] as? String) ?: ""
            nameA.compareTo(nameB)
          }
          "date" -> Comparator<Map<String, Any>> { a, b ->
            val dateA = (a["dateModifiedTimestamp"] as? Double) ?: 0.0
            val dateB = (b["dateModifiedTimestamp"] as? Double) ?: 0.0
            dateA.compareTo(dateB)
          }
          else -> Comparator<Map<String, Any>> { a, b ->
            val sizeA = (a["sizeBytes"] as? Double) ?: 0.0
            val sizeB = (b["sizeBytes"] as? Double) ?: 0.0
            sizeA.compareTo(sizeB)
          }
        }

        val directedComparator = if (sortOrder.equals("asc", ignoreCase = true)) {
          comparator
        } else {
          comparator.reversed()
        }

        // Add deterministic secondary comparator by id
        val deterministicComparator = directedComparator.thenComparing { a, b ->
          val idA = (a["id"] as? String) ?: ""
          val idB = (b["id"] as? String) ?: ""
          idB.compareTo(idA)
        }

        collectedFiles.sortedWith(deterministicComparator)
          .drop(safeOffset)
          .take(safeLimit)
      } else {
        collectedFiles
      }

      mapOf(
        "hasPermission" to true,
        "category" to category,
        "totalCountInMediaStore" to totalFoundInMediaStore,
        "validMappedCount" to finalFiles.size,
        "limit" to safeLimit,
        "offset" to safeOffset,
        "sortBy" to sortBy,
        "sortOrder" to sortOrder,
        "files" to finalFiles,
        "error" to null
      )
    }

    /**
     * findLargeFiles
     * Kept for backward compatibility. Uses getMediaFiles internally.
     */
    AsyncFunction("findLargeFiles") { minSizeBytes: Double, maxResults: Int ->
      val hasPermission = checkMediaPermissions()
      if (!hasPermission) {
        return@AsyncFunction mapOf(
          "hasPermission" to false,
          "files" to emptyList<Map<String, Any>>()
        )
      }

      val limit = maxResults.coerceIn(1, 100)
      val queryTargets = listOf(
        Pair(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, "videos"),
        Pair(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, "images"),
        Pair(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, "audio")
      )

      val projection = arrayOf(
        MediaStore.MediaColumns._ID,
        MediaStore.MediaColumns.DISPLAY_NAME,
        MediaStore.MediaColumns.SIZE,
        MediaStore.MediaColumns.DATE_MODIFIED,
        MediaStore.MediaColumns.MIME_TYPE
      )

      val minBytes = minSizeBytes.toLong().coerceAtLeast(0L)
      val selection = if (minBytes > 0L) "${MediaStore.MediaColumns.SIZE} >= ?" else null
      val selectionArgs = if (minBytes > 0L) arrayOf(minBytes.toString()) else null
      val sortOrder = "${MediaStore.MediaColumns.SIZE} DESC, ${MediaStore.MediaColumns._ID} DESC"

      val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
      val fileList = mutableListOf<Map<String, Any>>()

      for ((uri, category) in queryTargets) {
        try {
          context.contentResolver.query(uri, projection, selection, selectionArgs, sortOrder)?.use { cursor ->
            val idCol = cursor.getColumnIndex(MediaStore.MediaColumns._ID)
            val nameCol = cursor.getColumnIndex(MediaStore.MediaColumns.DISPLAY_NAME)
            val sizeCol = cursor.getColumnIndex(MediaStore.MediaColumns.SIZE)
            val dateCol = cursor.getColumnIndex(MediaStore.MediaColumns.DATE_MODIFIED)
            val mimeCol = cursor.getColumnIndex(MediaStore.MediaColumns.MIME_TYPE)

            var count = 0
            while (cursor.moveToNext() && count < limit) {
              count++
              val id = if (idCol >= 0 && !cursor.isNull(idCol)) cursor.getLong(idCol) else continue
              val name = if (nameCol >= 0 && !cursor.isNull(nameCol)) cursor.getString(nameCol) ?: "Unnamed_File" else "Unnamed_File"
              val size = if (sizeCol >= 0 && !cursor.isNull(sizeCol)) cursor.getLong(sizeCol) else 0L
              val dateSec = if (dateCol >= 0 && !cursor.isNull(dateCol)) cursor.getLong(dateCol) else 0L
              val mimeType = if (mimeCol >= 0 && !cursor.isNull(mimeCol)) cursor.getString(mimeCol) ?: "" else ""

              val contentUri = ContentUris.withAppendedId(uri, id).toString()
              val ext = name.substringAfterLast('.', mimeType.substringAfterLast('/', "bin"))
              val formattedDate = if (dateSec > 0) sdf.format(Date(dateSec * 1000L)) else "Recent"

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
          // Table query failed
        }
      }

      val sorted = fileList
        .sortedByDescending { (it["sizeBytes"] as? Double) ?: 0.0 }
        .take(limit)

      mapOf(
        "hasPermission" to true,
        "files" to sorted
      )
    }

    /**
     * requestDeleteFiles
     * Phase 4 Safe Cleanup: Uses Android 11+ MediaStore.createDeleteRequest for user consent
     * or Storage Access Framework (SAF) document operations.
     */
    AsyncFunction("requestDeleteFiles") { contentUris: List<String>, promise: Promise ->
      if (contentUris.isEmpty()) {
        promise.resolve(
          mapOf(
            "success" to true,
            "deletedCount" to 0,
            "cancelled" to false,
            "status" to "success"
          )
        )
        return@AsyncFunction
      }

      val uris = contentUris.map { Uri.parse(it) }

      // Separate SAF Document URIs from standard MediaStore URIs
      val (safUris, mediaStoreUris) = uris.partition { uri ->
        try {
          DocumentsContract.isDocumentUri(context, uri)
        } catch (e: Exception) {
          false
        }
      }

      var safDeleted = 0
      for (safUri in safUris) {
        try {
          if (DocumentsContract.deleteDocument(context.contentResolver, safUri)) {
            safDeleted++
          }
        } catch (e: Exception) {
          // Ignored
        }
      }

      if (mediaStoreUris.isNotEmpty()) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
          // Android 11+ official user-consent deletion flow
          try {
            val pendingIntent = MediaStore.createDeleteRequest(context.contentResolver, mediaStoreUris)
            val currentActivity = appContext.currentActivity
            if (currentActivity != null) {
              pendingDeletePromise = promise
              pendingDeleteMediaStoreCount = mediaStoreUris.size
              pendingDeleteSafCount = safDeleted

              currentActivity.startIntentSenderForResult(
                pendingIntent.intentSender,
                DELETE_REQUEST_CODE,
                null,
                0,
                0,
                0
              )
            } else {
              promise.reject("ERR_NO_ACTIVITY", "Current Android Activity is null", null)
            }
          } catch (e: Exception) {
            promise.resolve(
              mapOf(
                "success" to false,
                "deletedCount" to safDeleted,
                "cancelled" to false,
                "status" to "failed",
                "error" to (e.message ?: "Failed to initiate MediaStore deletion request")
              )
            )
          }
        } else {
          // Android 10 or earlier fallback
          var directDeleted = safDeleted
          for (msUri in mediaStoreUris) {
            try {
              val count = context.contentResolver.delete(msUri, null, null)
              if (count > 0) directDeleted++
            } catch (e: Exception) {
              // May throw RecoverableSecurityException on Android 10
            }
          }
          promise.resolve(
            mapOf(
              "success" to (directDeleted > 0),
              "deletedCount" to directDeleted,
              "cancelled" to false,
              "status" to (if (directDeleted > 0) "success" else "failed")
            )
          )
        }
      } else {
        promise.resolve(
          mapOf(
            "success" to (safDeleted > 0),
            "deletedCount" to safDeleted,
            "cancelled" to false,
            "status" to (if (safDeleted > 0) "success" else "failed"),
            "safDeletedCount" to safDeleted
          )
        )
      }
    }

    /**
     * openMediaInSystemViewer
     * Launches the native Android system viewer (Gallery / Video Player) safely.
     */
    AsyncFunction("openMediaInSystemViewer") { contentUriStr: String, mimeType: String? ->
      try {
        val uri = Uri.parse(contentUriStr)
        val finalMime = if (!mimeType.isNullOrBlank()) mimeType else "*/*"
        val intent = Intent(Intent.ACTION_VIEW).apply {
          setDataAndType(uri, finalMime)
          addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        val chooser = Intent.createChooser(intent, "Open media preview")
        chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(chooser)
        mapOf("success" to true)
      } catch (e: Exception) {
        mapOf("success" to false, "error" to (e.message ?: "Failed to launch system viewer"))
      }
    }

    /**
     * Audio Preview: playAudio
     */
    AsyncFunction("playAudio") { contentUriStr: String ->
      try {
        if (mediaPlayer != null) {
          if (currentAudioUri == contentUriStr) {
            if (!mediaPlayer!!.isPlaying) {
              mediaPlayer!!.start()
            }
            return@AsyncFunction mapOf(
              "isPlaying" to true,
              "uri" to contentUriStr,
              "positionMs" to mediaPlayer!!.currentPosition,
              "durationMs" to currentAudioDurationMs
            )
          }
          mediaPlayer?.release()
          mediaPlayer = null
        }

        val player = MediaPlayer()
        player.setAudioAttributes(
          AudioAttributes.Builder()
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .build()
        )
        val uri = Uri.parse(contentUriStr)
        player.setDataSource(context, uri)
        player.prepare()
        player.start()

        currentAudioUri = contentUriStr
        currentAudioDurationMs = player.duration
        mediaPlayer = player

        player.setOnCompletionListener {
          currentAudioUri = null
        }

        mapOf(
          "isPlaying" to true,
          "uri" to contentUriStr,
          "positionMs" to 0,
          "durationMs" to currentAudioDurationMs
        )
      } catch (e: Exception) {
        mapOf(
          "isPlaying" to false,
          "uri" to contentUriStr,
          "positionMs" to 0,
          "durationMs" to 0,
          "error" to (e.message ?: "Audio playback failed")
        )
      }
    }

    /**
     * Audio Preview: pauseAudio
     */
    AsyncFunction("pauseAudio") {
      val player = mediaPlayer
      if (player != null && player.isPlaying) {
        player.pause()
      }
      mapOf(
        "isPlaying" to false,
        "uri" to currentAudioUri,
        "positionMs" to (player?.currentPosition ?: 0),
        "durationMs" to currentAudioDurationMs
      )
    }

    /**
     * Audio Preview: stopAudio
     */
    AsyncFunction("stopAudio") {
      try {
        mediaPlayer?.stop()
        mediaPlayer?.release()
      } catch (e: Exception) {
        // Safe
      }
      mediaPlayer = null
      currentAudioUri = null
      currentAudioDurationMs = 0
      mapOf(
        "isPlaying" to false,
        "uri" to null,
        "positionMs" to 0,
        "durationMs" to 0
      )
    }

    /**
     * Audio Preview: getAudioPlaybackState
     */
    AsyncFunction("getAudioPlaybackState") {
      val player = mediaPlayer
      mapOf(
        "isPlaying" to (player?.isPlaying ?: false),
        "uri" to currentAudioUri,
        "positionMs" to (player?.currentPosition ?: 0),
        "durationMs" to currentAudioDurationMs
      )
    }

    /**
     * openDirectoryPicker
     * Launches Android SAF system directory tree picker (ACTION_OPEN_DOCUMENT_TREE).
     */
    AsyncFunction("openDirectoryPicker") { promise: Promise ->
      val currentActivity = appContext.currentActivity
      if (currentActivity == null) {
        promise.reject("ERR_NO_ACTIVITY", "Current Android Activity is null", null)
        return@AsyncFunction
      }
      pendingSafPickerPromise = promise
      try {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).apply {
          addFlags(
            Intent.FLAG_GRANT_READ_URI_PERMISSION or
            Intent.FLAG_GRANT_WRITE_URI_PERMISSION or
            Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION or
            Intent.FLAG_GRANT_PREFIX_URI_PERMISSION
          )
        }
        currentActivity.startActivityForResult(intent, OPEN_TREE_REQUEST_CODE)
      } catch (e: Exception) {
        pendingSafPickerPromise = null
        promise.resolve(
          mapOf(
            "success" to false,
            "error" to (e.message ?: "Failed to launch directory picker"),
            "cancelled" to false
          )
        )
      }
    }

    /**
     * getPersistedDirectoryUris
     * Returns granted SAF directory trees with persisted permissions.
     */
    AsyncFunction("getPersistedDirectoryUris") {
      try {
        val persisted = context.contentResolver.persistedUriPermissions
        val list = mutableListOf<Map<String, Any>>()
        for (perm in persisted) {
          val uriStr = perm.uri.toString()
          var name = perm.uri.lastPathSegment ?: "Granted Folder"
          try {
            val doc = DocumentFile.fromTreeUri(context, perm.uri)
            if (doc != null && doc.name != null) {
              name = doc.name!!
            }
          } catch (e: Exception) {
            // Ignore
          }
          list.add(
            mapOf(
              "treeUri" to uriStr,
              "name" to name,
              "isReadGranted" to perm.isReadPermission,
              "isWriteGranted" to perm.isWritePermission,
              "persistedTime" to perm.persistedTime.toDouble()
            )
          )
        }
        list
      } catch (e: Exception) {
        emptyList<Map<String, Any>>()
      }
    }

    /**
     * releasePersistedDirectoryUri
     */
    AsyncFunction("releasePersistedDirectoryUri") { treeUriStr: String ->
      try {
        val uri = Uri.parse(treeUriStr)
        val flags = (Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
        context.contentResolver.releasePersistableUriPermission(uri, flags)
        mapOf("success" to true)
      } catch (e: Exception) {
        mapOf("success" to false, "error" to (e.message ?: "Failed to release URI"))
      }
    }

    /**
     * analyzeApk
     * Inspects an APK installer archive and performs verified comparison with installed app.
     */
    AsyncFunction("analyzeApk") { apkPathOrUri: String ->
      analyzeApkInternal(apkPathOrUri)
    }

    /**
     * cancelDeepScan
     * Cancels any ongoing deep storage scan immediately.
     */
    AsyncFunction("cancelDeepScan") {
      activeScanFuture?.cancel(true)
      mapOf("success" to true)
    }

    /**
     * scanDeepCleanupCandidates
     * Scans accessible shared storage (MediaStore collections) and user-granted SAF directories
     * off the main thread. Identifies cleanup candidates with transparent reasoning and real metadata.
     */
    AsyncFunction("scanDeepCleanupCandidates") { options: Map<String, Any>, promise: Promise ->
      activeScanFuture?.cancel(true)
      activeScanFuture = scanExecutor.submit {
        try {
          if (Thread.currentThread().isInterrupted) return@submit
          val startTime = System.currentTimeMillis()
          val candidates = mutableListOf<Map<String, Any>>()
          val seenIds = HashSet<String>()
          val folderMap = mutableMapOf<String, Pair<Long, Int>>()
          val nowMs = System.currentTimeMillis()

          val hasPermission = checkMediaPermissions()
          if (!hasPermission) {
            promise.resolve(
              mapOf(
                "hasPermission" to false,
                "candidates" to emptyList<Map<String, Any>>(),
                "folders" to emptyList<Map<String, Any>>(),
                "diagnostics" to mapOf(
                  "error" to "Storage/Media permissions not granted"
                )
              )
            )
            return@submit
          }

          // 1. Scan Screenshots & Large Images in MediaStore.Images
          try {
            val imgUri = MediaStore.Images.Media.EXTERNAL_CONTENT_URI
            val imgProjection = arrayOf(
              MediaStore.MediaColumns._ID,
              MediaStore.MediaColumns.DISPLAY_NAME,
              MediaStore.MediaColumns.SIZE,
              MediaStore.MediaColumns.DATE_MODIFIED,
              MediaStore.MediaColumns.MIME_TYPE,
              if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) MediaStore.MediaColumns.RELATIVE_PATH else MediaStore.MediaColumns.DATA
            )
            val imgSort = "${MediaStore.MediaColumns.DATE_MODIFIED} DESC"
            context.contentResolver.query(imgUri, imgProjection, null, null, imgSort)?.use { cursor ->
              val idCol = cursor.getColumnIndex(MediaStore.MediaColumns._ID)
              val nameCol = cursor.getColumnIndex(MediaStore.MediaColumns.DISPLAY_NAME)
              val sizeCol = cursor.getColumnIndex(MediaStore.MediaColumns.SIZE)
              val dateCol = cursor.getColumnIndex(MediaStore.MediaColumns.DATE_MODIFIED)
              val mimeCol = cursor.getColumnIndex(MediaStore.MediaColumns.MIME_TYPE)
              val pathCol = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                cursor.getColumnIndex(MediaStore.MediaColumns.RELATIVE_PATH)
              } else {
                cursor.getColumnIndex(MediaStore.MediaColumns.DATA)
              }

              while (cursor.moveToNext() && candidates.size < 1200) {
                val id = if (idCol >= 0 && !cursor.isNull(idCol)) cursor.getLong(idCol) else continue
                val name = if (nameCol >= 0 && !cursor.isNull(nameCol)) cursor.getString(nameCol) ?: "" else ""
                val size = if (sizeCol >= 0 && !cursor.isNull(sizeCol)) cursor.getLong(sizeCol) else 0L
                val dateSec = if (dateCol >= 0 && !cursor.isNull(dateCol)) cursor.getLong(dateCol) else 0L
                val mime = if (mimeCol >= 0 && !cursor.isNull(mimeCol)) cursor.getString(mimeCol) ?: "" else ""
                val pathStr = if (pathCol >= 0 && !cursor.isNull(pathCol)) cursor.getString(pathCol) ?: "" else ""

                val contentUri = ContentUris.withAppendedId(imgUri, id).toString()
                if (seenIds.contains(contentUri)) continue

                val dateMs = dateSec * 1000L
                val ageDays = ((nowMs - dateMs) / 86400000L).coerceAtLeast(0L)
                val ext = name.substringAfterLast('.', mime.substringAfterLast('/', "jpg")).lowercase(Locale.ROOT)
                val isScreenshot = pathStr.contains("Screenshots", ignoreCase = true) ||
                  name.startsWith("Screenshot", ignoreCase = true) ||
                  name.startsWith("Screenshot_", ignoreCase = true)
                val isLarge = size >= (20L * 1024L * 1024L)

                val folderKey = if (pathStr.isNotBlank()) pathStr.trim('/') else "DCIM/Camera"
                val cur = folderMap[folderKey] ?: Pair(0L, 0)
                folderMap[folderKey] = Pair(cur.first + size, cur.second + 1)

                if (isScreenshot) {
                  seenIds.add(contentUri)
                  candidates.add(
                    mapOf(
                      "id" to contentUri,
                      "name" to name,
                      "path" to (if (pathStr.isNotBlank()) "$pathStr/$name" else name),
                      "contentUri" to contentUri,
                      "sizeBytes" to size.toDouble(),
                      "category" to "screenshots",
                      "extension" to ext,
                      "dateModifiedTimestamp" to dateMs.toDouble(),
                      "ageDays" to ageDays.toDouble(),
                      "ageLabel" to if (ageDays == 0L) "Modified today" else "Not modified for $ageDays days",
                      "recommendationReason" to "Screen capture in Screenshots folder",
                      "riskLevel" to (if (ageDays >= 90) "low" else "medium"),
                      "isSaf" to false
                    )
                  )
                } else if (isLarge) {
                  seenIds.add(contentUri)
                  candidates.add(
                    mapOf(
                      "id" to contentUri,
                      "name" to name,
                      "path" to (if (pathStr.isNotBlank()) "$pathStr/$name" else name),
                      "contentUri" to contentUri,
                      "sizeBytes" to size.toDouble(),
                      "category" to "large_media",
                      "extension" to ext,
                      "dateModifiedTimestamp" to dateMs.toDouble(),
                      "ageDays" to ageDays.toDouble(),
                      "ageLabel" to if (ageDays == 0L) "Modified today" else "Not modified for $ageDays days",
                      "recommendationReason" to "Large photo exceeding 20 MB",
                      "riskLevel" to "medium",
                      "isSaf" to false
                    )
                  )
                }
              }
            }
          } catch (e: Exception) {
            // Images query catch
          }

          // 2. Scan Screen Recordings & Large Videos in MediaStore.Video
          try {
            val vidUri = MediaStore.Video.Media.EXTERNAL_CONTENT_URI
            val vidProjection = arrayOf(
              MediaStore.MediaColumns._ID,
              MediaStore.MediaColumns.DISPLAY_NAME,
              MediaStore.MediaColumns.SIZE,
              MediaStore.MediaColumns.DATE_MODIFIED,
              MediaStore.MediaColumns.MIME_TYPE,
              if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) MediaStore.MediaColumns.RELATIVE_PATH else MediaStore.MediaColumns.DATA
            )
            val vidSort = "${MediaStore.MediaColumns.SIZE} DESC"
            context.contentResolver.query(vidUri, vidProjection, null, null, vidSort)?.use { cursor ->
              val idCol = cursor.getColumnIndex(MediaStore.MediaColumns._ID)
              val nameCol = cursor.getColumnIndex(MediaStore.MediaColumns.DISPLAY_NAME)
              val sizeCol = cursor.getColumnIndex(MediaStore.MediaColumns.SIZE)
              val dateCol = cursor.getColumnIndex(MediaStore.MediaColumns.DATE_MODIFIED)
              val mimeCol = cursor.getColumnIndex(MediaStore.MediaColumns.MIME_TYPE)
              val pathCol = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                cursor.getColumnIndex(MediaStore.MediaColumns.RELATIVE_PATH)
              } else {
                cursor.getColumnIndex(MediaStore.MediaColumns.DATA)
              }

              while (cursor.moveToNext() && candidates.size < 1500) {
                val id = if (idCol >= 0 && !cursor.isNull(idCol)) cursor.getLong(idCol) else continue
                val name = if (nameCol >= 0 && !cursor.isNull(nameCol)) cursor.getString(nameCol) ?: "" else ""
                val size = if (sizeCol >= 0 && !cursor.isNull(sizeCol)) cursor.getLong(sizeCol) else 0L
                val dateSec = if (dateCol >= 0 && !cursor.isNull(dateCol)) cursor.getLong(dateCol) else 0L
                val mime = if (mimeCol >= 0 && !cursor.isNull(mimeCol)) cursor.getString(mimeCol) ?: "" else ""
                val pathStr = if (pathCol >= 0 && !cursor.isNull(pathCol)) cursor.getString(pathCol) ?: "" else ""

                val contentUri = ContentUris.withAppendedId(vidUri, id).toString()
                if (seenIds.contains(contentUri)) continue

                val dateMs = dateSec * 1000L
                val ageDays = ((nowMs - dateMs) / 86400000L).coerceAtLeast(0L)
                val ext = name.substringAfterLast('.', mime.substringAfterLast('/', "mp4")).lowercase(Locale.ROOT)

                val isScreenRec = pathStr.contains("ScreenRecorder", ignoreCase = true) ||
                  pathStr.contains("Screenshots", ignoreCase = true) ||
                  name.startsWith("Screen", ignoreCase = true) ||
                  name.contains("Screen_Recording", ignoreCase = true)
                val isLarge = size >= (150L * 1024L * 1024L)

                val folderKey = if (pathStr.isNotBlank()) pathStr.trim('/') else "DCIM/Camera"
                val cur = folderMap[folderKey] ?: Pair(0L, 0)
                folderMap[folderKey] = Pair(cur.first + size, cur.second + 1)

                if (isScreenRec) {
                  seenIds.add(contentUri)
                  candidates.add(
                    mapOf(
                      "id" to contentUri,
                      "name" to name,
                      "path" to (if (pathStr.isNotBlank()) "$pathStr/$name" else name),
                      "contentUri" to contentUri,
                      "sizeBytes" to size.toDouble(),
                      "category" to "screen_recordings",
                      "extension" to ext,
                      "dateModifiedTimestamp" to dateMs.toDouble(),
                      "ageDays" to ageDays.toDouble(),
                      "ageLabel" to if (ageDays == 0L) "Modified today" else "Not modified for $ageDays days",
                      "recommendationReason" to "Screen recording video capture",
                      "riskLevel" to "medium",
                      "isSaf" to false
                    )
                  )
                } else if (isLarge) {
                  seenIds.add(contentUri)
                  candidates.add(
                    mapOf(
                      "id" to contentUri,
                      "name" to name,
                      "path" to (if (pathStr.isNotBlank()) "$pathStr/$name" else name),
                      "contentUri" to contentUri,
                      "sizeBytes" to size.toDouble(),
                      "category" to "large_media",
                      "extension" to ext,
                      "dateModifiedTimestamp" to dateMs.toDouble(),
                      "ageDays" to ageDays.toDouble(),
                      "ageLabel" to if (ageDays == 0L) "Modified today" else "Not modified for $ageDays days",
                      "recommendationReason" to "Large video exceeding 150 MB",
                      "riskLevel" to "high",
                      "isSaf" to false
                    )
                  )
                }
              }
            }
          } catch (e: Exception) {
            // Videos query catch
          }

          // 3. Scan Large Audio in MediaStore.Audio
          try {
            val audioUri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
            val audioProjection = arrayOf(
              MediaStore.MediaColumns._ID,
              MediaStore.MediaColumns.DISPLAY_NAME,
              MediaStore.MediaColumns.SIZE,
              MediaStore.MediaColumns.DATE_MODIFIED,
              MediaStore.MediaColumns.MIME_TYPE
            )
            val audioSelection = "${MediaStore.MediaColumns.SIZE} >= ?"
            val audioSelectionArgs = arrayOf((30L * 1024L * 1024L).toString())
            context.contentResolver.query(audioUri, audioProjection, audioSelection, audioSelectionArgs, null)?.use { cursor ->
              val idCol = cursor.getColumnIndex(MediaStore.MediaColumns._ID)
              val nameCol = cursor.getColumnIndex(MediaStore.MediaColumns.DISPLAY_NAME)
              val sizeCol = cursor.getColumnIndex(MediaStore.MediaColumns.SIZE)
              val dateCol = cursor.getColumnIndex(MediaStore.MediaColumns.DATE_MODIFIED)
              val mimeCol = cursor.getColumnIndex(MediaStore.MediaColumns.MIME_TYPE)

              while (cursor.moveToNext() && candidates.size < 1600) {
                val id = if (idCol >= 0 && !cursor.isNull(idCol)) cursor.getLong(idCol) else continue
                val name = if (nameCol >= 0 && !cursor.isNull(nameCol)) cursor.getString(nameCol) ?: "" else ""
                val size = if (sizeCol >= 0 && !cursor.isNull(sizeCol)) cursor.getLong(sizeCol) else 0L
                val dateSec = if (dateCol >= 0 && !cursor.isNull(dateCol)) cursor.getLong(dateCol) else 0L
                val mime = if (mimeCol >= 0 && !cursor.isNull(mimeCol)) cursor.getString(mimeCol) ?: "" else ""

                val contentUri = ContentUris.withAppendedId(audioUri, id).toString()
                if (seenIds.contains(contentUri)) continue
                seenIds.add(contentUri)

                val dateMs = dateSec * 1000L
                val ageDays = ((nowMs - dateMs) / 86400000L).coerceAtLeast(0L)
                val ext = name.substringAfterLast('.', mime.substringAfterLast('/', "mp3")).lowercase(Locale.ROOT)

                candidates.add(
                  mapOf(
                    "id" to contentUri,
                    "name" to name,
                    "path" to name,
                    "contentUri" to contentUri,
                    "sizeBytes" to size.toDouble(),
                    "category" to "large_media",
                    "extension" to ext,
                    "dateModifiedTimestamp" to dateMs.toDouble(),
                    "ageDays" to ageDays.toDouble(),
                    "ageLabel" to if (ageDays == 0L) "Modified today" else "Not modified for $ageDays days",
                    "recommendationReason" to "Large audio file exceeding 30 MB",
                    "riskLevel" to "medium",
                    "isSaf" to false
                  )
                )
              }
            }
          } catch (e: Exception) {
            // Audio query catch
          }

          // 4. Scan Downloads & Files for APKs, Old Docs/Archives, and Temporary files
          val collectionsToScan = mutableListOf<Uri>()
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            collectionsToScan.add(MediaStore.Downloads.EXTERNAL_CONTENT_URI)
          }

          for (collectionUri in collectionsToScan) {
            try {
              val docProjection = arrayOf(
                MediaStore.MediaColumns._ID,
                MediaStore.MediaColumns.DISPLAY_NAME,
                MediaStore.MediaColumns.SIZE,
                MediaStore.MediaColumns.DATE_MODIFIED,
                MediaStore.MediaColumns.MIME_TYPE,
                MediaStore.MediaColumns.DATA,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) MediaStore.MediaColumns.RELATIVE_PATH else MediaStore.MediaColumns.DATA
              )
              context.contentResolver.query(collectionUri, docProjection, null, null, null)?.use { cursor ->
                val idCol = cursor.getColumnIndex(MediaStore.MediaColumns._ID)
                val nameCol = cursor.getColumnIndex(MediaStore.MediaColumns.DISPLAY_NAME)
                val sizeCol = cursor.getColumnIndex(MediaStore.MediaColumns.SIZE)
                val dateCol = cursor.getColumnIndex(MediaStore.MediaColumns.DATE_MODIFIED)
                val mimeCol = cursor.getColumnIndex(MediaStore.MediaColumns.MIME_TYPE)
                val dataCol = cursor.getColumnIndex(MediaStore.MediaColumns.DATA)
                val pathCol = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                  cursor.getColumnIndex(MediaStore.MediaColumns.RELATIVE_PATH)
                } else {
                  cursor.getColumnIndex(MediaStore.MediaColumns.DATA)
                }

                while (cursor.moveToNext() && candidates.size < 2000) {
                  if (Thread.currentThread().isInterrupted) break
                  val id = if (idCol >= 0 && !cursor.isNull(idCol)) cursor.getLong(idCol) else continue
                  val name = if (nameCol >= 0 && !cursor.isNull(nameCol)) cursor.getString(nameCol) ?: "" else ""
                  val size = if (sizeCol >= 0 && !cursor.isNull(sizeCol)) cursor.getLong(sizeCol) else 0L
                  val dateSec = if (dateCol >= 0 && !cursor.isNull(dateCol)) cursor.getLong(dateCol) else 0L
                  val mime = if (mimeCol >= 0 && !cursor.isNull(mimeCol)) cursor.getString(mimeCol) ?: "" else ""
                  val directDataPath = if (dataCol >= 0 && !cursor.isNull(dataCol)) cursor.getString(dataCol) else null
                  val pathStr = if (pathCol >= 0 && !cursor.isNull(pathCol)) cursor.getString(pathCol) ?: "" else ""

                  val contentUri = ContentUris.withAppendedId(collectionUri, id).toString()
                  if (seenIds.contains(contentUri)) continue

                  val dateMs = dateSec * 1000L
                  val ageDays = ((nowMs - dateMs) / 86400000L).coerceAtLeast(0L)
                  val ext = name.substringAfterLast('.', "").lowercase(Locale.ROOT)

                  val folderKey = if (pathStr.isNotBlank()) pathStr.trim('/') else "Download"
                  val cur = folderMap[folderKey] ?: Pair(0L, 0)
                  folderMap[folderKey] = Pair(cur.first + size, cur.second + 1)

                  if (ext == "apk" || mime == "application/vnd.android.package-archive") {
                    seenIds.add(contentUri)
                    val apkAnalysis = analyzeApkInternal(contentUri, directDataPath)
                    val matchStatus = apkAnalysis["matchStatus"] as? String
                    val risk = if (matchStatus == "matches_installed_same" || matchStatus == "matches_installed_newer") "low" else "medium"
                    val reason = when (matchStatus) {
                      "matches_installed_same" -> "Installer matches installed version"
                      "matches_installed_newer" -> "Obsolete installer: newer app version already installed"
                      "matches_installed_older" -> "Installer for older version of installed app"
                      else -> "Standalone APK installer"
                    }

                    candidates.add(
                      mapOf(
                        "id" to contentUri,
                        "name" to name,
                        "path" to (if (pathStr.isNotBlank()) "$pathStr/$name" else name),
                        "contentUri" to contentUri,
                        "sizeBytes" to size.toDouble(),
                        "category" to "apk_installers",
                        "extension" to "apk",
                        "dateModifiedTimestamp" to dateMs.toDouble(),
                        "ageDays" to ageDays.toDouble(),
                        "ageLabel" to if (ageDays == 0L) "Modified today" else "Not modified for $ageDays days",
                        "recommendationReason" to reason,
                        "riskLevel" to risk,
                        "isSaf" to false,
                        "apkAnalysis" to apkAnalysis
                      )
                    )
                  } else if (ext in setOf("tmp", "temp", "bak", "log", "thumb", "thumbdata")) {
                    seenIds.add(contentUri)
                    candidates.add(
                      mapOf(
                        "id" to contentUri,
                        "name" to name,
                        "path" to (if (pathStr.isNotBlank()) "$pathStr/$name" else name),
                        "contentUri" to contentUri,
                        "sizeBytes" to size.toDouble(),
                        "category" to "temp_cache_files",
                        "extension" to ext,
                        "dateModifiedTimestamp" to dateMs.toDouble(),
                        "ageDays" to ageDays.toDouble(),
                        "ageLabel" to if (ageDays == 0L) "Modified today" else "Not modified for $ageDays days",
                        "recommendationReason" to "Temporary extension (.$ext) — candidate for review",
                        "riskLevel" to "low",
                        "isSaf" to false
                      )
                    )
                  } else if (ageDays >= 30L && ext in setOf("pdf", "zip", "rar", "7z", "tar", "gz", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv")) {
                    seenIds.add(contentUri)
                    candidates.add(
                      mapOf(
                        "id" to contentUri,
                        "name" to name,
                        "path" to (if (pathStr.isNotBlank()) "$pathStr/$name" else name),
                        "contentUri" to contentUri,
                        "sizeBytes" to size.toDouble(),
                        "category" to "old_downloads_docs",
                        "extension" to ext,
                        "dateModifiedTimestamp" to dateMs.toDouble(),
                        "ageDays" to ageDays.toDouble(),
                        "ageLabel" to "Not modified for $ageDays days",
                        "recommendationReason" to "Document/archive not modified for $ageDays days",
                        "riskLevel" to (if (ageDays >= 90L) "low" else "medium"),
                        "isSaf" to false
                      )
                    )
                  }
                }
              }
            } catch (e: Exception) {
              // Catch collection query
            }
          }

          // 5. Scan Granted SAF Tree URIs
          val safTreeUris = (options["safTreeUris"] as? List<*>)?.filterIsInstance<String>() ?: emptyList()
          var safCount = 0
          for (treeUriStr in safTreeUris) {
            val safFiles = traverseSafTree(treeUriStr)
            for (safFile in safFiles) {
              val id = safFile["id"] as? String ?: continue
              if (!seenIds.contains(id)) {
                seenIds.add(id)
                candidates.add(safFile)
                safCount++
              }
            }
          }

          // 6. Build Folders List (Marked isIncomplete: true)
          val folderList = folderMap.entries
            .filter { it.value.first > 10L * 1024L * 1024L }
            .sortedByDescending { it.value.first }
            .take(30)
            .map { entry ->
              mapOf(
                "folderPath" to entry.key,
                "totalSizeBytes" to entry.value.first.toDouble(),
                "itemCount" to entry.value.second,
                "isIncomplete" to true,
                "note" to "Contains indexed shared files only; app sandboxes and unindexed files are not included."
              )
            }

          val duration = System.currentTimeMillis() - startTime

          promise.resolve(
            mapOf(
              "hasPermission" to true,
              "candidates" to candidates,
              "folders" to folderList,
              "diagnostics" to mapOf(
                "totalCandidates" to candidates.size,
                "mediaStoreCandidates" to (candidates.size - safCount),
                "safCandidates" to safCount,
                "foldersAggregated" to folderList.size,
                "scanDurationMs" to duration.toDouble()
              )
            )
          )
        } catch (e: Exception) {
          promise.reject("ERR_DEEP_SCAN", e.message ?: "Deep storage scan failed", e)
        }
      }
    }

    /**
     * computeFileSha256
     * Computes the SHA-256 hash of a local file in streaming blocks.
     */
    AsyncFunction("computeFileSha256") { filePath: String ->
      val cleanPath = if (filePath.startsWith("file://")) {
        filePath.substring(7)
      } else {
        filePath
      }
      val file = File(cleanPath)
      if (!file.exists() || !file.isFile) {
        throw IllegalArgumentException("Target file does not exist or is not readable: $cleanPath")
      }
      val digest = java.security.MessageDigest.getInstance("SHA-256")
      java.io.FileInputStream(file).use { fis ->
        val buffer = ByteArray(65536)
        var read = fis.read(buffer)
        while (read != -1) {
          digest.update(buffer, 0, read)
          read = fis.read(buffer)
        }
      }
      digest.digest().joinToString("") { "%02x".format(it) }
    }
  }

  private fun analyzeApkInternal(apkPathOrUri: String, directFilePath: String? = null): Map<String, Any> {
    var tempFileToDelete: File? = null
    val targetPath: String = try {
      if (!directFilePath.isNullOrBlank() && File(directFilePath).canRead()) {
        directFilePath
      } else if (apkPathOrUri.startsWith("content://")) {
        val uri = Uri.parse(apkPathOrUri)
        var resolvedDataPath: String? = null
        try {
          context.contentResolver.query(uri, arrayOf(MediaStore.MediaColumns.DATA), null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
              val idx = cursor.getColumnIndex(MediaStore.MediaColumns.DATA)
              if (idx >= 0) {
                val path = cursor.getString(idx)
                if (!path.isNullOrBlank() && File(path).canRead()) {
                  resolvedDataPath = path
                }
              }
            }
          }
        } catch (_: Exception) {}

        if (resolvedDataPath != null) {
          resolvedDataPath
        } else {
          val temp = File(context.cacheDir, "apk_inspect_${System.currentTimeMillis()}.apk")
          tempFileToDelete = temp
          context.contentResolver.openInputStream(uri)?.use { input ->
            FileOutputStream(temp).use { output ->
              input.copyTo(output)
            }
          }
          temp.absolutePath
        }
      } else {
        apkPathOrUri
      }
    } catch (e: Exception) {
      apkPathOrUri
    }

    try {
      val packageManager = context.packageManager
      val archiveInfo = packageManager.getPackageArchiveInfo(targetPath, 0)
      if (archiveInfo == null) {
        return mapOf(
          "isValidApk" to false,
          "error" to "Unable to parse APK archive metadata"
        )
      }

      val apkPackageName = archiveInfo.packageName ?: ""
      val apkVersionName = archiveInfo.versionName ?: "Unknown"
      val apkVersionCode = PackageInfoCompat.getLongVersionCode(archiveInfo)

      archiveInfo.applicationInfo?.sourceDir = targetPath
      archiveInfo.applicationInfo?.publicSourceDir = targetPath
      val appLabel = try {
        archiveInfo.applicationInfo?.loadLabel(packageManager)?.toString() ?: apkPackageName
      } catch (e: Exception) {
        apkPackageName
      }

      var isInstalled = false
      var installedVersionCode = -1L
      var installedVersionName = ""
      var matchStatus = "not_installed_or_unverified"
      var isComparisonVerified = false

      try {
        val installedInfo = packageManager.getPackageInfo(apkPackageName, 0)
        isInstalled = true
        isComparisonVerified = true
        installedVersionCode = PackageInfoCompat.getLongVersionCode(installedInfo)
        installedVersionName = installedInfo.versionName ?: ""

        matchStatus = when {
          apkVersionCode == installedVersionCode -> "matches_installed_same"
          apkVersionCode < installedVersionCode -> "matches_installed_newer"
          else -> "matches_installed_older"
        }
      } catch (e: PackageManager.NameNotFoundException) {
        isInstalled = false
        isComparisonVerified = false
        matchStatus = "not_installed_or_unverified"
      } catch (e: SecurityException) {
        isInstalled = false
        isComparisonVerified = false
        matchStatus = "visibility_restricted"
      }

      return mapOf(
        "isValidApk" to true,
        "packageName" to apkPackageName,
        "appLabel" to appLabel,
        "apkVersionName" to apkVersionName,
        "apkVersionCode" to apkVersionCode.toDouble(),
        "isInstalled" to isInstalled,
        "isComparisonVerified" to isComparisonVerified,
        "installedVersionName" to installedVersionName,
        "installedVersionCode" to installedVersionCode.toDouble(),
        "matchStatus" to matchStatus
      )
    } finally {
      tempFileToDelete?.delete()
    }
  }

  private fun traverseSafTree(
    treeUriStr: String,
    maxDepth: Int = 4,
    maxFiles: Int = 400
  ): List<Map<String, Any>> {
    val results = mutableListOf<Map<String, Any>>()
    val nowMs = System.currentTimeMillis()
    try {
      val treeUri = Uri.parse(treeUriStr)
      val rootDoc = DocumentFile.fromTreeUri(context, treeUri) ?: return emptyList()

      fun walk(folder: DocumentFile, depth: Int, currentPath: String) {
        if (depth > maxDepth || results.size >= maxFiles) return
        val children = folder.listFiles()
        for (child in children) {
          if (results.size >= maxFiles) break
          if (child.isDirectory) {
            walk(child, depth + 1, "$currentPath/${child.name ?: "folder"}")
          } else if (child.isFile) {
            val name = child.name ?: "unknown"
            val size = child.length()
            val lastModMs = child.lastModified().takeIf { it > 0 } ?: nowMs
            val uriStr = child.uri.toString()
            val mime = child.type ?: ""
            val ext = name.substringAfterLast('.', mime.substringAfterLast('/', "")).lowercase(Locale.ROOT)
            val ageDays = ((nowMs - lastModMs) / 86400000L).coerceAtLeast(0L)

            var category = "other"
            var riskLevel = "medium"
            var reason = "User-granted SAF directory file"
            var apkAnalysis: Map<String, Any>? = null

            if (ext == "apk" || mime == "application/vnd.android.package-archive") {
              category = "apk_installers"
              apkAnalysis = analyzeApkInternal(uriStr)
              val matchStatus = apkAnalysis["matchStatus"] as? String
              if (matchStatus == "matches_installed_same") {
                riskLevel = "low"
                reason = "Installer matches already installed app"
              } else if (matchStatus == "matches_installed_newer") {
                riskLevel = "low"
                reason = "Obsolete installer: newer app version already installed"
              } else {
                riskLevel = "medium"
                reason = "Standalone APK installer"
              }
            } else if (ext in setOf("tmp", "temp", "bak", "log", "thumb", "thumbdata")) {
              category = "temp_cache_files"
              riskLevel = "low"
              reason = "Temporary extension (.$ext) - candidate for review"
            } else if (ext in setOf("pdf", "zip", "rar", "7z", "tar", "gz", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv")) {
              category = "old_downloads_docs"
              riskLevel = if (ageDays >= 90) "low" else "medium"
              reason = "Document/archive not modified for $ageDays days"
            } else if (size >= 150L * 1024 * 1024) {
              category = "large_media"
              riskLevel = "high"
              reason = "Large file exceeding 150 MB"
            }

            if (category != "other") {
              results.add(
                mapOf(
                  "id" to uriStr,
                  "name" to name,
                  "path" to "$currentPath/$name",
                  "contentUri" to uriStr,
                  "sizeBytes" to size.toDouble(),
                  "category" to category,
                  "extension" to ext,
                  "dateModifiedTimestamp" to lastModMs.toDouble(),
                  "ageDays" to ageDays.toDouble(),
                  "ageLabel" to if (ageDays == 0L) "Modified today" else "Not modified for $ageDays days",
                  "recommendationReason" to reason,
                  "riskLevel" to riskLevel,
                  "isSaf" to true,
                  "apkAnalysis" to (apkAnalysis ?: emptyMap<String, Any>())
                )
              )
            }
          }
        }
      }

      walk(rootDoc, 1, rootDoc.name ?: "Granted_Folder")
    } catch (e: Exception) {
      // Permission revoked or invalid tree
    }
    return results
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
