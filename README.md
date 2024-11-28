# ESP32 Cloud Dashboard

A real-time dashboard for monitoring and controlling ESP32 devices from anywhere using GitHub Pages and Render.com.

## Features

- Real-time data visualization with charts
- Live data table
- Device control buttons
- Multiple device support
- Automatic device discovery
- Responsive design
- Cloud-based WebSocket server
- Accessible from anywhere

## Setup Instructions

### 1. GitHub Pages Setup

1. Create a new GitHub repository
2. Push this project to your repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin your-repo-url
   git push -u origin main
   ```
3. Go to repository Settings > Pages
4. Set Source to "main" branch and "/docs" folder
5. Save the settings and wait for the page to be published
6. Note your GitHub Pages URL (e.g., https://username.github.io/repo-name)

### 2. Render.com WebSocket Server Setup

1. Create a new account on Render.com
2. Create a new Web Service
3. Connect your GitHub repository
4. Configure the service:
   - Name: esp32-dashboard-ws (or any name)
   - Runtime: Python 3
   - Build Command: `pip install -r server/requirements.txt`
   - Start Command: `python server/server.py`
   - Add Environment Variable:
     - Key: PORT
     - Value: 8080
5. Deploy the service
6. Note your Render.com WebSocket URL (e.g., wss://esp32-dashboard-ws.onrender.com)

### 3. Update Configuration

1. Edit `docs/config.js`:
   ```javascript
   const CONFIG = {
       WEBSOCKET_URL: 'wss://your-app-name.onrender.com'
   };
   ```

2. Edit ESP32 code (`esp32_websocket_client.ino`):
   ```cpp
   const char* websocket_server = "wss://your-app-name.onrender.com/esp32";
   ```

3. Commit and push changes to GitHub

### 4. ESP32 Setup

1. Install required Arduino libraries:
   - ArduinoWebsockets by Gil Maimon
   - ArduinoJson by Benoit Blanchon
   - DHT sensor library by Adafruit

2. Update WiFi credentials in `esp32_websocket_client.ino`:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```

3. Connect a DHT22 sensor to your ESP32:
   - VCC to 3.3V
   - GND to GND
   - DATA to GPIO4

4. Upload the code to your ESP32

## Usage

1. Access your dashboard at your GitHub Pages URL
2. The ESP32 will automatically connect to the WebSocket server and start sending temperature and humidity data
3. The dashboard will:
   - Display real-time temperature and humidity charts
   - Show a table of all received data
   - Allow you to control the ESP32's built-in LED
   - Show device connection status

## Troubleshooting

1. If the WebSocket connection fails:
   - Check that your Render.com service is running
   - Verify the WebSocket URLs in both ESP32 code and config.js
   - Check your ESP32's internet connection

2. If sensor data isn't showing:
   - Verify the DHT22 sensor is properly connected
   - Check the Serial Monitor in Arduino IDE for error messages

3. If the GitHub Pages site isn't updating:
   - Make sure you've pushed all changes to the main branch
   - Check if GitHub Actions is building your pages correctly
   - Clear your browser cache

## Contributing

Feel free to submit issues and enhancement requests!
