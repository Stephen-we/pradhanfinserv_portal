// server/src/middleware/uploads.js
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Single consistent uploads directory (inside /server/uploads)
const dir = path.join(__dirname, "..", "uploads");

// 🧩 Auto-repair: if /server/src/uploads exists, merge its files once
const legacyDir = path.join(__dirname, "uploads");
if (fs.existsSync(legacyDir)) {
  const legacyFiles = fs.readdirSync(legacyDir);
  if (legacyFiles.length > 0) {
    console.log(`🔄 Moving ${legacyFiles.length} legacy file(s) from /src/uploads → /uploads`);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    for (const f of legacyFiles) {
      const src = path.join(legacyDir, f);
      const dest = path.join(dir, f);
      try {
        fs.renameSync(src, dest);
      } catch {
        console.warn(`⚠️ Could not move ${f}`);
      }
    }
    try {
      fs.rmdirSync(legacyDir, { recursive: true });
    } catch {}
  }
}

// Ensure uploads folder exists
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log(`📁 Multer destination: ${file.fieldname} - ${file.originalname}`);
    cb(null, dir); // ✅ Always same dir as server.js
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/\s+/g, "_");
    const filename = `${name}-${Date.now()}${ext}`;
    console.log(`📁 Multer saved as: ${filename}`);
    cb(null, filename);
  },
});

const multerConfig = {
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200 MB
    fieldSize: 200 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    console.log(`🔍 Multer file filter: ${file.fieldname} - ${file.originalname} - ${file.mimetype}`);
    cb(null, true);
  },
};

const upload = multer(multerConfig);

export { upload };
