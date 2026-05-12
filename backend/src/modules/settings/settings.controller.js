const settingsService = require("./settings.service");
const {
  updateStoreProfileSchema,
  createStoreBankAccountSchema,
  updateStoreBankAccountSchema,
  updateStoreBankAccountStatusSchema,
  createSettingsUserSchema,
  updateSettingsUserSchema,
  updateSettingsUserRoleSchema,
  updateSettingsUserStatusSchema,
  resetSettingsUserPasswordSchema,
  updateSettingsEmployeeSchema,
  updateSettingsEmployeeStatusSchema,
  linkSettingsEmployeeUserSchema,
  updateRolePermissionsSchema,
  changePasswordSchema,
  updateOperationalPreferencesSchema,
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

const getSettingsUsers = async (req, res, next) => {
  try {
    const users = await settingsService.getSettingsUsers();

    return res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      data: {
        users,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getSettingsUserById = async (req, res, next) => {
  try {
    const user = await settingsService.getSettingsUserById(req.params.id);

    return res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

const createSettingsUser = async (req, res, next) => {
  try {
    const validatedData = createSettingsUserSchema.parse(req.body);

    const user = await settingsService.createSettingsUser(validatedData);

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateSettingsUser = async (req, res, next) => {
  try {
    const validatedData = updateSettingsUserSchema.parse(req.body);

    const user = await settingsService.updateSettingsUser(
      req.params.id,
      validatedData
    );

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateSettingsUserRole = async (req, res, next) => {
  try {
    const validatedData = updateSettingsUserRoleSchema.parse(req.body);

    const user = await settingsService.updateSettingsUserRole(
      req.params.id,
      validatedData.role,
      req.user.id
    );

    return res.status(200).json({
      success: true,
      message: "User role updated successfully",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateSettingsUserStatus = async (req, res, next) => {
  try {
    const validatedData = updateSettingsUserStatusSchema.parse(req.body);

    const user = await settingsService.updateSettingsUserStatus(
      req.params.id,
      validatedData.status,
      req.user.id
    );

    return res.status(200).json({
      success: true,
      message: "User status updated successfully",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

const resetSettingsUserPassword = async (req, res, next) => {
  try {
    const validatedData = resetSettingsUserPasswordSchema.parse(req.body);

    const user = await settingsService.resetSettingsUserPassword(
      req.params.id,
      validatedData.password
    );

    return res.status(200).json({
      success: true,
      message: "User password reset successfully",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getSettingsEmployees = async (req, res, next) => {
  try {
    const employees = await settingsService.getSettingsEmployees();

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

const getSettingsEmployeeById = async (req, res, next) => {
  try {
    const employee = await settingsService.getSettingsEmployeeById(
      req.params.id
    );

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

const updateSettingsEmployee = async (req, res, next) => {
  try {
    const validatedData = updateSettingsEmployeeSchema.parse(req.body);

    const employee = await settingsService.updateSettingsEmployee(
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

const updateSettingsEmployeeStatus = async (req, res, next) => {
  try {
    const validatedData = updateSettingsEmployeeStatusSchema.parse(req.body);

    const employee = await settingsService.updateSettingsEmployeeStatus(
      req.params.id,
      validatedData.status
    );

    return res.status(200).json({
      success: true,
      message: "Employee status updated successfully",
      data: {
        employee,
      },
    });
  } catch (error) {
    next(error);
  }
};

const linkSettingsEmployeeUser = async (req, res, next) => {
  try {
    const validatedData = linkSettingsEmployeeUserSchema.parse(req.body);

    const employee = await settingsService.linkSettingsEmployeeUser(
      req.params.id,
      validatedData.userId
    );

    return res.status(200).json({
      success: true,
      message: "Employee linked to user successfully",
      data: {
        employee,
      },
    });
  } catch (error) {
    next(error);
  }
};

const unlinkSettingsEmployeeUser = async (req, res, next) => {
  try {
    const employee = await settingsService.unlinkSettingsEmployeeUser(
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message: "Employee unlinked from user successfully",
      data: {
        employee,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getSettingsModules = async (req, res, next) => {
  try {
    const modules = await settingsService.getSettingsModules();

    return res.status(200).json({
      success: true,
      message: "Settings modules retrieved successfully",
      data: {
        modules,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getAllRolePermissions = async (req, res, next) => {
  try {
    const rolePermissions = await settingsService.getAllRolePermissions();

    return res.status(200).json({
      success: true,
      message: "Role permissions retrieved successfully",
      data: rolePermissions,
    });
  } catch (error) {
    next(error);
  }
};

const getRolePermissionsByRole = async (req, res, next) => {
  try {
    const rolePermissions = await settingsService.getRolePermissionsByRole(
      req.params.role
    );

    return res.status(200).json({
      success: true,
      message: "Role permission retrieved successfully",
      data: {
        rolePermissions,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateRolePermissions = async (req, res, next) => {
  try {
    const validatedData = updateRolePermissionsSchema.parse(req.body);

    const rolePermissions = await settingsService.updateRolePermissions(
      req.params.role,
      validatedData.moduleKeys
    );

    return res.status(200).json({
      success: true,
      message: "Role permissions updated successfully",
      data: {
        rolePermissions,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getMyPermissions = async (req, res, next) => {
  try {
    const myPermissions = await settingsService.getMyPermissions(req.user.role);

    return res.status(200).json({
      success: true,
      message: "My permissions retrieved successfully",
      data: {
        myPermissions,
      },
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const validatedData = changePasswordSchema.parse(req.body);

    const user = await settingsService.changePassword({
      userId: req.user.id,
      oldPassword: validatedData.oldPassword,
      newPassword: validatedData.newPassword,
    });

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getOperationalPreferences = async (req, res, next) => {
  try {
    const operationalPreferences =
      await settingsService.getOperationalPreferences();

    return res.status(200).json({
      success: true,
      message: "Operational preferences retrieved successfully",
      data: {
        operationalPreferences,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateOperationalPreferences = async (req, res, next) => {
  try {
    const validatedData = updateOperationalPreferencesSchema.parse(req.body);

    const operationalPreferences =
      await settingsService.updateOperationalPreferences(validatedData);

    return res.status(200).json({
      success: true,
      message: "Operational preferences updated successfully",
      data: {
        operationalPreferences,
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
  getSettingsUsers,
  getSettingsUserById,
  createSettingsUser,
  updateSettingsUser,
  updateSettingsUserRole,
  updateSettingsUserStatus,
  resetSettingsUserPassword,
  getSettingsEmployees,
  getSettingsEmployeeById,
  updateSettingsEmployee,
  updateSettingsEmployeeStatus,
  linkSettingsEmployeeUser,
  unlinkSettingsEmployeeUser,
  getSettingsModules,
  getAllRolePermissions,
  getRolePermissionsByRole,
  updateRolePermissions,
  getMyPermissions,
  changePassword,
  getOperationalPreferences,
  updateOperationalPreferences,
};