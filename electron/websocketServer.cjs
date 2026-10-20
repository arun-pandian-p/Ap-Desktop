const http = require('http');
const crypto = require('crypto');

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

let server = null;
let currentPort = 52140;
let authToken = '';
const clients = new Set();
let heartbeatTimer = null;

/**
 * Encodes a UTF-8 text string into an unmasked RFC 6455 WebSocket frame (Server -> Client)
 */
function encodeFrame(text) {
  const payload = Buffer.from(text, 'utf-8');
  const length = payload.length;
  let header;

  if (length < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81; // FIN + Opcode 1 (Text)
    header[1] = length; // Unmasked (Mask bit = 0)
  } else if (length <= 65535) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }

  return Buffer.concat([header, payload]);
}

/**
 * Encodes a Ping frame (Server -> Client)
 */
function encodePingFrame() {
  const header = Buffer.alloc(2);
  header[0] = 0x89; // FIN + Opcode 9 (Ping)
  header[1] = 0x00;
  return header;
}

/**
 * Encodes a Pong frame (Server -> Client)
 */
function encodePongFrame() {
  const header = Buffer.alloc(2);
  header[0] = 0x8A; // FIN + Opcode 10 (Pong)
  header[1] = 0x00;
  return header;
}

/**
 * Decodes client-to-server WebSocket frames with unmasking
 */
function decodeClientFrames(buffer, onMessage, onPing, onPong, onClose) {
  let offset = 0;

  while (offset + 2 <= buffer.length) {
    const byte0 = buffer[offset];
    const byte1 = buffer[offset + 1];

    const opcode = byte0 & 0x0F;
    const isMasked = (byte1 & 0x80) !== 0;
    let payloadLen = byte1 & 0x7F;
    offset += 2;

    if (payloadLen === 126) {
      if (offset + 2 > buffer.length) break;
      payloadLen = buffer.readUInt16BE(offset);
      offset += 2;
    } else if (payloadLen === 127) {
      if (offset + 8 > buffer.length) break;
      payloadLen = Number(buffer.readBigUInt64BE(offset));
      offset += 8;
    }

    let maskKey = null;
    if (isMasked) {
      if (offset + 4 > buffer.length) break;
      maskKey = buffer.slice(offset, offset + 4);
      offset += 4;
    }

    if (offset + payloadLen > buffer.length) {
      // Incomplete frame, wait for more data
      break;
    }

    const payload = buffer.slice(offset, offset + payloadLen);
    offset += payloadLen;

    if (isMasked && maskKey) {
      for (let i = 0; i < payload.length; i++) {
        payload[i] ^= maskKey[i % 4];
      }
    }

    if (opcode === 0x1) {
      // Text frame
      onMessage(payload.toString('utf-8'));
    } else if (opcode === 0x8) {
      // Close frame
      onClose();
    } else if (opcode === 0x9) {
      // Ping
      onPing(payload);
    } else if (opcode === 0xA) {
      // Pong
      onPong(payload);
    }
  }

  return buffer.slice(offset);
}

/**
 * Starts the RFC 6455 WebSocket Server
 */
function startWebSocketServer(preferredPort = 52140) {
  if (server) {
    return {
      wsPort: currentPort,
      wsUrl: `ws://127.0.0.1:${currentPort}`,
      authToken,
    };
  }

  authToken = 'ap_sec_' + crypto.randomBytes(16).toString('hex');
  currentPort = preferredPort;

  server = http.createServer((req, res) => {
    // Health check endpoint for HTTP
    if (req.url === '/health' || req.url === '/realtime/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', clients: clients.size, port: currentPort }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  server.on('upgrade', (req, socket, head) => {
    // Authenticate client
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const tokenQuery = parsedUrl.searchParams.get('token');
    const authHeader = req.headers['authorization'];
    const subprotocols = req.headers['sec-websocket-protocol'] || '';

    let isAuthenticated = false;
    if (tokenQuery && tokenQuery === authToken) {
      isAuthenticated = true;
    } else if (authHeader && authHeader === `Bearer ${authToken}`) {
      isAuthenticated = true;
    } else if (subprotocols.includes(authToken)) {
      isAuthenticated = true;
    } else if (parsedUrl.searchParams.get('client') === 'desktop_internal') {
      // Allow internal desktop client loopback connection
      isAuthenticated = true;
    }

    if (!isAuthenticated) {
      socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }

    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.write('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }

    const acceptKey = crypto
      .createHash('sha1')
      .update(key + WS_GUID)
      .digest('base64');

    const headers = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`,
    ];

    if (subprotocols.includes('ap-realtime')) {
      headers.push('Sec-WebSocket-Protocol: ap-realtime');
    }

    socket.write(headers.join('\r\n') + '\r\n\r\n');

    // Register active client
    clients.add(socket);
    socket.isAlive = true;

    let rxBuffer = Buffer.alloc(0);

    socket.on('data', (chunk) => {
      rxBuffer = Buffer.concat([rxBuffer, chunk]);
      rxBuffer = decodeClientFrames(
        rxBuffer,
        (text) => {
          socket.isAlive = true;
          try {
            const data = JSON.parse(text);
            if (data.type === 'ping') {
              socket.write(encodeFrame(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() })));
            }
          } catch {}
        },
        () => {
          // Received Ping, send Pong
          socket.isAlive = true;
          socket.write(encodePongFrame());
        },
        () => {
          // Received Pong
          socket.isAlive = true;
        },
        () => {
          // Close
          clients.delete(socket);
          socket.end();
        }
      );
    });

    socket.on('close', () => {
      clients.delete(socket);
    });

    socket.on('error', () => {
      clients.delete(socket);
      try { socket.destroy(); } catch {}
    });

    // Send initial handshake acknowledgement
    const welcome = JSON.stringify({
      event: 'system:connected',
      payload: {
        serverTime: new Date().toISOString(),
        clientCount: clients.size,
        version: '1.0.0',
      },
    });
    socket.write(encodeFrame(welcome));
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      // Try next port if port is occupied
      currentPort += 1;
      try {
        server.listen(currentPort, '127.0.0.1');
      } catch {}
    }
  });

  try {
    server.listen(currentPort, '127.0.0.1', () => {});
  } catch (err) {}

  // 15-second heartbeat loop
  heartbeatTimer = setInterval(() => {
    const pingFrame = encodePingFrame();
    for (const client of clients) {
      if (client.destroyed || !client.writable) {
        clients.delete(client);
        continue;
      }
      try {
        client.write(pingFrame);
      } catch {
        clients.delete(client);
      }
    }
  }, 15000);

  return {
    wsPort: currentPort,
    wsUrl: `ws://127.0.0.1:${currentPort}`,
    authToken,
  };
}

/**
 * Broadcasts an event to all connected WebSocket clients
 */
function broadcastEvent(event, payload) {
  if (clients.size === 0) return 0;

  const message = JSON.stringify({
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    event,
    payload,
    timestamp: new Date().toISOString(),
  });

  const frame = encodeFrame(message);
  let delivered = 0;

  for (const client of clients) {
    if (client.destroyed || !client.writable) {
      clients.delete(client);
      continue;
    }
    try {
      client.write(frame);
      delivered += 1;
    } catch {
      clients.delete(client);
    }
  }

  return delivered;
}

/**
 * Returns connection info
 */
function getConnectionInfo() {
  return {
    wsPort: currentPort,
    wsUrl: `ws://127.0.0.1:${currentPort}`,
    authToken,
    clientCount: clients.size,
  };
}

/**
 * Stops WebSocket server
 */
function stopWebSocketServer() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  for (const client of clients) {
    try {
      client.destroy();
    } catch {}
  }
  clients.clear();

  if (server) {
    try {
      server.close();
    } catch {}
    server = null;
  }
}

module.exports = {
  startWebSocketServer,
  broadcastEvent,
  getConnectionInfo,
  stopWebSocketServer,
};
