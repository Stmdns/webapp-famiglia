import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Group {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface GroupMember {
  id: string;
  groupId: string;
  userId: string | null;
  name: string;
  quotaPercent: number;
}

interface ExpenseCategory {
  id: string;
  groupId: string;
  name: string;
  icon: string;
  color: string;
}

interface RecurringExpense {
  id: string;
  groupId: string;
  categoryId: string | null;
  name: string;
  amount: number;
  frequencyType: "weekly" | "monthly" | "yearly" | "days" | "months";
  frequencyValue: number;
  dayOfMonth: number | null;
  isActive: boolean;
  category?: ExpenseCategory;
  monthlyAmount?: number;
}

interface Payment {
  id: string;
  groupId: string;
  memberId: string;
  expenseId: string | null;
  month: number;
  year: number;
  amountPaid: number;
  isConfirmed: boolean;
  confirmedAt: Date | null;
}

interface GroupStore {
  currentGroupId: string | null;
  groups: Group[];
  members: GroupMember[];
  categories: ExpenseCategory[];
  expenses: RecurringExpense[];
  payments: Payment[];
  
  setCurrentGroup: (id: string | null) => void;
  setGroups: (groups: Group[]) => void;
  setMembers: (members: GroupMember[]) => void;
  setCategories: (categories: ExpenseCategory[]) => void;
  setExpenses: (expenses: RecurringExpense[]) => void;
  setPayments: (payments: Payment[]) => void;
  
  addGroup: (group: Group) => void;
  addMember: (member: GroupMember) => void;
  updateMember: (id: string, data: Partial<GroupMember>) => void;
  removeMember: (id: string) => void;
  addExpense: (expense: RecurringExpense) => void;
  updateExpense: (id: string, data: Partial<RecurringExpense>) => void;
  removeExpense: (id: string) => void;
}

export const useGroupStore = create<GroupStore>()(
  persist(
    (set) => ({
      currentGroupId: null,
      groups: [],
      members: [],
      categories: [],
      expenses: [],
      payments: [],

      setCurrentGroup: (id) => set({ currentGroupId: id }),
      setGroups: (groups) => set({ groups }),
      setMembers: (members) => set({ members }),
      setCategories: (categories) => set({ categories }),
      setExpenses: (expenses) => set({ expenses }),
      setPayments: (payments) => set({ payments }),

      addGroup: (group) => set((state) => ({ groups: [...state.groups, group] })),
      addMember: (member) => set((state) => ({ members: [...state.members, member] })),
      updateMember: (id, data) => set((state) => ({
        members: state.members.map((m) => m.id === id ? { ...m, ...data } : m),
      })),
      removeMember: (id) => set((state) => ({
        members: state.members.filter((m) => m.id !== id),
      })),
      addExpense: (expense) => set((state) => ({ expenses: [...state.expenses, expense] })),
      updateExpense: (id, data) => set((state) => ({
        expenses: state.expenses.map((e) => e.id === id ? { ...e, ...data } : e),
      })),
      removeExpense: (id) => set((state) => ({
        expenses: state.expenses.filter((e) => e.id !== id),
      })),
    }),
    {
      name: "famiglia-budget-store",
    }
  )
);
