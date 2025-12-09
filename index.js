import express from "express";
import cors from "cors";
import fetch from "node-fetch";
const app = express();
app.use(cors());
app.use(express.json());
const GOOGLE_SCRIPT = "https://script.google.com/macros/s/AKfycbwPxMEpL94-hDpY0BtuzbMnPVukskOhPAXzitOGSTLP_6YJxXoRHMWjyKk4hHFxNkYYgA/exec";
app.post("/proxy", async (req, res) => {
  try {
    const response = await fetch(GOOGLE_SCRIPT, {
      method: "POST",
      body: JSON.stringify(req.body),
      headers: {'Content-Type':'application/json'}
    });
    const text = await response.text();
    res.status(200).send(text);
  } catch (e) {
    res.status(500).send('Proxy error');
  }
});
app.get("/", (req, res) => res.send("Proxy is running!"));
const port = process.env.PORT || 8080;
app.listen(port, ()=>console.log("Started on", port));
