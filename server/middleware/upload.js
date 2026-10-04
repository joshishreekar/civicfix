import multer from 'multer';
import fs from 'fs';
import path from 'path';
const dir = process.env.UPLOAD_DIR || 'uploads';
fs.mkdirSync(dir,{recursive:true});
const storage = multer.diskStorage({
  destination: (_,__,cb)=>cb(null,dir),
  filename: (_,file,cb)=>cb(null,`${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname).toLowerCase()}`)
});
const allowed = new Set(['image/jpeg','image/png','image/webp']);
export const upload = multer({
  storage,
  limits:{fileSize:Number(process.env.MAX_UPLOAD_MB||8)*1024*1024},
  fileFilter:(_,file,cb)=>allowed.has(file.mimetype)?cb(null,true):cb(new Error('Only JPG, PNG or WEBP images are allowed'))
});
