const customerService = require("./customer.service");
const {
  createCustomerSchema,
  updateCustomerSchema,
} = require("./customer.validation");

const getAllCustomers = async (req, res, next) => {
  try {
    const customers = await customerService.getAllCustomers(req.query);

    return res.status(200).json({
      success: true,
      message: "Customers retrieved successfully",
      data: {
        customers,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getCustomerById = async (req, res, next) => {
  try {
    const customer = await customerService.getCustomerById(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Customer retrieved successfully",
      data: {
        customer,
      },
    });
  } catch (error) {
    next(error);
  }
};

const createCustomer = async (req, res, next) => {
  try {
    const validatedData = createCustomerSchema.parse(req.body);

    const customer = await customerService.createCustomer(validatedData);

    return res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: {
        customer,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateCustomer = async (req, res, next) => {
  try {
    const validatedData = updateCustomerSchema.parse(req.body);

    const customer = await customerService.updateCustomer(
      req.params.id,
      validatedData
    );

    return res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      data: {
        customer,
      },
    });
  } catch (error) {
    next(error);
  }
};

const deactivateCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.deactivateCustomer(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Customer deactivated successfully",
      data: {
        customer,
      },
    });
  } catch (error) {
    next(error);
  }
};

const activateCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.activateCustomer(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Customer activated successfully",
      data: {
        customer,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deactivateCustomer,
  activateCustomer,
};