(function () {
  function initBebenWidget() {
    try {
      const root = document.createElement("div");
      root.id = "beben-ai-root";
      document.body.appendChild(root);

      const shadow = root.attachShadow({ mode: "open" });

      shadow.innerHTML = `
        <style>
          :root {
            --beben-black: #000;
            --beben-yellow: #FFD400;
            --radius-pill: 999px;
            --shadow: 0 10px 30px rgba(0,0,0,0.25);
            font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
          }

          .floating-btn {
            position: fixed;
            bottom: 24px;
            right: 24px;
            height: 56px;
            min-width: 56px;
            background: var(--beben-black);
            color: var(--beben-yellow);
            border-radius: var(--radius-pill);
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 0 18px;
            cursor: pointer;
            box-shadow: var(--shadow);
            transition: all 0.25s ease;
            overflow: hidden;
            z-index: 2147483647;
          }

          .collapsed {
            width: 56px;
            padding: 0;
            justify-content: center;
          }

          .icon {
            width: 22px;
            height: 22px;
            fill: var(--beben-yellow);
          }

          .label {
            white-space: nowrap;
            font-size: 14px;
            font-weight: 500;
          }

          .chat-panel {
            position: fixed;
            bottom: 96px;
            right: 24px;
            width: 340px;
            height: 420px;
            background: #fff;
            border-radius: 16px;
            box-shadow: var(--shadow);
            display: none;
            flex-direction: column;
            overflow: hidden;
            z-index: 2147483647;
          }

          .chat-header {
            background: var(--beben-black);
            color: var(--beben-yellow);
            padding: 14px;
            font-weight: 600;
          }

          .chat-messages {
            flex: 1;
            padding: 12px;
            overflow-y: auto;
            font-size: 14px;
          }

          .chat-input {
            border-top: 1px solid #eee;
            padding: 10px;
            display: flex;
            gap: 8px;
          }

          .chat-input input {
            flex: 1;
            padding: 10px;
            border-radius: 8px;
            border: 1px solid #ddd;
          }

          .chat-input button {
            background: var(--beben-black);
            color: var(--beben-yellow);
            border: none;
            padding: 0 14px;
            border-radius: 8px;
            cursor: pointer;
          }
        </style>

        <div id="btn" class="floating-btn collapsed">
          <svg class="icon" viewBox="0 0 24 24">
            <path d="M4 4h16v12H6l-2 2V4z"/>
          </svg>
          <span class="label">Ask beben AI</span>
        </div>

        <div id="chat" class="chat-panel">
          <div class="chat-header">beben AI</div>
          <div class="chat-messages">👋 Ask me about shipping, sizing, gear, or returns.</div>
          <div class="chat-input">
            <input placeholder="Type your question…" />
            <button>Send</button>
          </div>
        </div>
      `;

      const btn = shadow.getElementById("btn");
      const chat = shadow.getElementById("chat");

      btn.addEventListener("mouseenter", () => btn.classList.remove("collapsed"));
      btn.addEventListener("mouseleave", () => {
        if (chat.style.display !== "flex") btn.classList.add("collapsed");
      });

      btn.addEventListener("click", () => {
        const open = chat.style.display === "flex";
        chat.style.display = open ? "none" : "flex";
        btn.classList.toggle("collapsed", open);
      });

      console.log("[beben AI] widget loaded");
    } catch (e) {
      console.error("[beben AI] widget failed", e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBebenWidget);
  } else {
    initBebenWidget();
  }
})();
