import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import archiver from "archiver";


const router = express.Router();

// folder: /uploads/customers/<customerId>/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), "uploads", "customers", req.params.customerId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    const base = path.basename(file.originalname, ext).replace(/\s+/g,"_");
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});
const upload = multer({ storage });

// POST /api/customers/:customerId/docs (multiple)
router.post("/:customerId/docs", upload.array("files", 20), async (req,res)=>{
  // you can also persist file metadata in DB if you want
  res.json({ ok:true, files: req.files.map(f=>({ name:f.filename, path:f.path })) });
});

// GET /api/customers/:customerId/docs.zip
router.get("/:customerId/docs.zip", async (req,res)=>{
  const dir = path.join(process.cwd(), "uploads", "customers", req.params.customerId);
  if (!fs.existsSync(dir)) return res.status(404).json({message:"No documents yet"});

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="customer_${req.params.customerId}_docs.zip"`);

  const archive = archiver("zip", { zlib:{ level:9 }});
  archive.on("error", err => res.status(500).send({error: err.message}));
  archive.pipe(res);
  archive.directory(dir, false);
  archive.finalize();
});

export default router;
