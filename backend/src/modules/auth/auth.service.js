const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const prisma = require("../../config/prisma");

const login = async ({ username, password }) => {
  const user = await prisma.user.findUnique({
    where: {
      username,
    },
  });

  if (!user) {
    const error = new Error("Invalid username or password");
    error.status = 401;
    throw error;
  }

  if (user.status !== "ACTIVE") {
    const error = new Error("User account is inactive");
    error.status = 403;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    const error = new Error("Invalid username or password");
    error.status = 401;
    throw error;
  }

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      status: user.status,
    },
  };
};

module.exports = {
  login,
};