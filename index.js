import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import multer from "multer";
import * as XLSX from "xlsx";

const app = express();

// Настройка multer для загрузки файлов
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel' ||
        file.mimetype === 'application/octet-stream' ||
        file.originalname.endsWith('.xlsx') || 
        file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Неподдерживаемый формат файла. Разрешены только .xlsx и .xls'));
    }
  }
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxJKYD9fmbrY9cCmohRk4t5QuO8SPlA4VeBLAAqlZy0gDl5eCIxIqjSma5Ug2HxLvZ_RA/exec";

// Основной прокси эндпоинт
app.post("/proxy", async (req, res) => {
  console.log("\n" + "=".repeat(50));
  console.log("📨 ПОЛУЧЕН ЗАПРОС НА ПРОКСИ");
  console.log("Время:", new Date().toISOString());
  
  try {
    const data = req.body;
    console.log("Данные от клиента:", JSON.stringify(data, null, 2));
    
    // Отправляем в Google Apps Script
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
    
    // Устанавливаем CORS заголовки
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    // Возвращаем ответ
    res.status(response.status).send(responseText);
    
  } catch (error) {
    console.error("❌ ОШИБКА ПРОКСИ:", error);
    res.status(500).json({
      status: "error",
      message: "Ошибка прокси: " + error.message
    });
  }
});

// Эндпоинт для обновления статуса "Отгружен"
app.post("/proxy/update-shipped", upload.single('excelFile'), async (req, res) => {
  console.log("\n" + "=".repeat(50));
  console.log("📨 ПОЛУЧЕН ЗАПРОС НА ОБНОВЛЕНИЕ СТАТУСА ОТГРУЖЕН");
  console.log("Время:", new Date().toISOString());
  
  try {
    if (!req.file) {
      return res.status(400).json({
        status: "error",
        message: "Файл не загружен"
      });
    }
    
    console.log("📥 Обрабатываю файл:", req.file.originalname);
    console.log("📏 Размер файла:", req.file.size, "байт");
    
    // Читаем Excel файл из буфера
    console.log("📖 Читаю Excel файл...");
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Преобразуем в JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    console.log("📊 Данные из Excel:", jsonData.length, "строк");
    
    // Извлекаем номера клиентских возвратов (предполагаем, что они в первом столбце)
    const returnNumbers = [];
    for (let i = 1; i < jsonData.length; i++) { // Начинаем с 1, чтобы пропустить заголовок
      const row = jsonData[i];
      if (row && row[0]) {
        const returnNum = row[0].toString().trim();
        if (returnNum && returnNum.length > 0) {
          returnNumbers.push(returnNum);
        }
      }
    }
    
    console.log("📋 Найдено номеров клиентских возвратов:", returnNumbers.length);
    
    if (returnNumbers.length === 0) {
      return res.json({
        status: "success",
        message: "В файле не найдено номеров клиентских возвратов",
        updatedCount: 0,
        totalChecked: 0
      });
    }
    
    // Отправляем запрос в Google Apps Script
    console.log(`📤 Отправляю в Google для обновления: ${GOOGLE_SCRIPT_URL}`);
    
    const requestData = {
      action: "updateShipped",
      returnNumbers: returnNumbers
    };
    
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(requestData),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const responseText = await response.text();
    console.log(`📥 Ответ от Google:`);
    console.log(`Статус: ${response.status}`);
    
    // Устанавливаем CORS заголовки
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    // Возвращаем ответ
    res.status(response.status).send(responseText);
    
  } catch (error) {
    console.error("❌ ОШИБКА ОБНОВЛЕНИЯ СТАТУСА:", error);
    res.status(500).json({
      status: "error",
      message: "Ошибка обновления статуса: " + error.message
    });
  }
});

app.options('/proxy', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

app.options('/proxy/update-shipped', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.json({
    service: "Google Apps Script Proxy",
    status: "online",
    timestamp: new Date().toISOString(),
    endpoints: {
      "POST /proxy": "Основной прокси для формы",
      "POST /proxy/update-shipped": "Обновление статуса отгружен (multipart/form-data)"
    }
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
