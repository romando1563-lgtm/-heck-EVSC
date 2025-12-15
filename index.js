import express from "express";
import cors from "cors";
import fetch from "node-fetch";


const app = express();

app.use(cors());
app.use(express.json());

// ⚠️ Замените на ваш URL Google Apps Script!
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/ВАШ_ИД_СЦЕНАРИЯ/exec";

app.post("/proxy", async (req, res) => {
  console.log("\n" + "=".repeat(50));
  console.log("📨 ПОЛУЧЕН ЗАПРОС НА ПРОКСИ");
  console.log("Время:", new Date().toISOString());

  try {
    const data = req.body;
    console.log("Данные от клиента:", JSON.stringify(data, null, 2));
    console.log("Количество полей:", Object.keys(data).length);


    // Пересылаем данные в Google Apps Script
    console.log(`📤 Отправляю в Google: ${GOOGLE_SCRIPT_URL}`);


    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const responseText = await response.text();
    console.log(`📥 Ответ от Google:`);
    console.log(`Статус: ${response.status}`);
    console.log(`Текст: ${responseText.substring(0, 500)}...`);


    res.status(response.status).send(responseText);

  } catch (error) {
    console.error("❌ ОШИБКА ПРОКСИ:", error);
    res.status(500).json({
      status: "error",
      message: "Ошибка прокси: " + error.message
    });
  }
});

app.get("/", (req, res) => {
  res.json({
    service: "Google Apps Script Proxy",
    status: "online",
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
