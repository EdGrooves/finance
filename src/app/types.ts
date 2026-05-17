export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  paidBy: string;
  splits?: ExpenseSplit[];
  isShared: boolean;
}

export interface ExpenseSplit {
  userId: string;
  amount?: number;
  percentage?: number;
}

export interface Balance {
  userId: string;
  userName: string;
  amount: number;
  type: 'owes' | 'owed';
}
