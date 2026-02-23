import express from "express";
import { createServer as createViteServer } from "vite";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import db from "./src/db.ts";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

app.use(express.json());

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- Auth Routes ---
app.post("/api/auth/register", async (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const stmt = db.prepare("INSERT INTO users (email, password, first_name, last_name) VALUES (?, ?, ?, ?)");
    const info = stmt.run(email, hashedPassword, firstName, lastName);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (error: any) {
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: "An account with this email already exists. Please sign in instead." });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
  res.json({ token, user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name } });
});

// --- User Profile Routes ---
app.get("/api/user/profile", authenticateToken, (req: any, res) => {
  const user = db.prepare("SELECT id, email, first_name, last_name, mobile, blood_group, personal_notes FROM users WHERE id = ?").get(req.user.id);
  res.json(user);
});

app.put("/api/user/profile", authenticateToken, (req: any, res) => {
  const { firstName, lastName, mobile, bloodGroup, personalNotes } = req.body;
  db.prepare(`
    UPDATE users 
    SET first_name = ?, last_name = ?, mobile = ?, blood_group = ?, personal_notes = ?
    WHERE id = ?
  `).run(firstName, lastName, mobile, bloodGroup, personalNotes, req.user.id);
  res.json({ success: true });
});

// --- Chat History Routes ---
app.get("/api/chat/sessions", authenticateToken, (req: any, res) => {
  const sessions = db.prepare("SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
  res.json(sessions);
});

app.post("/api/chat/sessions", authenticateToken, (req: any, res) => {
  const { title } = req.body;
  const info = db.prepare("INSERT INTO chat_sessions (user_id, title) VALUES (?, ?)").run(req.user.id, title);
  res.json({ id: info.lastInsertRowid });
});

app.get("/api/chat/history", authenticateToken, (req: any, res) => {
  const { sessionId } = req.query;
  let history;
  if (sessionId) {
    history = db.prepare("SELECT * FROM chat_history WHERE user_id = ? AND session_id = ? ORDER BY created_at ASC").all(req.user.id, sessionId);
  } else {
    history = db.prepare("SELECT * FROM chat_history WHERE user_id = ? ORDER BY created_at ASC").all(req.user.id);
  }
  res.json(history);
});

app.post("/api/chat/history", authenticateToken, (req: any, res) => {
  const { role, content, sessionId } = req.body;
  db.prepare("INSERT INTO chat_history (user_id, role, content, session_id) VALUES (?, ?, ?, ?)").run(req.user.id, role, content, sessionId);
  res.json({ success: true });
});

// --- Medical Report Routes ---
const upload = multer({ storage: multer.memoryStorage() });

app.post("/api/reports/upload", authenticateToken, upload.single('report'), (req: any, res) => {
  const { analysis } = req.body;
  const filename = req.file?.originalname || "report.pdf";
  db.prepare("INSERT INTO medical_reports (user_id, filename, analysis) VALUES (?, ?, ?)").run(req.user.id, filename, analysis);
  res.json({ success: true });
});

app.get("/api/reports", authenticateToken, (req: any, res) => {
  const reports = db.prepare("SELECT * FROM medical_reports WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
  res.json(reports);
});

// --- Vite Middleware ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
