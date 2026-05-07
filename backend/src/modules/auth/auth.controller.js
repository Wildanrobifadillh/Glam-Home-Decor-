const authService = require("./auth.service");
const { loginSchema } = require("./auth.validation");

const login = async (req, res, next) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const result = await authService.login(validatedData);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "User profile retrieved successfully",
    data: {
      user: req.user,
    },
  });
};


module.exports = {
  login,
  getMe,
};