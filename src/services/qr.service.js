import QRCode from "qrcode";

// Generate QR as DataURL (base64 PNG)
const generateQR = async (text) => {
  try {
    const qrImage = await QRCode.toDataURL(text, {
      color: {
        dark: "#FFFFFF",   // QR dots (white)
        light: "#00000000" // background (transparent)
      },
      width: 600
    });

    return qrImage;
  } catch (err) {
    console.error("QR Generation Error:", err);
    throw err;
  }
};

export default {
  generateQR,
};
