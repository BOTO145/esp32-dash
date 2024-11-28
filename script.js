// WebSocket connection
let ws = null;
const devices = new Map();
let chart = null;

// Initialize the dashboard
function initDashboard() {
    setupWebSocket();
    initChart();
    setupEventListeners();
}

// Setup WebSocket connection
function setupWebSocket() {
    ws = new WebSocket('ws://' + window.location.hostname + ':81');
    
    ws.onopen = () => {
        updateConnectionStatus(true);
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

// Initialize Chart.js
function initChart() {
    const ctx = document.getElementById('dataChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'second'
                    }
                },
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Handle incoming data from ESP32
function handleIncomingData(data) {
    try {
        const parsedData = JSON.parse(data);
        
        // Update device list
        updateDeviceList(parsedData.deviceId);
        
        // Update data table
        addDataToTable(parsedData);
        
        // Update chart
        updateChart(parsedData);
        
    } catch (error) {
        console.error('Error processing data:', error);
    }
}

// Update device list
function updateDeviceList(deviceId) {
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

// Add data to table
function addDataToTable(data) {
    const tbody = document.getElementById('data-table');
    const row = document.createElement('tr');
    
    row.innerHTML = `
        <td>${new Date(data.timestamp).toLocaleString()}</td>
        <td>${data.deviceId}</td>
        <td>${data.sensor}</td>
        <td>${data.value}</td>
    `;
    
    tbody.insertBefore(row, tbody.firstChild);
    
    // Limit table rows to prevent memory issues
    if (tbody.children.length > 100) {
        tbody.removeChild(tbody.lastChild);
    }
}

// Update chart with new data
function updateChart(data) {
    const datasetLabel = `${data.deviceId}-${data.sensor}`;
    let dataset = chart.data.datasets.find(ds => ds.label === datasetLabel);
    
    if (!dataset) {
        // Create new dataset for this device-sensor combination
        dataset = {
            label: datasetLabel,
            data: [],
            borderColor: getRandomColor(),
            fill: false,
            tension: 0.4
        };
        chart.data.datasets.push(dataset);
    }
    
    // Add new data point
    dataset.data.push({
        x: data.timestamp,
        y: data.value
    });
    
    // Limit data points to prevent performance issues
    if (dataset.data.length > 50) {
        dataset.data.shift();
    }
    
    chart.update('none'); // Update without animation for better performance
}

// Send command to ESP32
function sendCommand(command) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            command: command,
            timestamp: Date.now()
        }));
    } else {
        console.error('WebSocket is not connected');
    }
}

// Generate random color for chart lines
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
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
