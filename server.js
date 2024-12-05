const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const CHAT_HISTORY_FILE = './chatHistory.json';

// 初始化聊天記錄
let chatHistory = [];
if (fs.existsSync(CHAT_HISTORY_FILE)) {
    try {
        chatHistory = JSON.parse(fs.readFileSync(CHAT_HISTORY_FILE, 'utf-8'));
    } catch (error) {
        console.error('Error reading chat history file:', error);
        chatHistory = [];
    }
}

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('A user connected');

    // 驗證密碼並設置用戶暱稱
    socket.on('setNickname', (hashedPassword, callback) => {
        if (hashedPassword === "2f1987bf98c09d2f5d2a23a6ae29fa53b9aec8f07ed1330bd439122f5a1a2c2c") {
            socket.nickname = "Sally";
        } else if (hashedPassword === "a7a39b72f29718e653e73503210fbb597057b7a1c77d1fe321a1afcff041d4e1") {
            socket.nickname = "XXX";
        } else {
            callback({ success: false });
            console.log("Authentication failed");
            return;
        }

        callback({ success: true, nickname: socket.nickname });
        console.log(`${socket.nickname} authenticated successfully`);

        // 發送歷史聊天記錄
        socket.emit('chatHistory', chatHistory);
    });

    // 接收新訊息
    socket.on('chatMessage', (msg) => {
        if (socket.nickname) {
            const messageId = `${Date.now()}-${Math.random()}`;
            const userMessage = {
                id: messageId,
                text: msg,
                sender: socket.nickname,
                timestamp: new Date().toISOString(),
                retracted: false
            };
            chatHistory.push(userMessage);
            saveChatHistory();
            io.emit('chatMessage', userMessage);
        } else {
            console.log("Unauthorized user tried to send a message.");
            io.emit('reload');
        }
    });

    // 收回訊息
    socket.on('retractMessage', (messageId) => {
        const message = chatHistory.find(msg => msg.id === messageId);
        if (message && message.sender === socket.nickname) {
            message.retracted = true;
            saveChatHistory();
            io.emit('retractMessage', messageId);
        }
    });

    socket.on('disconnect', () => {
        console.log(`${socket.nickname || 'Unknown user'} disconnected`);
    });
});

// 儲存聊天記錄到檔案
function saveChatHistory() {
    try {
        fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify(chatHistory, null, 2), 'utf-8');
        console.log('Chat history saved successfully');
    } catch (error) {
        console.error('Error saving chat history:', error);
    }
}

server.listen(3000, () => {
    console.log('Server is running.');
});
