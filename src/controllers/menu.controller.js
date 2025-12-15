// controllers/menu.controller.js

const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const Dish = require("../models/Dish");
const ApiResponse = require("../utils/apiResponse");
const logger = require("../utils/logger");

// Cloudflare R2 utils
const { uploadBuffer, deleteFromR2 } = require("../helpers/storageR2");
const R2_BUCKET = process.env.R2_BUCKET;


/* ==========================================================
   GET MENU FOR A RESTAURANT (BY USERNAME)
   GET /restaurants/:username/menu
========================================================== */
exports.getMenu = async (req, res, next) => {
  try {
    const { username } = req.params;

    const {
      category,
      minPrice,
      maxPrice,
      available,
      search,
      sort = "nameAsc",
      page = 1,
      limit = 50,
    } = req.query;

    const query = { username };

    if (category) query.category = category;
    if (available !== undefined) query.available = available === "true";

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const sortObj = {};
    if (sort === "nameAsc") sortObj.name = 1;
    if (sort === "nameDesc") sortObj.name = -1;
    if (sort === "priceAsc") sortObj.price = 1;
    if (sort === "priceDesc") sortObj.price = -1;

    const skip = (page - 1) * limit;

    const dishes = await Dish.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit));

    const total = await Dish.countDocuments(query);

    return ApiResponse.success(
      res,
      {
        total,
        dishes,
        page: Number(page),
        limit: Number(limit),
      },
      "Menu retrieved successfully"
    );

  } catch (err) {
    logger.error("Get menu error:", err);
    next(err);
  }
};



/* ==========================================================
   CREATE DISH (username from req.user)
   POST /restaurants/:username/menu
========================================================== */
exports.createDish = async (req, res, next) => {
  try {
    const username = req.params.username;   // FIXED: read from URL, not JWT

    if (!username)
      return ApiResponse.badRequest(res, "Restaurant username missing");

    const { name, price, category, description } = req.body;

    if (!name || !price) {
      return ApiResponse.badRequest(res, "Name and price are required");
    }

    let imageUrl = null;
    let thumbnailUrl = null;

    if (req.file) {
      const ext = path.extname(req.file.originalname) || ".jpg";
      const baseKey = `restaurants/${username}/dishes/${uuidv4()}`;

      // upload main image
      imageUrl = await uploadBuffer(
        req.file.buffer,
        R2_BUCKET,
        `${baseKey}${ext}`,
        req.file.mimetype
      );

      // generate thumbnail
      const resized = await sharp(req.file.buffer)
        .resize(800, 800, { fit: "inside" })
        .jpeg({ quality: 80 })
        .toBuffer();

      thumbnailUrl = await uploadBuffer(
        resized,
        R2_BUCKET,
        `${baseKey}-thumb.jpg`,
        "image/jpeg"
      );
    }

    const dish = await Dish.create({
      username,   // store the restaurant username
      name,
      description,
      category,
      price: parseFloat(price),
      imageUrl,
      thumbnailUrl,
    });

    return ApiResponse.created(res, dish, "Dish created successfully");

  } catch (err) {
    logger.error("Create dish error:", err);
    next(err);
  }
};



/* ==========================================================
   DELETE DISH (BY USERNAME)
   DELETE /restaurants/:username/menu/:id
========================================================== */
exports.deleteDish = async (req, res, next) => {
  try {
    const { username, id } = req.params;

    const dish = await Dish.findOne({ _id: id, username });
    if (!dish) return ApiResponse.notFound(res, "Dish not found");

    // DELETE MAIN IMAGE
    if (dish.imageUrl) {
      try {
        const key = dish.imageUrl.split("/").pop();
        await deleteFromR2(R2_BUCKET, key);
      } catch (err) {
        console.log("Main image delete failed:", err.message);
      }
    }

    // DELETE THUMBNAIL
    if (dish.thumbnailUrl) {
      try {
        const key = dish.thumbnailUrl.split("/").pop();
        await deleteFromR2(R2_BUCKET, key);
      } catch (err) {
        console.log("Thumbnail delete failed:", err.message);
      }
    }

    await dish.deleteOne();

    return ApiResponse.success(res, null, "Dish deleted successfully");

  } catch (err) {
    logger.error("Delete dish error:", err);
    next(err);
  }
};
