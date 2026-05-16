const prisma = require("../../config/prisma");

const getAllEmployees = async (query = {}) => {
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
      {
        position: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        user: {
          is: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      },
      {
        user: {
          is: {
            username: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      },
    ];
  }

  if (status === "ACTIVE" || status === "INACTIVE") {
    where.status = status;
  }

  return prisma.employee.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          status: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

const getEmployeeById = async (id) => {
  const employee = await prisma.employee.findUnique({
    where: {
      id,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          status: true,
        },
      },
    },
  });

  if (!employee) {
    const error = new Error("Employee not found");
    error.status = 404;
    throw error;
  }

  return employee;
};

const validateUserId = async (userId, employeeId = null) => {
  if (!userId) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  const existingEmployee = await prisma.employee.findUnique({
    where: {
      userId,
    },
  });

  if (existingEmployee && existingEmployee.id !== employeeId) {
    const error = new Error("User is already linked to another employee");
    error.status = 400;
    throw error;
  }
};

const createEmployee = async ({
  userId,
  name,
  phone,
  address,
  position,
  baseSalary,
  joinedAt,
}) => {
  await validateUserId(userId);

  return prisma.employee.create({
    data: {
      userId,
      name,
      phone,
      address,
      position,
      baseSalary,
      joinedAt,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          status: true,
        },
      },
    },
  });
};

const updateEmployee = async (
  id,
  { userId, name, phone, address, position, baseSalary, joinedAt, status }
) => {
  const employee = await prisma.employee.findUnique({
    where: {
      id,
    },
  });

  if (!employee) {
    const error = new Error("Employee not found");
    error.status = 404;
    throw error;
  }

  await validateUserId(userId, id);

  return prisma.employee.update({
    where: {
      id,
    },
    data: {
      userId,
      name,
      phone,
      address,
      position,
      baseSalary,
      joinedAt,
      status,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          status: true,
        },
      },
    },
  });
};

const deactivateEmployee = async (id) => {
  const employee = await prisma.employee.findUnique({
    where: {
      id,
    },
  });

  if (!employee) {
    const error = new Error("Employee not found");
    error.status = 404;
    throw error;
  }

  return prisma.employee.update({
    where: {
      id,
    },
    data: {
      status: "INACTIVE",
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          status: true,
        },
      },
    },
  });
};

const activateEmployee = async (id) => {
  const employee = await prisma.employee.findUnique({
    where: {
      id,
    },
  });

  if (!employee) {
    const error = new Error("Employee not found");
    error.status = 404;
    throw error;
  }

  return prisma.employee.update({
    where: {
      id,
    },
    data: {
      status: "ACTIVE",
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          status: true,
        },
      },
    },
  });
};

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deactivateEmployee,
  activateEmployee,
};