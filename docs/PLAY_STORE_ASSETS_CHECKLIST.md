# Google Play Store Visual Assets Checklist

**Application:** Offline AI Phone Assistant (`com.offlineai.phoneassistant`)  
**Specification Authority:** Google Play Console Graphic Assets Guidelines

---

## 1. Mandatory Graphical Assets

| Asset Type | Dimension / Format | Requirements | Project Status | File Path |
| :--- | :--- | :--- | :--- | :--- |
| **App Icon** | `512 x 512 px`<br>32-bit PNG | Max 1024 KB. No transparency / alpha channel. Square icon with sharp corners (Play Store applies 20% squircle mask). | **READY** | `assets/images/icon.png` (Source) |
| **Feature Graphic** | `1024 x 500 px`<br>JPEG or 24-bit PNG | Max 15 MB. No transparency. Bold, clean illustration representing offline device intelligence. Avoid text near borders. | **PENDING** | *To be finalized in design tool* |
| **Phone Screenshots** | Min `1080 x 1920 px`<br>(or `1080 x 2400 px`)<br>16:9 / 9:16 aspect ratio | Minimum 4 required, up to 8 recommended. High resolution, showing real UI states without mock borders. | **READY** | Captured from test device (see Section 2) |
| **Privacy Policy URL** | Public HTTPS Link | Hosted web page accessible to Google reviewers and users without login. | **PENDING** | *Awaiting hosting (e.g. GitHub Pages)* |

---

## 2. Screenshot Presentation Sequence

Google Play listings require screenshots that highlight the primary user journey and value propositions:

### Screenshot 1: Overview Dashboard
- **Headline:** Instant Storage & Memory Health
- **Visual:** Dashboard displaying total storage partition, used percentage, real RAM telemetry, and quick navigation actions.
- **Key Element:** Clear category breakdown and battery-friendly design.

### Screenshot 2: Deep Storage Analyzer
- **Headline:** Surface Space Hogs in Seconds
- **Visual:** Storage screen showing large candidate files (>50 MB, >100 MB) filtered by category (Videos, APKs, Large Files).
- **Key Element:** Instant size filters and fast scrolling.

### Screenshot 3: Gallery Cleanup (Screenshots & Recordings)
- **Headline:** Clean Cluttered Media Automatically
- **Visual:** Media Explorer tab showing detected screenshots and screen recordings with date and size metadata.
- **Key Element:** Quick selection and itemized previews.

### Screenshot 4: Explicit Two-Step Deletion Safeguard
- **Headline:** Safe Deletion — You Stay in Control
- **Visual:** Multi-step cleanup modal showing exact file names, size to be freed, and explicit confirmation button.
- **Key Element:** AI assistant NEVER deletes files autonomously.

### Screenshot 5: 100% Offline AI Assistant
- **Headline:** Private On-Device Intelligence
- **Visual:** Assistant chat interface answering questions like *"How much storage is free?"* and *"Show large videos"*.
- **Key Element:** Grounded truth disclaimer and 100% offline badge.

### Screenshot 6: Honest System RAM Telemetry
- **Headline:** No Fake "Cleaners" — Real Android Telemetry
- **Visual:** Performance screen showing ActivityManager memory stats and educational note explaining Android Low Memory Killer (LMK).

---

## 3. Policy Video Demonstration (Mandatory for Photo/Video Permissions)

Google Play enforces strict scrutiny on apps requesting `READ_MEDIA_IMAGES` and `READ_MEDIA_VIDEO`. You must submit a short video demonstration (hosted unlisted on YouTube) showing:

1. **Permission Request:** App prompts user for Media Access explaining the storage audit purpose.
2. **Core Feature:** App indexes media to calculate category distribution and display largest files across the gallery.
3. **Photo Picker Justification:** Demonstrates why the system Photo Picker is insufficient (Photo Picker requires manual user selection upfront, preventing the app from scanning partition totals or identifying which files are occupying space).
4. **User-Confirmed Cleanup:** User previews candidate media and explicitly approves deletion.

---

## 4. Asset Generation Checklist Prior to Store Submission

- [ ] Export `icon.png` as 512x512 PNG (no alpha channel).
- [ ] Render 1024x500 Feature Graphic with title *"Offline AI Phone Assistant"*.
- [ ] Frame 4 to 6 device screenshots at 1080x2400 resolution.
- [ ] Record and upload 60-second YouTube unlisted permission demonstration video.
- [ ] Publish `docs/PRIVACY_POLICY_DRAFT.md` to public HTTPS URL.
