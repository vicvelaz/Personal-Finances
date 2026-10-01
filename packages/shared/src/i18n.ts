export const SUPPORTED_LANGUAGES = ["en", "es"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

const en = {
  accounts: {
    account: "Account",
    accountNotFound: "Account not found",
    accountOtherAccountsSkipped: "Account (other accounts are skipped)",
    accounts: "Accounts",
    activeAccounts: "No active accounts",
    alreadyAccount: "Already have an account?",
    cash: "Cash",
    checkingAccount: "Checking account",
    createAccount: "Create account",
    createAccountPrompt: "Create an account",
    createFirstAccount: "Create your first account",
    creditCard: "Credit card",
    currencyDiffersAccountCurrency:
      "Currency differs from the account ({currency})",
    deleteAccountActionUndone:
      "Delete this account? This action cannot be undone.",
    destinationAccount: "Destination account",
    destinationAccountMustDifferent:
      "The destination account must be different",
    donTAnyAccountsYet: "You don't have any accounts yet.",
    donTAnyAccountsYetCreateFirstAccount:
      "You don't have any accounts yet. Create your first account.",
    editAccount: "Edit account",
    invalidAccount: "Invalid account",
    invalidAccountType: "Invalid account type",
    investment: "Investment",
    linkedAccount: "Linked account",
    linkedAccountOptional: "Linked account (optional)",
    loan: "Loan",
    needLeastOneActiveAccount: "You need at least one active account.",
    negativeAmountDebtsCreditCardsLoans:
      "Use a negative amount for debts (credit cards, loans).",
    netSavings: "Net savings",
    newAccount: "New account",
    notLoadAccount: "Could not load the account",
    notLoadAccounts: "Could not load accounts",
    notSaveAccountTryAgain: "Could not save the account. Try again",
    savings: "Savings",
    selectAccount: "Select an account",
    selectDestinationAccount: "Select the destination account",
    sourceAccount: "Source account",
  },
  auth: {
    accountExistsEmailReceivePasswordResetCode:
      "If an account exists for that email, you will receive a password reset code",
    accountExistsEmailReceivePasswordResetLink:
      "If an account exists for that email, you will receive a password reset link",
    alreadyAccountSign: "Already have an account? Sign in",
    backSign: "Back to sign in",
    changePassword: "Change password",
    checkEmailConfirmAccount: "Check your email to confirm your account",
    confirmEmail: "Confirm your email",
    confirmEmailSigning: "Confirm your email before signing in",
    continueGoogle: "Continue with Google",
    currentPassword: "Current password",
    email: "Email",
    enterPassword: "Enter your password",
    enterValidEmailAddress: "Enter a valid email address",
    forgotPassword: "Forgot your password?",
    goSign: "Go to sign in",
    incorrectEmailPassword: "Incorrect email or password",
    incorrectPassword: "Incorrect password",
    newPassword: "New password",
    notSignGoogle: "Could not sign in with Google",
    password: "Password",
    passwordMustContainLeastOneLetter:
      "Password must contain at least one letter",
    passwordMustContainLeastOneNumber:
      "Password must contain at least one number",
    passwordMustLeast8Characters: "Password must be at least 8 characters",
    passwordMustThan72Characters: "Password must be no more than 72 characters",
    passwordsNotMatch: "Passwords do not match",
    recoverPassword: "Recover password",
    repeatPassword: "Repeat password",
    requestNewLinkSignAgain: "Request a new link or sign in again.",
    savePassword: "Save password",
    sent6DigitCodeEmail: "We sent a 6-digit code to your email",
    sessionExpiredSignAgain: "Your session has expired. Sign in again",
    sign: "Sign in",
    signInButton: "Sign in",
    signInTitle: "Sign in",
    signUpButton: "Sign up",
  },
  budgets: {
    addBudget: "Add budget",
    budgetExceeded: "budget exceeded",
    budgetName: "Budget: {name}",
    budgetRisk: "budget at risk",
    budgets: "Budgets",
    chooseExpenseCategory: "Choose an expense category",
    deleteBudget: "Delete budget",
    deleteCategoryTransactionsBecomeUncategorizedBudgetsDeleted:
      "Delete this category? Its transactions will become uncategorized and its budgets will be deleted.",
    newBudget: "New budget",
    notLoadBudgets: "Could not load budgets",
    notSaveBudgetTryAgain: "Could not save the budget. Try again",
    remaining: "Remaining:",
    risk: "At risk",
    spent: "spent of",
    transactionsBecomeUncategorizedBudgetsDeleted:
      "Its transactions will become uncategorized and its budgets will be deleted.",
  },
  categories: {
    category: "Category",
    categoryNameAlreadyExists: "A category with that name already exists",
    categoryNotFound: "Category not found",
    categoryNotValidTransactionType:
      "Category is not valid for this transaction type",
    categoryPartIndex: "Category for part {index}",
    categoryStatusPercent: "{category}: {status} ({percent}%)",
    categorySubcategoriesDeleteMoveFirst:
      "This category has subcategories. Delete or move them first",
    createCategory: "Create category",
    deleteCategory: "Delete category",
    editCategory: "Edit category",
    emptyState: "No categories.",
    invalidParentCategory: "Invalid parent category",
    newCategory: "New category",
    noCategoriesMessage: "No categories.",
    noneTopLevelCategory: "— None (top-level category) —",
    notLoadCategory: "Could not load the category",
    notSaveCategoryTryAgain: "Could not save the category. Try again",
    parentCategory: "Parent category",
    parentCategoryMustTopLevelCategorySameType:
      "The parent category must be a top-level category of the same type",
    partIndexCategory: "Part {index}: category",
    selectCategory: "Select a category",
    uncategorized: "Uncategorized",
  },
  common: {
    achieved: "Achieved",
    active: "Active",
    allFeminine: "All",
    allMasculine: "All",
    apply: "Apply",
    archive: "Archive",
    archived: "Archived",
    archivedStatus: "Archived",
    back: "Back",
    cancel: "Cancel",
    categories: "Categories",
    clear: "Clear",
    completed: "Completed",
    confirm: "Confirm",
    daily: "Daily",
    delete: "Delete",
    deletePermanently: "Delete permanently",
    disable: "Disable",
    enable: "Enable",
    englishUnitedKingdom: "English (United Kingdom)",
    englishUnitedStates: "English (United States)",
    everyTwoWeeks: "Every two weeks",
    exceeded: "Exceeded",
    exchangeRate: "No exchange rate for:",
    exchangeRateCurrencies: "No exchange rate for: {currencies}",
    filter: "Filter",
    filters: "Filters",
    home: "Home",
    least8CharactersIncludingOneLetterOneNumber:
      "At least 8 characters, including one letter and one number.",
    load: "Load more",
    managePersonalFinances: "Manage your personal finances",
    moveMoneyUsing: "Move money using",
    next: "Next",
    none: "None",
    of: "of",
    ok: "OK",
    once: "Once",
    page: "Page",
    pagePagePages: "Page {page} of {pages}",
    pagination: "Pagination",
    paused: "Paused",
    post: "Post",
    previous: "Previous",
    progress: "In progress",
    quarterly: "Quarterly",
    remaining: "Remaining",
    remove: "Remove",
    restore: "Restore",
    row: "Row",
    save: "Save",
    saveChanges: "Save changes",
    search: "Search",
    select: "Select",
    selectOption: "— Select —",
    sending: "Sending…",
    sendLink: "Send link",
    showingFirstCount: "Showing the first {count}.",
    signOut: "Sign out",
    skip: "Skip",
    spanishArgentina: "Spanish (Argentina)",
    spanishColombia: "Spanish (Colombia)",
    spanishMexico: "Spanish (Mexico)",
    spanishSpain: "Spanish (Spain)",
    total: "Total",
    unallocated: "Unallocated:",
    unexpectedError: "Something went wrong. Try again.",
    upcoming: "Upcoming",
    verify: "Verify",
    weekly: "Weekly",
    yearly: "Yearly",
    yyyyMmDd: "YYYY-MM-DD",
  },
  csvImport: {
    actualAmount: "Actual amount",
    actualAmountDescription: "Actual amount for {description}",
    amount: "Amount",
    amountContributeWithdraw: "Amount to contribute or withdraw",
    amountName: "Amount for {name}",
    amountNegativeExpense: "Amount (negative = expense) *",
    amountPartIndex: "Amount for part {index}",
    amountReceivedCurrency: "Amount received ({currency})",
    amountsConverted: "Amounts converted to",
    amountsConvertedBasecurrencyExcludingTransfers:
      "Amounts converted to {baseCurrency}, excluding transfers.",
    amountsConvertedCurrencyExcludingTransfers:
      "Amounts converted to {currency}, excluding transfers.",
    columnIndex: "Column {index}",
    columns: "Columns",
    countErrorsTheyNotImported:
      ", {count} with errors (they will not be imported)",
    countValidRowsErrorsErrorsTheyNotImported:
      "{count} valid rows, {errors} with errors (they will not be imported).",
    csvFile: "CSV file",
    dateColumn: "Date *",
    downloadTransactionsCsv: "Download transactions (CSV)",
    enterAmountReceivedDestinationCurrency:
      "Enter the amount received in the destination currency",
    enterValidAmount2DecimalPlaces:
      "Enter a valid amount (up to 2 decimal places)",
    errorsTheyNotImported: "with errors (they will not be imported)",
    estimatedAmount: "Estimated amount",
    estimatedAmountConfirmPosting: "Estimated amount (confirm when posting)",
    estimatedAmountsPostedAutomatically:
      "Estimated amounts cannot be posted automatically",
    exportCsv: "Export CSV",
    fileEmpty: "The file is empty",
    fileLargerThan1Mb: "The file cannot be larger than 1 MB",
    fileLargerThanSizeMb: "The file cannot be larger than {size} MB",
    firstRowHeader: "The first row is a header",
    importCountTransaction: "Import {count} transaction",
    importCountTransactions: "Import {count} transactions",
    importCsv: "Import CSV",
    importing: "before importing.",
    importTransactions: "Import transactions",
    invalidAmount: "Invalid amount",
    maximumRows: "The file cannot contain more than {count} rows",
    notLoadProfile: "Could not load the profile",
    notSaveProfileTryAgain: "Could not save the profile. Try again",
    partIndexAmount: "Part {index}: amount",
    preview: "Preview",
    profile: "Profile",
    profileUpdated: "Profile updated",
    rowBelongsAnotherAccountAccount:
      "This row belongs to another account ({account})",
    transfersImported: "Transfers cannot be imported",
    uploadBankCsvFinExportNegativeAmountsImportedExpensesPositiveAmountsIncome:
      "Upload a bank CSV or a fin export. Negative amounts are imported as expenses and positive amounts as income.",
    uploadBankCsvFinExportNegativeAmountsImportedExpensesPositiveAmountsIncomeTransactionsAlreadyAccountSkipped:
      "Upload a bank CSV or a fin export. Negative amounts are imported as expenses and positive amounts as income; transactions already in the account are skipped.",
    validRows: "valid rows",
  },
  dashboard: {
    alerts: "Alerts",
    amountMonth: "· {amount}/month",
    balanceCurrency: "Balance by currency",
    budgetAlreadyExistsCategoryMonth:
      "A budget already exists for this category this month",
    budgetsMonth: "No budgets for this month.",
    copyLastMonthSBudgets: "Copy last month's budgets",
    currentBalance: "Current balance",
    currentBalanceLabel: "Current balance:",
    incomeExpenseTrend: "Income and expense trend",
    invalidMonth: "Invalid month",
    last6Months: "Last 6 months",
    monthIncomeIncomeExpensesExpense:
      "{month} income {income} expenses {expense}",
    monthly: "Monthly",
    monthlySummary: "Monthly summary",
    netWorth: "Net worth",
    nextMonth: "Next month",
    notLoadOverview: "Could not load overview",
    openingBalance: "Opening balance",
    overview: "Overview",
    previousMonth: "Previous month",
    spendingCategory: "Spending by category",
    spendingMonth: "No spending this month.",
    totalLabel: "Total:",
    transactionsMonth: "No transactions this month.",
  },
  dataRights: {
    accountAllDataPermanentlyDeleted:
      "Your account and all your data will be permanently deleted.",
    accountAllDataPermanentlyDeletedActionUndone:
      "Your account and all your data will be permanently deleted. This action cannot be undone.",
    data: "Your data",
    deleteAccount: "Delete account",
    downloadDataJson: "Download my data (JSON)",
    exportData: "Export my data",
    exportDataWeb: "Export my data (web)",
    exportJson: "Export JSON",
    permanentlyDeleteAccount: "Permanently delete my account",
  },
  fields: {
    action: "Action",
    amount: "Amount",
    amountPlaceholder: "0.00",
    code: "Code",
    color: "Color",
    colorOptional: "Color (optional)",
    date: "Date",
    dateYyyyMmDd: "Date (YYYY-MM-DD)",
    description: "Description",
    descriptionAmountDate: "{description}: {amount} on {date}",
    endDateOptional: "End date (optional)",
    incorrectCode: "Incorrect code",
    incorrectExpiredCode: "Incorrect or expired code",
    name: "Name",
    nextDate: "Next: {date}",
    notes: "Notes",
    sendCode: "Send code",
    startDate: "Start date",
    startDateYyyyMmDd: "Start date (YYYY-MM-DD)",
    target: "Target",
    type: "Type",
    typeBorrarConfirm: "Type BORRAR to confirm",
    typeWordConfirm: "Type {word} to confirm",
    unallocatedAmount: "Unallocated: {amount}",
  },
  goals: {
    accountMustBelongGoalSCurrency:
      "The account must belong to you and use the goal's currency",
    accountMustSameCurrencyGoal:
      "The account must use the same currency as the goal",
    achievedStatus: "Achieved",
    achievedStatusSuffix: "· Achieved",
    activeStatus: "Active",
    activeGoals: "Active goals",
    archivedStatusSuffix: "· Archived",
    chooseAccountMoveMoneyGoalAccountWithdrawing:
      "Choose an account to move money to the goal account (or from it when withdrawing).",
    chooseAccountOtherThanGoalSLinkedAccount:
      "Choose an account other than the goal's linked account",
    contribute: "Contribute",
    contributeWithdraw: "Contribute or withdraw",
    contributions: "Contributions",
    createGoalButton: "Create goal",
    createGoalLink: "Create a goal",
    deleteGoal: "Delete goal",
    donTAnySavingsGoalsYet: "You don't have any savings goals yet.",
    goal: "Goal",
    goalNotFound: "Goal not found",
    goalReached: "Goal reached",
    goals: "Goals",
    goalTransactions: "Goal transactions",
    linkAccountGoalMoveMoney: "Link an account to the goal to move money",
    linkAccountGoalSoContributionsMoveMoneyBetweenAccounts:
      "Link an account to the goal so contributions move money between accounts.",
    monthlySavings: "Save {amount} per month",
    monthlySavingsSuffix: "· Save {amount} per month",
    newGoal: "New goal",
    newSavingsGoal: "New savings goal",
    notLoadGoals: "Could not load goals",
    notSaveGoalTryAgain: "Could not save the goal. Try again",
    savingsGoal: "Savings goal",
    savingsGoals: "Savings goals",
    splitSaved: "Split saved",
    targetDate: "Target date: {date}",
    targetDateOptional: "Target date (optional)",
    targetDateSuffix: "· Target date: {date}",
    withdraw: "Withdraw",
    withdrawals: "Withdrawals",
    withdrawThanAmountSaved: "You cannot withdraw more than the amount saved",
  },
  profile: {
    baseCurrency: "Base currency",
    currency: "Currency",
    currencyOtherCurrenciesSkipped: "Currency (other currencies are skipped)",
    displayName: "Display name",
    invalidTimeZone: "Invalid time zone",
    invalidTimeZoneShort: "Invalid time zone",
    language: "Language",
    languageRegionalFormat: "Language and regional format",
    timeZone: "Time zone",
    totalCurrency: "Total {currency}",
    totalsCurrency: "Totals by currency",
    unsupportedCurrency: "Unsupported currency",
    unsupportedLanguage: "Unsupported language",
  },
  scheduled: {
    automatic: "Automatic",
    automaticSuffix: "· Automatic",
    countScheduledTransactionsDue: "{count} scheduled transactions due",
    deleteScheduledTransaction: "Delete scheduled transaction",
    editScheduledTransaction: "Edit scheduled transaction",
    emptyState: "You have no scheduled transactions.",
    estimatedSuffix: "· Estimated",
    frequency: "Frequency",
    inactiveSection: "Inactive",
    inactiveStatus: "Inactive",
    invalidFrequency: "Invalid frequency",
    message1ScheduledTransactionDue: "1 scheduled transaction due",
    newScheduledButton: "New scheduled transaction",
    newScheduledTitle: "New scheduled transaction",
    notLoadScheduledTransactions: "Could not load scheduled transactions",
    notSaveScheduledTransactionTryAgain:
      "Could not save the scheduled transaction. Try again",
    onlyExpensesIncomeCanScheduled: "Only expenses and income can be scheduled",
    overdue: "Overdue",
    postAutomatically: "Post automatically",
    postAutomaticallyDue: "Post automatically when due",
    reminderDaysBefore: "Remind days ahead (optional, 0–30)",
    saveScheduledTransaction: "Save scheduled transaction",
    scheduled: "Scheduled",
    scheduledTransaction: "Scheduled transaction",
    scheduledTransactionInactive: "This scheduled transaction is inactive",
    scheduledTransactionNotFound: "Scheduled transaction not found",
    scheduledTransactions: "Scheduled transactions",
    upcomingScheduledTransaction: "Upcoming scheduled transaction",
  },
  security: {
    addKeyAuthenticatorAppEnterCodeDisplays:
      "Add this key to your authenticator app and enter the code it displays.",
    enabledAuthenticatorApp: "Enabled with an authenticator app.",
    enter6DigitCodeAuthenticatorApp:
      "Enter the 6-digit code from your authenticator app.",
    openAuthenticatorApp: "Open in authenticator app",
    protectAccountRequiringAuthenticatorCodeSigning:
      "Protect your account by requiring an authenticator code when signing in.",
    qrCodeAuthenticatorApp: "QR code for the authenticator app",
    scanQrCodeAuthenticatorAppEnterKeyManually:
      "Scan the QR code with your authenticator app or enter the key manually.",
    secretKey: "Secret key",
    twoStepVerification: "Two-step verification",
    twoStepVerificationDisabled: "Two-step verification disabled",
    twoStepVerificationEnabled: "Two-step verification enabled",
    verificationCode: "Verification code",
  },
  transactions: {
    accountArchivedUnarchiveAddTransactions:
      "This account is archived. Unarchive it to add transactions",
    accountTransactionsDeletedArchiveInstead:
      "This account has transactions and cannot be deleted. Archive it instead",
    addSplit: "Add split",
    bothTransactionsDeleted: "Both transactions will be deleted.",
    deleteConfirmation: "Delete this transaction?",
    deleteTransaction: "Delete transaction",
    deleteTransfer: "Delete transfer",
    deleteTransferBothTransactionsDeleted:
      "Delete this transfer? Both transactions will be deleted.",
    deletingRuleNotAffectTransactionsAlreadyPosted:
      "Deleting this rule does not affect transactions already posted.",
    donTAnyTransactionsYet: "You don't have any transactions yet.",
    editTransaction: "Edit transaction",
    editTransfer: "Edit transfer",
    emptyState: "No transactions",
    excludingTransfers: ", excluding transfers.",
    expense: "Expense",
    expenses: "Expenses",
    income: "Income",
    incomes: "Income",
    needLeastOneActiveAccountRecordTransactions:
      "You need at least one active account to record transactions.",
    newTransaction: "New transaction",
    notLoadTransactions: "Could not load transactions",
    notSaveTransactionTryAgain: "Could not save the transaction. Try again",
    onlyExpensesBaseCurrencyIncluded:
      "Only expenses in your base currency are included",
    removeLastSplit: "Remove last split",
    removeSplit: "Remove split",
    saveSplit: "Save split",
    saveTransaction: "Save transaction",
    split: "Split (",
    splitAcrossCategories: "Split across categories",
    splitAmountsMustAddTransactionTotal:
      "Split amounts must add up to the transaction total",
    splitCount: "Split ({count})",
    splitRemoved: "Split removed",
    splitTransaction: "Split transaction",
    splitTransactionLeast2Parts: "Split the transaction into at least 2 parts",
    transaction: "No transaction",
    transactionNotFound: "Transaction not found",
    transactions: "Transactions",
    transactionsAlreadyPostedKept: "Transactions already posted will be kept.",
    transactionSingular: "Transaction",
    transactionsMatchFilters: "No transactions match these filters.",
    transfer: "Transfer",
    transferAccountsMustSameCurrency:
      "Transfer accounts must use the same currency",
    transfersSplit: "Transfers cannot be split",
    typeTransfersSkipped: "Type (transfers are skipped)",
  },
  validation: {
    actionUndone: "This action cannot be undone.",
    descriptionMust120CharactersFewer:
      "Description must be 120 characters or fewer",
    descriptionRequired: "Description is required",
    descriptionTooLong: "Description is too long",
    endDateStartDate: "The end date cannot be before the start date",
    enter6DigitCode: "Enter the 6-digit code",
    enterTargetGreaterThan02DecimalPlaces:
      "Enter a target greater than 0 (up to 2 decimal places)",
    invalidDate: "Invalid date",
    invalidExpiredLink: "Invalid or expired link",
    invalidLink: "Invalid link",
    invalidType: "Invalid type",
    nameMust60CharactersFewer: "Name must be 60 characters or fewer",
    nameMust80CharactersFewer: "Name must be 80 characters or fewer",
    nameRequired: "Name is required",
    notesMust500CharactersFewer: "Notes must be 500 characters or fewer",
    notLoadCategories: "Could not load categories",
    notLoadData: "Could not load data",
    notSaveChanges: "Could not save changes.",
    positiveAmount: "Enter an amount greater than 0",
    positiveAmountWithTwoDecimals:
      "Enter an amount greater than 0 (up to 2 decimal places)",
    reminderDaysRange: "Enter a number of days between 0 and 30",
    somethingWentWrongTryAgain: "Something went wrong. Try again",
    unexpectedErrorTryAgain: "Unexpected error. Try again.",
  },
} as const;

type MessageTree<T> = {
  readonly [K in keyof T]: T[K] extends string ? string : MessageTree<T[K]>;
};

const es = {
  accounts: {
    account: "Cuenta",
    accountNotFound: "La cuenta no existe",
    accountOtherAccountsSkipped: "Cuenta (omite otras)",
    accounts: "Cuentas",
    activeAccounts: "No hay cuentas activas",
    alreadyAccount: "¿Ya tienes cuenta?",
    cash: "Efectivo",
    checkingAccount: "Cuenta corriente",
    createAccount: "Crear cuenta",
    createAccountPrompt: "Crea una cuenta",
    createFirstAccount: "Crea tu primera cuenta",
    creditCard: "Tarjeta de crédito",
    currencyDiffersAccountCurrency: "Moneda distinta de la cuenta ({currency})",
    deleteAccountActionUndone:
      "Borrar esta cuenta? Esta acción no se puede deshacer.",
    destinationAccount: "Cuenta destino",
    destinationAccountMustDifferent: "La cuenta destino debe ser distinta",
    donTAnyAccountsYet: "Aún no tienes cuentas.",
    donTAnyAccountsYetCreateFirstAccount:
      "Aún no tienes cuentas. Crea tu primera cuenta.",
    editAccount: "Editar cuenta",
    invalidAccount: "Cuenta no válida",
    invalidAccountType: "Tipo de cuenta no válido",
    investment: "Inversión",
    linkedAccount: "Cuenta asociada",
    linkedAccountOptional: "Cuenta asociada (opcional)",
    loan: "Préstamo",
    needLeastOneActiveAccount: "Necesitas al menos una cuenta activa.",
    negativeAmountDebtsCreditCardsLoans:
      "Usa negativo para deudas (tarjetas, préstamos).",
    netSavings: "Ahorro neto",
    newAccount: "Nueva cuenta",
    notLoadAccount: "No se pudo cargar la cuenta",
    notLoadAccounts: "No se pudieron cargar las cuentas",
    notSaveAccountTryAgain: "No se pudo guardar la cuenta. Inténtalo de nuevo",
    savings: "Ahorro",
    selectAccount: "Selecciona una cuenta",
    selectDestinationAccount: "Selecciona la cuenta destino",
    sourceAccount: "Cuenta origen",
  },
  auth: {
    accountExistsEmailReceivePasswordResetCode:
      "Si existe una cuenta con ese email, recibirás un código para restablecer tu contraseña",
    accountExistsEmailReceivePasswordResetLink:
      "Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña",
    alreadyAccountSign: "¿Ya tienes cuenta? Inicia sesión",
    backSign: "Volver a iniciar sesión",
    changePassword: "Cambiar contraseña",
    checkEmailConfirmAccount: "Revisa tu correo para confirmar tu cuenta",
    confirmEmail: "Confirma tu email",
    confirmEmailSigning: "Debes confirmar tu email antes de iniciar sesión",
    continueGoogle: "Continuar con Google",
    currentPassword: "Contraseña actual",
    email: "Email",
    enterPassword: "Introduce tu contraseña",
    enterValidEmailAddress: "Introduce un email válido",
    forgotPassword: "¿Olvidaste tu contraseña?",
    goSign: "Ir a iniciar sesión",
    incorrectEmailPassword: "Email o contraseña incorrectos",
    incorrectPassword: "Contraseña incorrecta",
    newPassword: "Nueva contraseña",
    notSignGoogle: "No se pudo iniciar sesión con Google",
    password: "Contraseña",
    passwordMustContainLeastOneLetter:
      "La contraseña debe contener al menos una letra",
    passwordMustContainLeastOneNumber:
      "La contraseña debe contener al menos un número",
    passwordMustLeast8Characters:
      "La contraseña debe tener al menos 8 caracteres",
    passwordMustThan72Characters:
      "La contraseña no puede superar 72 caracteres",
    passwordsNotMatch: "Las contraseñas no coinciden",
    recoverPassword: "Recuperar contraseña",
    repeatPassword: "Repite la contraseña",
    requestNewLinkSignAgain:
      "Solicita un nuevo enlace o vuelve a iniciar sesión.",
    savePassword: "Guardar contraseña",
    sent6DigitCodeEmail: "Te hemos enviado un código de 6 dígitos a tu correo",
    sessionExpiredSignAgain: "Tu sesión ha caducado. Vuelve a iniciar sesión",
    sign: "Inicia sesión",
    signInButton: "Entrar",
    signInTitle: "Iniciar sesión",
    signUpButton: "Registrarme",
  },
  budgets: {
    addBudget: "Añadir presupuesto",
    budgetExceeded: "presupuesto superado",
    budgetName: "Presupuesto {name}",
    budgetRisk: "presupuesto en riesgo",
    budgets: "Presupuestos",
    chooseExpenseCategory: "Elige una categoría de gastos",
    deleteBudget: "Borrar presupuesto",
    deleteCategoryTransactionsBecomeUncategorizedBudgetsDeleted:
      "Borrar esta categoría? Sus movimientos quedarán sin categoría y se borrarán sus presupuestos.",
    newBudget: "Nuevo presupuesto",
    notLoadBudgets: "No se pudieron cargar los presupuestos",
    notSaveBudgetTryAgain:
      "No se pudo guardar el presupuesto. Inténtalo de nuevo",
    remaining: "Restante:",
    risk: "En riesgo",
    spent: "gastado de",
    transactionsBecomeUncategorizedBudgetsDeleted:
      "Sus movimientos quedarán sin categoría y se borrarán sus presupuestos.",
  },
  categories: {
    category: "Categoría",
    categoryNameAlreadyExists: "Ya existe una categoría con ese nombre",
    categoryNotFound: "La categoría no existe",
    categoryNotValidTransactionType:
      "La categoría no es válida para este tipo de movimiento",
    categoryPartIndex: "Categoría de la parte {index}",
    categoryStatusPercent: "{category}: {status} ({percent}%)",
    categorySubcategoriesDeleteMoveFirst:
      "La categoría tiene subcategorías. Bórralas o muévelas primero",
    createCategory: "Crear categoría",
    deleteCategory: "Borrar categoría",
    editCategory: "Editar categoría",
    emptyState: "Sin categorías.",
    invalidParentCategory: "Categoría padre no válida",
    newCategory: "Nueva categoría",
    noCategoriesMessage: "No hay categorías.",
    noneTopLevelCategory: "— Ninguna (categoría principal) —",
    notLoadCategory: "No se pudo cargar la categoría",
    notSaveCategoryTryAgain:
      "No se pudo guardar la categoría. Inténtalo de nuevo",
    parentCategory: "Categoría padre",
    parentCategoryMustTopLevelCategorySameType:
      "La categoría padre debe ser una categoría principal del mismo tipo",
    partIndexCategory: "Parte {index}: categoría",
    selectCategory: "Selecciona una categoría",
    uncategorized: "Sin categoría",
  },
  common: {
    achieved: "Conseguidas",
    active: "Activas",
    allFeminine: "Todas",
    allMasculine: "Todos",
    apply: "Aplicar",
    archive: "Archivar",
    archived: "Archivadas",
    archivedStatus: "Archivada",
    back: "Volver",
    cancel: "Cancelar",
    categories: "Categorías",
    clear: "Limpiar",
    completed: "Completada",
    confirm: "Confirmar",
    daily: "Diario",
    delete: "Borrar",
    deletePermanently: "Borrar definitivamente",
    disable: "Desactivar",
    enable: "Activar",
    englishUnitedKingdom: "English (United Kingdom)",
    englishUnitedStates: "English (United States)",
    everyTwoWeeks: "Quincenal",
    exceeded: "Superado",
    exchangeRate: "Sin tipo de cambio para:",
    exchangeRateCurrencies: "Sin tipo de cambio para: {currencies}",
    filter: "Filtrar",
    filters: "Filtros",
    home: "Inicio",
    least8CharactersIncludingOneLetterOneNumber:
      "Mínimo 8 caracteres, con al menos una letra y un número.",
    load: "Cargar más",
    managePersonalFinances: "Gestiona tus finanzas personales",
    moveMoneyUsing: "Mover dinero con",
    next: "Siguiente",
    none: "Ninguna",
    of: "de",
    ok: "Aceptar",
    once: "Una vez",
    page: "Página",
    pagePagePages: "Página {page} de {pages}",
    pagination: "Paginación",
    paused: "Pausada",
    post: "Registrar",
    previous: "Anterior",
    progress: "En curso",
    quarterly: "Trimestral",
    remaining: "Faltan",
    remove: "Quitar",
    restore: "Reactivar",
    row: "Línea",
    save: "Guardar",
    saveChanges: "Guardar cambios",
    search: "Buscar",
    select: "Selecciona",
    selectOption: "— Selecciona —",
    sending: "Enviando…",
    sendLink: "Enviar enlace",
    showingFirstCount: "Se muestran las primeras {count}.",
    signOut: "Cerrar sesión",
    skip: "Omitir",
    spanishArgentina: "Español (Argentina)",
    spanishColombia: "Español (Colombia)",
    spanishMexico: "Español (México)",
    spanishSpain: "Español (España)",
    total: "Total",
    unallocated: "Por asignar:",
    unexpectedError: "Algo salió mal. Inténtalo de nuevo.",
    upcoming: "Próximos",
    verify: "Verificar",
    weekly: "Semanal",
    yearly: "Anual",
    yyyyMmDd: "AAAA-MM-DD",
  },
  csvImport: {
    actualAmount: "Importe real",
    actualAmountDescription: "Importe real de {description}",
    amount: "Importe",
    amountContributeWithdraw: "Importe a aportar o retirar",
    amountName: "Importe de {name}",
    amountNegativeExpense: "Importe (negativo = gasto) *",
    amountPartIndex: "Importe de la parte {index}",
    amountReceivedCurrency: "Importe recibido ({currency})",
    amountsConverted: "Importes convertidos a",
    amountsConvertedBasecurrencyExcludingTransfers:
      "Importes convertidos a {baseCurrency}, sin transferencias.",
    amountsConvertedCurrencyExcludingTransfers:
      "Importes convertidos a {currency}, sin transferencias.",
    columnIndex: "Columna {index}",
    columns: "Columnas",
    countErrorsTheyNotImported: ", {count} con errores (no se importarán)",
    countValidRowsErrorsErrorsTheyNotImported:
      "{count} filas válidas, {errors} con errores (no se importarán).",
    csvFile: "Fichero CSV",
    dateColumn: "Fecha *",
    downloadTransactionsCsv: "Descargar movimientos (CSV)",
    enterAmountReceivedDestinationCurrency:
      "Indica el importe recibido en la moneda destino",
    enterValidAmount2DecimalPlaces:
      "Introduce un importe válido (máximo 2 decimales)",
    errorsTheyNotImported: "con errores (no se importarán)",
    estimatedAmount: "Importe estimado",
    estimatedAmountConfirmPosting:
      "Importe estimado (se confirma al registrar)",
    estimatedAmountsPostedAutomatically:
      "Los importes estimados no se pueden registrar automáticamente",
    exportCsv: "Exportar CSV",
    fileEmpty: "El fichero está vacío",
    fileLargerThan1Mb: "El fichero no puede superar 1 MB",
    fileLargerThanSizeMb: "El fichero no puede superar {size} MB",
    firstRowHeader: "La primera fila es cabecera",
    importCountTransaction: "Importar {count} movimiento",
    importCountTransactions: "Importar {count} movimientos",
    importCsv: "Importar CSV",
    importing: "antes de importar.",
    importTransactions: "Importar movimientos",
    invalidAmount: "Importe no válido",
    maximumRows: "El fichero no puede tener más de {count} filas",
    notLoadProfile: "No se pudo cargar el perfil",
    notSaveProfileTryAgain: "No se pudo guardar el perfil. Inténtalo de nuevo",
    partIndexAmount: "Parte {index}: importe",
    preview: "Vista previa",
    profile: "Perfil",
    profileUpdated: "Perfil actualizado",
    rowBelongsAnotherAccountAccount: "Es de otra cuenta ({account})",
    transfersImported: "Las transferencias no se importan",
    uploadBankCsvFinExportNegativeAmountsImportedExpensesPositiveAmountsIncome:
      "Sube el CSV de tu banco o una exportación de fin. Los importes negativos se importan como gastos y los positivos como ingresos.",
    uploadBankCsvFinExportNegativeAmountsImportedExpensesPositiveAmountsIncomeTransactionsAlreadyAccountSkipped:
      "Sube el CSV de tu banco o una exportación de fin. Los importes negativos se importan como gastos y los positivos como ingresos; se omiten los movimientos que ya existan en la cuenta.",
    validRows: "filas válidas",
  },
  dashboard: {
    alerts: "Avisos",
    amountMonth: "· {amount}/mes",
    balanceCurrency: "Saldo por moneda",
    budgetAlreadyExistsCategoryMonth:
      "Ya hay un presupuesto para esa categoría en este mes",
    budgetsMonth: "No hay presupuestos para este mes.",
    copyLastMonthSBudgets: "Copiar presupuestos del mes anterior",
    currentBalance: "Saldo actual",
    currentBalanceLabel: "Saldo actual:",
    incomeExpenseTrend: "Evolución de ingresos y gastos",
    invalidMonth: "Mes no válido",
    last6Months: "Últimos 6 meses",
    monthIncomeIncomeExpensesExpense:
      "{month} ingresos {income} gastos {expense}",
    monthly: "Mensual",
    monthlySummary: "Resumen del mes",
    netWorth: "Patrimonio",
    nextMonth: "Mes siguiente",
    notLoadOverview: "No se pudo cargar el resumen",
    openingBalance: "Saldo inicial",
    overview: "Resumen",
    previousMonth: "Mes anterior",
    spendingCategory: "Gasto por categoría",
    spendingMonth: "Sin gastos este mes.",
    totalLabel: "Total:",
    transactionsMonth: "No hay movimientos en este mes.",
  },
  dataRights: {
    accountAllDataPermanentlyDeleted:
      "Se borrarán definitivamente tu cuenta y todos tus datos.",
    accountAllDataPermanentlyDeletedActionUndone:
      "Se borrarán definitivamente tu cuenta y todos tus datos. Esta acción no se puede deshacer.",
    data: "Tus datos",
    deleteAccount: "Borrar cuenta",
    downloadDataJson: "Descargar mis datos (JSON)",
    exportData: "Exportar mis datos",
    exportDataWeb: "Exportar mis datos (web)",
    exportJson: "Exportar JSON",
    permanentlyDeleteAccount: "Borrar mi cuenta definitivamente",
  },
  fields: {
    action: "Operación",
    amount: "Importe",
    amountPlaceholder: "0,00",
    code: "Código",
    color: "Color",
    colorOptional: "Color (opcional)",
    date: "Fecha",
    dateYyyyMmDd: "Fecha (AAAA-MM-DD)",
    description: "Descripción",
    descriptionAmountDate: "{description}: {amount} el {date}",
    endDateOptional: "Fecha de fin (opcional)",
    incorrectCode: "Código incorrecto",
    incorrectExpiredCode: "Código incorrecto o caducado",
    name: "Nombre",
    nextDate: "Próximo: {date}",
    notes: "Notas",
    sendCode: "Enviar código",
    startDate: "Fecha de inicio",
    startDateYyyyMmDd: "Fecha de inicio (AAAA-MM-DD)",
    target: "Objetivo",
    type: "Tipo",
    typeBorrarConfirm: "Escribe BORRAR para confirmar",
    typeWordConfirm: "Escribe {word} para confirmar",
    unallocatedAmount: "Por asignar: {amount}",
  },
  goals: {
    accountMustBelongGoalSCurrency:
      "La cuenta debe ser tuya y de la misma moneda que la meta",
    accountMustSameCurrencyGoal:
      "La cuenta debe tener la misma moneda que la meta",
    achievedStatus: "Conseguida",
    achievedStatusSuffix: "· Conseguida",
    activeStatus: "Activas",
    activeGoals: "Metas activas",
    archivedStatusSuffix: "· Archivada",
    chooseAccountMoveMoneyGoalAccountWithdrawing:
      "Elige una cuenta para mover el dinero a la cuenta de la meta (o desde ella al retirar).",
    chooseAccountOtherThanGoalSLinkedAccount:
      "Elige una cuenta distinta de la de la meta",
    contribute: "Aportar",
    contributeWithdraw: "Aportar o retirar",
    contributions: "Aportaciones",
    createGoalButton: "Crear meta",
    createGoalLink: "Crea una meta",
    deleteGoal: "Borrar meta",
    donTAnySavingsGoalsYet: "Aún no tienes metas de ahorro.",
    goal: "Meta",
    goalNotFound: "La meta no existe",
    goalReached: "Objetivo alcanzado",
    goals: "Metas",
    goalTransactions: "Movimientos de la meta",
    linkAccountGoalMoveMoney: "Vincula una cuenta a la meta para mover dinero",
    linkAccountGoalSoContributionsMoveMoneyBetweenAccounts:
      "Vincula una cuenta a la meta para que las aportaciones muevan dinero entre cuentas.",
    monthlySavings: "Ahorra {amount} al mes",
    monthlySavingsSuffix: "· Ahorra {amount} al mes",
    newGoal: "Nueva meta",
    newSavingsGoal: "Nueva meta de ahorro",
    notLoadGoals: "No se pudieron cargar las metas",
    notSaveGoalTryAgain: "No se pudo guardar la meta. Inténtalo de nuevo",
    savingsGoal: "Meta de ahorro",
    savingsGoals: "Metas de ahorro",
    splitSaved: "División guardada",
    targetDate: "Fecha objetivo: {date}",
    targetDateOptional: "Fecha objetivo (opcional)",
    targetDateSuffix: "· Fecha objetivo: {date}",
    withdraw: "Retirar",
    withdrawals: "Retiradas",
    withdrawThanAmountSaved: "No puedes retirar más de lo ahorrado",
  },
  profile: {
    baseCurrency: "Moneda base",
    currency: "Moneda",
    currencyOtherCurrenciesSkipped: "Moneda (omite otras)",
    displayName: "Nombre visible",
    invalidTimeZone: "La zona horaria no es válida",
    invalidTimeZoneShort: "Zona horaria no válida",
    language: "Idioma",
    languageRegionalFormat: "Idioma y formato",
    timeZone: "Zona horaria",
    totalCurrency: "Total {currency}",
    totalsCurrency: "Totales por moneda",
    unsupportedCurrency: "Moneda no soportada",
    unsupportedLanguage: "Idioma no soportado",
  },
  scheduled: {
    automatic: "Automático",
    automaticSuffix: "· Automático",
    countScheduledTransactionsDue: "{count} movimientos programados pendientes",
    deleteScheduledTransaction: "Borrar programado",
    editScheduledTransaction: "Editar programado",
    emptyState: "No tienes movimientos programados.",
    estimatedSuffix: "· Estimado",
    frequency: "Periodicidad",
    inactiveSection: "Inactivos",
    inactiveStatus: "Inactivo",
    invalidFrequency: "Periodicidad no válida",
    message1ScheduledTransactionDue: "1 movimiento programado pendiente",
    newScheduledButton: "Nuevo programado",
    newScheduledTitle: "Nuevo movimiento programado",
    notLoadScheduledTransactions: "No se pudieron cargar los programados",
    notSaveScheduledTransactionTryAgain:
      "No se pudo guardar el movimiento programado. Inténtalo de nuevo",
    onlyExpensesIncomeCanScheduled:
      "Solo se pueden programar gastos e ingresos",
    overdue: "Vencidos",
    postAutomatically: "Registrar automáticamente",
    postAutomaticallyDue: "Registrar automáticamente al vencer",
    reminderDaysBefore: "Recordar días antes (opcional, 0–30)",
    saveScheduledTransaction: "Guardar programado",
    scheduled: "Programados",
    scheduledTransaction: "Programado",
    scheduledTransactionInactive: "El movimiento programado está inactivo",
    scheduledTransactionNotFound: "El movimiento programado no existe",
    scheduledTransactions: "Movimientos programados",
    upcomingScheduledTransaction: "Próximo movimiento programado",
  },
  security: {
    addKeyAuthenticatorAppEnterCodeDisplays:
      "Añade esta clave en tu app de autenticación e introduce el código que muestre.",
    enabledAuthenticatorApp: "Activada con app de autenticación.",
    enter6DigitCodeAuthenticatorApp:
      "Introduce el código de 6 dígitos de tu app de autenticación.",
    openAuthenticatorApp: "Abrir en la app de autenticación",
    protectAccountRequiringAuthenticatorCodeSigning:
      "Protege tu cuenta pidiendo un código de tu app de autenticación al iniciar sesión.",
    qrCodeAuthenticatorApp: "Código QR para la app de autenticación",
    scanQrCodeAuthenticatorAppEnterKeyManually:
      "Escanea el código QR con tu app de autenticación o introduce la clave manualmente.",
    secretKey: "Clave secreta",
    twoStepVerification: "Verificación en dos pasos",
    twoStepVerificationDisabled: "Verificación en dos pasos desactivada",
    twoStepVerificationEnabled: "Verificación en dos pasos activada",
    verificationCode: "Código de verificación",
  },
  transactions: {
    accountArchivedUnarchiveAddTransactions:
      "La cuenta está archivada. Desarchívala para añadir movimientos",
    accountTransactionsDeletedArchiveInstead:
      "La cuenta tiene movimientos y no se puede borrar. Archívala en su lugar",
    addSplit: "Añadir parte",
    bothTransactionsDeleted: "Se borrarán ambos movimientos.",
    deleteConfirmation: "Borrar este movimiento.",
    deleteTransaction: "Borrar movimiento",
    deleteTransfer: "Borrar transferencia",
    deleteTransferBothTransactionsDeleted:
      "Borrar esta transferencia. Se borrarán ambos movimientos.",
    deletingRuleNotAffectTransactionsAlreadyPosted:
      "Borrar no afecta a los movimientos ya registrados.",
    donTAnyTransactionsYet: "Aún no tienes movimientos.",
    editTransaction: "Editar movimiento",
    editTransfer: "Editar transferencia",
    emptyState: "Sin movimientos",
    excludingTransfers: ", sin transferencias.",
    expense: "Gasto",
    expenses: "Gastos",
    income: "Ingreso",
    incomes: "Ingresos",
    needLeastOneActiveAccountRecordTransactions:
      "Necesitas al menos una cuenta activa para registrar movimientos.",
    newTransaction: "Nuevo movimiento",
    notLoadTransactions: "No se pudieron cargar los movimientos",
    notSaveTransactionTryAgain:
      "No se pudo guardar el movimiento. Inténtalo de nuevo",
    onlyExpensesBaseCurrencyIncluded:
      "Solo se tienen en cuenta los gastos en tu moneda base",
    removeLastSplit: "Quitar última parte",
    removeSplit: "Quitar división",
    saveSplit: "Guardar división",
    saveTransaction: "Guardar movimiento",
    split: "Dividido (",
    splitAcrossCategories: "Dividir entre categorías",
    splitAmountsMustAddTransactionTotal:
      "Las partes deben sumar el total del movimiento",
    splitCount: "Dividido ({count})",
    splitRemoved: "División eliminada",
    splitTransaction: "Dividir movimiento",
    splitTransactionLeast2Parts: "Divide el movimiento en al menos 2 partes",
    transaction: "Sin movimiento",
    transactionNotFound: "El movimiento no existe",
    transactions: "Movimientos",
    transactionsAlreadyPostedKept:
      "Los movimientos ya registrados se conservan.",
    transactionSingular: "Movimiento",
    transactionsMatchFilters:
      "No hay movimientos que coincidan con los filtros.",
    transfer: "Transferencia",
    transferAccountsMustSameCurrency:
      "Las cuentas de una transferencia deben tener la misma moneda",
    transfersSplit: "Las transferencias no se pueden dividir",
    typeTransfersSkipped: "Tipo (omite transferencias)",
  },
  validation: {
    actionUndone: "Esta acción no se puede deshacer.",
    descriptionMust120CharactersFewer:
      "La descripción no puede superar 120 caracteres",
    descriptionRequired: "La descripción es obligatoria",
    descriptionTooLong: "Descripción demasiado larga",
    endDateStartDate: "La fecha de fin no puede ser anterior a la de inicio",
    enter6DigitCode: "Introduce el código de 6 dígitos",
    enterTargetGreaterThan02DecimalPlaces:
      "Introduce un objetivo mayor que 0 (máximo 2 decimales)",
    invalidDate: "Fecha no válida",
    invalidExpiredLink: "Enlace no válido o caducado",
    invalidLink: "Enlace no válido",
    invalidType: "Tipo no válido",
    nameMust60CharactersFewer: "El nombre no puede superar 60 caracteres",
    nameMust80CharactersFewer: "El nombre no puede superar 80 caracteres",
    nameRequired: "El nombre es obligatorio",
    notesMust500CharactersFewer: "Las notas no pueden superar 500 caracteres",
    notLoadCategories: "No se pudieron cargar las categorías",
    notLoadData: "No se pudo cargar",
    notSaveChanges: "No se pudieron guardar los cambios.",
    positiveAmount: "Introduce un importe mayor que 0",
    positiveAmountWithTwoDecimals:
      "Introduce un importe mayor que 0 (máximo 2 decimales)",
    reminderDaysRange: "Introduce un número de días entre 0 y 30",
    somethingWentWrongTryAgain: "Ha ocurrido un error. Inténtalo de nuevo",
    unexpectedErrorTryAgain: "Error inesperado. Inténtalo de nuevo.",
  },
} satisfies MessageTree<typeof en>;

export const catalogs = { en, es } satisfies Record<
  Language,
  MessageTree<typeof en>
>;

type LeafKeys<T> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : T[K] extends object
      ? `${K}.${LeafKeys<T[K]>}`
      : never;
}[keyof T & string];

export type TranslationKey = LeafKeys<typeof en>;

function normalizeMessage(message: string): string {
  return message.replace(/\s+/g, " ").trim();
}

function getMessage(language: Language, key: string): string | undefined {
  let value: unknown = catalogs[language];
  for (const part of key.split(".")) {
    if (!value || typeof value !== "object") return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return typeof value === "string" ? value : undefined;
}

function flattenCatalog(
  tree: object,
  prefix = "",
  result: [string, string][] = [],
): [string, string][] {
  for (const [part, value] of Object.entries(tree)) {
    const key = prefix ? `${prefix}.${part}` : part;
    if (typeof value === "string") result.push([key, value]);
    else flattenCatalog(value, key, result);
  }
  return result;
}

const sourceMessageKeys = new Map<string, TranslationKey>();
const interpolatedSources = flattenCatalog(es).flatMap(([key, source]) => {
  sourceMessageKeys.set(normalizeMessage(source), key as TranslationKey);
  const names = [...source.matchAll(/\{(\w+)\}/g)].map((match) => match[1]!);
  if (!names.length) return [];
  const pattern = source
    .split(/(\{\w+\})/g)
    .map((part) =>
      part.startsWith("{")
        ? "(.+?)"
        : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    )
    .join("");
  return [
    { key: key as TranslationKey, names, pattern: new RegExp(`^${pattern}$`) },
  ];
});

function interpolate(
  template: string,
  values?: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    String(values?.[name] ?? placeholder),
  );
}

export function getLanguage(locale: string | null | undefined): Language {
  const baseLanguage = locale?.split(/[-_]/, 1)[0]?.toLowerCase();
  return SUPPORTED_LANGUAGES.includes(baseLanguage as Language)
    ? (baseLanguage as Language)
    : "es";
}

export function translateKey(
  locale: string | null | undefined,
  key: TranslationKey,
  values?: Record<string, string | number>,
): string {
  return interpolate(getMessage(getLanguage(locale), key) ?? key, values);
}

/** Accepts stable English keys; source-language messages remain compatible for existing call sites. */
export function translate(
  locale: string | null | undefined,
  keyOrSourceMessage: string,
  values?: Record<string, string | number>,
): string {
  const language = getLanguage(locale);
  const normalized = normalizeMessage(keyOrSourceMessage);
  if (getMessage(language, normalized)) {
    return translateKey(language, normalized as TranslationKey, values);
  }

  const legacyKey = sourceMessageKeys.get(normalized);
  if (legacyKey) return translateKey(language, legacyKey, values);

  for (const candidate of interpolatedSources) {
    const match = normalized.match(candidate.pattern);
    if (!match) continue;
    const interpolatedValues = Object.fromEntries(
      candidate.names.map((name, index) => [name, match[index + 1]!]),
    );
    return translateKey(language, candidate.key, interpolatedValues);
  }

  return interpolate(keyOrSourceMessage, values);
}

let currentLocale = "es-ES";

export function getCurrentLocale(): string {
  return currentLocale;
}

export function setCurrentLocale(locale: string | null | undefined): void {
  currentLocale = locale || "es-ES";
}

export function translateCurrent(
  keyOrSourceMessage: string,
  values?: Record<string, string | number>,
): string {
  return translate(currentLocale, keyOrSourceMessage, values);
}
