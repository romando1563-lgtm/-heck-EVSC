import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();

// Разрешаем все CORS
app.use(cors());
app.use(express.json());

// Ваш Google Apps Script URL - проверьте что он правильный!
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwPxMEpL94-hDpY0BtuzbMnPVukskOhPAXzitOGSTLP_6YJxXoRHMWjyKk4hHFxNkYYgA/exec";

app.post("/proxy", async (req, res) => {
  console.log("📨 Получен запрос через прокси");
  console.log("Тело запроса:", JSON.stringify(req.body, null, 2));

  try {
    // ДОБАВЬТЕ ПАРАМЕТР ?test=1 чтобы избежать редиректа
    const urlWithParams = GOOGLE_SCRIPT_URL + "?random=" + Date.now();
    
    const response = await fetch(urlWithParams, {
      method: "POST",
      body: JSON.stringify(req.body),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const responseText = await response.text();
    console.log("📤 Статус ответа:", response.status);
    console.log("Ответ:", responseText.substring(0, 500));

    // Возвращаем ответ как есть
    res.status(response.status).send(responseText);

  } catch (error) {
    console.error("❌ Ошибка:", error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

app.get("/", (req, res) => {
  res.json({ 
    status: "Прокси работает", 
    google_script: GOOGLE_SCRIPT_URL,
    test: "Отправьте POST запрос на /proxy"
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
