const expenseService = require("./expense.service");
const {
  createExpenseSchema,
  cancelExpenseSchema,
} = require("./expense.validation");

const getAllExpenses = async (req, res, next) => {
  try {
    const expenses = await expenseService.getAllExpenses({
      accountId: req.query.accountId,
      cashBankAccountId: req.query.cashBankAccountId,
      paymentMethod: req.query.paymentMethod,
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      search: req.query.search,
    });

    return res.status(200).json({
      success: true,
      message: "Expenses retrieved successfully",
      data: {
        expenses,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getExpenseSummary = async (req, res, next) => {
  try {
    const summary = await expenseService.getExpenseSummary({
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });

    return res.status(200).json({
      success: true,
      message: "Expense summary retrieved successfully",
      data: {
        summary,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getExpenseById = async (req, res, next) => {
  try {
    const expense = await expenseService.getExpenseById(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Expense retrieved successfully",
      data: {
        expense,
      },
    });
  } catch (error) {
    next(error);
  }
};

const createExpense = async (req, res, next) => {
  try {
    const validatedData = createExpenseSchema.parse(req.body);

    const expense = await expenseService.createExpense({
      ...validatedData,
      createdById: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Expense created successfully",
      data: {
        expense,
      },
    });
  } catch (error) {
    next(error);
  }
};

const cancelExpense = async (req, res, next) => {
  try {
    const validatedData = cancelExpenseSchema.parse(req.body);

    const result = await expenseService.cancelExpense({
      expenseId: req.params.id,
      reason: validatedData.reason,
      cancelledById: req.user.id,
    });

    return res.status(200).json({
      success: true,
      message: "Expense cancelled successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllExpenses,
  getExpenseSummary,
  getExpenseById,
  createExpense,
  cancelExpense,
};
