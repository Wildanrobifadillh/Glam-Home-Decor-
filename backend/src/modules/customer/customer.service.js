const prisma = require("../../config/prisma");

const getAllCustomers = async () => {
  return prisma.customer.findMany({
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

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deactivateCustomer,
};