// server/src/middleware/uploads.js
import multer from "multer";
import path from "path";
import fs from "fs";

const dir = path.join(process.cwd(), "server", "uploads");
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log(`📁 Multer destination: ${file.fieldname} - ${file.originalname}`);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/\s+/g, "_");
    const filename = `${name}-${Date.now()}${ext}`;
    console.log(`📁 Multer filename: ${filename}`);
    cb(null, filename);
  },
});

// Enhanced multer configuration
export const upload = multer({ 
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    fieldSize: 100 * 1024 * 1024, // 100MB for non-file fields
  }
});