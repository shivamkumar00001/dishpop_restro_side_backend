const express = require("express");
const upload = require("../middlewares/modelUpload");
const isAuthenticated = require("../middlewares/isAuthenticated");
const { requestARModel } = require("../controllers/arRequest.controller");

const router = express.Router();

router.post(
  "/request-model",
  isAuthenticated,
  upload.array("files", 50),
  requestARModel
);

module.exports = router;
