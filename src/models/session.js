const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const SessionSchema = new Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      index: true,
    },
    tableNumber: {
      type: Number,
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "BILLED", "EXPIRED"],
      default: "ACTIVE",
      index: true,
    },
    orders: [
      {
        type: Schema.Types.ObjectId,
        ref: "Customer",
      },
    ],
    billId: {
      type: Schema.Types.ObjectId,
      ref: "Bill",
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: Date,
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

SessionSchema.index({ username: 1, tableNumber: 1, status: 1 });
SessionSchema.index({ username: 1, phoneNumber: 1, status: 1 });
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

SessionSchema.statics.generateSessionId = function () {
  return `SES-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

SessionSchema.statics.findOrCreate = async function (
  username,
  tableNumber,
  customerName,
  phoneNumber
) {
  let session = await this.findOne({
    username,
    tableNumber,
    phoneNumber,
    status: "ACTIVE",
  });

  if (session) {
    return { session, isNew: false };
  }

  const sessionId = this.generateSessionId();
  session = await this.create({
    sessionId,
    username,
    tableNumber,
    customerName,
    phoneNumber,
    status: "ACTIVE",
  });

  return { session, isNew: true };
};

SessionSchema.statics.getActiveSessions = async function (username) {
  return this.find({
    username,
    status: "ACTIVE",
  })
    .populate("orders")
    .sort({ startedAt: -1 });
};

SessionSchema.methods.markAsBilled = async function (billId) {
  this.status = "BILLED";
  this.billId = billId;
  this.endedAt = new Date();
  await this.save();
};

SessionSchema.methods.expire = async function () {
  this.status = "EXPIRED";
  this.endedAt = new Date();
  await this.save();
};

module.exports = mongoose.model("Session", SessionSchema);
