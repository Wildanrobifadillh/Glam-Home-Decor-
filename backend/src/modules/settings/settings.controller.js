const settingsService = require("./settings.service");
const {
  updateStoreProfileSchema,
  createStoreBankAccountSchema,
  updateStoreBankAccountSchema,
  updateStoreBankAccountStatusSchema,
} = require("./settings.validation");

const getStoreProfile = async (req, res, next) => {
  try {
    const storeProfile = await settingsService.getStoreProfile();

    return res.status(200).json({
      success: true,
      message: "Store profile retrieved successfully",
      data: {
        storeProfile,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateStoreProfile = async (req, res, next) => {
  try {
    const validatedData = updateStoreProfileSchema.parse(req.body);

    const storeProfile = await settingsService.updateStoreProfile(validatedData);

    return res.status(200).json({
      success: true,
      message: "Store profile updated successfully",
      data: {
        storeProfile,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getStoreBankAccounts = async (req, res, next) => {
  try {
    const storeBankAccounts = await settingsService.getStoreBankAccounts();

    return res.status(200).json({
      success: true,
      message: "Store bank accounts retrieved successfully",
      data: {
        storeBankAccounts,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getStoreBankAccountById = async (req, res, next) => {
  try {
    const storeBankAccount = await settingsService.getStoreBankAccountById(
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message: "Store bank account retrieved successfully",
      data: {
        storeBankAccount,
      },
    });
  } catch (error) {
    next(error);
  }
};

const createStoreBankAccount = async (req, res, next) => {
  try {
    const validatedData = createStoreBankAccountSchema.parse(req.body);

    const storeBankAccount = await settingsService.createStoreBankAccount(
      validatedData
    );

    return res.status(201).json({
      success: true,
      message: "Store bank account created successfully",
      data: {
        storeBankAccount,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateStoreBankAccount = async (req, res, next) => {
  try {
    const validatedData = updateStoreBankAccountSchema.parse(req.body);

    const storeBankAccount = await settingsService.updateStoreBankAccount(
      req.params.id,
      validatedData
    );

    return res.status(200).json({
      success: true,
      message: "Store bank account updated successfully",
      data: {
        storeBankAccount,
      },
    });
  } catch (error) {
    next(error);
  }
};

const setDefaultStoreBankAccount = async (req, res, next) => {
  try {
    const storeBankAccount = await settingsService.setDefaultStoreBankAccount(
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message: "Store bank account set as default successfully",
      data: {
        storeBankAccount,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateStoreBankAccountStatus = async (req, res, next) => {
  try {
    const validatedData = updateStoreBankAccountStatusSchema.parse(req.body);

    const storeBankAccount =
      await settingsService.updateStoreBankAccountStatus(
        req.params.id,
        validatedData.status
      );

    return res.status(200).json({
      success: true,
      message: "Store bank account status updated successfully",
      data: {
        storeBankAccount,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStoreProfile,
  updateStoreProfile,
  getStoreBankAccounts,
  getStoreBankAccountById,
  createStoreBankAccount,
  updateStoreBankAccount,
  setDefaultStoreBankAccount,
  updateStoreBankAccountStatus,
};