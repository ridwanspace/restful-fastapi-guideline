## 15. Real-time Communication with WebSockets

WebSockets provide a full-duplex communication channel over a single TCP connection, enabling real-time, bidirectional data exchange between clients and servers. FastAPI offers robust support for WebSockets, making it straightforward to build interactive applications like chat apps, live dashboards, and collaborative tools.

### Introduction to WebSockets in FastAPI

FastAPI uses the `WebSocket` class from Starlette (its underlying ASGI framework) to handle WebSocket connections. You define WebSocket endpoints similarly to HTTP endpoints, using a decorator like `@app.websocket("/ws")`.

**Key Concepts:**
*   **`WebSocket` Dependency:** Injected into your path operation function to interact with the WebSocket connection.
*   **Connection Lifecycle:** FastAPI manages the WebSocket handshake and connection state.
*   **Sending/Receiving Data:** You can send and receive various data types (text, JSON, bytes).

**Basic Setup Example:**

```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, status, WebSocketState
from typing import List, Dict, Any, Optional
import uvicorn
import logging
import asyncio # Added for broadcast example

app = FastAPI()
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO) # Basic logging config

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket {websocket.client} connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket {websocket.client} disconnected. Total connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        if websocket.client_state == WebSocketState.CONNECTED:
            try:
                await websocket.send_text(message)
            except Exception as e:
                logger.error(f"Error sending personal message to {websocket.client}: {e}")
                # self.disconnect(websocket) # Consider disconnecting on send error

    async def broadcast(self, message: str, exclude_websocket: Optional[WebSocket] = None):
        disconnected_clients = []
        for connection in self.active_connections:
            if connection != exclude_websocket and connection.client_state == WebSocketState.CONNECTED:
                try:
                    await connection.send_text(message)
                except Exception as e: 
                    logger.error(f"Error broadcasting to {connection.client}: {e}. Marking for disconnection.")
                    disconnected_clients.append(connection)
        
        for ws_client in disconnected_clients:
            self.disconnect(ws_client)

manager = ConnectionManager()

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: int):
    await manager.connect(websocket)
    await manager.broadcast(f"Client #{client_id} joined the chat", exclude_websocket=websocket)
    try:
        while True:
            data = await websocket.receive_text()
            logger.info(f"Received from client #{client_id}: {data}")
            await manager.send_personal_message(f"You (Client #{client_id}) wrote: {data}", websocket)
            await manager.broadcast(f"Client #{client_id} says: {data}", exclude_websocket=websocket)
    except WebSocketDisconnect:
        logger.info(f"Client #{client_id} disconnected gracefully.")
    except Exception as e:
        logger.error(f"Unexpected error for client #{client_id}: {e}", exc_info=True)
        if websocket.client_state != WebSocketState.DISCONNECTED:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
    finally:
        manager.disconnect(websocket)
        # Ensure broadcast doesn't happen if manager is already empty or for other reasons
        if manager.active_connections:
             await manager.broadcast(f"Client #{client_id} left the chat", exclude_websocket=websocket)

# if __name__ == "__main__":
#     uvicorn.run(app, host="0.0.0.0", port=8000)
```
*In a production scenario, the `ConnectionManager` would need to be more sophisticated, potentially using a distributed store like Redis if you have multiple server instances.*

### Handling WebSocket Connections

Managing the lifecycle of a WebSocket connection involves accepting the connection, handling disconnections gracefully, and potentially performing actions at each stage.

*   **`await websocket.accept()`:** Must be called to accept an incoming WebSocket connection. You can perform authentication checks before accepting.
*   **`WebSocketDisconnect` Exception:** FastAPI raises this exception when a client disconnects. You should handle this to clean up resources.
*   **Connection State:** You can use `websocket.client_state` (e.g., `CONNECTING`, `CONNECTED`, `DISCONNECTED`) and `websocket.application_state` to manage connection-specific states.

**Example: Connection Lifecycle Management with Authentication**
```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, status, Query, WebSocketState
from fastapi.security import OAuth2PasswordBearer 
import logging
import jwt # PyJWT for token handling
from datetime import datetime, timedelta
import json # For JSONDecodeError

app = FastAPI() # Define app if not already defined globally in this context
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

SECRET_KEY_WS_AUTH = "your-very-secret-key-for-ws"
ALGORITHM_WS_AUTH = "HS256"

class AuthConnectionManager:
    def __init__(self):
        self.active_connections: Dict[WebSocket, dict] = {} # Store user info

    async def connect(self, websocket: WebSocket, user: dict):
        # await websocket.accept() # Accept is now handled by the endpoint before calling this
        self.active_connections[websocket] = user
        logger.info(f"User {user.get('username', 'Unknown')} ({websocket.client}) connected via WebSocket.")

    def disconnect(self, websocket: WebSocket):
        user_info = self.active_connections.pop(websocket, None)
        if user_info:
            logger.info(f"User {user_info.get('username', 'Unknown')} ({websocket.client}) disconnected.")
        return user_info

    async def broadcast(self, message: Any, room: Optional[str] = None, exclude_websocket: Optional[WebSocket] = None, send_json: bool = False):
        disconnected_sockets = []
        for ws, user_info in list(self.active_connections.items()): # Iterate over a copy
            if ws == exclude_websocket:
                continue
            # Add room filtering logic if user_info contains room details
            # if room and user_info.get("room") != room:
            #     continue
            if ws.client_state == WebSocketState.CONNECTED:
                try:
                    if send_json:
                        await ws.send_json(message)
                    else:
                        await ws.send_text(str(message))
                except Exception as e:
                    logger.error(f"Broadcast error to {ws.client}: {e}")
                    disconnected_sockets.append(ws)
            else: # Already disconnected or in closing state
                disconnected_sockets.append(ws) # Mark for removal

        for ws_client in disconnected_sockets:
            self.disconnect(ws_client)


auth_manager = AuthConnectionManager()

async def get_user_from_ws_token(token: Optional[str] = Query(None)):
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY_WS_AUTH, algorithms=[ALGORITHM_WS_AUTH])
        username: str = payload.get("sub")
        if username and payload.get("type") == "websocket_auth": 
            return {"username": username, "id": payload.get("user_id")} 
    except jwt.ExpiredSignatureError:
        logger.warning("WebSocket auth attempt with expired token.")
    except jwt.PyJWTError as e:
        logger.warning(f"WebSocket auth attempt with invalid token: {e}")
    return None

@app.websocket("/ws/secure-room/{room_name}")
async def secure_websocket_endpoint(
    websocket: WebSocket,
    room_name: str,
    user: Optional[dict] = Depends(get_user_from_ws_token) 
):
    if user is None:
        await websocket.accept() 
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid or missing authentication token")
        logger.warning(f"WebSocket connection attempt denied & closed for room {room_name} (invalid/missing token).")
        return

    await websocket.accept() 
    await auth_manager.connect(websocket, user) 
    await auth_manager.broadcast(f"User {user['username']} joined room '{room_name}'", room=room_name) 

    try:
        while True:
            data = await websocket.receive_json() 
            logger.info(f"Received JSON from {user['username']} in room {room_name}: {data}")
            message_content = data.get('message', '')
            await auth_manager.broadcast(f"Room '{room_name}' | {user['username']}: {message_content}", room=room_name, exclude_websocket=websocket)
            await websocket.send_json({"status": "Message sent", "your_message": message_content})

    except WebSocketDisconnect:
        logger.info(f"User {user['username']} disconnected from room {room_name}.")
    except json.JSONDecodeError:
        logger.warning(f"Client {user.get('username', websocket.client)} sent non-JSON message to secure room {room_name}.")
        if websocket.client_state != WebSocketState.DISCONNECTED:
            await websocket.close(code=status.WS_1003_UNSUPPORTED_DATA, reason="Invalid JSON format")
    except Exception as e:
        logger.error(f"Error in WebSocket for user {user['username']} in room {room_name}: {e}", exc_info=True)
        if websocket.client_state != WebSocketState.DISCONNECTED:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
    finally:
        disconnected_user = auth_manager.disconnect(websocket)
        if disconnected_user: 
            await auth_manager.broadcast(f"User {disconnected_user['username']} left room '{room_name}'", room=room_name)
```

### Sending and Receiving Messages

FastAPI WebSockets support various methods for message exchange:

*   **Text Messages:**
    *   `await websocket.send_text(data: str)`
    *   `data: str = await websocket.receive_text()`
*   **JSON Messages:**
    *   `await websocket.send_json(data: Any, mode: str = "text")` (mode can be "text" or "binary")
    *   `data: Any = await websocket.receive_json(mode: str = "text")`
*   **Binary Messages (Bytes):**
    *   `await websocket.send_bytes(data: bytes)`
    *   `data: bytes = await websocket.receive_bytes()`
*   **Closing the Connection:**
    *   `await websocket.close(code: int = 1000, reason: Optional[str] = None)` (Standard close codes: 1000 for normal, 1001 for going away, etc.)

**Example: Handling Different Message Types**
```python
# ... (FastAPI app, logger, ConnectionManager 'manager' setup) ...

@app.websocket("/ws/data-protocol")
async def websocket_data_protocol_endpoint(websocket: WebSocket):
    await manager.connect(websocket) # Assumes manager.connect calls accept()
    await websocket.send_json({"status": "connected", "message": "Send JSON with 'type' and 'payload'."})
    try:
        while True:
            received_data = await websocket.receive_json()
            message_type = received_data.get("type")
            payload = received_data.get("payload")

            if message_type == "echo_text":
                if isinstance(payload, str):
                    await websocket.send_json({"type": "echo_response", "original_text": payload})
                else:
                    await websocket.send_json({"type": "error", "message": "echo_text requires string payload"})
            elif message_type == "process_item":
                item_id = payload.get("id") if isinstance(payload, dict) else None
                if item_id is not None:
                    logger.info(f"Processing item_id: {item_id} from {websocket.client}")
                    await asyncio.sleep(0.1) 
                    await websocket.send_json({"type": "item_processed", "item_id": item_id, "status": "completed"})
                else:
                    await websocket.send_json({"type": "error", "message": "process_item requires payload with 'id'"})
            elif message_type == "close_connection":
                await websocket.send_json({"type": "closing", "message": "Closing connection as requested."})
                break 
            else:
                await websocket.send_json({"type": "error", "message": f"Unknown message type: {message_type}"})

    except WebSocketDisconnect:
        logger.info(f"Client {websocket.client} disconnected from data-protocol endpoint.")
    except json.JSONDecodeError:
        logger.warning(f"Client {websocket.client} sent non-JSON message when JSON was expected.")
        if websocket.client_state != WebSocketState.DISCONNECTED:
            await websocket.close(code=status.WS_1003_UNSUPPORTED_DATA, reason="Invalid JSON format")
    except Exception as e:
        logger.error(f"Error in data-protocol WebSocket ({websocket.client}): {e}", exc_info=True)
        if websocket.client_state != WebSocketState.DISCONNECTED:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
    finally:
        manager.disconnect(websocket)
```

### Broadcasting Messages

Broadcasting involves sending a message to multiple (or all) connected WebSocket clients. This is essential for chat applications, live updates, etc. A `ConnectionManager` (as shown in the first example) is a common pattern.

**Considerations for Broadcasting:**
*   **Efficiency:** Iterating through many connections can be slow. For large numbers of clients, consider asynchronous task managers or message queues.
*   **Filtering:** You might want to broadcast only to clients in a specific "room" or group.
*   **Error Handling:** Handle potential errors when sending to individual clients (e.g., a client disconnected abruptly).

**Enhanced Connection Manager for Broadcasting to Rooms:**
```python
from collections import defaultdict

class RoomConnectionManager:
    def __init__(self):
        self.room_connections: Dict[str, List[WebSocket]] = defaultdict(list)
        self.websocket_to_room: Dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, room_name: str):
        if websocket.client_state != WebSocketState.CONNECTED:
             await websocket.accept()
        self.room_connections[room_name].append(websocket)
        self.websocket_to_room[websocket] = room_name
        logger.info(f"WebSocket {websocket.client} connected to room '{room_name}'. Total in room: {len(self.room_connections[room_name])}")

    def disconnect(self, websocket: WebSocket):
        room_name = self.websocket_to_room.pop(websocket, None)
        if room_name and websocket in self.room_connections.get(room_name, []):
            self.room_connections[room_name].remove(websocket)
            logger.info(f"WebSocket {websocket.client} disconnected from room '{room_name}'. Remaining in room: {len(self.room_connections.get(room_name, []))}")
            if not self.room_connections[room_name]: 
                del self.room_connections[room_name]
                logger.info(f"Room '{room_name}' is now empty and removed.")
        elif room_name: 
            logger.warning(f"Websocket {websocket.client} was mapped to room '{room_name}' but not found in its connection list during disconnect.")

    async def broadcast_to_room(self, message: Any, room_name: str, exclude_sender: Optional[WebSocket] = None, send_json: bool = False):
        if room_name not in self.room_connections:
            logger.debug(f"Attempted to broadcast to non-existent or empty room: {room_name}")
            return
        
        disconnected_clients = []
        for connection in list(self.room_connections[room_name]): 
            if connection == exclude_sender:
                continue
            if connection.client_state == WebSocketState.CONNECTED:
                try:
                    if send_json:
                        await connection.send_json(message)
                    else:
                        await connection.send_text(str(message))
                except Exception as e:
                    logger.error(f"Broadcast error to {connection.client} in room {room_name}: {e}")
                    disconnected_clients.append(connection)
            else: 
                 disconnected_clients.append(connection)
        
        for ws_client in disconnected_clients:
            self.disconnect(ws_client) 

room_manager = RoomConnectionManager() 

@app.websocket("/ws/chat/{room_name}/{user_name}")
async def chat_websocket_endpoint(websocket: WebSocket, room_name: str, user_name: str):
    await room_manager.connect(websocket, room_name)
    join_message = {"type": "system", "user": user_name, "action": "joined", "room": room_name, "timestamp": datetime.utcnow().isoformat()}
    await room_manager.broadcast_to_room(join_message, room_name, send_json=True)
    
    try:
        while True:
            data = await websocket.receive_json() 
            message_text = data.get("text", "")
            logger.info(f"Room '{room_name}', {user_name}: {message_text}")
            
            chat_message = {
                "type": "chat", 
                "user": user_name, 
                "text": message_text, 
                "room": room_name,
                "timestamp": datetime.utcnow().isoformat()
            }
            await room_manager.broadcast_to_room(chat_message, room_name, exclude_sender=websocket, send_json=True)
            
    except WebSocketDisconnect:
        logger.info(f"User {user_name} disconnected from room {room_name}.")
    except json.JSONDecodeError:
        logger.warning(f"User {user_name} in room {room_name} sent non-JSON message.")
        if websocket.client_state != WebSocketState.DISCONNECTED:
            await websocket.close(code=status.WS_1003_UNSUPPORTED_DATA, reason="Invalid JSON message format")
    except Exception as e:
        logger.error(f"Chat WebSocket error for {user_name} in {room_name}: {e}", exc_info=True)
        if websocket.client_state != WebSocketState.DISCONNECTED:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
    finally:
        room_manager.disconnect(websocket)
        leave_message = {"type": "system", "user": user_name, "action": "left", "room": room_name, "timestamp": datetime.utcnow().isoformat()}
        await room_manager.broadcast_to_room(leave_message, room_name, send_json=True)

```

### Authentication and Authorization for WebSockets

Securing WebSocket endpoints is crucial. You can't use standard HTTP `Authorization` headers directly after the initial handshake. Common strategies include:

1.  **Token in Query Parameter:** Pass a token as a query parameter during the initial WebSocket connection URL.
    *   `wss://example.com/ws?token=YOUR_JWT_TOKEN`
    *   **Caveat:** URLs can be logged. Better for server-to-server or non-browser clients if security is paramount.
2.  **Token in Subprotocol:** Pass the token in one of the `Sec-WebSocket-Protocol` headers during the handshake. FastAPI allows you to access these.
    *   Client: `new WebSocket("wss://example.com/ws", ["token.YOUR_JWT_TOKEN", "another.protocol"]);`
    *   Server: `await websocket.accept(subprotocol=chosen_protocol)`
3.  **Cookie-based Authentication:** If your HTTP API uses cookies for auth (e.g., `HttpOnly` session cookies), WebSockets initiated from the same domain can often leverage these cookies automatically if the browser sends them. FastAPI can access `websocket.cookies`.
4.  **Initial Message Authentication:** Client connects, then sends an authentication message (e.g., a JWT) as the first WebSocket message. The server validates it before proceeding.

**Example: Token in Query Parameter & Cookie-Based (Conceptual)**
```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, Depends, status, Cookie, HTTPException, WebSocketState
import jwt 
from datetime import datetime, timedelta
import logging
import json 
from typing import Optional, Dict, List, Any
from collections import defaultdict 

app = FastAPI() 
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# room_manager = RoomConnectionManager() # Assumed to be defined

SECRET_KEY_WS = "a_different_secret_for_websocket_tokens_perhaps"
ALGORITHM_WS = "HS256"

def create_ws_auth_token(user_id: int, username: str, permissions: List[str] = None):
    expires_delta = timedelta(hours=1) 
    expire = datetime.utcnow() + expires_delta
    to_encode = {"sub": username, "user_id": user_id, "exp": expire, "type": "websocket_auth"}
    if permissions:
        to_encode["perms"] = permissions
    return jwt.encode(to_encode, SECRET_KEY_WS, algorithm=ALGORITHM_WS)

async def get_user_from_ws_token_query(token: Optional[str] = Query(None)) -> Optional[Dict[str, Any]]:
    if not token: return None
    try:
        payload = jwt.decode(token, SECRET_KEY_WS, algorithms=[ALGORITHM_WS])
        if payload.get("type") != "websocket_auth": 
            logger.warning(f"Query token type mismatch: {payload.get('type')}")
            return None
        return {"username": payload.get("sub"), "user_id": payload.get("user_id"), "source": "query_token", "perms": payload.get("perms", [])}
    except jwt.ExpiredSignatureError: 
        logger.warning("WS Auth: Query token expired.")
    except jwt.PyJWTError as e:
        logger.warning(f"WS Auth: Invalid query token: {e}")
    return None

async def get_user_from_ws_cookie(session_token: Optional[str] = Cookie(None)) -> Optional[Dict[str, Any]]:
    if not session_token: return None
    try:
        payload = jwt.decode(session_token, SECRET_KEY_WS, algorithms=[ALGORITHM_WS]) 
        if payload.get("type") != "http_session_token_for_ws": 
            logger.warning(f"Cookie token type mismatch: {payload.get('type')}")
            return None
        return {"username": payload.get("sub"), "user_id": payload.get("user_id"), "source": "cookie", "perms": payload.get("perms", [])}
    except jwt.ExpiredSignatureError:
        logger.warning("WS Auth: Cookie token expired.")
    except jwt.PyJWTError as e:
        logger.warning(f"WS Auth: Invalid cookie token: {e}")
    return None

async def authenticate_websocket_user(
    websocket: WebSocket, 
    token_user: Optional[dict] = Depends(get_user_from_ws_token_query),
    cookie_user: Optional[dict] = Depends(get_user_from_ws_cookie)
) -> Optional[dict]:
    user = token_user or cookie_user 
    if user:
        logger.info(f"WebSocket authenticated user {user['username']} via {user['source']}.")
        return user
    
    logger.warning(f"WebSocket authentication failed for {websocket.client}.")
    return None

async def get_user_from_subprotocol(websocket: WebSocket) -> Optional[Dict[str, Any]]:
    chosen_protocol = None
    token_to_verify = None

    if websocket.scope.get("subprotocols"):
        for sp in websocket.scope["subprotocols"]:
            if sp.startswith("token."):
                token_to_verify = sp.split("token.", 1)[1]
                chosen_protocol = sp 
                break 
    
    if not token_to_verify:
        return None

    try:
        payload = jwt.decode(token_to_verify, SECRET_KEY_WS, algorithms=[ALGORITHM_WS])
        if payload.get("type") != "websocket_auth": return None
        user_data = {"username": payload.get("sub"), "user_id": payload.get("user_id"), "source": "subprotocol_token", "perms": payload.get("perms", [])}
        user_data["chosen_subprotocol"] = chosen_protocol 
        return user_data
    except jwt.PyJWTError:
        return None


@app.websocket("/ws/multi-auth/{channel_id}")
async def multi_auth_websocket(
    websocket: WebSocket,
    channel_id: str,
    user: Optional[dict] = Depends(authenticate_websocket_user) 
):
    chosen_subprotocol_for_accept = None
    if not user: 
        user_via_subprotocol = await get_user_from_subprotocol(websocket)
        if user_via_subprotocol:
            user = user_via_subprotocol
            chosen_subprotocol_for_accept = user_via_subprotocol.get("chosen_subprotocol")
            logger.info(f"WebSocket authenticated user {user['username']} via subprotocol.")
        else: 
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication required")
            return

    try:
        await websocket.accept(subprotocol=chosen_subprotocol_for_accept)
    except Exception as e: 
        logger.error(f"Failed to accept WebSocket connection for {user['username'] if user else 'unknown'}: {e}")
        return 

    room_manager.room_connections[channel_id].append(websocket)
    room_manager.websocket_to_room[websocket] = channel_id
    logger.info(f"User {user['username']} ({websocket.client}) effectively in room '{channel_id}'.")


    await room_manager.broadcast_to_room(
        {"type": "join", "user": user['username'], "channel": channel_id, "auth_source": user['source']},
        channel_id,
        send_json=True
    )

    try:
        while True:
            data = await websocket.receive_json()
            await room_manager.broadcast_to_room(
                {"type": "message", "user": user['username'], "content": data, "channel": channel_id},
                channel_id,
                exclude_sender=websocket,
                send_json=True
            )
    except WebSocketDisconnect:
        logger.info(f"User {user['username']} disconnected from channel {channel_id}.")
    except json.JSONDecodeError:
        logger.warning(f"User {user['username']} in channel {channel_id} sent non-JSON message.")
        if websocket.client_state != WebSocketState.DISCONNECTED:
            await websocket.close(code=status.WS_1003_UNSUPPORTED_DATA, reason="Invalid JSON format")
    except Exception as e:
        logger.error(f"Error for user {user['username']} in channel {channel_id}: {e}", exc_info=True)
        if websocket.client_state != WebSocketState.DISCONNECTED:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
    finally:
        room_manager.disconnect(websocket) 
        await room_manager.broadcast_to_room(
             {"type": "leave", "user": user['username'], "channel": channel_id},
             channel_id,
             send_json=True
        )
```

### Scaling WebSockets

When your application needs to handle a large number of concurrent WebSocket connections or run across multiple server instances, a simple in-memory `ConnectionManager` is insufficient.

**Challenges:**
*   **State Management:** How do you know which client is connected to which server instance?
*   **Broadcasting:** How does one server instance send a message to a client connected to another instance?

**Common Scaling Strategies:**
1.  **Sticky Sessions (Load Balancer):**
    *   The load balancer (e.g., Nginx, HAProxy, AWS ALB) ensures that a client always connects to the same server instance for the duration of its WebSocket session, typically based on client IP or a cookie.
    *   **Pros:** Simpler server-side logic as each server manages its own connections locally.
    *   **Cons:** Can lead to uneven load distribution; if a server instance goes down, all its WebSocket clients are disconnected and need to re-establish.
2.  **Shared Connection Store & Pub/Sub (e.g., Redis):**
    *   Each server instance registers its connected clients (and their server identifier/channel subscriptions) in a shared store like Redis.
    *   When broadcasting, a server publishes a message to a Redis Pub/Sub channel (e.g., `room:chat_room_123`). All server instances subscribe to relevant channels. Upon receiving a message from Redis, each instance forwards it to its locally connected WebSocket clients that are part of that room/channel.
    *   **Pros:** Better load distribution, more resilient to server failures (clients can reconnect to another instance and re-subscribe).
    *   **Cons:** Increased complexity, reliance and potential bottleneck on Redis.
3.  **Dedicated WebSocket Layer/Service:**
    *   Use a specialized service (e.g., Centrifugo, Socket.IO with a Redis adapter, Ably, Pusher, or a custom-built one using something like `aiohttp-websockets` scaled independently) designed to handle WebSocket connections at scale. Your FastAPI application interacts with this layer via an API or message queue to send messages.
    *   **Pros:** Offloads WebSocket connection management complexity, often provides advanced features (presence, history, horizontal scaling).
    *   **Cons:** Introduces another component/dependency, potential vendor lock-in or operational overhead for self-hosted solutions.
4.  **Message Brokers (Kafka, RabbitMQ):**
    *   For very high-throughput scenarios or when messages need strong delivery guarantees and persistence, messages can be routed through a message broker. Each server instance (or a dedicated set of WebSocket gateway instances) consumes messages relevant to its connected clients.
    *   **Pros:** Highly scalable, durable, good for complex event-driven architectures.
    *   **Cons:** Significant architectural complexity, higher latency compared to direct Pub/Sub.

**Conceptual Example: Using Redis Pub/Sub for Broadcasting**

This is a conceptual outline. A full implementation requires a Redis client library (e.g., `redis-py` with `asyncio` support) and careful handling of subscriptions, message parsing, and error states.

```python
# Conceptual - requires redis-py (async version) and proper async handling
import redis.asyncio as redis 
import asyncio
import json
import uuid 
# Assume: app, logger, RoomConnectionManager 'room_manager' are defined

redis_publisher_conn: Optional[redis.Redis] = None
redis_subscriber_conn: Optional[redis.Redis] = None
pubsub_listener_task: Optional[asyncio.Task] = None
CURRENT_INSTANCE_ID = str(uuid.uuid4()) 

async def connect_redis():
    global redis_publisher_conn, redis_subscriber_conn
    try:
        redis_publisher_conn = await redis.from_url("redis://localhost:6379/0", decode_responses=True)
        redis_subscriber_conn = await redis.from_url("redis://localhost:6379/0", decode_responses=True) 
        await redis_publisher_conn.ping()
        await redis_subscriber_conn.ping()
        logger.info(f"Instance {CURRENT_INSTANCE_ID} connected to Redis for Pub/Sub.")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}", exc_info=True)
        redis_publisher_conn = None
        redis_subscriber_conn = None


async def disconnect_redis():
    global pubsub_listener_task 
    if pubsub_listener_task and not pubsub_listener_task.done():
        pubsub_listener_task.cancel()
        try:
            await pubsub_listener_task
        except asyncio.CancelledError:
            logger.info("PubSub listener task cancelled.")
        except Exception as e:
            logger.error(f"Error during PubSub listener task cancellation: {e}")
    if redis_subscriber_conn:
        try:
            await redis_subscriber_conn.close()
            logger.info("Redis subscriber connection closed.")
        except Exception as e:
            logger.error(f"Error closing Redis subscriber connection: {e}")
    if redis_publisher_conn:
        try:
            await redis_publisher_conn.close()
            logger.info("Redis publisher connection closed.")
        except Exception as e:
            logger.error(f"Error closing Redis publisher connection: {e}")


async def redis_message_handler_loop(pubsub: redis.client.PubSub):
    try:
        async for message in pubsub.listen():
            if message["type"] == "pmessage": 
                try:
                    channel_full = message["channel"] 
                    channel_parts = channel_full.split(":", 1)
                    if len(channel_parts) < 2 or channel_parts[0] != "room":
                        logger.debug(f"Ignoring Redis message on unexpected channel: {channel_full}")
                        continue
                    
                    room_name = channel_parts[1]
                    message_data_str = message["data"]
                    data_dict = json.loads(message_data_str) 
                    
                    actual_message_content = data_dict.get("content") 
                    origin_instance_id = data_dict.get("instance_id")

                    logger.debug(f"Redis received for room {room_name} (from {origin_instance_id}): {actual_message_content}")
                    await room_manager.broadcast_to_room(
                        actual_message_content, 
                        room_name, 
                        send_json=True 
                    )
                except json.JSONDecodeError:
                    logger.error(f"Redis Pub/Sub: Could not decode JSON from message data: {message.get('data')}")
                except Exception as e:
                    logger.error(f"Error processing Redis message for channel {message.get('channel')}: {e}", exc_info=True)
    except asyncio.CancelledError:
        logger.info("Redis message handler loop cancelled.")
    except Exception as e:
        logger.error(f"Critical error in Redis message handler loop: {e}", exc_info=True)
    finally:
        logger.info("Redis message handler loop finished.")


async def start_pubsub_listener():
    global pubsub_listener_task
    if not redis_subscriber_conn:
        logger.error("Redis subscriber not initialized for listener. Cannot start listener.")
        return
    
    pubsub = redis_subscriber_conn.pubsub()
    try:
        await pubsub.psubscribe("room:*") 
        pubsub_listener_task = asyncio.create_task(redis_message_handler_loop(pubsub))
        logger.info(f"Instance {CURRENT_INSTANCE_ID} Redis PubSub listener started for pattern 'room:*'.")
    except Exception as e:
        logger.error(f"Failed to psubscribe or start listener task: {e}", exc_info=True)


app.add_event_handler("startup", connect_redis)
app.add_event_handler("startup", start_pubsub_listener) 
app.add_event_handler("shutdown", disconnect_redis)


async def broadcast_to_room_via_redis(message_content: Any, room_name: str):
    if not redis_publisher_conn:
        logger.error("Redis publisher not initialized for broadcast. Message not sent.")
        return

    payload_to_publish = {
        "content": message_content, 
        "instance_id": CURRENT_INSTANCE_ID 
    }
    try:
        channel = f"room:{room_name}"
        await redis_publisher_conn.publish(channel, json.dumps(payload_to_publish))
        logger.debug(f"Instance {CURRENT_INSTANCE_ID} published to Redis channel {channel}: {message_content}")
    except Exception as e:
        logger.error(f"Failed to publish message to Redis for room {room_name}: {e}", exc_info=True)

# Example modification to the chat endpoint:
# @app.websocket("/ws/chat-redis/{room_name}/{user_name}")
# async def chat_redis_websocket_endpoint(websocket: WebSocket, room_name: str, user_name: str):
#     # ... (authentication and local room_manager.connect logic) ...
#     await room_manager.connect(websocket, room_name) 
#     join_msg_content = {"type": "system", "user": user_name, "action": "joined", "room": room_name, "timestamp": datetime.utcnow().isoformat()}
#     await broadcast_to_room_via_redis(join_msg_content, room_name)
#     try:
#         while True:
#             data = await websocket.receive_json()
#             chat_msg_content = {"type": "chat", "user": user_name, "text": data.get("text",""), "room": room_name, "timestamp": datetime.utcnow().isoformat()}
#             await broadcast_to_room_via_redis(chat_msg_content, room_name) 
#     except WebSocketDisconnect:
#         logger.info(f"User {user_name} (Redis chat) disconnected from room {room_name}.")
#     finally:
#         room_manager.disconnect(websocket)
#         leave_msg_content = {"type": "system", "user": user_name, "action": "left", "room": room_name, "timestamp": datetime.utcnow().isoformat()}
#         await broadcast_to_room_via_redis(leave_msg_content, room_name)
```
This Redis Pub/Sub example illustrates how instances can communicate. Each server instance maintains its local WebSocket connections. When a message needs to be broadcast (e.g., a chat message from a user connected to instance A), instance A publishes it to a Redis channel (e.g., `room:my_chat_room`). All instances (A, B, C, etc.) are subscribed to this channel. When they receive the message from Redis, they then iterate through their *local* WebSocket connections for `my_chat_room` and send the message.

---

## 16. Implementing Webhooks

Webhooks are automated messages sent from apps when something happens. They have a message—or payload—which is sent to a unique URL: a webhook URL. This allows different applications to communicate event-driven information in real-time or near real-time.

### Understanding Webhooks vs. Polling

*   **Polling:** The client repeatedly asks the server if there's new data.
    *   **Pros:** Simple to implement on the client.
    *   **Cons:** Inefficient (many useless requests), latency (delay in getting updates), can overload the server.
*   **Webhooks (Push):** The server notifies the client (by sending an HTTP request to a pre-registered client URL) when new data or an event occurs.
    *   **Pros:** Efficient (data sent only when available), low latency, reduces server load.
    *   **Cons:** Client needs a publicly accessible endpoint, more complex initial setup, requires handling security.

**When to use Webhooks:**
*   Notifications for events (e.g., payment completed, new user signed up, CI build finished).
*   Data synchronization between services.
*   Integrating with third-party services that support webhooks (e.g., GitHub, Stripe, Slack).

### Receiving Webhooks in FastAPI

Your FastAPI application will act as the HTTP server listening for incoming webhook requests from an external service.

**Key Considerations:**
1.  **Dedicated Endpoint:** Create a specific endpoint (e.g., `/webhooks/service-name`) for each webhook provider.
2.  **HTTP Method:** Most webhooks use `POST` requests with a JSON payload.
3.  **Immediate Response:** Respond quickly to the webhook provider (e.g., `200 OK` or `202 Accepted`) to acknowledge receipt. Long processing should be done asynchronously.
4.  **Payload Validation:** Validate the structure and data types of the incoming payload using Pydantic models.
5.  **Security:** Verify the authenticity of the webhook.
6.  **Asynchronous Processing:** Offload the actual processing of the webhook data to background tasks.
7.  **Idempotency:** Webhook providers may send the same event multiple times (e.g., due to network issues or retries). Design your handler to be idempotent if the action taken is not naturally so.

**Example: Receiving a GitHub Webhook**

```python
from fastapi import FastAPI, Request, HTTPException, Header, BackgroundTasks, status
from pydantic import BaseModel, Field, ValidationError
import hashlib
import hmac
import json
import logging
import uvicorn 
from typing import Dict, Any, List, Optional 
import os 
import uuid 

app = FastAPI() 
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

GITHUB_WEBHOOK_SECRET = os.environ.get("GITHUB_WEBHOOK_SECRET", "your_github_webhook_secret_fallback") 

class GitHubRepository(BaseModel):
    id: int
    name: str
    full_name: str
    html_url: str

class GitHubPusher(BaseModel):
    name: str
    email: Optional[str] = None

class GitHubCommit(BaseModel):
    id: str
    message: str
    timestamp: str 
    url: str
    author: Dict[str, str] 

class GitHubPushEventPayload(BaseModel):
    ref: str
    before: str
    after: str
    repository: GitHubRepository
    pusher: GitHubPusher
    commits: List[GitHubCommit]
    head_commit: Optional[GitHubCommit] = None 

async def verify_github_signature(request: Request, secret: str) -> bool:
    signature_header = request.headers.get("X-Hub-Signature-256")
    if not signature_header:
        logger.warning("Missing X-Hub-Signature-256 header from GitHub webhook.")
        return False

    sha_name, signature_hex = signature_header.split("=", 1)
    if sha_name != "sha256":
        logger.warning(f"Unsupported signature algorithm: {sha_name}")
        return False

    request_body_bytes = await request.body() 
    request.state.raw_body = request_body_bytes

    mac = hmac.new(secret.encode('utf-8'), msg=request_body_bytes, digestmod=hashlib.sha256)
    expected_signature = mac.hexdigest()

    if not hmac.compare_digest(expected_signature, signature_hex):
        logger.warning(f"GitHub webhook signature mismatch. Expected: {expected_signature}, Got: {signature_hex}")
        return False
    
    logger.info("GitHub webhook signature verified successfully.")
    return True

async def process_github_push_event(event_id: str, payload: GitHubPushEventPayload):
    logger.info(f"Event ID {event_id}: Processing GitHub push event for repo: {payload.repository.full_name}, ref: {payload.ref}")
    for commit in payload.commits:
        logger.info(f"Event ID {event_id}: Commit {commit.id[:7]} by {commit.author.get('name')}: {commit.message.splitlines()[0]}")
    
    await asyncio.sleep(5) 
    logger.info(f"Event ID {event_id}: Finished processing push event for {payload.repository.full_name}.")


@app.post("/webhooks/github")
async def github_webhook_receiver(
    request: Request,
    background_tasks: BackgroundTasks,
    x_github_event: Optional[str] = Header(None), 
    x_github_delivery: Optional[str] = Header(None), 
    x_hub_signature_256: Optional[str] = Header(None) 
):
    event_id = x_github_delivery or str(uuid.uuid4()) 
    logger.info(f"Event ID {event_id}: Received GitHub webhook. Event Type: {x_github_event}, Signature Present: {x_hub_signature_256 is not None}")

    if not await verify_github_signature(request, GITHUB_WEBHOOK_SECRET):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid signature")

    raw_body = getattr(request.state, "raw_body", None)
    if not raw_body:
        logger.error(f"Event ID {event_id}: Raw body not found in request state after signature verification.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal error processing request body.")
    
    try:
        payload_dict = json.loads(raw_body.decode('utf-8'))
    except json.JSONDecodeError:
        logger.error(f"Event ID {event_id}: GitHub webhook - Invalid JSON payload.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON payload")

    if x_github_event == "push":
        try:
            push_payload = GitHubPushEventPayload(**payload_dict)
        except ValidationError as e: 
            logger.error(f"Event ID {event_id}: GitHub webhook 'push' event validation error: {e.errors()}")
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"message": "Invalid push event payload", "errors": e.errors()})
        
        background_tasks.add_task(process_github_push_event, event_id, push_payload)
        logger.info(f"Event ID {event_id}: GitHub 'push' event for {push_payload.repository.full_name} queued for processing.")
        return {"status": "success", "message": "Webhook received and queued.", "event_id": event_id}
    
    elif x_github_event == "ping":
        logger.info(f"Event ID {event_id}: Received GitHub 'ping' event. Zen: {payload_dict.get('zen')}")
        return {"status": "success", "message": "Pong! Ping event received.", "event_id": event_id}
        
    else:
        logger.info(f"Event ID {event_id}: Received unhandled GitHub event type: {x_github_event}")
        return {"status": "success", "message": f"Webhook event '{x_github_event}' received but not processed.", "event_id": event_id}

```

### Sending Webhooks from FastAPI

Your application might also need to send webhooks to other services when certain events occur within your system.

**Key Considerations:**
1.  **Event Trigger:** Determine what internal events should trigger a webhook.
2.  **Subscriber Management:** Store webhook URLs subscribed by clients/services. This usually involves a database table for `(event_type, target_url, secret_for_signing, is_active)`.
3.  **Payload Design:** Create a clear and consistent JSON payload for your webhooks. Include event type, timestamp, a unique event ID, and relevant data.
4.  **Asynchronous Sending:** Send webhooks asynchronously (e.g., using `BackgroundTasks` or a task queue like Celery/RQ) to avoid blocking your main application logic.
5.  **Retry Mechanisms:** Implement retries with exponential backoff for failed deliveries. External services might be temporarily unavailable. Log failed attempts and final failures.
6.  **Signing Outgoing Webhooks:** Sign your webhook payloads (e.g., using HMAC-SHA256 with the subscriber's secret) so the recipient can verify their authenticity.
7.  **Logging and Monitoring:** Log all outgoing webhook attempts, successes, and failures. Monitor delivery rates and error patterns.
8.  **Dead Letter Queues (DLQ):** For webhooks that consistently fail after multiple retries, consider sending them to a DLQ for manual inspection or later processing.

**Example: Sending a Webhook for a "New Order" Event**

```python
from fastapi import FastAPI, BackgroundTasks, Depends, status as http_status 
from pydantic import BaseModel, Field
import httpx 
import hmac
import hashlib
import json
import time 
from typing import List, Dict, Any, Optional
import logging
import asyncio
import uuid 
from datetime import datetime 

app = FastAPI() 
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

webhook_subscriptions: Dict[str, List[Dict[str, str]]] = {
    "order.created": [
        {"id": "sub_1", "url": "https://client-service-a.com/webhooks/orders", "secret": "client_a_super_secret", "is_active": True},
        {"id": "sub_2", "url": "http://localhost:8001/test-webhook-receiver", "secret": "local_test_secret", "is_active": True}, 
        {"id": "sub_3", "url": "https://client-service-b.com/api/new-order-hook", "secret": "client_b_very_secure_key", "is_active": False}, 
    ],
    "user.updated": [
        {"id": "sub_4", "url": "https://audit-log-service.com/user-events", "secret": "audit_secret_key", "is_active": True},
    ]
}

class OrderItem(BaseModel):
    product_id: str
    quantity: int
    unit_price: float

class OrderDataForWebhook(BaseModel):
    order_id: str
    customer_id: int
    total_amount: float
    currency: str = "USD"
    items: List[OrderItem]
    status: str = "pending"
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


async def send_webhook_attempt_with_retries(
    target_url: str, 
    payload_dict: Dict[str, Any], 
    secret: str, 
    event_id: str,
    subscription_id: str,
    max_retries: int = 3, 
    initial_delay_seconds: int = 2
):
    payload_bytes = json.dumps(payload_dict, sort_keys=True, separators=(',', ':')).encode('utf-8') 
    signature = hmac.new(secret.encode('utf-8'), payload_bytes, hashlib.sha256).hexdigest()
    
    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-MyAPI-Signature-256": f"sha256={signature}", 
        "X-MyAPI-Event-ID": event_id,
        "User-Agent": "MyFastAPI-WebhookDispatcher/1.0"
    }

    for attempt in range(1, max_retries + 1):
        headers["X-MyAPI-Webhook-Attempt"] = str(attempt)
        logger.info(f"Event {event_id} (Sub {subscription_id}): Attempt {attempt}/{max_retries} to send webhook to {target_url}")
        try:
            async with httpx.AsyncClient(timeout=10.0) as client: 
                response = await client.post(target_url, content=payload_bytes, headers=headers)
            
            if 200 <= response.status_code < 300:
                logger.info(f"Event {event_id} (Sub {subscription_id}): Webhook successfully sent to {target_url}. Status: {response.status_code}")
                return True 
            else:
                logger.warning(f"Event {event_id} (Sub {subscription_id}): Webhook delivery to {target_url} failed. Status: {response.status_code}, Response: {response.text[:200]}")
                if 400 <= response.status_code < 500 and response.status_code not in [408, 429]: 
                    logger.error(f"Event {event_id} (Sub {subscription_id}): Client error {response.status_code} from {target_url}. Not retrying further for this error.")
                    return False 
        
        except httpx.TimeoutException:
            logger.warning(f"Event {event_id} (Sub {subscription_id}): Webhook request to {target_url} timed out (Attempt {attempt}).")
        except httpx.RequestError as e:
            logger.error(f"Event {event_id} (Sub {subscription_id}): Webhook request error for {target_url} (Attempt {attempt}): {e}")
        except Exception as e: 
            logger.error(f"Event {event_id} (Sub {subscription_id}): Unexpected error sending webhook to {target_url} (Attempt {attempt}): {e}", exc_info=True)

        if attempt < max_retries:
            delay = initial_delay_seconds * (2 ** (attempt - 1)) 
            logger.info(f"Event {event_id} (Sub {subscription_id}): Retrying webhook to {target_url} in {delay} seconds.")
            await asyncio.sleep(delay)
        else:
            logger.error(f"Event {event_id} (Sub {subscription_id}): Failed to deliver webhook to {target_url} after {max_retries} attempts.")
            return False
    return False 

async def dispatch_event_to_subscribers(event_type: str, event_data_model: BaseModel):
    subscribers = webhook_subscriptions.get(event_type, [])
    if not subscribers:
        logger.debug(f"No subscribers for event type: {event_type}")
        return

    event_id = str(uuid.uuid4())
    event_payload_dict = {
        "event_type": event_type,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "data": event_data_model.dict(), 
        "event_id": event_id 
    }
    
    active_subscribers = [sub for sub in subscribers if sub.get("is_active")]
    logger.info(f"Event {event_id} ({event_type}): Dispatching to {len(active_subscribers)} active subscribers.")

    tasks = [
        send_webhook_attempt_with_retries(
            target_url=sub["url"], 
            payload_dict=event_payload_dict, 
            secret=sub["secret"],
            event_id=event_id,
            subscription_id=sub["id"]
        )
        for sub in active_subscribers
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True) 

    for i, result in enumerate(results):
        sub_url = active_subscribers[i]["url"]
        if isinstance(result, Exception):
            logger.error(f"Event {event_id}: Exception during webhook dispatch to {sub_url}: {result}")
        elif not result: 
             logger.error(f"Event {event_id}: Final delivery failure to {sub_url}.")


@app.post("/orders", status_code=http_status.HTTP_201_CREATED)
async def create_new_order_and_send_webhook(
    order_input: OrderDataForWebhook, 
    background_tasks: BackgroundTasks
):
    logger.info(f"Order {order_input.order_id} created for customer {order_input.customer_id}.")
    background_tasks.add_task(dispatch_event_to_subscribers, "order.created", order_input)
    return {"message": "Order created successfully and webhook dispatch initiated.", "order_id": order_input.order_id}

@app.post("/test-trigger-webhook/{event_type}")
async def trigger_test_webhook(event_type: str, background_tasks: BackgroundTasks):
    test_data = {"message": f"This is a test event for {event_type}", "value": 123}
    class TestEventData(BaseModel): message: str; value: int
    test_data_model = TestEventData(**test_data)
    background_tasks.add_task(dispatch_event_to_subscribers, event_type, test_data_model)
    return {"message": f"Test webhook for event '{event_type}' triggered."}

# Dummy endpoint to receive test webhooks
# @app.post("/test-webhook-receiver")
# async def test_webhook_receiver(request: Request, x_myapi_signature_256: Optional[str] = Header(None)):
#     payload_bytes = await request.body()
#     logger.info(f"Test receiver got signature: {x_myapi_signature_256}")
#     logger.info(f"Test receiver got payload: {payload_bytes.decode()}")
#     return {"status": "received by test endpoint"}
# if __name__ == "__main__":
#    uvicorn.run(app, host="0.0.0.0", port=8000) 
#    # To run the test receiver: uvicorn test_receiver_app:app --port 8001
```

**Webhook Management (Conceptual):**
*   **Subscription Storage:**
    *   Database table: `webhook_subscriptions`
        *   `id` (PK, e.g., UUID)
        *   `user_id` / `client_id` (FK, who owns this subscription)
        *   `event_type` (e.g., "order.created", "user.updated", or "*" for all)
        *   `target_url` (HTTPS is highly recommended)
        *   `secret` (randomly generated, strong secret for signing, stored encrypted at rest)
        *   `is_active` (boolean, to easily enable/disable)
        *   `created_at`, `updated_at`
*   **Subscription API Endpoints:**
    *   `POST /api/v1/webhook-subscriptions`: Create a new subscription. Request body includes `event_type`, `target_url`. Server generates and returns the `secret`.
    *   `GET /api/v1/webhook-subscriptions`: List user's subscriptions.
    *   `GET /api/v1/webhook-subscriptions/{subscription_id}`: Get details of a specific subscription.
    *   `PUT /api/v1/webhook-subscriptions/{subscription_id}`: Update `target_url` or `is_active`. (Regenerating secret might be an option).
    *   `DELETE /api/v1/webhook-subscriptions/{subscription_id}`: Delete a subscription.
*   **Security:** All subscription management endpoints MUST be authenticated and authorized.

---

## 17. Background Tasks and Asynchronous Processing

In web applications, especially APIs, it's crucial to respond to client requests quickly. Some operations, however, can take a significant amount of time to complete (e.g., sending an email, processing a large file, calling a slow third-party API). Performing these tasks synchronously within the request-response cycle can lead to long wait times for the client and potentially request timeouts. Background tasks allow you to offload these operations, respond immediately to the client, and process the work independently.

### When to Use Background Tasks
*   **Sending Notifications:** Emails, SMS, push notifications.
*   **Data Processing:** Generating reports, resizing images, data aggregation.
*   **Third-Party API Calls:** Interacting with external services that might be slow or unreliable.
*   **Cache Invalidation/Population:** Updating caches after data changes.
*   **Logging and Analytics:** Sending detailed logs or analytics events to a separate system.
*   Any operation that doesn't need to complete before sending a response to the client.

### FastAPI's `BackgroundTasks` Dependency

FastAPI provides a simple way to run tasks in the background using the `BackgroundTasks` object. These tasks run *within the same process* as your FastAPI application after the response has been sent.

**Key Features:**
*   Easy to use: Inject `BackgroundTasks` into your path operation function.
*   Runs after response: Ensures the client gets a quick acknowledgment.
*   Suitable for I/O-bound tasks that are not CPU-intensive and don't require a separate worker process.

**Limitations:**
*   **Single Process:** Tasks run in the same event loop and process as the main application. CPU-bound tasks can still block the event loop if not handled carefully (e.g., by running them in a thread pool executor via `asyncio.to_thread`).
*   **No Built-in Retries/Persistence:** If the server crashes while a background task is running, the task is lost. There's no automatic retry mechanism.
*   **Limited Monitoring:** No built-in dashboard or extensive monitoring for these tasks.
*   **Not for Very Long-Running or Critical Tasks:** For tasks that are critical, very long-running, or require guaranteed execution, a dedicated task queue is more appropriate.

**Example: Sending a Confirmation Email**
```python
from fastapi import FastAPI, BackgroundTasks, Depends, status
from pydantic import BaseModel
import time
import logging
import uvicorn 
import asyncio 

app = FastAPI()
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

async def send_email_async(email_to: str, subject: str, body: str):
    logger.info(f"Preparing to send email to: {email_to} with subject: '{subject}'")
    await asyncio.sleep(5) 
    logger.info(f"Email successfully sent to: {email_to}, Subject: '{subject}', Body: '{body[:50]}...'")

def send_email_sync(email_to: str, subject: str, body: str):
    logger.info(f"SYNC: Preparing to send email to: {email_to} with subject: '{subject}'")
    time.sleep(5) 
    logger.info(f"SYNC: Email successfully sent to: {email_to}, Subject: '{subject}', Body: '{body[:50]}...'")


class UserCreate(BaseModel):
    username: str
    email: str
    password: str

@app.post("/users/register", status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate, background_tasks: BackgroundTasks):
    logger.info(f"Registering user: {user_data.username} with email: {user_data.email}")
    user_id = 123 

    email_subject = "Welcome to Our Awesome Service!"
    email_body = f"Hi {user_data.username},\n\nWelcome! We're glad to have you."
    
    background_tasks.add_task(send_email_async, user_data.email, email_subject, email_body)
    
    logger.info(f"User {user_data.username} registration request processed. Email task added to background.")
    return {"message": "User registered successfully. Confirmation email will be sent.", "user_id": user_id}

# if __name__ == "__main__":
#     uvicorn.run(app, host="0.0.0.0", port=8000)
```
In this example, the `/users/register` endpoint will immediately return a response to the client after adding the `send_email_async` task. The email sending will happen in the background.

### Integrating with Task Queues (e.g., Celery, RQ, Dramatiq, ARQ)

For more robust, scalable, and reliable background task processing, dedicated task queues are recommended. They offer:
*   **Separate Worker Processes:** Tasks run in different processes (or even different machines), preventing them from impacting API responsiveness.
*   **Persistence:** Tasks can be stored in a message broker (e.g., Redis, RabbitMQ) and will be processed even if the API server restarts.
*   **Retries & Error Handling:** Built-in mechanisms for retrying failed tasks with configurable strategies (e.g., exponential backoff).
*   **Scheduling:** Ability to schedule tasks to run at specific times or intervals.
*   **Monitoring & Management:** Tools to inspect queues, workers, and task statuses (e.g., Flower for Celery).
*   **Distributed Execution:** Scale workers independently of your API servers.

**Conceptual Example: FastAPI with Celery**

This requires Celery and a message broker (like Redis or RabbitMQ) to be set up.

**1. Define Celery Tasks (`tasks.py`):**
```python
# tasks.py
from celery import Celery
import time
import logging
import os 

logger = logging.getLogger(__name__) 
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(task_id)s - %(message)s')


CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

celery_app = Celery(
    "my_fastapi_tasks", 
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True, 
)


@celery_app.task(bind=True, name="send_confirmation_email_task", max_retries=3, default_retry_delay=60) 
def send_confirmation_email_task(self, user_email: str, username: str):
    try:
        logger.info(f"Task {self.request.id}: Sending confirmation email to {user_email} for user {username}")
        time.sleep(10) 
        logger.info(f"Task {self.request.id}: Confirmation email sent to {user_email}")
        return {"status": "success", "email": user_email, "task_id": self.request.id}
    except Exception as e:
        logger.error(f"Task {self.request.id}: Failed to send email to {user_email}: {e}", exc_info=True)
        try:
            raise self.retry(exc=e, countdown=self.default_retry_delay * (2**self.request.retries))
        except self.MaxRetriesExceededError:
            logger.critical(f"Task {self.request.id}: Max retries exceeded for sending email to {user_email}.")
            return {"status": "failed_max_retries", "email": user_email, "task_id": self.request.id, "error": str(e)}


@celery_app.task(bind=True, name="process_large_data_task")
def process_large_data_task(self, data_id: str, user_id: int):
    logger.info(f"Task {self.request.id}: Starting processing for data_id: {data_id}, user_id: {user_id}")
    total_steps = 10
    for i in range(total_steps):
        time.sleep(2) 
        self.update_state(state='PROGRESS', meta={'current': i + 1, 'total': total_steps, 'status': f'Processing step {i+1}'})
        logger.info(f"Task {self.request.id}: Step {i+1}/{total_steps} for data_id: {data_id}")
    
    result_url = f"/results/data/{data_id}" 
    logger.info(f"Task {self.request.id}: Finished processing for data_id: {data_id}. Result at {result_url}")
    return {"status": "completed", "data_id": data_id, "result_url": result_url, "task_id": self.request.id}

```

**2. Trigger Celery Task from FastAPI Endpoint (`main.py`):**
```python
# main.py (FastAPI app)
from fastapi import FastAPI, BackgroundTasks, HTTPException, status as http_status
from pydantic import BaseModel
import tasks 
import logging
import uvicorn
from celery.result import AsyncResult 

app = FastAPI()
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

class UserRegistration(BaseModel):
    username: str
    email: str

class DataProcessingRequest(BaseModel):
    data_id: str
    user_id: int

@app.post("/users/register-celery")
async def register_user_with_celery(user_data: UserRegistration):
    logger.info(f"Received registration for {user_data.username}, queuing email task.")
    task_result = tasks.send_confirmation_email_task.delay(user_data.email, user_data.username)
    logger.info(f"Email task for {user_data.email} enqueued with Celery Task ID: {task_result.id}")
    return {
        "message": "User registration submitted, confirmation email will be sent.",
        "email_task_id": task_result.id
    }

@app.post("/process-data-celery")
async def process_data_with_celery(data_request: DataProcessingRequest):
    logger.info(f"Received data processing request for data_id: {data_request.data_id}")
    task_result = tasks.process_large_data_task.delay(data_request.data_id, data_request.user_id)
    logger.info(f"Data processing task for {data_request.data_id} enqueued with Celery Task ID: {task_result.id}")
    return {
        "message": "Data processing task initiated.",
        "task_id": task_result.id,
        "status_url": f"/tasks/status/{task_result.id}" 
    }

@app.get("/tasks/status/{task_id}")
async def get_task_status(task_id: str):
    task = AsyncResult(task_id, app=tasks.celery_app) 
    
    response = {
        "task_id": task_id,
        "status": task.status,
        "result": task.result if task.ready() else None,
    }
    if task.status == 'PROGRESS':
        response['progress'] = task.info 
    elif task.status == 'FAILURE':
        response['error_info'] = str(task.result) 
    
    return response

# To run this:
# 1. Start Redis: `redis-server`
# 2. Start Celery worker: `celery -A tasks.celery_app worker -l info --concurrency=4`
# 3. Start FastAPI app: `uvicorn main:app --reload`
```

### Handling Long-Running Operations & Status Updates
When a task is offloaded, the client might need to know its status or get the result later.
*   **Return Task ID:** As shown in the Celery example, return a unique task ID to the client.
*   **Status Endpoint:** Provide an endpoint (e.g., `/tasks/status/{task_id}`) where the client can poll for the task's status and result.
*   **WebSockets/Server-Sent Events (SSE):** For real-time updates, the server can push status updates to the client over a WebSocket connection or using SSE once the task state changes. This avoids client-side polling.
*   **Callbacks/Webhooks:** The background task, upon completion (or failure), can make an HTTP request to a callback URL provided by the client or another service.

### Monitoring Background Tasks
*   **Logging:** Implement comprehensive logging within your task functions. Include task IDs, parameters, and timing information.
*   **Task Queue Monitoring Tools:**
    *   **Flower:** A web-based tool for monitoring and administrating Celery clusters.
    *   **RQ Dashboard:** For Redis Queue.
    *   Many task queues have similar UIs or CLI tools.
*   **Application Performance Monitoring (APM):** Integrate with APM tools (e.g., Datadog, New Relic, Sentry) which often have specific integrations for popular task queues. This allows you to trace tasks, view error rates, and measure performance.
*   **Metrics:** Collect metrics like queue length, number of active workers, task execution time, and error rates. Expose these via a metrics endpoint (e.g., for Prometheus).
*   **Alerting:** Set up alerts for critical failures, long queue times, or high error rates.

---

## 18. FastAPI in a Microservices Architecture

Microservices architecture structures an application as a collection of loosely coupled, independently deployable services. FastAPI is well-suited for building these individual services due to its high performance, ease of use, and strong data validation capabilities.

### API Gateway Integration

An API Gateway acts as a single entry point for all client requests, routing them to the appropriate backend microservice. It can also handle cross-cutting concerns.

**Responsibilities of an API Gateway:**
*   **Request Routing:** Directing incoming requests to the correct microservice based on path, headers, or other criteria.
*   **Authentication & Authorization:** Centralizing user authentication (e.g., validating JWTs) and basic authorization before forwarding requests.
*   **Rate Limiting & Throttling:** Protecting backend services from overload.
*   **Load Balancing:** Distributing traffic across multiple instances of a microservice.
*   **Request/Response Transformation:** Modifying requests or responses if needed (e.g., protocol translation, data format changes).
*   **Caching:** Caching responses from frequently accessed, non-dynamic endpoints.
*   **Logging & Monitoring:** Centralized logging of all incoming requests and metrics collection.
*   **SSL Termination:** Handling HTTPS and offloading SSL/TLS processing.

**FastAPI with an API Gateway:**
*   Your FastAPI services typically listen on internal network ports.
*   The API Gateway is exposed to the public internet.
*   FastAPI services can focus on business logic, relying on the gateway for common concerns.
*   **Example Configuration (Conceptual Nginx as Gateway):**
    ```nginx
    # nginx.conf (simplified)
    # upstream user_service {
    #     server user_service_instance1:8001; # Assuming FastAPI user service runs on port 8001
    #     server user_service_instance2:8001;
    # }
    # upstream order_service {
    #     server order_service_instance1:8002; # Assuming FastAPI order service runs on port 8002
    # }

    # server {
    #     listen 80;
    #     server_name api.example.com;

    #     location /api/v1/users {
    #         proxy_pass http://user_service/users; 
    #         proxy_set_header Host $host;
    #         proxy_set_header X-Real-IP $remote_addr;
    #         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    #         proxy_set_header X-Forwarded-Proto $scheme;
    #         # Potentially add auth_request here to an auth service
    #     }

    #     location /api/v1/orders {
    #         proxy_pass http://order_service/orders;
    #         proxy_set_header Host $host;
    #         proxy_set_header X-Real-IP $remote_addr;
    #         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    #         proxy_set_header X-Forwarded-Proto $scheme;
    #     }
    # }
    ```
*   **Popular API Gateways:** Kong, Tyk, AWS API Gateway, Azure API Management, Apigee, Nginx, HAProxy, Traefik.

### Inter-service Communication Patterns

Microservices need to communicate with each other. Choosing the right pattern is crucial.

1.  **Synchronous Communication (e.g., HTTP/REST, gRPC):**
    *   **HTTP/REST:**
        *   **Pros:** Widely understood, simple, uses standard HTTP. FastAPI excels here.
        *   **Cons:** Can lead to tight coupling, cascading failures if a downstream service is slow or down. Latency can add up.
        *   **FastAPI Example (Service A calls Service B):**
            ```python
            # In Service A (e.g., Order Service)
            import httpx 
            import logging
            import os 
            from fastapi import FastAPI, HTTPException 
            from pydantic import BaseModel, ValidationError 
            from typing import Optional 

            app = FastAPI() 
            logger = logging.getLogger(__name__)
            logging.basicConfig(level=logging.INFO)

            USER_SERVICE_URL = os.environ.get("USER_SERVICE_URL", "http://user-service.internal:8000") 

            class UserResponse(BaseModel): 
                id: int
                username: str
                email: str
                
            async def get_user_details_from_service(user_id: int) -> Optional[UserResponse]:
                try:
                    async with httpx.AsyncClient(timeout=5.0) as client:
                        response = await client.get(f"{USER_SERVICE_URL}/api/v1/users/{user_id}") 
                        response.raise_for_status() 
                        return UserResponse(**response.json()) 
                except httpx.HTTPStatusError as e:
                    logger.error(f"HTTP error calling user service for user {user_id}: {e.response.status_code} - {e.response.text[:200]}")
                    if e.response.status_code == 404:
                        return None 
                except httpx.RequestError as e:
                    logger.error(f"Request error calling user service for user {user_id}: {e}")
                except ValidationError as e: 
                    logger.error(f"User service response validation error for user {user_id}: {e.errors()}")
                return None

            @app.post("/internal/orders") 
            async def create_order_for_user_internal(user_id: int, item_id: str, quantity: int):
                user = await get_user_details_from_service(user_id)
                if not user:
                    raise HTTPException(status_code=404, detail=f"User {user_id} not found or user service unavailable.")
                
                logger.info(f"Order creation process for user {user.username} (ID: {user_id}) with item {item_id}")
                return {"message": "Order created", "user_details": user.dict()}
            ```
    *   **gRPC:**
        *   **Pros:** High performance (uses HTTP/2 and Protocol Buffers), strongly typed contracts defined in `.proto` files, supports streaming, code generation in multiple languages.
        *   **Cons:** More complex setup than REST, less browser-friendly directly (requires a proxy like gRPC-Web).
        *   FastAPI can act as a client to gRPC services, or you can build gRPC services in Python (e.g., using `grpcio`) that run alongside or are called by FastAPI services.

2.  **Asynchronous Communication (e.g., Message Queues - RabbitMQ, Kafka, Redis Streams, NATS):**
    *   Services communicate by producing messages/events to a queue or topic. Other services consume these messages.
    *   **Pros:** Decoupling (services don't need to know about each other directly, only the message contract), improved resilience (if a consumer is down, messages can be queued), better scalability (consumers can be scaled independently), supports event-driven architectures.
    *   **Cons:** Increased operational complexity (managing the message broker), eventual consistency (data updates are not immediately reflected across all services), requires careful message design and schema management.
    *   **FastAPI Example (Conceptual: Order Service publishes event, Notification Service consumes via Celery task):**
        ```python
        # Order Service (main_order_service.py) - Publisher
        # from your_celery_setup import celery_app 
        # from your_celery_tasks import send_order_notification_task 

        # @celery_app.task(name="tasks.send_order_notification") 
        # def send_order_notification_task(order_details: dict):
        #     logger.info(f"NOTIFICATION TASK: Sending notification for order: {order_details.get('order_id')}")
        #     time.sleep(2) 
        #     logger.info(f"NOTIFICATION TASK: Notification sent for order: {order_details.get('order_id')}")
        #     return {"status": "notification_sent", "order_id": order_details.get("order_id")}


        # @app.post("/orders/async-notify") 
        # async def create_order_and_publish_async(order_data: dict): 
        #     order_id = order_data.get("id", "new_order_123")
        #     logger.info(f"Order {order_id} created. Publishing notification event.")
            
        #     send_order_notification_task.delay(
        #         {"order_id": order_id, "customer_email": order_data.get("customer_email"), "status": "created"}
        #     )
        #     return {"message": "Order created, notification task enqueued."}

        # Notification Service (worker for tasks.send_order_notification, could be a separate Celery worker process)
        # It would define and register the `send_order_notification_task` shown above.
        ```

### Service Discovery and Load Balancing

In a dynamic microservices environment, services need to find each other (service discovery) and distribute requests (load balancing).
*   **Service Discovery:**
    *   **Client-Side Discovery:** Client (or API Gateway) queries a service registry (e.g., Consul, Eureka, ZooKeeper, Kubernetes DNS) to find available instances of a service.
    *   **Server-Side Discovery:** A load balancer queries the service registry and routes requests.
*   **Load Balancing:**
    *   Distributes incoming traffic across multiple instances of a microservice to improve availability and performance.
    *   Can be handled by API Gateways, dedicated load balancers (Nginx, HAProxy, AWS ELB), or service mesh components (Istio, Linkerd).
*   **FastAPI Context:** FastAPI services register themselves with a service registry upon startup and de-register on shutdown (often via helper libraries or sidecars in environments like Kubernetes). They might query the registry to find other services. Kubernetes handles much of this automatically via its internal DNS and Services.

### Cross-cutting Concerns in Microservices

These are aspects that affect multiple services:
*   **Centralized Logging:** Aggregate logs from all services into a central system (e.g., ELK Stack - Elasticsearch, Logstash, Kibana; Grafana Loki; Datadog Logs). Use correlation IDs to trace requests across services.
    *   FastAPI: Use structured logging (e.g., `python-json-logger`) and ensure a correlation ID (e.g., `X-Request-ID` from gateway or generated per request) is logged with every message.
*   **Distributed Tracing:** Track requests as they flow through multiple services to understand latency and dependencies (e.g., Jaeger, Zipkin, OpenTelemetry).
    *   FastAPI: Integrate with OpenTelemetry (e.g., `opentelemetry-instrumentation-fastapi`) to automatically instrument requests, propagate trace context, and export spans.
*   **Metrics Collection:** Gather metrics (request counts, latency, error rates, resource usage) from each service and send them to a monitoring system (e.g., Prometheus, Datadog, New Relic).
    *   FastAPI: Use libraries like `starlette-prometheus` or `prometheus-fastapi-instrumentator` or custom middleware.
*   **Configuration Management:** Manage configurations for multiple services centrally (e.g., Spring Cloud Config, HashiCorp Consul/Vault, Kubernetes ConfigMaps/Secrets, AWS AppConfig).
    *   FastAPI: Load configuration from environment variables, config files, or a central config service at startup using libraries like Pydantic's `Settings` management.
*   **Security:**
    *   **Authentication:** Often handled at the API Gateway. Internal service-to-service calls might use mutual TLS (mTLS) or short-lived, service-specific JWTs/tokens.
    *   **Authorization:** Can be a combination of gateway-level checks and fine-grained checks within services, possibly using a central policy decision point (PDP) or by services fetching user permissions.
*   **Resilience Patterns:**
    *   **Timeouts:** Configure timeouts for inter-service calls (e.g., in `httpx`).
    *   **Retries:** Implement retries with exponential backoff for transient failures (e.g., `tenacity` library or `httpx` transport retries).
    *   **Circuit Breakers:** Prevent cascading failures by temporarily stopping requests to an unhealthy service (e.g., using libraries like `pybreaker` or service mesh capabilities like Istio/Linkerd).

**Example: Correlation ID Middleware in FastAPI**
```python
from fastapi import FastAPI, Request, Response
import uuid
import logging
import time 

app = FastAPI() 
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - [%(correlation_id)s] - %(message)s')


class CorrelationIdLoggerAdapter(logging.LoggerAdapter):
    def process(self, msg, kwargs):
        if 'correlation_id' not in self.extra:
            self.extra['correlation_id'] = "NOT_SET"
        return msg, kwargs

@app.middleware("http")
async def correlation_id_middleware(request: Request, call_next):
    correlation_id = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())
    request.state.correlation_id = correlation_id 

    adapter = CorrelationIdLoggerAdapter(logger, {'correlation_id': correlation_id})
    
    adapter.info(f"Request started: {request.method} {request.url.path} from {request.client.host if request.client else 'unknown'}")
    start_time = time.time()
        
    response: Response = await call_next(request)
        
    process_time = (time.time() - start_time) * 1000 
    response.headers["X-Correlation-ID"] = correlation_id
    response.headers["X-Process-Time-Ms"] = f"{process_time:.2f}"
    adapter.info(f"Request finished: {response.status_code}, Duration: {process_time:.2f}ms")
    return response

@app.get("/items/{item_id}")
async def read_item(item_id: str, request: Request):
    correlation_id = request.state.correlation_id 
    adapter = CorrelationIdLoggerAdapter(logger, {'correlation_id': correlation_id})
    adapter.info(f"Processing item {item_id}")
    return {"item_id": item_id, "name": "Sample Item", "correlation_id": correlation_id}

```

---

## 19. Advanced Idempotency Patterns

Idempotency ensures that making the same request multiple times has the same effect as making it once. This is crucial for robust APIs, especially for operations that modify data (`POST`, `PUT`, `PATCH`, `DELETE`), as network issues or client retries can lead to duplicate requests. While `GET`, `PUT`, and `DELETE` are often inherently idempotent by definition, `POST` (creation) and sometimes `PATCH` require explicit mechanisms.

### Deep Dive into Idempotency Keys

An **Idempotency Key** is a unique client-generated value (e.g., a UUID) included in the request header (commonly `Idempotency-Key` or `X-Idempotency-Key`). The server uses this key to recognize and de-duplicate requests.

**How it Works:**
1.  **Client Generates Key:** The client generates a unique key for an operation it's about to perform.
2.  **Client Sends Request:** The client includes this key in the request header.
3.  **Server Receives Request:**
    *   The server checks if it has seen this idempotency key before (typically within a certain time window, e.g., 24 hours).
    *   **First Time:** If the key is new, the server processes the request as usual. It then stores the idempotency key along with the result of the operation (e.g., the response status code and body, or a reference to the created/modified resource).
    *   **Subsequent Times (Duplicate):** If the key has been seen before and the original operation is still being processed or has completed, the server *does not* re-process the request. Instead, it returns a response based on the stored result of the original operation.
        *   If the original is still processing: Return a `409 Conflict` or `425 Too Early`.
        *   If the original completed successfully: Return the same `2xx` response.
        *   If the original failed: Return the same `4xx` or `5xx` error response.

**Key Characteristics of Idempotency Keys:**
*   **Uniqueness:** Must be unique per operation attempt by the client. UUIDs are a good choice.
*   **Client-Generated:** The client is responsible for generating and managing these keys.
*   **Time-Limited Storage:** The server typically stores idempotency keys and their results for a limited time (e.g., 24-72 hours) to prevent indefinite storage growth.
*   **Scope:** Idempotency keys are usually scoped to a specific user or API key to prevent collisions.

**Header Name:** While `Idempotency-Key` is common (popularized by Stripe), there's no single IETF standard. `X-Idempotency-Key` is also used. Consistency within your API is key.

### Implementing Idempotency Middleware

A FastAPI middleware is an excellent place to handle the core logic for idempotency key processing.

**Middleware Responsibilities:**
1.  Extract the `Idempotency-Key` from request headers.
2.  If no key is present for a non-idempotent method (like `POST`), potentially reject the request or proceed without idempotency guarantees (depending on API policy).
3.  Check a persistent store (e.g., Redis, a database table) for the key.
    *   **Key Found & Processing:** If the key exists and an operation is marked as "in-progress", return a `409 Conflict` (or similar) indicating the request is already being handled.
    *   **Key Found & Completed:** If the key exists and a response was previously stored, return the stored response.
    *   **Key Not Found:**
        *   Mark the key as "in-progress" in the store.
        *   Allow the request to proceed to the path operation function.
        *   After the path operation function returns a response:
            *   Store the idempotency key along with the response (status code, headers, body).
            *   Mark the key as "completed".
        *   If an error occurs during processing, store the error response and mark as "completed_with_error".

**Conceptual Idempotency Middleware Example:**

```python
from fastapi import FastAPI, Request, Response, HTTPException, status as http_status
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse
import uuid
import json
import logging
import time
from typing import Optional, Tuple, Any, Dict 
import hashlib 
# import redis.asyncio as redis # For production

app = FastAPI()
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

MOCK_IDEMPOTENCY_STORE: Dict[str, Dict[str, Any]] = {}
IDEMPOTENCY_KEY_EXPIRY_SECONDS = 24 * 60 * 60  
IDEMPOTENCY_PROCESSING_TIMEOUT_SECONDS = 30 

class IdempotencyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.method not in ("POST", "PUT", "PATCH", "DELETE"):
            return await call_next(request)

        idempotency_key = request.headers.get("Idempotency-Key")
        if not idempotency_key:
            logger.debug(f"No Idempotency-Key for {request.method} {request.url.path}. Proceeding without idempotency.")
            return await call_next(request)
        
        if not self.is_valid_uuid(idempotency_key):
            logger.warning(f"Invalid Idempotency-Key format: {idempotency_key}")
            return JSONResponse(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                content={"error": "Invalid Idempotency-Key format. Must be a UUID."}
            )

        scoped_key = f"idem:{idempotency_key}" 

        stored_entry = MOCK_IDEMPOTENCY_STORE.get(scoped_key)

        if stored_entry:
            if stored_entry["status"] == "processing":
                if time.time() - stored_entry.get("timestamp", 0) > IDEMPOTENCY_PROCESSING_TIMEOUT_SECONDS:
                    logger.warning(f"Idempotency key {scoped_key} found processing but timed out. Allowing re-processing.")
                else:
                    logger.info(f"Idempotency key {scoped_key} already processing. Returning 409 Conflict.")
                    return JSONResponse(
                        status_code=http_status.HTTP_409_CONFLICT,
                        content={"error": "Request with this Idempotency-Key is already being processed."}
                    )
            elif stored_entry["status"] in ("completed", "completed_with_error"):
                logger.info(f"Idempotency key {scoped_key} found completed. Returning stored response.")
                return JSONResponse(
                    status_code=stored_entry["response"]["status_code"],
                    content=stored_entry["response"]["body"], 
                    headers=dict(stored_entry["response"]["headers"])
                )
        
        request_body_bytes = await request.body() 
        request_hash = hashlib.sha256(request_body_bytes).hexdigest()

        MOCK_IDEMPOTENCY_STORE[scoped_key] = {
            "status": "processing", 
            "timestamp": time.time(),
            "request_hash": request_hash 
        }
        
        async def receive_body(): return {"type": "http.request", "body": request_body_bytes, "more_body": False}
        request_with_body = Request(request.scope, receive=receive_body, send=request._send)


        try:
            response = await call_next(request_with_body)
            
            response_body_bytes_final = b""
            async for chunk in response.body_iterator: 
                response_body_bytes_final += chunk
            
            try:
                response_body_content = json.loads(response_body_bytes_final.decode())
            except json.JSONDecodeError:
                response_body_content = response_body_bytes_final.decode() 

            stored_response_data = {
                "status_code": response.status_code,
                "headers": list(response.headers.items()), 
                "body": response_body_content 
            }
            MOCK_IDEMPOTENCY_STORE[scoped_key].update({
                "status": "completed",
                "response": stored_response_data,
                "completed_at": time.time()
            })
            
            return Response(
                content=response_body_bytes_final,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type
            )

        except Exception as e:
            error_status_code = http_status.HTTP_500_INTERNAL_SERVER_ERROR
            error_body = {"error": "Internal Server Error during idempotent processing", "detail": str(e)}
            if isinstance(e, HTTPException):
                error_status_code = e.status_code
                error_body = {"error": "Request Processing Error", "detail": e.detail}

            MOCK_IDEMPOTENCY_STORE[scoped_key].update({
                "status": "completed_with_error",
                "response": {"status_code": error_status_code, "body": error_body, "headers": {}},
                "completed_at": time.time()
            })
            
            if isinstance(e, HTTPException):
                raise 
            else:
                return JSONResponse(status_code=error_status_code, content=error_body)
        finally:
            keys_to_delete = [
                k for k, v in MOCK_IDEMPOTENCY_STORE.items() 
                if time.time() - v.get("timestamp", 0) > IDEMPOTENCY_KEY_EXPIRY_SECONDS
            ]
            for k_del in keys_to_delete:
                if k_del in MOCK_IDEMPOTENCY_STORE: del MOCK_IDEMPOTENCY_STORE[k_del]
    
    def is_valid_uuid(self, val):
        try:
            uuid.UUID(str(val))
            return True
        except ValueError:
            return False

# app.add_middleware(IdempotencyMiddleware) 

@app.post("/create-resource")
async def create_resource(request: Request, data: Dict[str, Any]):
    logger.info(f"Idempotency Key from header: {request.headers.get('Idempotency-Key')}")
    logger.info(f"Processing create_resource with data: {data}")
    await asyncio.sleep(2) 
        
    new_resource_id = str(uuid.uuid4())
    logger.info(f"Resource created with ID: {new_resource_id}")
    return {"message": "Resource created successfully", "id": new_resource_id, "data_received": data}

```
*Note: This middleware example is conceptual and simplified, especially the response body handling and storage. Real-world implementations need careful consideration of response sizes, content types, and efficient storage/retrieval with a proper distributed cache like Redis.*

### Database Considerations for Idempotency

If you're not using middleware or want an additional layer of safety at the database level:
*   **Idempotency Key Column:** Add an `idempotency_key` column to tables representing operations or resources created by idempotent requests (e.g., `payments` table, `orders` table).
*   **Unique Constraint:** Place a unique constraint on `(user_id, idempotency_key)` or `(tenant_id, idempotency_key)` to prevent duplicate entries at the database level.
*   **Two-Phase Commit (Conceptual):**
    1.  Record the idempotency key with a "pending" status.
    2.  Perform the actual business logic (e.g., create the order, process payment).
    3.  If successful, update the idempotency key record to "completed" and store the result/reference.
    4.  If it fails, update to "failed".
    *   This requires careful transaction management.

### Handling Concurrent Idempotent Requests

Race conditions can occur if multiple identical requests with the same idempotency key arrive simultaneously before the first one has finished processing and stored its result.
*   **Distributed Locks:** Use a distributed lock (e.g., with Redis using `SETNX` or Redlock algorithm) when an idempotency key is first seen.
    *   The first request acquires the lock for the key.
    *   Subsequent requests for the same key will fail to acquire the lock and can either wait (with a timeout) or return a `409 Conflict` / `425 Too Early`.
    *   The lock is released after the first request completes (successfully or with an error) and its result is stored.
*   **Database-Level Locking:** If using database transactions, row-level locks on the idempotency key record (if it exists) can help serialize operations for the same key.
*   **Atomic Operations in Cache:** Cache solutions like Redis offer atomic operations (e.g., `SETNX` - SET if Not eXists) that are crucial for marking a key as "in-progress" without race conditions.

**Choosing a Strategy:**
*   For most `POST` requests that create a new resource, using an `Idempotency-Key` header processed by middleware is a robust approach.
*   The middleware should use a fast, distributed cache (like Redis) to store key states and responses.
*   Ensure client-side logic generates and retries with the *same* idempotency key for a particular operation attempt.

---

## 20. Serverless Deployment of FastAPI Applications

Serverless computing allows you to run code without provisioning or managing servers. Platforms like AWS Lambda, Google Cloud Functions, and Azure Functions execute your code in response to events and automatically manage the underlying compute resources. FastAPI, being an ASGI framework, can be deployed to these environments with the help of adapter libraries.

### Introduction to Serverless and FastAPI

**Benefits of Serverless for FastAPI:**
*   **Scalability:** Automatically scales with the number of requests.
*   **Cost-Effectiveness:** Pay only for the compute time you consume.
*   **Reduced Operational Overhead:** No servers to patch or manage.
*   **Focus on Code:** Developers can focus more on application logic.

**Considerations:**
*   **Cold Starts:** The first request to an inactive function might experience higher latency as the environment is initialized.
*   **Execution Time Limits:** Serverless functions typically have maximum execution time limits (e.g., 15 minutes for AWS Lambda).
*   **Statelessness:** Functions should ideally be stateless; persistent state should be stored in external services (databases, S3, Redis).
*   **Package Size Limits:** Deployment packages have size limitations.
*   **Concurrency Limits:** Platforms have limits on concurrent executions per region/account.
*   **ASGI Adapters:** FastAPI (ASGI) needs an adapter to work with the serverless provider's request/response format (e.g., AWS Lambda's event/context).

### Using Mangum for ASGI Compatibility

**Mangum** is a popular adapter for running ASGI applications (like FastAPI, Starlette, Quart) on AWS Lambda with API Gateway or Application Load Balancer (ALB) triggers. It translates Lambda's event and context objects into an ASGI scope and handles the response back to Lambda.

**Installation:**
```bash
pip install fastapi uvicorn mangum
```

**Example: Basic FastAPI App with Mangum for AWS Lambda**

```python
# main_lambda.py (your FastAPI application for Lambda)
from fastapi import FastAPI, Request
from pydantic import BaseModel
import logging
import os
from typing import Optional, Dict, Any 

app = FastAPI(
    # root_path=os.environ.get("API_GATEWAY_STAGE", "") 
)
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

class Item(BaseModel):
    name: str
    description: Optional[str] = None
    price: float

@app.on_event("startup")
async def startup_event():
    logger.info("FastAPI application startup event (Lambda context)")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("FastAPI application shutdown event (Lambda context)")


@app.get("/")
async def read_root(request: Request):
    logger.info(f"Root path requested. Scope: {request.scope}")
    return {"message": "Hello from FastAPI on AWS Lambda via Mangum!"}

@app.get("/info")
async def get_app_info(request: Request):
    aws_event = request.scope.get("aws.event", {})
    aws_context = request.scope.get("aws.context", {})
    
    aws_request_id = getattr(aws_context, 'aws_request_id', 'N/A_if_not_lambda')
    remaining_time_ms = getattr(aws_context, 'get_remaining_time_in_millis', lambda: -1)()

    return {
        "message": "Application Information (from Lambda)",
        "root_path": request.scope.get("root_path", "Not Set"),
        "path": request.url.path,
        "aws_request_id": aws_request_id,
        "remaining_time_ms": remaining_time_ms,
        "lambda_event_keys": list(aws_event.keys()) 
    }

@app.post("/items/", response_model=Item)
async def create_item_lambda(item: Item):
    logger.info(f"Creating item via Lambda: {item.name}")
    return item

from mangum import Mangum
mangum_handler = Mangum(app, lifespan="auto") 
```

**Deployment Package (`requirements.txt` and `zip`):**
Your deployment package for Lambda would include `main_lambda.py`, `requirements.txt` (with `fastapi`, `mangum`, `pydantic`), and any other dependencies. You'd zip these up. `uvicorn` is not needed for Lambda execution with Mangum.

**Serverless Framework or AWS SAM:**
Tools like the Serverless Framework or AWS SAM (Serverless Application Model) simplify defining your Lambda functions, API Gateway triggers, IAM roles, and other resources using YAML or JSON templates.

**Example `serverless.yml` (Conceptual for Serverless Framework):**
```yaml
# service: my-fastapi-lambda-service

# provider:
#   name: aws
#   runtime: python3.10 
#   stage: ${opt:stage, 'dev'}
#   region: us-east-1

# functions:
#   api:
#     handler: main_lambda.mangum_handler 
#     timeout: 30 
#     memorySize: 256 
#     events:
#       - httpApi: 
#           path: /{proxy+}
#           method: any
          
# package:
#  individually: true 

# plugins:
#   - serverless-python-requirements 

# custom:
#   pythonRequirements:
#     dockerizePip: non-linux 
#     zip: true
#     slim: true 
```

### Deployment to Cloud Functions (AWS Lambda, Google Cloud Functions, Azure Functions)

*   **AWS Lambda:**
    *   Use Mangum as shown above.
    *   Trigger via API Gateway (REST or HTTP API) or Application Load Balancer (ALB).
    *   Package dependencies in a zip file or use Lambda Layers.
    *   Container image support for Lambda is also an option, allowing more complex dependencies and larger packages.
*   **Google Cloud Functions (GCF):**
    *   Python Cloud Functions (2nd gen) can directly serve HTTP requests from an ASGI application if you specify an entry point that serves the app (e.g., using `functions-framework --target=app --source=main.py --signature-type=http`).
    *   For 1st gen or if more control is needed, an adapter similar to Mangum might be required, or you can write a small wrapper.
    *   **Google Cloud Run** is often a more straightforward choice for deploying containerized FastAPI (ASGI) applications in a serverless manner, as it natively supports serving HTTP from containers.
*   **Azure Functions:**
    *   Python Azure Functions with an HTTP trigger can serve ASGI applications. The Azure Functions Python worker has built-in ASGI support. You configure your `function.json` to point to your FastAPI app instance.
    *   **Example `function.json` (conceptual):**
        ```json
        // {
        //   "scriptFile": "__init__.py", 
        //   "bindings": [
        //     {
        //       "authLevel": "anonymous",
        //       "type": "httpTrigger",
        //       "direction": "in",
        //       "name": "req",
        //       "methods": ["get", "post", "put", "delete", "patch", "options"],
        //       "route": "{*route}" 
        //     },
        //     {
        //       "type": "http",
        //       "direction": "out",
        //       "name": "$return"
        //     }
        //   ],
        //   "asgiHandler": "main_azure.app" // Points to FastAPI app instance in main_azure.py
        // }
        ```
    *   **`__init__.py` for Azure Function:**
        ```python
        # import azure.functions as func
        # from .main_azure import app # Assuming your FastAPI app is in main_azure.py

        # async def main(req: func.HttpRequest, context: func.Context) -> func.HttpResponse:
        #     return await func.AsgiMiddleware(app).handle_async(req, context)
        ```
    *   Azure Container Apps also provides a serverless environment for containers.

### Cold Starts and Optimization Strategies

A "cold start" occurs when your serverless function is invoked for the first time or after a period of inactivity, requiring the platform to initialize the execution environment and load your code.

**Impact:** Increased latency for the first request.

**Optimization Strategies:**
1.  **Keep Package Size Small:**
    *   Include only necessary dependencies.
    *   Use tools like `serverless-python-requirements` with Docker to build optimized packages.
    *   Consider Lambda Layers for shared dependencies.
2.  **Minimize Initialization Code:**
    *   Defer heavy initializations (e.g., database connections, loading large models) until they are actually needed within a request, or do it globally but efficiently.
    *   Initialize SDK clients (like `boto3` for AWS) outside the handler function so they can be reused across invocations if the container is warm.
3.  **Choose Appropriate Memory Size:** More memory often means more CPU, which can reduce initialization time. Test different memory configurations.
4.  **Provisioned Concurrency (AWS Lambda) / Minimum Instances (GCF 2nd gen, Cloud Run, Azure Functions Premium):**
    *   Keeps a specified number of function instances initialized and ready to respond immediately.
    *   Reduces/eliminates cold starts for those instances but incurs costs even when idle.
5.  **Language Choice & Runtime:** Newer Python runtimes are generally more optimized.
6.  **Optimize Dependencies:** Some libraries are "heavier" than others. Tree-shaking or using lighter alternatives can help.
7.  **Avoid VPC for Lambda if Not Strictly Necessary:** Accessing resources within a VPC from Lambda can add to cold start time and complexity, though this has improved significantly with recent AWS updates. If needed, optimize VPC networking (e.g., use VPC endpoints).
8.  **"Warm-up" Strategies (Use with Caution):** Periodically pinging your function to keep it warm. This can incur costs and might not always be effective due to platform optimizations. Most platforms advise against manual warming and prefer provisioned concurrency.

### Serverless-specific Monitoring and Logging

*   **CloudWatch (AWS):** Lambda automatically integrates with CloudWatch Logs for `print()` and `logging` statements. CloudWatch Metrics provides invocation counts, error rates, duration, etc. AWS X-Ray for distributed tracing.
*   **Google Cloud Logging & Monitoring:** Cloud Functions integrate with Google Cloud's operations suite.
*   **Azure Monitor:** Azure Functions integrate with Application Insights and Azure Monitor.
*   **Structured Logging:** Use structured logging (JSON format) to make logs easier to parse and query in these cloud logging systems. Include request IDs, user IDs, and other relevant context.
*   **APM Tools:** Many APM tools (Datadog, New Relic, Sentry, Dynatrace) have specific integrations or agents for serverless platforms to provide richer monitoring and tracing.
*   **Custom Metrics:** Emit custom metrics from your function code to track business-specific KPIs.

```python
# Example of structured logging within a FastAPI app for serverless
# import logging
# import json # For structured logging

# # Configure a JSON formatter if not using a library like python-json-logger
# class JsonFormatter(logging.Formatter):
#     def format(self, record):
#         log_record = {
#             "timestamp": self.formatTime(record, self.datefmt),
#             "level": record.levelname,
#             "message": record.getMessage(),
#             "module": record.module,
#             "function": record.funcName,
#             "line": record.lineno,
#             "aws_request_id": getattr(record, 'aws_request_id', 'N/A') # Example custom field
#         }
#         # Add other fields from record.args or custom fields
#         if hasattr(record, 'custom_props'):
#             log_record.update(record.custom_props)
#         return json.dumps(log_record)

# logger = logging.getLogger("serverless_app")
# if not logger.handlers: # Avoid adding multiple handlers on Lambda re-invocations
#     handler = logging.StreamHandler()
#     handler.setFormatter(JsonFormatter())
#     logger.addHandler(handler)
#     logger.setLevel(logging.INFO)


# @app.get("/serverless-log-example")
# async def serverless_log_example(request: Request):
#     aws_request_id = request.scope.get("aws.event", {}).get("requestContext", {}).get("requestId", "local_dev")
#     extra_log_props = {"path": request.url.path, "aws_request_id": aws_request_id}
    
#     logger.info("Processing serverless request with structured data.", extra=extra_log_props)
#     return {"status": "logged", "aws_request_id": aws_request_id}
```
When deploying to serverless, ensure your logging configuration outputs in a way that's easily ingested and searched by the platform's logging service (often JSON).

---

## 21. Containerization and Orchestration for Production

Containerization (primarily with Docker) and orchestration (commonly with Kubernetes) are foundational for deploying, scaling, and managing modern applications, including FastAPI services, in production.

### Introduction to Containerization

**What are Containers?**
Containers are a lightweight, standalone, executable package of software that includes everything needed to run an application: code, runtime, system tools, system libraries, and settings. Docker is the most popular containerization platform.

**Benefits:**
*   **Consistency:** Applications run the same way regardless of where they are deployed (developer's laptop, testing, production).
*   **Portability:** Build once, run anywhere that supports containers.
*   **Isolation:** Containers isolate applications from each other and the underlying system.
*   **Efficiency:** Lighter than traditional virtual machines, allowing for better resource utilization.
*   **Scalability:** Easy to scale applications up or down by running more or fewer container instances.
*   **DevOps Enablement:** Streamlines CI/CD pipelines and improves collaboration between development and operations.

### Dockerizing FastAPI Applications

To containerize your FastAPI application, you create a `Dockerfile`. This text file contains instructions for Docker to build an image.

**Key `Dockerfile` Instructions:**
*   **`FROM`:** Specifies the base image (e.g., an official Python image).
*   **`WORKDIR`:** Sets the working directory for subsequent instructions.
*   **`COPY` or `ADD`:** Copies files from your local machine into the image.
*   **`RUN`:** Executes commands during the image build process (e.g., installing dependencies).
*   **`EXPOSE`:** Informs Docker that the container listens on specified network ports at runtime (documentation purposes, doesn't actually publish the port).
*   **`ENV`:** Sets environment variables.
*   **`CMD` or `ENTRYPOINT`:** Specifies the command to run when the container starts. For FastAPI, this is typically `uvicorn`.

**Basic `Dockerfile` Example for FastAPI:**
```dockerfile
# Dockerfile

# 1. Use an official Python runtime as a parent image
FROM python:3.10-slim-buster AS base

# 2. Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1  # Prevents python from writing .pyc files
ENV PYTHONUNBUFFERED 1      # Force stdin, stdout, stderr to be totally unbuffered

# 3. Set the working directory in the container
WORKDIR /app

# 4. Install system dependencies if any (less common for simple FastAPI, but good to know)
# RUN apt-get update && apt-get install -y --no-install-recommends some-package && rm -rf /var/lib/apt/lists/*

# 5. Copy the requirements file into the container at /app
COPY ./requirements.txt /app/requirements.txt

# 6. Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# 7. Copy the rest of the application code into the container at /app
COPY . /app/

# 8. Expose the port the app runs on (e.g., 8000 for Uvicorn default)
EXPOSE 8000

# 9. Define the command to run your app using Uvicorn
#    Host 0.0.0.0 makes it accessible from outside the container.
#    Workers can be configured based on CPU cores.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```
**`requirements.txt` example:**
```
fastapi
uvicorn[standard] # Includes gunicorn, ujson, etc.
pydantic
# Add other dependencies here
```
**`.dockerignore` file (place in the same directory as Dockerfile):**
```
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
.git/
.gitignore
Dockerfile
docker-compose.yml
README.md
# Add other files/directories you don't want in the image
```
**Build and Run:**
```bash
docker build -t my-fastapi-app .
docker run -d -p 8000:8000 --name my-running-app my-fastapi-app
```

### Multi-stage Builds

Multi-stage builds allow you to use multiple `FROM` instructions in your `Dockerfile`. Each `FROM` instruction can use a different base, and each begins a new stage of the build. You can selectively copy artifacts from one stage to another, leaving behind everything you don't want in the final image.

**Benefits:**
*   **Smaller Final Images:** By discarding build tools, intermediate files, and development dependencies.
*   **Improved Security:** Reduces the attack surface by not including unnecessary tools or libraries in the production image.
*   **Better Build Cache Utilization:** Changes in one stage might not invalidate caches for other stages.

**Example `Dockerfile` with Multi-stage Build:**
```dockerfile
# Dockerfile (Multi-stage)

# ---- Build Stage ----
FROM python:3.10-slim-buster AS builder

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /opt/app_build

# Install build-time dependencies (if any, e.g., for compiling C extensions)
# RUN apt-get update && apt-get install -y --no-install-recommends build-essential libpq-dev

COPY ./requirements.txt .

# Install dependencies into a virtual environment within the build stage
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" # Activate venv for subsequent RUN commands
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt


# ---- Runtime Stage ----
FROM python:3.10-slim-buster AS runtime

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV APP_HOME=/app

WORKDIR $APP_HOME

# Create a non-root user and group
RUN groupadd -r appuser && useradd --no-log-init -r -g appuser appuser

# Copy only the virtual environment from the builder stage
COPY --from=builder /opt/venv /opt/venv

# Copy application code
COPY . $APP_HOME/

# Ensure the appuser owns the application files and venv
RUN chown -R appuser:appuser $APP_HOME /opt/venv

# Switch to the non-root user
USER appuser

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Activate the virtual environment and run the application
ENV PATH="/opt/venv/bin:$PATH"
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Introduction to Docker Compose

Docker Compose is a tool for defining and running multi-container Docker applications. With Compose, you use a YAML file (`docker-compose.yml`) to configure your application's services, networks, and volumes.

**Use Cases:**
*   **Local Development:** Easily spin up your FastAPI app along with dependencies like databases (PostgreSQL, Redis), message brokers, etc.
*   **Testing:** Create isolated environments for integration testing.
*   **Simple Multi-service Deployments:** For smaller applications, though Kubernetes is preferred for complex production scenarios.

**Basic `docker-compose.yml` Structure:**
```yaml
# version: "3.8" # Specify Compose file version

# services:
#   web: # Your FastAPI application service
#     build: . # Build from Dockerfile in the current directory
#     # image: your-dockerhub-username/my-fastapi-app:latest # Or use a pre-built image
#     container_name: fastapi_web_app
#     command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload # Command for development
#     volumes:
#       - .:/app # Mount current directory to /app in container for live code reloading
#     ports:
#       - "8000:8000" # Map host port 8000 to container port 8000
#     environment:
#       - DATABASE_URL=postgresql://user:password@db:5432/mydatabase
#       - REDIS_URL=redis://cache:6379
#       # Add other environment variables
#     depends_on: # Ensure db and cache start before the web app (for startup order, not readiness)
#       - db
#       - cache

#   db: # PostgreSQL database service
#     image: postgres:15-alpine
#     container_name: postgres_db
#     volumes:
#       - postgres_data:/var/lib/postgresql/data/ # Persist database data
#     environment:
#       - POSTGRES_USER=user
#       - POSTGRES_PASSWORD=password
#       - POSTGRES_DB=mydatabase
#     ports:
#       - "5432:5432" # Expose DB port if needed for direct access from host

#   cache: # Redis cache service
#     image: redis:7-alpine
#     container_name: redis_cache
#     ports:
#       - "6379:6379"

# volumes: # Define named volumes for data persistence
#   postgres_data:
```
**Run with Docker Compose:**
```bash
docker-compose up -d # Start services in detached mode
docker-compose down    # Stop and remove containers, networks
docker-compose logs -f web # Follow logs for the 'web' service
```

### Basic Concepts of Kubernetes Deployment

Kubernetes (K8s) is an open-source system for automating deployment, scaling, and management of containerized applications. It's the de-facto standard for container orchestration in production.

**Key Kubernetes Objects:**
*   **Pod:** The smallest deployable unit. A Pod represents a single instance of a running process in your cluster and can contain one or more containers (like your FastAPI app container). Containers within a Pod share network and storage resources.
*   **Deployment:** Describes the desired state for your application. It manages a set of replica Pods and handles rolling updates and rollbacks. If a Pod crashes, the Deployment will automatically create a new one.
*   **Service:** Provides a stable network endpoint (a single IP address and DNS name) to access a set of Pods. It acts as a load balancer for the Pods it targets (selected via labels). Types include `ClusterIP` (internal), `NodePort`, `LoadBalancer` (cloud provider), and `ExternalName`.
*   **Ingress:** Manages external access to the services in a cluster, typically HTTP/S. It can provide load balancing, SSL termination, and name-based virtual hosting. An Ingress controller (e.g., Nginx Ingress, Traefik) is needed to fulfill the Ingress rules.
*   **ConfigMap & Secret:** Used to manage application configuration and sensitive data (like API keys, passwords) respectively, decoupling them from your container images.
*   **Namespace:** Provides a scope for names. Used to create virtual clusters within a physical cluster.

**Conceptual YAML Manifests for a FastAPI App:**

**1. `deployment.yaml`:**
```yaml
# apiVersion: apps/v1
# kind: Deployment
# metadata:
#   name: fastapi-app-deployment
#   labels:
#     app: fastapi-app
# spec:
#   replicas: 3 # Number of desired Pods
#   selector:
#     matchLabels:
#       app: fastapi-app # Selects Pods with this label
#   template: # Pod template
#     metadata:
#       labels:
#         app: fastapi-app
#     spec:
#       containers:
#       - name: fastapi-container
#         image: your-dockerhub-username/my-fastapi-app:latest # Your Docker image
#         ports:
#         - containerPort: 8000 # Port your app listens on inside the container
#         env:
#           - name: DATABASE_URL
#             valueFrom:
#               secretKeyRef:
#                 name: app-secrets
#                 key: db_url
#         # resources: # Optional: Define CPU/memory requests and limits
#         #   requests:
#         #     memory: "128Mi"
#         #     cpu: "250m" # 0.25 CPU core
#         #   limits:
#         #     memory: "256Mi"
#         #     cpu: "500m"
#         # livenessProbe: ... (see next section)
#         # readinessProbe: ... (see next section)
```

**2. `service.yaml`:**
```yaml
# apiVersion: v1
# kind: Service
# metadata:
#   name: fastapi-app-service
# spec:
#   type: LoadBalancer # Or ClusterIP for internal, NodePort for specific node port
#   selector:
#     app: fastapi-app # Selects Pods managed by the Deployment above
#   ports:
#   - protocol: TCP
#     port: 80       # Port the Service is available on
#     targetPort: 8000 # Port on the Pods/containers to forward traffic to
```

**3. `ingress.yaml` (Optional, for external access via domain name):**
```yaml
# apiVersion: networking.k8s.io/v1
# kind: Ingress
# metadata:
#   name: fastapi-app-ingress
#   # annotations:
#   #   kubernetes.io/ingress.class: "nginx" # Example for Nginx Ingress controller
#   #   cert-manager.io/cluster-issuer: "letsencrypt-prod" # For automatic SSL with cert-manager
# spec:
#   rules:
#   - host: api.yourdomain.com
#     http:
#       paths:
#       - path: /
#         pathType: Prefix
#         backend:
#           service:
#             name: fastapi-app-service # Name of the Service defined above
#             port:
#               number: 80 # Port of the Service
  # tls: # Optional: For HTTPS
  # - hosts:
  #   - api.yourdomain.com
  #   secretName: yourdomain-tls-secret # Kubernetes secret containing TLS cert and key
```
**Apply to Kubernetes:**
```bash
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
# kubectl apply -f ingress.yaml # If using Ingress
```

### Health Checks for Containerized Applications

Health checks are critical for orchestrators like Kubernetes to manage your application's lifecycle effectively.
*   **Liveness Probe:** Kubernetes uses liveness probes to know when to restart a container. If a liveness probe fails, Kubernetes kills the container and restarts it according to its restart policy.
*   **Readiness Probe:** Kubernetes uses readiness probes to know when a container is ready to start accepting traffic. A Pod is considered ready when all of its containers are ready. If a readiness probe fails, Kubernetes removes the Pod's IP address from the endpoints of all Services that match the Pod.

**Implementing Health Check Endpoints in FastAPI:**
```python
# In your main.py or a dedicated health_check_router.py

from fastapi import FastAPI, APIRouter, status, Response

# app = FastAPI() # Assuming app is defined elsewhere if this is a separate router file
health_router = APIRouter(tags=["Health Checks"])

# Basic liveness check - is the app process running?
@health_router.get("/health/live", status_code=status.HTTP_200_OK)
async def liveness_check():
    return {"status": "alive"}

# Readiness check - is the app ready to serve traffic?
# This might involve checking database connections, cache, other dependencies.
@health_router.get("/health/ready", status_code=status.HTTP_200_OK)
async def readiness_check():
    # Simulate checking dependencies
    db_ready = True # await check_db_connection()
    cache_ready = True # await check_cache_connection()

    if db_ready and cache_ready:
        return {"status": "ready", "dependencies": {"database": "ok", "cache": "ok"}}
    else:
        # Return 503 if not ready, so Kubernetes doesn't send traffic
        # This requires careful implementation to avoid flapping if checks are unreliable.
        # For simplicity, we'll return 200 but indicate not ready in payload.
        # A better approach for K8s is to actually return 503 if not ready.
        # raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Service not ready")
        return Response(
            content=json.dumps({"status": "not_ready", "dependencies": {"database": "error" if not db_ready else "ok", "cache": "error" if not cache_ready else "ok"}}),
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, # Correct for K8s
            media_type="application/json"
        )


# app.include_router(health_router) # Add to your main FastAPI app
```

**Configuring Probes in Kubernetes Deployment (`deployment.yaml` snippet):**
```yaml
# ... (inside spec.template.spec.containers[])
#       containers:
#       - name: fastapi-container
#         # ... other container config ...
#         livenessProbe:
#           httpGet:
#             path: /health/live # Your liveness endpoint
#             port: 8000
#           initialDelaySeconds: 15 # Wait before first probe
#           periodSeconds: 20    # How often to probe
#           timeoutSeconds: 5
#           failureThreshold: 3
#         readinessProbe:
#           httpGet:
#             path: /health/ready # Your readiness endpoint
#             port: 8000
#           initialDelaySeconds: 20 # Often longer than liveness
#           periodSeconds: 10
#           timeoutSeconds: 5
#           successThreshold: 1
#           failureThreshold: 3
```
Properly configured health checks ensure that your application is resilient and that traffic is only routed to healthy, ready instances.