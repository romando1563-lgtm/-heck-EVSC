import express from "express";
import cors from "cors";
import fetch from "node-fetch";
const app = express();

// Более гибкие настройки CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const GOOGLE_SCRIPT = "https://script.google.com/macros/s/AKfycbwPxMEpL94-hDpY0BtuzbMnPVukskOhPAXzitOGSTLP_6YJxXoRHMWjyKk4hHFxNkYYgA/exec";

app.post("/proxy", async (req, res) => {
  try {
    console.log("📨 Получен запрос через прокси");
    console.log("Данные:", JSON.stringify(req.body, null, 2));
    
    // ВАЖНО: Google Apps Script возвращает редирект, нужно его обработать
    const response = await fetch(GOOGLE_SCRIPT, {
      method: "POST",
      body: JSON.stringify(req.body),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      // Важно: Google Apps Script возвращает 302 редирект
      redirect: 'manual' // Обрабатываем редирект вручную
    });

    console.log("Статус ответа от Google:", response.status);
    console.log("Заголовки:", response.headers.raw());

    // Если получили редирект (Google Apps Script делает 302)
    if (response.status === 302 || response.status === 301) {
      const redirectUrl = response.headers.get('location');
      console.log("Редирект на:", redirectUrl);
      
      if (redirectUrl) {
        // Следуем за редиректом
        const redirectedResponse = await fetch(redirectUrl, {
          method: "POST",
          body: JSON.stringify(req.body),
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        const text = await redirectedResponse.text();
        console.log("Ответ после редиректа:", text);
        res.status(redirectedResponse.status).send(text);
        return;
      }
    }

    // Если не было редиректа, возвращаем как есть
    const text = await response.text();
    console.log("Ответ от Google:", text);
    res.status(response.status).send(text);
    
  } catch (e) {
    console.error("❌ Ошибка прокси:", e);
    res.status(500).json({ 
      status: "error", 
      message: "Proxy error: " + e.message 
    });
  }
});

// Простой GET для проверки
app.get("/", (req, res) => {
  res.json({ 
    status: "running", 
    message: "Прокси сервер для Google Apps Script",
    google_script: GOOGLE_SCRIPT
  });
});

// Проверка здоровья
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString() 
  });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`🚀 Прокси сервер запущен на порту ${port}`);
  console.log(`🔗 Google Apps Script: ${GOOGLE_SCRIPT}`);
  console.log(`🌐 Доступен по: https://heck-evsc.onrender.com`);
});
