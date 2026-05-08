const employeeService = require("./employee.service");
const {
  createEmployeeSchema,
  updateEmployeeSchema,
} = require("./employee.validation");

const getAllEmployees = async (req, res, next) => {
  try {
    const employees = await employeeService.getAllEmployees();

    return res.status(200).json({
      success: true,
      message: "Employees retrieved successfully",
      data: {
        employees,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getEmployeeById = async (req, res, next) => {
  try {
    const employee = await employeeService.getEmployeeById(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Employee retrieved successfully",
      data: {
        employee,
      },
    });
  } catch (error) {
    next(error);
  }
};

const createEmployee = async (req, res, next) => {
  try {
    const validatedData = createEmployeeSchema.parse(req.body);

    const employee = await employeeService.createEmployee(validatedData);

    return res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: {
        employee,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateEmployee = async (req, res, next) => {
  try {
    const validatedData = updateEmployeeSchema.parse(req.body);

    const employee = await employeeService.updateEmployee(
      req.params.id,
      validatedData
    );

    return res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      data: {
        employee,
      },
    });
  } catch (error) {
    next(error);
  }
};

const deactivateEmployee = async (req, res, next) => {
  try {
    const employee = await employeeService.deactivateEmployee(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Employee deactivated successfully",
      data: {
        employee,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deactivateEmployee,
};