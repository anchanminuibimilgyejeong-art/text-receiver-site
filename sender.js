const form = document.querySelector("#sendForm");
const textOne = document.querySelector("#textOne");
const textTwo = document.querySelector("#textTwo");
const status = document.querySelector("#status");
const storageKey = "receivedMessages";

function saveLocalMessage(message) {
  try {
    const messages = JSON.parse(localStorage.getItem(storageKey)) || [];
    messages.unshift(message);
    localStorage.setItem(storageKey, JSON.stringify(messages));
  } catch {
    localStorage.setItem(storageKey, JSON.stringify([message]));
  }
}

function markSent() {
  status.textContent = "전송했습니다. 받는 사이트에서 확인할 수 있습니다.";
  status.classList.remove("error");
  textOne.value = "";
  textTwo.value = "";
  textOne.focus();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const first = textOne.value.trim();
  const second = textTwo.value.trim();

  if (!first && !second) {
    status.textContent = "보낼 글자를 한 칸 이상 입력하세요.";
    status.classList.add("error");
    return;
  }

  const message = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    first,
    second,
    createdAt: new Date().toISOString()
  };

  if (window.location.protocol.startsWith("http")) {
    fetch("/api/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(message)
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("send failed");
        }
        markSent();
      })
      .catch(() => {
        status.textContent = "전송에 실패했습니다. 서버가 켜져 있는지 확인하세요.";
        status.classList.add("error");
      });
    return;
  }

  saveLocalMessage(message);
  markSent();
});
