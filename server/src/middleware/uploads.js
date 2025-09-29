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
     console.log(`📁 Multer saved as: ${filename}`);
    cb(null, filename);
  },
});

// More permissive multer configuration
const multerConfig = {
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB limit
    fieldSize: 200 * 1024 * 1024, // 200MB for non-file fields
  },
  fileFilter: (req, file, cb) => {
    console.log(`🔍 Multer file filter: ${file.fieldname} - ${file.originalname} - ${file.mimetype}`);
    cb(null, true); // Accept all files
  }
};

const upload = multer(multerConfig);

export { upload };