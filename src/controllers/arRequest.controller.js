const r2 = require("../utils/r2");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { sendMail } = require("../utils/mailer");

exports.requestARModel = async (req, res) => {
  try {
    /* =========================
       RESTAURANT FROM AUTH
    ========================= */
    const restaurantId = req.user?._id;
    const restaurantName = req.user?.restaurantName;

    if (!restaurantId || !restaurantName) {
      return res.status(401).json({
        message: "Unauthorized: restaurant not identified",
      });
    }

    /* =========================
       REQUEST DATA
    ========================= */
    const { dishId, dishName } = req.body;
    const files = req.files;

    if (!dishId) {
      return res.status(400).json({
        message: "Dish ID is required",
      });
    }

    if (!dishName || !files || files.length === 0) {
      return res.status(400).json({
        message: "Dish name and image folder are required",
      });
    }

    /* =========================
       SAFE NAMES (FOR PATH)
    ========================= */
    const safeRestaurant = restaurantName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const safeDish = dishName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    /* =========================
       R2 STORAGE PATH
       (restaurant + dishId)
    ========================= */
    const basePath = `ar-images/${safeRestaurant}/${restaurantId}/${dishId}-${safeDish}-${Date.now()}`;

    const uploadedImages = [];

    /* =========================
       UPLOAD IMAGES TO R2
    ========================= */
    for (const file of files) {
      const key = `${basePath}/${file.originalname}`;

      await r2.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
      );

      uploadedImages.push({
        dishId,
        dishName,
        imageUrl: `${process.env.R2_PUBLIC_URL_R}/${key}`,
      });
    }

    /* =========================
       EMAIL NOTIFICATION
    ========================= */
    await sendMail({
      subject: `AR Model Request – ${dishName}`,
      text: `
New AR Image Upload

Restaurant: ${restaurantName}
Restaurant ID: ${restaurantId}

Dish Name: ${dishName}
Dish ID: ${dishId}
Total Images: ${uploadedImages.length}

Image Links:
${uploadedImages.map((img) => img.imageUrl).join("\n")}
      `,
    });

    /* =========================
       RESPONSE
    ========================= */
    return res.status(200).json({
      success: true,
      restaurant: {
        id: restaurantId,
        name: restaurantName,
      },
      dish: {
        id: dishId,
        name: dishName,
      },
      images: uploadedImages,
    });
  } catch (error) {
    console.error("AR Upload Error:", error);
    return res.status(500).json({
      message: "Image upload failed",
    });
  }
};
