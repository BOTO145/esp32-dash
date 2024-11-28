// WebSocket connection
let ws = null;
const devices = new Map();

// Initialize the dashboard
function initDashboard() {
    setupWebSocket();
    setupEventListeners();
}

// Setup WebSocket connection
function setupWebSocket() {
    if (ws) {
        ws.close();
    }

    ws = new WebSocket(CONFIG.WEBSOCKET_URL);
    
    ws.onopen = () => {
        updateConnectionStatus(true);
        // Request current device list
        sendMessage({
            command: 'getDevices'
        });
    };

    ws.onclose = () => {
        updateConnectionStatus(false);
        // Attempt to reconnect after 5 seconds
        setTimeout(setupWebSocket, 5000);
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateConnectionStatus(false);
    };

    ws.onmessage = (event) => {
        handleIncomingData(event.data);
    };
}

// Update connection status in UI
function updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connection-status');
    statusElement.textContent = `Status: ${connected ? 'Connected' : 'Disconnected'}`;
    statusElement.className = connected ? 'text-light connected' : 'text-light disconnected';
}

// Handle incoming data
function handleIncomingData(data) {
    try {
        const parsedData = JSON.parse(data);
        
        if (parsedData.type === 'deviceList') {
            updateDeviceList(parsedData.devices);
        } else if (parsedData.type === 'deviceDisconnected') {
            removeDevice(parsedData.deviceId);
        } else if (parsedData.deviceId) {
            // Update device list
            updateDevice(parsedData.deviceId);
            
            // Handle button press
            if (parsedData.sensor === 'button' && parsedData.value === 'pressed') {
                addButtonPressToTable(parsedData);
            }
        }
        
    } catch (error) {
        console.error('Error processing data:', error);
    }
}

// Update device in the list
function updateDevice(deviceId) {
    if (!devices.has(deviceId)) {
        devices.set(deviceId, {
            lastSeen: Date.now(),
            online: true
        });
        
        const deviceList = document.getElementById('device-list');
        const deviceElement = document.createElement('li');
        deviceElement.className = 'list-group-item device-item';
        deviceElement.id = `device-${deviceId}`;
        deviceElement.innerHTML = `
            ESP32 ${deviceId}
            <span class="status-indicator online"></span>
        `;
        deviceList.appendChild(deviceElement);
    } else {
        devices.get(deviceId).lastSeen = Date.now();
    }
}

// Remove device from the list
function removeDevice(deviceId) {
    const element = document.getElementById(`device-${deviceId}`);
    if (element) {
        element.remove();
    }
    devices.delete(deviceId);
}

// Add button press to table with timestamp
function addButtonPressToTable(data) {
    const tbody = document.getElementById('data-table');
    const row = document.createElement('tr');
    
    const timestamp = new Date(parseInt(data.timestamp));
    
    row.innerHTML = `
        <td>${timestamp.toLocaleString()}</td>
        <td>${data.deviceId}</td>
        <td>${data.sensor}</td>
        <td><strong>Button Pressed!</strong></td>
    `;
    
    row.style.backgroundColor = '#e6ffe6';  // Light green background
    setTimeout(() => {
        row.style.backgroundColor = '';  // Remove background after 2 seconds
    }, 2000);
    
    tbody.insertBefore(row, tbody.firstChild);
    
    // Limit table rows
    if (tbody.children.length > 100) {
        tbody.removeChild(tbody.lastChild);
    }
}

// Send message through WebSocket
function sendMessage(message) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
}

// Check device online status periodically
setInterval(() => {
    const now = Date.now();
    devices.forEach((device, deviceId) => {
        const element = document.getElementById(`device-${deviceId}`);
        if (element) {
            const isOnline = now - device.lastSeen < 10000; // Consider offline after 10 seconds
            const statusIndicator = element.querySelector('.status-indicator');
            statusIndicator.className = `status-indicator ${isOnline ? 'online' : 'offline'}`;
            device.online = isOnline;
        }
    });
}, 5000);

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', initDashboard);
