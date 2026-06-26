# Brookmere İletişim Platformu

Discord benzeri, koyu temalı web tabanlı iletişim platformu.

## 🚀 Render.com'a Deploy Etme

### 1. Firebase Kurulumu

1. [console.firebase.google.com](https://console.firebase.google.com) adresine gidin
2. **Proje Ekle** → proje ismi girin → oluşturun
3. Sol menüden **Realtime Database** → "Veritabanı Oluştur" → **Test modu** seçin
4. Sol menüden **Proje Ayarları** (⚙️) → "Uygulamalarınız" → **Web uygulaması ekle** (`</>`)
5. `firebaseConfig` nesnesindeki değerleri not alın

### 2. GitHub'a Yükle

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/kullanici/brookmere.git
git push -u origin main
```

### 3. Render.com'da Servis Oluştur

1. [render.com](https://render.com) → **New** → **Static Site**
2. GitHub reponuzu bağlayın
3. Ayarlar:
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. **Environment Variables** kısmına şu değişkenleri girin:

| Key | Value |
|-----|-------|
| `VITE_FIREBASE_API_KEY` | Firebase'den alınan apiKey |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase'den alınan authDomain |
| `VITE_FIREBASE_DATABASE_URL` | Firebase'den alınan databaseURL |
| `VITE_FIREBASE_PROJECT_ID` | Firebase'den alınan projectId |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase'den alınan storageBucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase'den alınan messagingSenderId |
| `VITE_FIREBASE_APP_ID` | Firebase'den alınan appId |
| `VITE_FIREBASE_MEASUREMENT_ID` | Firebase'den alınan measurementId (opsiyonel) |

5. **Create Static Site** → Deploy!

### 4. Kullanım

- Deploy bittikten sonra Render'ın verdiği URL'i arkadaşlarınızla paylaşın
- Admin hesabı: **Kullanıcı adı:** `Admin` / **Şifre:** `6668`
- Admin olarak giriş yapın, sunucuları oluşturun
- Arkadaşlarınız siteye girince otomatik kayıt olur ve tüm sunuculara katılır
- Firebase sayesinde herkes gerçek zamanlı mesajlaşır

## 🔧 Lokal Geliştirme

```bash
# .env dosyası oluştur
cp .env.example .env
# .env dosyasını Firebase değerleriyle doldur

npm install
npm run dev
```

## 🔑 Admin Bilgileri

- **Kullanıcı Adı:** Admin
- **Şifre:** 6668
