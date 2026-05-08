const cashBankAccountService = require("./cash-bank-account.service");
const {
  createCashBankAccountSchema,
  updateCashBankAccountSchema,
} = require("./cash-bank-account.validation");

const getAllCashBankAccounts = async (req, res, next) => {
  try {
    const cashBankAccounts =
      await cashBankAccountService.getAllCashBankAccounts();

    return res.status(200).json({
      success: true,
      message: "Cash/bank accounts retrieved successfully",
      data: {
        cashBankAccounts,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getCashBankAccountById = async (req, res, next) => {
  try {
    const cashBankAccount =
      await cashBankAccountService.getCashBankAccountById(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Cash/bank account retrieved successfully",
      data: {
        cashBankAccount,
      },
    });
  } catch (error) {
    next(error);
  }
};

const createCashBankAccount = async (req, res, next) => {
  try {
    const validatedData = createCashBankAccountSchema.parse(req.body);

    const cashBankAccount =
      await cashBankAccountService.createCashBankAccount(validatedData);

    return res.status(201).json({
      success: true,
      message: "Cash/bank account created successfully",
      data: {
        cashBankAccount,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateCashBankAccount = async (req, res, next) => {
  try {
    const validatedData = updateCashBankAccountSchema.parse(req.body);

    const cashBankAccount =
      await cashBankAccountService.updateCashBankAccount(
        req.params.id,
        validatedData
      );

    return res.status(200).json({
      success: true,
      message: "Cash/bank account updated successfully",
      data: {
        cashBankAccount,
      },
    });
  } catch (error) {
    next(error);
  }
};

const deactivateCashBankAccount = async (req, res, next) => {
  try {
    const cashBankAccount =
      await cashBankAccountService.deactivateCashBankAccount(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Cash/bank account deactivated successfully",
      data: {
        cashBankAccount,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllCashBankAccounts,
  getCashBankAccountById,
  createCashBankAccount,
  updateCashBankAccount,
  deactivateCashBankAccount,
};