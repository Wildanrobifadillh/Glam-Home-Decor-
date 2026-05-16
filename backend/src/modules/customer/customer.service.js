const prisma = require("../../config/prisma");

const getAllCustomers = async (query = {}) => {
  const search = query.search?.trim();
  const status = query.status;
  const type = query.type;

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

  if (type === "GENERAL" || type === "PROJECT" || type === "RESELLER") {
    where.type = type;
  }

  return prisma.customer.findMany({
    where,
    orderBy: {
      name: "asc",
    },
  });
};

const getCustomerById = async (id) => {
  const customer = await prisma.customer.findUnique({
    where: {
      id,
    },
  });

  if (!customer) {
    const error = new Error("Customer not found");
    error.status = 404;
    throw error;
  }

  return customer;
};

const createCustomer = async ({ name, phone, address, type }) => {
  return prisma.customer.create({
    data: {
      name,
      phone,
      address,
      type,
    },
  });
};

const updateCustomer = async (id, data) => {
  await getCustomerById(id);

  return prisma.customer.update({
    where: {
      id,
    },
    data,
  });
};

const deactivateCustomer = async (id) => {
  await getCustomerById(id);

  return prisma.customer.update({
    where: {
      id,
    },
    data: {
      status: "INACTIVE",
    },
  });
};

const activateCustomer = async (id) => {
  await getCustomerById(id);

  return prisma.customer.update({
    where: {
      id,
    },
    data: {
      status: "ACTIVE",
    },
  });
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deactivateCustomer,
  activateCustomer,
};