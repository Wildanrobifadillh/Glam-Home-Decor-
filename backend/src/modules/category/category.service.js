const prisma = require("../../config/prisma");

const getAllCategories = async (query = {}) => {
  const { search, status } = query;

  const where = {};

  if (search) {
    where.name = {
      contains: search,
      mode: "insensitive",
    };
  }

  if (status) {
    where.status = status;
  }

  return prisma.category.findMany({
    where,
    orderBy: {
      name: "asc",
    },
  });
};

const getCategoryById = async (id) => {
  const category = await prisma.category.findUnique({
    where: {
      id,
    },
  });

  if (!category) {
    const error = new Error("Category not found");
    error.status = 404;
    throw error;
  }

  return category;
};

const createCategory = async ({ name }) => {
  const existingCategory = await prisma.category.findUnique({
    where: {
      name,
    },
  });

  if (existingCategory) {
    const error = new Error("Category already exists");
    error.status = 409;
    throw error;
  }

  return prisma.category.create({
    data: {
      name,
    },
  });
};

const updateCategory = async (id, data) => {
  await getCategoryById(id);

  if (data.name) {
    const existingCategory = await prisma.category.findUnique({
      where: {
        name: data.name,
      },
    });

    if (existingCategory && existingCategory.id !== id) {
      const error = new Error("Category already exists");
      error.status = 409;
      throw error;
    }
  }

  return prisma.category.update({
    where: {
      id,
    },
    data,
  });
};

const deactivateCategory = async (id) => {
  await getCategoryById(id);

  return prisma.category.update({
    where: {
      id,
    },
    data: {
      status: "INACTIVE",
    },
  });
};

const activateCategory = async (id) => {
  await getCategoryById(id);

  return prisma.category.update({
    where: {
      id,
    },
    data: {
      status: "ACTIVE",
    },
  });
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deactivateCategory,
  activateCategory,
};