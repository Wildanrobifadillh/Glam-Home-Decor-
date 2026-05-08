const accountService = require("./account.service");
const {
  createAccountSchema,
  updateAccountSchema,
} = require("./account.validation");

const getAllAccounts = async (req, res, next) => {
  try {
    const accounts = await accountService.getAllAccounts();

    return res.status(200).json({
      success: true,
      message: "Accounts retrieved successfully",
      data: {
        accounts,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getAccountById = async (req, res, next) => {
  try {
    const account = await accountService.getAccountById(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Account retrieved successfully",
      data: {
        account,
      },
    });
  } catch (error) {
    next(error);
  }
};

const createAccount = async (req, res, next) => {
  try {
    const validatedData = createAccountSchema.parse(req.body);

    const account = await accountService.createAccount(validatedData);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: {
        account,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateAccount = async (req, res, next) => {
  try {
    const validatedData = updateAccountSchema.parse(req.body);

    const account = await accountService.updateAccount(
      req.params.id,
      validatedData
    );

    return res.status(200).json({
      success: true,
      message: "Account updated successfully",
      data: {
        account,
      },
    });
  } catch (error) {
    next(error);
  }
};

const deactivateAccount = async (req, res, next) => {
  try {
    const account = await accountService.deactivateAccount(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Account deactivated successfully",
      data: {
        account,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deactivateAccount,
};