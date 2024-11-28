import asyncio
import json
import logging
import os
from datetime import datetime
import websockets
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
PORT = int(os.getenv('PORT', 8080))
CLIENTS = set()
ESP32_DEVICES = {}

# Set up logging
logging.basicConfig(
    format='%(asctime)s %(message)s',
    level=logging.INFO,
)

async def broadcast_to_web_clients(message, sender=None):
    """Broadcast message to all web clients except sender"""
    web_clients = {client for client in CLIENTS if not client.esp32_device}
    if web_clients:
        await asyncio.gather(
            *[client.send(message) for client in web_clients if client != sender]
        )

async def handle_esp32_message(websocket, message):
    """Handle messages from ESP32 devices"""
    try:
        data = json.loads(message)
        device_id = data.get('deviceId')
        
        if device_id:
            ESP32_DEVICES[device_id] = {
                'lastSeen': datetime.now().isoformat(),
                'websocket': websocket
            }
            
        # Broadcast the message to all web clients
        await broadcast_to_web_clients(message)
        
    except json.JSONDecodeError:
        logging.error(f"Invalid JSON received: {message}")

async def handle_web_client_message(websocket, message):
    """Handle messages from web clients"""
    try:
        data = json.loads(message)
        device_id = data.get('deviceId')
        command = data.get('command')
        
        if device_id and device_id in ESP32_DEVICES:
            esp32_socket = ESP32_DEVICES[device_id]['websocket']
            if esp32_socket and esp32_socket in CLIENTS:
                await esp32_socket.send(message)
        elif command == 'getDevices':
            # Send list of active devices
            response = {
                'type': 'deviceList',
                'devices': [
                    {
                        'id': device_id,
                        'lastSeen': data['lastSeen']
                    }
                    for device_id, data in ESP32_DEVICES.items()
                ]
            }
            await websocket.send(json.dumps(response))
            
    except json.JSONDecodeError:
        logging.error(f"Invalid JSON received: {message}")

async def register(websocket, esp32_device=False):
    """Register a new client"""
    websocket.esp32_device = esp32_device
    CLIENTS.add(websocket)
    logging.info(f"{'ESP32' if esp32_device else 'Web Client'} connected. Total clients: {len(CLIENTS)}")

async def unregister(websocket):
    """Unregister a client"""
    CLIENTS.remove(websocket)
    # Remove device from ESP32_DEVICES if it was an ESP32
    for device_id, data in list(ESP32_DEVICES.items()):
        if data['websocket'] == websocket:
            del ESP32_DEVICES[device_id]
            # Notify web clients about device disconnection
            disconnect_message = json.dumps({
                'type': 'deviceDisconnected',
                'deviceId': device_id
            })
            await broadcast_to_web_clients(disconnect_message)
    logging.info(f"Client disconnected. Total clients: {len(CLIENTS)}")

async def handler(websocket, path):
    """Handle WebSocket connections"""
    # Determine if the client is an ESP32 device based on the path
    esp32_device = path == '/esp32'
    
    try:
        await register(websocket, esp32_device)
        async for message in websocket:
            if esp32_device:
                await handle_esp32_message(websocket, message)
            else:
                await handle_web_client_message(websocket, message)
    except websockets.exceptions.ConnectionClosed:
        logging.info("Client connection closed")
    finally:
        await unregister(websocket)

async def main():
    """Start WebSocket server"""
    async with websockets.serve(handler, "0.0.0.0", PORT):
        logging.info(f"WebSocket server started on port {PORT}")
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main())
