#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ==========================================================================
// 1. KONFIGURASI WIFI
// ==========================================================================
const char* WIFI_SSID     = "anak hebat";
const char* WIFI_PASSWORD = "07112208";

// ==========================================================================
// 2. KONFIGURASI SUPABASE
// ==========================================================================
const char* SUPABASE_URL = "https://nvsvwizlvloburivvupj.supabase.co";
const char* SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52c3Z3aXpsdmxvYnVyaXZ2dXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMjg4NTYsImV4cCI6MjA5NTcwNDg1Nn0.S7YzpgCX56OIdC37knmUhFduDf6YUO2MYBekO4rxChY";

// ==========================================================================
// 3. PIN
// ==========================================================================
#define DHTPIN       4
#define DHTTYPE      DHT22
#define ONE_WIRE_BUS 5
#define RELAY_PIN    13

// ==========================================================================
// 4. LOGIKA RELAY
// HIGH = Relay ON  = Peltier ON
// LOW  = Relay OFF = Peltier OFF
// ==========================================================================
#define RELAY_ON  HIGH
#define RELAY_OFF LOW

// ==========================================================================
// 5. BATAS SUHU AIR
// ==========================================================================
#define BATAS_SUHU_AIR 30.0

// ==========================================================================
// 6. INTERVAL
// ==========================================================================
const unsigned long INTERVAL_KIRIM   = 5000;  // kirim data ke Supabase (ms)
const unsigned long INTERVAL_COMMAND = 3000;  // cek perintah dari Supabase (ms)

// ==========================================================================
// 7. INISIALISASI OBJEK
// ==========================================================================
DHT dht(DHTPIN, DHTTYPE);

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

LiquidCrystal_I2C lcd(0x27, 16, 2);

WiFiClientSecure secureClient;

// ==========================================================================
// 8. VARIABEL GLOBAL
// ==========================================================================
bool  relayState = false;
float suhuUdara  = 0;
float suhuAir    = 0;

unsigned long prevKirim   = 0;
unsigned long prevCommand = 0;

// ==========================================================================
// 9. FUNGSI KONTROL PELTIER
// ==========================================================================
void setPeltier(bool state) {
  relayState = state;
  digitalWrite(RELAY_PIN, relayState ? RELAY_ON : RELAY_OFF);

  if (relayState) {
    Serial.println("RELAY ON | PELTIER ON");
  } else {
    Serial.println("RELAY OFF | PELTIER OFF");
  }
}

// ==========================================================================
// 10. KONTROL OTOMATIS BERDASARKAN SUHU AIR
// ==========================================================================
void kontrolPeltierOtomatis() {
  if (suhuAir > BATAS_SUHU_AIR) {
    setPeltier(true);
    Serial.println("AUTO: Suhu air > 30C | PELTIER ON");
  } else if (suhuAir < BATAS_SUHU_AIR) {
    setPeltier(false);
    Serial.println("AUTO: Suhu air < 30C | PELTIER OFF");
  }
  // Jika suhuAir tepat 30.0C, status Peltier tetap seperti sebelumnya
}

// ==========================================================================
// 11. KONEKSI WIFI
// ==========================================================================
void connectWiFi() {
  Serial.print("Menghubungkan ke WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Connecting WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi terhubung");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("WiFi Connected");
  lcd.setCursor(0, 1);
  lcd.print(WiFi.localIP());
  delay(1500);
}

// ==========================================================================
// 12. BACA SENSOR
// ==========================================================================
void readSensor() {
  suhuUdara = dht.readTemperature();

  sensors.requestTemperatures();
  suhuAir = sensors.getTempCByIndex(0);

  if (isnan(suhuUdara)) {
    suhuUdara = 0;
  }

  if (suhuAir == DEVICE_DISCONNECTED_C) {
    suhuAir = 0;
  }
}

// ==========================================================================
// 13. KIRIM DATA SENSOR KE SUPABASE
// ==========================================================================
void kirimKeSupabase() {
  HTTPClient http;
  String url = String(SUPABASE_URL) + "/rest/v1/sensor_readings";

  http.begin(secureClient, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.addHeader("Prefer", "return=minimal");

  String body = "{\"water_temp\":" + String(suhuAir, 1)
    + ",\"env_temp\":" + String(suhuUdara, 1)
    + ",\"peltier_on\":" + String(relayState ? "true" : "false") + "}";

  int code = http.POST(body);

  if (code == 201) {
    Serial.printf("Supabase OK | Air:%.1f GH:%.1f Peltier:%s\n",
                  suhuAir, suhuUdara, relayState ? "ON" : "OFF");
  } else {
    Serial.printf("Supabase error: HTTP %d\n", code);
  }

  http.end();
}

// ==========================================================================
// 14. TANDAI PERINTAH SEBAGAI EXECUTED
// ==========================================================================
void tandaiDieksekusi(long id) {
  HTTPClient http;
  String url = String(SUPABASE_URL)
    + "/rest/v1/peltier_commands?id=eq."
    + String(id);

  http.begin(secureClient, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.addHeader("Prefer", "return=minimal");

  String patchBody = "{\"executed\":true}";
  http.sendRequest("PATCH", patchBody);
  http.end();
}

// ==========================================================================
// 15. CEK PERINTAH PELTIER DARI SUPABASE
// ==========================================================================
void cekPerintahPeltier() {
  HTTPClient http;
  String url = String(SUPABASE_URL)
    + "/rest/v1/peltier_commands"
    + "?executed=eq.false&order=created_at.desc&limit=1";

  http.begin(secureClient, url);
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);

  int code = http.GET();

  if (code == 200) {
    String payload = http.getString();
    StaticJsonDocument<256> doc;
    DeserializationError err = deserializeJson(doc, payload);

    if (!err && doc.is<JsonArray>() && doc.size() > 0) {
      long        id      = doc[0]["id"];
      const char* command = doc[0]["command"];

      Serial.printf("Perintah manual diterima: %s (id=%ld)\n", command, id);

      if      (strcmp(command, "ON")  == 0) setPeltier(true);
      else if (strcmp(command, "OFF") == 0) setPeltier(false);
      else {
        Serial.println("Perintah tidak valid.");
      }

      tandaiDieksekusi(id);
    }
  } else {
    Serial.printf("Gagal cek perintah: HTTP %d\n", code);
  }

  http.end();
}

// ==========================================================================
// 16. TAMPILKAN DATA KE LCD
// ==========================================================================
void updateLCD() {
  lcd.setCursor(0, 0);
  lcd.print("Air:");
  lcd.print(suhuAir, 1);
  lcd.print((char)223); // simbol derajat
  lcd.print("C ");

  if (relayState) {
    lcd.print("ON ");
  } else {
    lcd.print("OFF");
  }

  lcd.print("   ");

  lcd.setCursor(0, 1);
  lcd.print("GH:");
  lcd.print(suhuUdara, 1);
  lcd.print((char)223);
  lcd.print("C        ");
}

// ==========================================================================
// 17. SETUP
// ==========================================================================
void setup() {
  Serial.begin(115200);

  dht.begin();
  sensors.begin();

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, RELAY_OFF);
  relayState = false;

  lcd.begin();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Sistem Suhu Air");
  lcd.setCursor(0, 1);
  lcd.print("& Greenhouse");
  delay(2000);
  lcd.clear();

  connectWiFi();

  // Nonaktifkan verifikasi SSL
  secureClient.setInsecure();

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Supabase Ready");
  delay(1500);
  lcd.clear();

  Serial.println("=== KONTROL PELTIER VIA SUPABASE ===");
  Serial.printf("Threshold      : %.1f C\n", BATAS_SUHU_AIR);
  Serial.println("Kirim data     : setiap 5 detik");
  Serial.println("Cek perintah   : setiap 3 detik");
  Serial.println("Peltier ON  jika suhu air > 30.0 C");
  Serial.println("Peltier OFF jika suhu air < 30.0 C");
}

// ==========================================================================
// 18. LOOP
// ==========================================================================
void loop() {
  // Reconnect WiFi jika terputus
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    return;
  }

  // Kontrol manual dari Serial Monitor (debug)
  if (Serial.available()) {
    String data = Serial.readStringUntil('\n');
    data.trim();

    if (data == "1" || data == "ON") {
      setPeltier(true);
    } else if (data == "0" || data == "OFF") {
      setPeltier(false);
    }
  }

  unsigned long now = millis();

  // Kirim data sensor + kontrol otomatis setiap INTERVAL_KIRIM
  if (now - prevKirim >= INTERVAL_KIRIM) {
    prevKirim = now;

    readSensor();
    kontrolPeltierOtomatis();
    updateLCD();

    Serial.print("Air:");
    Serial.print(suhuAir, 1);
    Serial.print("C | GH:");
    Serial.print(suhuUdara, 1);
    Serial.print("C | Peltier:");
    Serial.println(relayState ? "ON" : "OFF");

    kirimKeSupabase();
  }

  // Cek perintah manual dari Supabase setiap INTERVAL_COMMAND
  if (now - prevCommand >= INTERVAL_COMMAND) {
    prevCommand = now;
    cekPerintahPeltier();
  }
}