const socket = io(); // 必须在任何对 socket 的使用之前声明
const page = 0;
let nickname; // 儲存使用者名稱

/* 解鎖頁面並傳送使用者名稱 */
async function unlock() {
    console.log("Trying to unlock...");
    const passwordInput = document.getElementById("password").value;
    const errorMessage = document.getElementById("error-message");

    const hashedPassword = await hashPassword(passwordInput);
    console.log("Hashed password:", hashedPassword);

    socket.emit('setNickname', hashedPassword, async (response) => {
        if (response.success) {
            page = 1;
            nickname = response.nickname; // 设置前端的 nickname
            setCookie('nickname', nickname, 7); // 保存昵称到 cookie，7 天有效

            console.log(`Welcome, ${nickname}!`);
            $(".lock").fadeOut(400, async function () {
                document.getElementById("lock-screen").classList.remove("active");
                document.getElementById("content").classList.add("active");
            });
            await delay(400);
            $(".unlock").fadeIn(400);
        } else {
            errorMessage.style.display = "block"; // 密码错误
            errorMessage.textContent = "密码错误，请再试一次！";
        }
    });
}

async function sendmes() {
    if(nickname != null && nickname !== "" && page == 1){
        const mess = document.getElementById("messageInput").value; // 獲取輸入框的值
    if (mess.trim() !== "") { // 確保訊息不為空
        socket.emit('chatMessage', mess); // 發送訊息
        console.log(`${nickname} sent a message: ${mess}`);
        document.getElementById("messageInput").value = ""; // 清空輸入框
    } else {
        console.log("Message is empty, not sent.");
    }
    }else{
        console.log("Name did not define, reload...");
        history.go(0);
    }
}

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
}

/* 更新歷史訊息 */
socket.on('chatHistory', (history) => {
    history.forEach(msg => addMessage(msg));
});

/* 新訊息 */
socket.on('chatMessage', (msg) => {
    addMessage(msg);
}); 

/* 收回訊息 */
socket.on('retractMessage', (messageId) => {
    const msgElement = document.getElementById(messageId);
    if (msgElement) {
        // 找到訊息內容的部分並修改其文字
        const messageContent = msgElement.querySelector('.text, .text-self');
        if (messageContent) {
            messageContent.textContent = '[訊息已收回]';
        }

        const retractButton = msgElement.querySelector('.recall-button');
        if (retractButton) {
            retractButton.remove();
        }
    }
});

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}


function retractMessage(messageId) {
    socket.emit('retractMessage', messageId);
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
}

window.onload = () => {
    if(page==1){
        const storedNickname = getCookie('nickname');
    if (storedNickname) {
        nickname = storedNickname;
        console.log(`Restored nickname from cookie: ${nickname}`);

        // 自动隐藏锁屏界面，显示聊天界面
        $(".lock").hide();
        document.getElementById("lock-screen").classList.remove("active");
        document.getElementById("content").classList.add("active");
        $(".unlock").fadeIn(400);
    } else {
        console.log("No nickname stored in cookie.");
        history.go(0);
    }
    }
};
