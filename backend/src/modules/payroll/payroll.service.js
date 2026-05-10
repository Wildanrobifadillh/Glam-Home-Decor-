const prisma = require("../../config/prisma");
const { generatePayrollNumber } = require("../../utils/generatePayrollNumber");
const {
  createJournalEntryWithLines,
  getAccountByCode,
  getCashBankAccountForPayment,
} = require("../../utils/accountingJournal");

const getPayrollInclude = () => ({
  employee: {
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
  },
  cashBankAccount: {
    include: {
      account: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
    },
  },
});

const buildPayrollWhere = ({
  employeeId,
  periodMonth,
  periodYear,
  paymentMethod,
  status,
  startDate,
  endDate,
  search,
} = {}) => {
  const where = {};

  if (employeeId) {
    where.employeeId = employeeId;
  }

  if (periodMonth) {
    where.periodMonth = Number(periodMonth);
  }

  if (periodYear) {
    where.periodYear = Number(periodYear);
  }

  if (paymentMethod) {
    where.paymentMethod = paymentMethod;
  }

  if (status) {
    where.status = status;
  }

  if (startDate || endDate) {
    where.paidAt = {};

    if (startDate) {
      where.paidAt.gte = new Date(startDate);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.paidAt.lte = end;
    }
  }

  if (search) {
    where.OR = [
      {
        payrollNumber: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        note: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        employee: {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
      {
        employee: {
          phone: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
      {
        employee: {
          position: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
    ];
  }

  return where;
};

const getAllPayrolls = async (filters = {}) => {
  return prisma.payroll.findMany({
    where: buildPayrollWhere(filters),
    include: getPayrollInclude(),
    orderBy: {
      paidAt: "desc",
    },
  });
};

const getPayrollById = async (id) => {
  const payroll = await prisma.payroll.findUnique({
    where: {
      id,
    },
    include: getPayrollInclude(),
  });

  if (!payroll) {
    const error = new Error("Payroll not found");
    error.status = 404;
    throw error;
  }

  return payroll;
};

const getPayrollSummary = async ({
  periodMonth,
  periodYear,
  startDate,
  endDate,
} = {}) => {
  const payrolls = await prisma.payroll.findMany({
    where: buildPayrollWhere({
      status: "POSTED",
      periodMonth,
      periodYear,
      startDate,
      endDate,
    }),
    include: {
      employee: true,
      cashBankAccount: true,
    },
  });

  const summary = {
    payrollCount: payrolls.length,
    totalBaseSalary: 0,
    totalAllowance: 0,
    totalDeduction: 0,
    totalBonus: 0,
    totalGrossSalary: 0,
    totalNetSalary: 0,
    byEmployee: [],
    byCashBankAccount: [],
    byPaymentMethod: {
      CASH: 0,
      TRANSFER: 0,
    },
  };

  const employeeMap = new Map();
  const cashBankMap = new Map();

  for (const payroll of payrolls) {
    summary.totalBaseSalary += payroll.baseSalary;
    summary.totalAllowance += payroll.allowance;
    summary.totalDeduction += payroll.deduction;
    summary.totalBonus += payroll.bonus;
    summary.totalGrossSalary += payroll.grossSalary;
    summary.totalNetSalary += payroll.netSalary;
    summary.byPaymentMethod[payroll.paymentMethod] += payroll.netSalary;

    if (!employeeMap.has(payroll.employeeId)) {
      employeeMap.set(payroll.employeeId, {
        employeeId: payroll.employeeId,
        employeeName: payroll.employee.name,
        position: payroll.employee.position,
        payrollCount: 0,
        totalNetSalary: 0,
      });
    }

    const employeeSummary = employeeMap.get(payroll.employeeId);
    employeeSummary.payrollCount += 1;
    employeeSummary.totalNetSalary += payroll.netSalary;

    if (!cashBankMap.has(payroll.cashBankAccountId)) {
      cashBankMap.set(payroll.cashBankAccountId, {
        cashBankAccountId: payroll.cashBankAccountId,
        cashBankAccountName: payroll.cashBankAccount.name,
        type: payroll.cashBankAccount.type,
        payrollCount: 0,
        totalNetSalary: 0,
      });
    }

    const cashBankSummary = cashBankMap.get(payroll.cashBankAccountId);
    cashBankSummary.payrollCount += 1;
    cashBankSummary.totalNetSalary += payroll.netSalary;
  }

  summary.byEmployee = Array.from(employeeMap.values()).sort(
    (a, b) => b.totalNetSalary - a.totalNetSalary
  );

  summary.byCashBankAccount = Array.from(cashBankMap.values()).sort(
    (a, b) => b.totalNetSalary - a.totalNetSalary
  );

  return summary;
};

const createPayrollJournal = async ({
  tx,
  payroll,
  salaryExpenseAccount,
  cashBankAccount,
  createdById,
}) => {
  await createJournalEntryWithLines({
    tx,
    description: `Jurnal payroll ${payroll.payrollNumber}`,
    sourceType: "PAYROLL",
    sourceId: payroll.id,
    lines: [
      {
        accountId: salaryExpenseAccount.id,
        debit: payroll.netSalary,
        credit: 0,
        note: `Beban gaji ${payroll.employee?.name || payroll.employeeId}`,
      },
      {
        accountId: cashBankAccount.accountId,
        debit: 0,
        credit: payroll.netSalary,
        note: `Pembayaran payroll ${payroll.payrollNumber}`,
      },
    ],
    createdById,
  });
};

const createPayroll = async ({
  employeeId,
  periodMonth,
  periodYear,
  baseSalary,
  allowance,
  deduction,
  bonus,
  paymentMethod,
  cashBankAccountId,
  paidAt,
  note,
  createdById,
}) => {
  return prisma.$transaction(async (tx) => {
    const employee = await tx.employee.findUnique({
      where: {
        id: employeeId,
      },
    });

    if (!employee) {
      const error = new Error("Employee not found");
      error.status = 404;
      throw error;
    }

    if (employee.status !== "ACTIVE") {
      const error = new Error("Employee is inactive");
      error.status = 400;
      throw error;
    }

    const existingPayroll = await tx.payroll.findFirst({
      where: {
        employeeId,
        periodMonth,
        periodYear,
      },
    });

    if (existingPayroll) {
      const error = new Error("Payroll for this employee and period already exists");
      error.status = 400;
      throw error;
    }

    const salaryExpenseAccount = await getAccountByCode(tx, "6102");

    if (salaryExpenseAccount.type !== "EXPENSE") {
      const error = new Error("Salary expense account must be an expense account");
      error.status = 400;
      throw error;
    }

    const cashBankAccount = await getCashBankAccountForPayment(
      tx,
      cashBankAccountId,
      paymentMethod
    );

    const finalBaseSalary = baseSalary || employee.baseSalary;
    const grossSalary = finalBaseSalary + allowance + bonus;
    const netSalary = grossSalary - deduction;

    if (netSalary <= 0) {
      const error = new Error("Net salary must be greater than 0");
      error.status = 400;
      throw error;
    }

    const payrollNumber = generatePayrollNumber();

    const payroll = await tx.payroll.create({
      data: {
        payrollNumber,
        employeeId,
        periodMonth,
        periodYear,
        baseSalary: finalBaseSalary,
        allowance,
        deduction,
        bonus,
        grossSalary,
        netSalary,
        paymentMethod,
        cashBankAccountId,
        paidAt: paidAt || new Date(),
        note,
        status: "POSTED",
        createdById,
      },
      include: {
        employee: true,
      },
    });

    await createPayrollJournal({
      tx,
      payroll,
      salaryExpenseAccount,
      cashBankAccount,
      createdById,
    });

    return tx.payroll.findUnique({
      where: {
        id: payroll.id,
      },
      include: getPayrollInclude(),
    });
  });
};

module.exports = {
  getAllPayrolls,
  getPayrollById,
  getPayrollSummary,
  createPayroll,
};