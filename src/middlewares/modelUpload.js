const multer = require("multer");
const path = require("path");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = [".jpg", ".jpeg", ".png", ".webp"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error("Only image files are allowed"), false);
};

module.exports = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 10MB per image
  fileFilter,
});
