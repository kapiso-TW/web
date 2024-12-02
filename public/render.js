const socket = io();
let nickname = null;

/* 解鎖頁面並傳送使用者名稱 */
async function unlock() {
    const passwordInput = document.getElementById("password").value;
    const errorMessage = document.getElementById("error-message");

    const hashedPassword = await hashPassword(passwordInput);

    socket.emit('setNickname', hashedPassword, (response) => {
        if (response.success) {
            nickname = response.nickname;
            setCookie('nickname', nickname, 7);
            transitionToChatScreen();
        } else {
            errorMessage.style.display = "block";
            errorMessage.textContent = "密碼錯誤，請再試一次！";
        }
    });
}

/* 發送訊息 */
async function sendMessage() {
    const messageInput = document.getElementById("messageInput");
    const message = messageInput.value.trim();

    if (message) {
        socket.emit('chatMessage', message);
        messageInput.value = "";
    }
}

/* 收回訊息 */
function retractMessage(messageId) {
    socket.emit('retractMessage', messageId);
}

/* 新訊息處理 */
socket.on('chatMessage', (msg) => {
    addMessage(msg);
});

/* 更新歷史訊息 */
socket.on('chatHistory', (history) => {
    history.forEach(msg => addMessage(msg));
});

/* 收回訊息處理 */
socket.on('retractMessage', (messageId) => {
    const msgElement = document.getElementById(messageId);
    if (msgElement) {
        msgElement.querySelector('.message-text').textContent = '[訊息已收回]';
        const retractButton = msgElement.querySelector('.retract-button');
        if (retractButton) retractButton.remove();
    }
});

/* 添加訊息到聊天框 */
function addMessage(msg) {
    const messageWrapper = document.createElement('div');
    messageWrapper.id = msg.id;
    messageWrapper.className = msg.sender === nickname ? 'message-self' : 'message-post';

    // 發送者名稱
    const senderName = document.createElement('div');
    senderName.className = msg.sender === nickname ? 'name-self' : 'name';
    senderName.textContent = msg.sender;

    // 訊息內容容器 (包裹用戶訊息)
    const messageContentWrapper = document.createElement('div');
    messageContentWrapper.className = msg.sender === nickname ? 'text-self' : 'text';

    // 訊息內部容器，設定文字對齊方式
    const messageContentInner = document.createElement('div');
    messageContentInner.style.textAlign = 'left';

    // 設定訊息內容
    if (msg.retracted) {
        messageContentInner.textContent = '[訊息已收回]';
        messageContentInner.classList.add('retracted');
    } else {
        messageContentInner.textContent = msg.text || 'No message';
    }

    // 將內部容器加到訊息內容容器中
    messageContentWrapper.appendChild(messageContentInner);

    // 將發送者名稱和訊息內容容器加到訊息包裹器中
    messageWrapper.appendChild(senderName);
    messageWrapper.appendChild(messageContentWrapper);

    const chatBox = document.getElementById('chatBox');
    chatBox.appendChild(messageWrapper);
    chatBox.scrollTop = chatBox.scrollHeight;

    // 收回按鈕 (僅當前用戶的訊息顯示)
    if (msg.sender === nickname && !msg.retracted) {
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.textContent = '收回';
        deleteButton.className = 'recall-button';

        // 為按鈕綁定事件處理函數來發送收回訊息的請求
        deleteButton.onclick = () => {
            retractMessage(msg.id);
        };

        messageWrapper.appendChild(deleteButton);
    }

    chatBox.appendChild(messageWrapper);
}

/* 密碼哈希 */
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

/* 轉換到聊天畫面 */
function transitionToChatScreen() {
    document.getElementById("lock-screen").style.display = "none";
    document.getElementById("content").style.display = "block";
    chatBox.scrollTop = chatBox.scrollHeight;
}


/* 設置 Cookie */
function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

/* 取得 Cookie */
function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
}

/* 初始化頁面 */
window.onload = () => {
    const storedNickname = getCookie('nickname');
    if (storedNickname) {
        nickname = storedNickname;
        transitionToChatScreen();
    }
};
