
export type AccountProvider = 'bkash' | 'nagad' | 'rocket' | 'flexiload' | 'hand_cash';
export type AccountType = 'Agent' | 'Personal' | 'Payment' | 'GP' | 'Robi' | 'Airtel' | 'BL';
export type Carrier = 'GP' | 'Robi' | 'Airtel' | 'BL' | 'None';

export interface Account {
  id: string;
  slNumber: number;
  provider: AccountProvider;
  type: AccountType;
  number: string;
  balance: number;
  lastDailyUpdate?: string;
}

export interface ProviderClosing {
  provider: AccountProvider;
  timestamp: string;
  totalBalance: number;
  accounts: {
    number: string;
    type: string;
    balance: number;
    slNumber: number;
  }[];
}

export interface HistoryRecord {
  id: string; // This will be the date (YYYY-MM-DD)
  date: string;
  lastUpdated: string;
  closings: Record<string, ProviderClosing>;
}

export interface Transaction {
  id: string;
  customerId: string;
  accountId?: string;
  accountName?: string;
  amountGiven: number;
  amountReceived: number;
  balanceAfter: number; 
  comment: string;
  date: string;
}

export interface Customer {
  id: string;
  name: string;
  number: string;
  address: string;
  imageUrl: string;
  currentDue: number;
  transactions: Transaction[];
}

export interface LoanTransaction {
  id: string;
  date: string;
  deposit: number; // Installment amount paid
  savings: number; // Extra savings added during this payment
  balanceAfter: number; // Remaining due after this payment
  comment?: string;
}

export interface LoanRecord {
  id: string;
  ngoName: string;
  loanId: string;
  date: string;
  initialSavings: number;
  principal: number;
  interest: number;
  currentDue: number;
  totalSavings: number;
  type: 'Given' | 'Taken';
  status: 'Active' | 'Closed';
  createdAt: string;
  transactions: LoanTransaction[];
}

export interface Product {
  id: string; // Typically carrier_itemType
  slNumber: number; // Serial Number for sorting
  name: string; // Display name
  carrier: Carrier;
  itemType: string;
  buyPrice: number;
  sellPrice: number; // Recommended or last sell price
  stock: number;
  minStock: number;
  totalValue: number;
  remarks?: string;
}

export interface StockTransaction {
  id: string;
  date: string;
  type: 'BUY' | 'SELL';
  carrier: Carrier;
  itemType: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  profit?: number;
  remarks: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  createdAt: string;
}

export interface IncomeRecord {
  id: string;
  income: number;
  expense: number;
  source: string;
  description: string;
  date: string;
  createdAt: string;
}

export interface RentRecord {
  id: string;
  date: string;
  type: 'Room Enamul' | 'Pay Bill Enamul' | 'Sinthiyar Beton';
  amount: number;
  comment: string;
  createdAt: string;
}

export interface CustomerAccountRecord {
  id: string;
  slNumber: number;
  date: string;
  name: string;
  address: string;
  service: string;
  number: string;
  pin: string;
  nid: string;
  dob: string;
  status: string;
  createdAt: string;
}

export interface User {
  email: string;
  name: string;
}
