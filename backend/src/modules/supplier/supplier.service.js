const prisma = require("../../config/prisma");

const getAllSuppliers = async (query = {}) => {
  const search = query.search?.trim();
  const status = query.status;

  const where = {};

  if (search) {
    where.OR = [
      {
        name: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        phone: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        address: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  if (status === "ACTIVE" || status === "INACTIVE") {
    where.status = status;
  }

  return prisma.supplier.findMany({
    where,
    orderBy: {
      name: "asc",
    },
  });
};

const getSupplierById = async (id) => {
  const supplier = await prisma.supplier.findUnique({
    where: {
      id,
    },
  });

  if (!supplier) {
    const error = new Error("Supplier not found");
    error.status = 404;
    throw error;
  }

  return supplier;
};

const createSupplier = async ({ name, phone, address }) => {
  const existingSupplier = await prisma.supplier.findUnique({
    where: {
      name,
    },
  });

  if (existingSupplier) {
    const error = new Error("Supplier already exists");
    error.status = 409;
    throw error;
  }

  return prisma.supplier.create({
    data: {
      name,
      phone,
      address,
    },
  });
};

const updateSupplier = async (id, data) => {
  await getSupplierById(id);

  if (data.name) {
    const existingSupplier = await prisma.supplier.findUnique({
      where: {
        name: data.name,
      },
    });

    if (existingSupplier && existingSupplier.id !== id) {
      const error = new Error("Supplier already exists");
      error.status = 409;
      throw error;
    }
  }

  return prisma.supplier.update({
    where: {
      id,
    },
    data,
  });
};

const deactivateSupplier = async (id) => {
  await getSupplierById(id);

  return prisma.supplier.update({
    where: {
      id,
    },
    data: {
      status: "INACTIVE",
    },
  });
};

const activateSupplier = async (id) => {
  await getSupplierById(id);

  return prisma.supplier.update({
    where: {
      id,
    },
    data: {
      status: "ACTIVE",
    },
  });
};

module.exports = {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deactivateSupplier,
  activateSupplier
};