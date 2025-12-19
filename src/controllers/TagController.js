const Tag = require("../models/Tag");

exports.createTag = async (req, res) => {
  const { username, name, type } = req.body;

  const tag = await Tag.create({ username, name, type });
  res.status(201).json(tag);
};

exports.getTags = async (req, res) => {
  const { username } = req.params;

  const tags = await Tag.find({ username, isActive: true });
  res.json(tags);
};
