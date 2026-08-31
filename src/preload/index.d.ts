export interface CategoryTreeNode {
  id: number
  name: string
  icon: string | null
  children: CategoryTreeNode[]
}

export interface ExpenseInput {
  amount: number
  categoryId: number
  date: string
  note?: string
}

export interface ExpenseRecord {
  id: number
  amountCents: number
  date: string
  note: string | null
  categoryId: number
  subCategory: string
  topCategoryId: number
  topCategory: string
  topCategoryIcon: string | null
}

declare global {
  interface Window {
    api: {
      getCategories: () => Promise<CategoryTreeNode[]>
      addExpense: (input: ExpenseInput) => Promise<number>
      getExpenses: () => Promise<ExpenseRecord[]>
      addCategory: (parentId: number | null, name: string, icon?: string) => Promise<number>
      renameCategory: (id: number, name: string) => Promise<void>
      deleteCategory: (id: number) => Promise<void>
      versions: {
        electron: string
        chrome: string
        node: string
      }
    }
  }
}

export {}
