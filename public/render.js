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
    const msgElement = document.getElementById(messageId + '-text');
    const msgWrapper = document.getElementById(messageId);

    if (msgElement) {
        msgElement.textContent = '[訊息已收回]';
        msgElement.classList.add('retracted');

        const retractButton = msgWrapper.querySelector('.tooltip');
        if (retractButton) {
            retractButton.remove();
        }
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
    messageContentInner.id = msg.id + "-text";

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
        deleteButton.className = 'tooltip rbt';

        // SVG 元素
        deleteButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20" height="25" width="25">
                <path fill="#6361D9" d="M8.78842 5.03866C8.86656 4.96052 8.97254 4.91663 9.08305 4.91663H11.4164C11.5269 4.91663 11.6329 4.96052 11.711 5.03866C11.7892 5.11681 11.833 5.22279 11.833 5.33329V5.74939H8.66638V5.33329C8.66638 5.22279 8.71028 5.11681 8.78842 5.03866ZM7.16638 5.74939V5.33329C7.16638 4.82496 7.36832 4.33745 7.72776 3.978C8.08721 3.61856 8.57472 3.41663 9.08305 3.41663H11.4164C11.9247 3.41663 12.4122 3.61856 12.7717 3.978C13.1311 4.33745 13.333 4.82496 13.333 5.33329V5.74939H15.5C15.9142 5.74939 16.25 6.08518 16.25 6.49939C16.25 6.9136 15.9142 7.24939 15.5 7.24939H15.0105L14.2492 14.7095C14.2382 15.2023 14.0377 15.6726 13.6883 16.0219C13.3289 16.3814 12.8414 16.5833 12.333 16.5833H8.16638C7.65805 16.5833 7.17054 16.3814 6.81109 16.0219C6.46176 15.6726 6.2612 15.2023 6.25019 14.7095L5.48896 7.24939H5C4.58579 7.24939 4.25 6.9136 4.25 6.49939C4.25 6.08518 4.58579 5.74939 5 5.74939H6.16667H7.16638ZM7.91638 7.24996H12.583H13.5026L12.7536 14.5905C12.751 14.6158 12.7497 14.6412 12.7497 14.6666C12.7497 14.7771 12.7058 14.8831 12.6277 14.9613C12.5495 15.0394 12.4436 15.0833 12.333 15.0833H8.16638C8.05588 15.0833 7.94989 15.0394 7.87175 14.9613C7.79361 14.8831 7.74972 14.7771 7.74972 14.6666C7.74972 14.6412 7.74842 14.6158 7.74584 14.5905L6.99681 7.24996H7.91638Z" clip-rule="evenodd" fill-rule="evenodd"></path>
            </svg>
            <span class="tooltiptext">remove</span>
        `;

        // 綁定點擊事件
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
    const lockScreen = document.getElementById("lock-screen");
    const content = document.getElementById("content");

    // 淡出 lock-screen
    lockScreen.classList.add("fade-out");
    lockScreen.classList.remove("fade-in");

    // 等待淡出結束後顯示 content
    setTimeout(() => {
        lockScreen.style.display = "none";
        content.style.display = "block";

        // 淡入 content
        content.classList.add("fade-in");
        content.classList.remove("fade-out");

        // 滾動到最新聊天訊息
        const chatBox = document.getElementById("chatBox");
        if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
    }, 700); // 與 CSS 動畫的時間匹配
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
        document.getElementById("lock-screen").style.display = "none";
        document.getElementById("content").style.display = "block";
        chatBox.scrollTop = chatBox.scrollHeight;
    }
};

socket.on('reload', () => {
    let cookies = document.cookie.split(";");

    for (let cookie of cookies) {
        let cookieName = cookie.split("=")[0].trim();
        document.cookie = cookieName + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    }

    alert("名稱驗證錯誤! 請重新登入!");
    window.location.reload();
});
