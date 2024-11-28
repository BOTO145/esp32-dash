import asyncio
import websockets
import logging

# Set up logging
logging.basicConfig(
    format='%(asctime)s %(message)s',
    level=logging.INFO,
)

# Store connected clients
CLIENTS = set()

async def broadcast(message, sender=None):
    """Broadcast message to all connected clients except sender"""
    if CLIENTS:
        await asyncio.gather(
            *[client.send(message) for client in CLIENTS if client != sender]
        )

async def handler(websocket):
    """Handle WebSocket connections"""
    try:
        # Register client
        CLIENTS.add(websocket)
        logging.info(f"Client connected. Total clients: {len(CLIENTS)}")
        
        # Handle messages
        async for message in websocket:
            logging.info(f"Received message: {message}")
            # Broadcast message to all other clients
            await broadcast(message, websocket)
            
    except websockets.exceptions.ConnectionClosed:
        logging.info("Client connection closed")
    finally:
        # Unregister client
        CLIENTS.remove(websocket)
        logging.info(f"Client disconnected. Total clients: {len(CLIENTS)}")

async def main():
    """Start WebSocket server"""
    async with websockets.serve(handler, "0.0.0.0", 81):
        logging.info("WebSocket server started on ws://0.0.0.0:81")
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main())
