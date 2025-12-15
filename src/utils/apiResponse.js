exports.success = function (res, data, message = "Success") {
  return res.status(200).json({
    success: true,
    message,
    data
  });
};

exports.created = function (res, data, message = "Created") {
  return res.status(201).json({
    success: true,
    message,
    data
  });
};

exports.badRequest = function (res, message = "Bad request") {
  return res.status(400).json({
    success: false,
    message
  });
};

exports.notFound = function (res, message = "Not found") {
  return res.status(404).json({
    success: false,
    message
  });
};
