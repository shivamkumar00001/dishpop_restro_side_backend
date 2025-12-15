// controllers/dishController.js

const Dish = require("../models/Dish");
const ApiResponse = require("../utils/apiResponse");
const logger = require("../utils/logger");

const sharp = require("sharp");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const { uploadBuffer, deleteFromR2 } = require("../helpers/storageR2");
const R2_BUCKET = process.env.R2_BUCKET;

/* ==========================================================
   GET SINGLE DISH (PUBLIC)
   GET /restaurants/:username/dishes/:dishId
========================================================== */
exports.getDish = async (req, res, next) => {
  try {
    const { username, dishId } = req.params;

    const dish = await Dish.findOne({ _id: dishId, username });

    if (!dish) {
      return ApiResponse.notFound(res, "Dish not found");
    }

    return ApiResponse.success(res, dish, "Dish retrieved successfully");
  } catch (err) {
    logger.error("Get dish error:", err);
    next(err);
  }
};

/* ==========================================================
   UPDATE DISH (PROTECTED)
   PATCH /restaurants/:username/dishes/:dishId
========================================================== */
exports.updateDish = async (req, res, next) => {
  try {
    const { username, dishId } = req.params;

    const dish = await Dish.findOne({ _id: dishId, username });
    if (!dish) return ApiResponse.notFound(res, "Dish not found");

    const { name, price, description, category, available, isVeg } = req.body;

    // update basic fields
    if (name) dish.name = name;
    if (description) dish.description = description;
    if (category) dish.category = category;
    if (price) dish.price = Number(price);

    if (available !== undefined) dish.available = available === true || available === "true";
    if (isVeg !== undefined) dish.isVeg = isVeg === true || isVeg === "true";

    /* ----------- IMAGE UPDATE -------------- */
    if (req.file) {

      // delete previous images in R2
      try {
        if (dish.imageUrl) {
          const key = dish.imageUrl.split("/").pop();
          await deleteFromR2(R2_BUCKET, key);
        }
        if (dish.thumbnailUrl) {
          const key = dish.thumbnailUrl.split("/").pop();
          await deleteFromR2(R2_BUCKET, key);
        }
      } catch (err) {
        console.log("Old image delete failed:", err.message);
      }

      const ext = path.extname(req.file.originalname) || ".jpg";
      const baseKey = `restaurants/${username}/dishes/${uuidv4()}`;

      // upload main image
      const imageUrl = await uploadBuffer(
        req.file.buffer,
        R2_BUCKET,
        `${baseKey}${ext}`,
        req.file.mimetype
      );

      // generate and upload thumbnail
      const thumb = await sharp(req.file.buffer)
        .resize(800, 800, { fit: "inside" })
        .jpeg({ quality: 80 })
        .toBuffer();

      const thumbnailUrl = await uploadBuffer(
        thumb,
        R2_BUCKET,
        `${baseKey}-thumb.jpg`,
        "image/jpeg"
      );

      dish.imageUrl = imageUrl;
      dish.thumbnailUrl = thumbnailUrl;
    }

    await dish.save();

    return ApiResponse.success(res, dish, "Dish updated successfully");
  } catch (err) {
    logger.error("Update dish error:", err);
    next(err);
  }
};

/* ==========================================================
   DELETE DISH (PROTECTED)
   DELETE /restaurants/:username/dishes/:dishId
========================================================== */
exports.deleteDish = async (req, res, next) => {
  try {
    const { username, dishId } = req.params;

    const dish = await Dish.findOne({ _id: dishId, username });
    if (!dish) return ApiResponse.notFound(res, "Dish not found");

    // Delete images in R2
    try {
      if (dish.imageUrl) {
        const key = dish.imageUrl.split("/").pop();
        await deleteFromR2(R2_BUCKET, key);
      }
      if (dish.thumbnailUrl) {
        const key = dish.thumbnailUrl.split("/").pop();
        await deleteFromR2(R2_BUCKET, key);
      }
    } catch (err) {
      console.log("R2 delete failed:", err.message);
    }

    await dish.deleteOne();

    return ApiResponse.success(res, null, "Dish deleted successfully");
  } catch (err) {
    logger.error("Delete dish error:", err);
    next(err);
  }
};
