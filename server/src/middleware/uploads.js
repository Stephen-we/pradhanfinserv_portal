// server/src/middleware/uploads.js
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Single consistent uploads directory (inside /server/uploads)
const dir = path.join(__dirname, "..", "uploads");

// Ensure uploads folder exists
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log(`📁 Multer destination: ${file.fieldname} - ${file.originalname}`);
    cb(null, dir); // ✅ Always use same dir as server.js
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
    console.log(
      `🔍 Multer file filter: ${file.fieldname} - ${file.originalname} - ${file.mimetype}`
    );
    cb(null, true); // ✅ Accept all file types (photos, PDFs, docs, etc.)
  },
};

const upload = multer(multerConfig);

export { upload };
