# 📱 Deployment Guide - Bike Racer

Complete step-by-step guide to deploy Bike Racer on multiple platforms.

---

## Table of Contents
1. [Web Deployment](#1-web-deployment)
2. [Android APK (Play Store)](#2-android-apk-play-store)
3. [iOS Deployment](#3-ios-deployment)
4. [Progressive Web App (PWA)](#4-progressive-web-app-pwa)
5. [Ad Integration](#5-ad-integration)

---

## 1. Web Deployment

### Option A: Static Hosting (Free)

#### GitHub Pages (Recommended for Students)

**Step 1**: Create GitHub Repository
```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Initial commit - Bike Racer v1.0"

# Create GitHub repo and push
git remote add origin https://github.com/yourusername/bike-racer.git
git branch -M main
git push -u origin main
```

**Step 2**: Enable GitHub Pages
1. Go to repository Settings
2. Scroll to "Pages" section
3. Source: Deploy from branch "main"
4. Folder: / (root)
5. Save

**Step 3**: Access Your Game
- URL: `https://yourusername.github.io/bike-racer/`
- Wait 2-5 minutes for deployment

**Pros**: Free, easy, automatic updates  
**Cons**: No custom domain (without upgrade)

---

#### Netlify (Best for Production)

**Step 1**: Create Account
- Visit netlify.com
- Sign up (free tier available)

**Step 2**: Deploy
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
cd BikeRacer
netlify deploy --prod
```

Or drag-and-drop the folder on netlify.com

**Step 3**: Configure
- Custom domain: yourname.com
- HTTPS: Automatic (Let's Encrypt)
- Continuous deployment: Connect to GitHub

**Pros**: Fast CDN, automatic HTTPS, custom domains  
**Cons**: None significant

---

#### Vercel

**Step 1**: Install Vercel CLI
```bash
npm i -g vercel
```

**Step 2**: Deploy
```bash
cd BikeRacer
vercel
```

**Step 3**: Production
```bash
vercel --prod
```

---

### Option B: Traditional Web Hosting

Upload to any web host via FTP:
1. Connect to your hosting
2. Upload all files to public_html/
3. Access via your domain

**Recommended Hosts**:
- Hostinger (cheap)
- Bluehost (popular)
- SiteGround (fast)

---

## 2. Android APK (Play Store)

### Prerequisites
- Android Studio (download from developer.android.com)
- Google Play Console account ($25 one-time fee)
- Java JDK 11 or higher

---

### Step-by-Step Android Build

#### Phase 1: Create Project

**1. Open Android Studio**
```
File → New → New Project
Select: "Empty Activity"
Name: BikeRacer
Package: com.yourname.bikeracer
Language: Java (or Kotlin)
Minimum SDK: API 21 (Android 5.0)
```

**2. Copy Game Files**
```
app/src/main/assets/BikeRacer/
├── index.html
├── bike.png
├── car1.png
├── car2.png
└── bg.mp3
```

Create `assets` folder if it doesn't exist:
```bash
mkdir -p app/src/main/assets/BikeRacer
```

---

#### Phase 2: Configure Project

**3. Update `build.gradle` (Module: app)**

```gradle
android {
    compileSdk 34
    
    defaultConfig {
        applicationId "com.yourname.bikeracer"
        minSdk 21
        targetSdk 34
        versionCode 1
        versionName "1.0"
    }
    
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

**4. Update `AndroidManifest.xml`**

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.VIBRATE" />
    
    <!-- Optional: Remove if not using tilt controls -->
    <uses-feature android:name="android.hardware.sensor.accelerometer" 
                  android:required="false" />

    <application
        android:allowBackup="true"
        android:dataExtractionRules="@xml/data_extraction_rules"
        android:fullBackupContent="@xml/backup_rules"
        android:icon="@mipmap/ic_launcher"
        android:label="Bike Racer"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.BikeRacer"
        android:usesCleartextTraffic="false"
        tools:targetApi="31">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait"
            android:configChanges="orientation|screenSize|keyboardHidden">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

---

**5. Update `MainActivity.java`**

```java
package com.yourname.bikeracer;

import android.annotation.SuppressLint;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {
    
    private WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Hide system UI for immersive experience
        hideSystemUI();

        webView = findViewById(R.id.webview);
        
        // Configure WebView settings
        WebSettings settings = webView.getSettings();
        
        // Enable JavaScript (required for game)
        settings.setJavaScriptEnabled(true);
        
        // Enable local storage
        settings.setDomStorageEnabled(true);
        
        // Allow file access for assets
        settings.setAllowFileAccess(true);
        
        // Security: Disable risky features
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setGeolocationEnabled(false);
        
        // Performance optimizations
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setRenderPriority(WebSettings.RenderPriority.HIGH);
        settings.setEnableSmoothTransition(true);
        
        // Disable zoom controls
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        
        // Set WebViewClient to handle navigation
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return false; // Load all URLs in WebView
            }
        });
        
        // Load game
        webView.loadUrl("file:///android_asset/BikeRacer/index.html");
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        hideSystemUI();
    }

    // Hide navigation bar for immersive experience
    private void hideSystemUI() {
        View decorView = getWindow().getDecorView();
        decorView.setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_FULLSCREEN
        );
    }
}
```

---

**6. Update `activity_main.xml`**

```xml
<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#000000"
    tools:context=".MainActivity">

    <WebView
        android:id="@+id/webview"
        android:layout_width="match_parent"
        android:layout_height="match_parent" />

</RelativeLayout>
```

---

#### Phase 3: Build APK

**7. Test on Emulator**
```
Run → Run 'app' (Shift+F10)
```

**8. Build Debug APK** (for testing)
```
Build → Build Bundle(s) / APK(s) → Build APK(s)
```
APK location: `app/build/outputs/apk/debug/app-debug.apk`

---

#### Phase 4: Release Build

**9. Generate Keystore**
```
Build → Generate Signed Bundle / APK
→ Select "Android App Bundle"
→ Create new keystore

Fill in:
- Key store path: /path/to/bikeracer.jks
- Password: [secure password]
- Alias: bikeracer
- Validity: 25 years (minimum)
- Certificate info: Your details
```

⚠️ **CRITICAL**: Save keystore file and passwords securely!  
Lost keystore = Cannot update app on Play Store

**10. Build Release AAB**
```
Build → Generate Signed Bundle / APK
→ Android App Bundle
→ Select your keystore
→ Build variant: release
→ Finish
```

Output: `app/release/app-release.aab`

---

#### Phase 5: Play Store Submission

**11. Create Play Console Account**
- Visit play.google.com/console
- Pay $25 registration fee (one-time)

**12. Create App**
```
All apps → Create app
- App name: Bike Racer
- Default language: English
- App or game: Game
- Free or paid: Free
- Declarations: Complete all
```

**13. Complete Store Listing**

**App Details**:
```
Short description (80 chars):
"Fun endless racing game! Dodge traffic and beat your high score!"

Full description (4000 chars):
"🏍️ BIKE RACER - Ultimate Racing Challenge!

Race through traffic, dodge cars, and beat your high score in this addictive arcade racer!

FEATURES:
✓ Simple one-touch controls
✓ Smooth 60 FPS gameplay
✓ Progressive difficulty
✓ Day & night modes
✓ Tilt control support
✓ Vibration feedback
✓ Compete with friends

PERFECT FOR:
- Quick gaming sessions
- Commute entertainment
- Beating high scores
- All ages!

CONTROLS:
• Tap left/right to move lanes
• Tilt device to steer
• Pause anytime

Download now and start racing!"
```

**Graphics** (required):
- App icon: 512×512 PNG
- Feature graphic: 1024×500 PNG
- Phone screenshots: At least 2 (1080×1920 recommended)
- Tablet screenshots: Optional but recommended

**Categorization**:
- App category: Games → Racing
- Content rating: PEGI 3 / Everyone
- Target age: All ages

**14. Upload AAB**
```
Production → Create new release
→ Upload app-release.aab
→ Release name: 1.0
→ Release notes: "Initial release"
→ Save
```

**15. Content Rating**
```
Complete questionnaire:
- Violence: None
- Sexuality: None
- Language: None
- Controlled Substances: None
- Gambling: None
- Horror: None

Result: PEGI 3 / Everyone
```

**16. Pricing & Distribution**
```
- Free
- Countries: All (or select specific)
- Consent for ads: Yes (if using AdMob)
```

**17. Submit for Review**
```
Review → Submit for review
```

**Timeline**:
- Review: 1-7 days typically
- Status: Check Play Console

---

## 3. iOS Deployment

### Prerequisites
- Mac with Xcode
- Apple Developer Account ($99/year)
- CocoaPods installed

### Quick Guide

**1. Create Xcode Project**
```
File → New → Project → iOS → App
```

**2. Add WKWebView**
```swift
import UIKit
import WebKit

class ViewController: UIViewController {
    var webView: WKWebView!
    
    override func loadView() {
        let webConfiguration = WKWebViewConfiguration()
        webView = WKWebView(frame: .zero, configuration: webConfiguration)
        view = webView
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        if let url = Bundle.main.url(forResource: "index", 
                                     withExtension: "html", 
                                     subdirectory: "BikeRacer") {
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
    }
}
```

**3. Add Game Files**
- Drag BikeRacer folder to Xcode
- Select "Create folder references"

**4. Configure Info.plist**
```xml
<key>NSMotionUsageDescription</key>
<string>We use device motion for tilt controls</string>
```

**5. Build & Submit**
- Archive app
- Upload to App Store Connect
- Submit for review

---

## 4. Progressive Web App (PWA)

Make your game installable on mobile home screens!

### Step 1: Create `manifest.json`

```json
{
  "name": "Bike Racer",
  "short_name": "BikeRacer",
  "description": "Fun endless racing game",
  "start_url": "./index.html",
  "display": "standalone",
  "background_color": "#667eea",
  "theme_color": "#667eea",
  "orientation": "portrait",
  "icons": [
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Step 2: Create Service Worker (`sw.js`)

```javascript
const CACHE_NAME = 'bike-racer-v1';
const urlsToCache = [
  './index.html',
  './bike.png',
  './car1.png',
  './car2.png',
  './bg.mp3'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
```

### Step 3: Update `index.html`

Add to `<head>`:
```html
<link rel="manifest" href="manifest.json">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<link rel="apple-touch-icon" href="icon-192.png">

<script>
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(reg => console.log('SW registered'))
    .catch(err => console.log('SW error:', err));
}
</script>
```

### Step 4: Test PWA

1. Serve over HTTPS
2. Open in Chrome on mobile
3. Click "Add to Home Screen"

---

## 5. Ad Integration

### AdMob Setup (Google)

**1. Create AdMob Account**
- Visit admob.google.com
- Sign up / Sign in
- Create app

**2. Get Ad Unit IDs**
```
Banner Ad: ca-app-pub-XXXXXXXX/YYYYYYYYYY
Interstitial: ca-app-pub-XXXXXXXX/ZZZZZZZZZZ
```

**3. Update `index.html`**

Add to `<head>`:
```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"
     data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"></script>
```

**4. Add Banner Ad**

Replace the placeholder:
```html
<div id="adContainer">
    <ins class="adsbygoogle"
         style="display:block"
         data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
         data-ad-slot="YYYYYYYYYY"
         data-ad-format="auto"
         data-full-width-responsive="true"></ins>
</div>

<script>
(adsbygoogle = window.adsbygoogle || []).push({});
</script>
```

**5. Add Interstitial (Game Over)**

```javascript
function showInterstitialAd() {
    // AdMob interstitial code
    if (typeof admob !== 'undefined') {
        admob.showInterstitial();
    }
}

// Call on game over
function gameOver() {
    // ... existing code ...
    showInterstitialAd();
}
```

### Android AdMob Integration

**1. Update `build.gradle` (app)**
```gradle
dependencies {
    implementation 'com.google.android.gms:play-services-ads:22.6.0'
}
```

**2. Update `AndroidManifest.xml`**
```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"/>
```

**3. Initialize in `MainActivity.java`**
```java
import com.google.android.gms.ads.MobileAds;

@Override
protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    
    // Initialize AdMob
    MobileAds.initialize(this, initializationStatus -> {});
    
    // ... rest of code
}
```

---

## 6. Analytics Integration

### Firebase Analytics

**1. Add Firebase to Project**
```
Tools → Firebase → Analytics → Log events
→ Connect to Firebase
→ Add Analytics to app
```

**2. Track Events**

Add to game code:
```html
<script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-analytics.js"></script>

<script>
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  projectId: "YOUR_PROJECT_ID",
  // ... other config
};

firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics();

// Track game start
function startGame() {
    analytics.logEvent('game_start');
    // ... existing code
}

// Track game over
function gameOver() {
    analytics.logEvent('game_over', {
        score: GAME.score,
        level: GAME.level
    });
    // ... existing code
}
</script>
```

---

## 7. Troubleshooting Deployment

### Common Issues

**Problem**: "App not optimized"
- **Solution**: Build App Bundle (.aab) not APK

**Problem**: WebView shows blank screen
- **Solution**: Check file paths, enable JavaScript

**Problem**: Game slow on Android
- **Solution**: 
  - Enable hardware acceleration
  - Reduce particle effects
  - Cap frame rate to 30fps on low-end

**Problem**: Sound not playing
- **Solution**: User interaction required before audio

**Problem**: AdMob ads not showing
- **Solution**: 
  - Test with test ad IDs first
  - Wait 1-2 hours for ads to appear
  - Check AdMob account status

---

## 8. Maintenance Checklist

### Monthly
□ Check crash reports (Play Console)  
□ Monitor reviews and ratings  
□ Update dependencies  
□ Review analytics  

### Quarterly
□ Performance audit  
□ Security review  
□ A/B test new features  
□ Update graphics  

### Yearly
□ Major version update  
□ Redesign if needed  
□ Refresh marketing materials  
□ Review monetization strategy  

---

## 9. Marketing Tips

### App Store Optimization (ASO)

**Keywords** (play with these):
- bike racer
- endless runner
- traffic dodge
- racing game
- arcade racer

**Screenshots** should show:
1. Gameplay action
2. High score screen
3. Day mode
4. Night mode
5. Game over screen

**Video Trailer** (30 seconds):
- 0-5s: Hook (exciting gameplay)
- 5-15s: Features showcase
- 15-25s: Social proof / reviews
- 25-30s: Call to action

### Launch Strategy

**Week 1**: Soft launch (select countries)  
**Week 2**: Gather feedback, fix bugs  
**Week 3**: Global launch  
**Week 4**: Marketing push  

---

## 10. Success Metrics

Track these KPIs:

- **DAU/MAU ratio**: Daily/Monthly Active Users
- **Retention**: D1, D7, D30
- **Session length**: Average playtime
- **ARPU**: Average revenue per user
- **Crash-free rate**: Target >99%
- **Rating**: Maintain >4.0 stars

---

**Good luck with your deployment! 🚀**

Need help? Check the README or SECURITY_AUDIT documents.
