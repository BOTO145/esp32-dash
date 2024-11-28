#include <WiFi.h>
#include <ArduinoWebsockets.h>
#include <ArduinoJson.h>
#include <DHT.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// WebSocket server details (Replace with your Render.com WebSocket URL)
const char* websocket_server = "wss://esp32-dash-ws.onrender.com/esp32";

// Device configuration
const char* deviceId = "ESP32_001";

// DHT sensor configuration
#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// LED Pin
const int ledPin = 2;

using namespace websockets;
WebsocketsClient client;

// JSON document for sending data
StaticJsonDocument<200> doc;
char json_buffer[200];

// Variables for sensor reading intervals
unsigned long lastSensorRead = 0;
const long sensorInterval = 2000;  // Read sensor every 2 seconds

void setup() {
    Serial.begin(115200);
    
    // Initialize LED pin
    pinMode(ledPin, OUTPUT);
    digitalWrite(ledPin, LOW);
    
    // Initialize DHT sensor
    dht.begin();
    
    // Connect to WiFi
    WiFi.begin(ssid, password);
    Serial.println("Connecting to WiFi");
    
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    
    Serial.println("Connected to WiFi");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    
    // Connect to WebSocket server
    connectWebSocket();
}

void connectWebSocket() {
    // Connect to WebSocket server
    bool connected = client.connect(websocket_server);
    if (connected) {
        Serial.println("Connected to WebSocket server");
        // Callback for receiving messages
        client.onMessage([&](WebsocketsMessage message) {
            handleWebSocketMessage(message.data());
        });
    } else {
        Serial.println("Failed to connect to WebSocket server");
    }
}

void handleWebSocketMessage(String message) {
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, message);
    
    if (error) {
        Serial.println("Failed to parse JSON command");
        return;
    }
    
    const char* command = doc["command"];
    
    if (String(command) == "LED_ON") {
        digitalWrite(ledPin, HIGH);
        Serial.println("LED turned ON");
    }
    else if (String(command) == "LED_OFF") {
        digitalWrite(ledPin, LOW);
        Serial.println("LED turned OFF");
    }
    else if (String(command) == "GET_DATA") {
        sendSensorData();
    }
}

void sendSensorData() {
    // Read temperature and humidity
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();
    
    // Send temperature data
    doc.clear();
    doc["deviceId"] = deviceId;
    doc["sensor"] = "temperature";
    doc["value"] = temperature;
    doc["timestamp"] = millis();
    
    serializeJson(doc, json_buffer);
    client.send(json_buffer);
    
    // Send humidity data
    doc.clear();
    doc["deviceId"] = deviceId;
    doc["sensor"] = "humidity";
    doc["value"] = humidity;
    doc["timestamp"] = millis();
    
    serializeJson(doc, json_buffer);
    client.send(json_buffer);
}

void loop() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi connection lost. Reconnecting...");
        WiFi.begin(ssid, password);
        while (WiFi.status() != WL_CONNECTED) {
            delay(500);
            Serial.print(".");
        }
    }
    
    if (!client.available()) {
        Serial.println("WebSocket connection lost. Reconnecting...");
        connectWebSocket();
        delay(2000);
        return;
    }
    
    // Handle WebSocket events
    client.poll();
    
    // Send sensor data periodically
    unsigned long currentMillis = millis();
    if (currentMillis - lastSensorRead >= sensorInterval) {
        lastSensorRead = currentMillis;
        sendSensorData();
    }
}
