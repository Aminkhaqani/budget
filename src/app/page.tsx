'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO, addDays } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { db } from '@/lib/db'

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'

// Icons
import { 
  Wallet, TrendingUp, TrendingDown, CreditCard, PiggyBank, ArrowUpRight, ArrowDownRight,
  Plus, Minus, RefreshCw, Calendar, Clock, Users, Building, User, ChevronRight,
  LayoutDashboard, Receipt, HandCoins, CalendarClock, Landmark, BarChart3, Settings,
  Edit, Trash2, Eye, CheckCircle, AlertCircle, DollarSign, Banknote, ArrowRightLeft
} from 'lucide-react'

// Types
type Account = {
  id: string
  name: string
  type: string
  balance: number
  currency: string
  color: string | null
  icon: string | null
  isDefault: boolean
  isActive: boolean
}

type Category = {
  id: string
  name: string
  type: string
  icon: string | null
  color: string | null
  budget: number | null
}

type Transaction = {
  id: string
  type: string
  amount: number
  description: string | null
  date: Date
  accountId: string
  categoryId: string | null
  notes: string | null
  tags: string | null
  isRecurring: boolean
  account?: Account
  category?: Category
}

type Loan = {
  id: string
  type: string
  principalAmount: number
  interestRate: number | null
  startDate: Date
  dueDate: Date | null
  status: string
  description: string | null
  fromAccountId: string | null
  toAccountId: string | null
  lenderContactId: string | null
  borrowerContactId: string | null
  payments: LoanPayment[]
}

type LoanPayment = {
  id: string
  amount: number
  date: Date
  principal: number
  interest: number
  notes: string | null
}

type Debt = {
  id: string
  type: string
  amount: number
  remainingAmount: number
  dueDate: Date | null
  status: string
  description: string | null
  creditorId: string | null
  debtorId: string | null
  payments: DebtPayment[]
}

type DebtPayment = {
  id: string
  amount: number
  date: Date
  notes: string | null
}

type Contact = {
  id: string
  name: string
  email: string | null
  phone: string | null
  type: string
  notes: string | null
}

type ScheduledPayment = {
  id: string
  name: string
  type: string
  amount: number
  frequency: string
  customDays: number | null
  startDate: Date
  endDate: Date | null
  nextDueDate: Date
  lastProcessed: Date | null
  isActive: boolean
  autoRecord: boolean
  description: string | null
  accountId: string
  categoryId: string | null
  account?: Account
  category?: Category
}

// Utility functions
const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

const getAccountIcon = (type: string) => {
  switch (type) {
    case 'bank': return Landmark
    case 'cash': return Banknote
    case 'credit_card': return CreditCard
    case 'investment': return TrendingUp
    case 'savings': return PiggyBank
    default: return Wallet
  }
}

const CHART_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export default function PersonalFinanceApp() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isLoading, setIsLoading] = useState(true)
  
  // Data states
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [scheduledPayments, setScheduledPayments] = useState<ScheduledPayment[]>([])
  
  // Form states
  const [showTransactionDialog, setShowTransactionDialog] = useState(false)
  const [showAccountDialog, setShowAccountDialog] = useState(false)
  const [showLoanDialog, setShowLoanDialog] = useState(false)
  const [showDebtDialog, setShowDebtDialog] = useState(false)
  const [showScheduledDialog, setShowScheduledDialog] = useState(false)
  const [showContactDialog, setShowContactDialog] = useState(false)
  
  // Editing states
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null)
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)
  const [editingScheduled, setEditingScheduled] = useState<ScheduledPayment | null>(null)
  
  // Form data
  const [transactionForm, setTransactionForm] = useState({
    type: 'expense',
    amount: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    accountId: '',
    categoryId: '',
    notes: '',
    tags: ''
  })
  
  const [accountForm, setAccountForm] = useState({
    name: '',
    type: 'bank',
    balance: '',
    currency: 'USD',
    color: '#3b82f6'
  })
  
  const [loanForm, setLoanForm] = useState({
    type: 'taken',
    principalAmount: '',
    interestRate: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    dueDate: '',
    description: '',
    contactId: '',
    accountId: ''
  })
  
  const [debtForm, setDebtForm] = useState({
    type: 'payable',
    amount: '',
    dueDate: '',
    description: '',
    contactId: ''
  })
  
  const [scheduledForm, setScheduledForm] = useState({
    name: '',
    type: 'expense',
    amount: '',
    frequency: 'monthly',
    customDays: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    nextDueDate: format(new Date(), 'yyyy-MM-dd'),
    accountId: '',
    categoryId: '',
    description: ''
  })
  
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'person',
    notes: ''
  })

  // Load initial data
  useEffect(() => {
    loadData()
  }, [])
  
  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load all data in parallel
      const [accountsRes, categoriesRes, transactionsRes, loansRes, debtsRes, contactsRes, scheduledRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/categories'),
        fetch('/api/transactions'),
        fetch('/api/loans'),
        fetch('/api/debts'),
        fetch('/api/contacts'),
        fetch('/api/scheduled-payments')
      ])
      
      if (accountsRes.ok) setAccounts(await accountsRes.json())
      if (categoriesRes.ok) setCategories(await categoriesRes.json())
      if (transactionsRes.ok) setTransactions(await transactionsRes.json())
      if (loansRes.ok) setLoans(await loansRes.json())
      if (debtsRes.ok) setDebts(await debtsRes.json())
      if (contactsRes.ok) setContacts(await contactsRes.json())
      if (scheduledRes.ok) setScheduledPayments(await scheduledRes.json())
      
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate totals
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0)
  
  const currentMonth = {
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  }
  
  const monthlyIncome = transactions
    .filter(t => t.type === 'income' && isWithinInterval(new Date(t.date), currentMonth))
    .reduce((sum, t) => sum + t.amount, 0)
  
  const monthlyExpenses = transactions
    .filter(t => t.type === 'expense' && isWithinInterval(new Date(t.date), currentMonth))
    .reduce((sum, t) => sum + t.amount, 0)
  
  const totalLoansGiven = loans.filter(l => l.type === 'given' && l.status === 'active')
    .reduce((sum, l) => {
      const paid = l.payments.reduce((s, p) => s + p.principal, 0)
      return sum + (l.principalAmount - paid)
    }, 0)
  
  const totalLoansTaken = loans.filter(l => l.type === 'taken' && l.status === 'active')
    .reduce((sum, l) => {
      const paid = l.payments.reduce((s, p) => s + p.principal, 0)
      return sum + (l.principalAmount - paid)
    }, 0)
  
  const totalDebtsPayable = debts.filter(d => d.type === 'payable' && d.status !== 'paid')
    .reduce((sum, d) => sum + d.remainingAmount, 0)
  
  const totalDebtsReceivable = debts.filter(d => d.type === 'receivable' && d.status !== 'paid')
    .reduce((sum, d) => sum + d.remainingAmount, 0)

  // Chart data
  const expensesByCategory = categories
    .filter(c => c.type === 'expense')
    .map(cat => {
      const total = transactions
        .filter(t => t.categoryId === cat.id && t.type === 'expense' && isWithinInterval(new Date(t.date), currentMonth))
        .reduce((sum, t) => sum + t.amount, 0)
      return { name: cat.name, value: total, color: cat.color || '#3b82f6' }
    })
    .filter(d => d.value > 0)
  
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(new Date(), 5 - i)
    const start = startOfMonth(month)
    const end = endOfMonth(month)
    const income = transactions
      .filter(t => t.type === 'income' && isWithinInterval(new Date(t.date), { start, end }))
      .reduce((sum, t) => sum + t.amount, 0)
    const expense = transactions
      .filter(t => t.type === 'expense' && isWithinInterval(new Date(t.date), { start, end }))
      .reduce((sum, t) => sum + t.amount, 0)
    return { month: format(month, 'MMM'), income, expense }
  })

  // CRUD Operations
  const handleAddTransaction = async () => {
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...transactionForm,
          amount: parseFloat(transactionForm.amount),
          date: new Date(transactionForm.date)
        })
      })
      
      if (response.ok) {
        toast({ title: 'Success', description: 'Transaction added' })
        loadData()
        setShowTransactionDialog(false)
        resetTransactionForm()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add transaction', variant: 'destructive' })
    }
  }
  
  const handleUpdateTransaction = async () => {
    if (!editingTransaction) return
    try {
      const response = await fetch(`/api/transactions/${editingTransaction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...transactionForm,
          amount: parseFloat(transactionForm.amount),
          date: new Date(transactionForm.date)
        })
      })
      
      if (response.ok) {
        toast({ title: 'Success', description: 'Transaction updated' })
        loadData()
        setShowTransactionDialog(false)
        setEditingTransaction(null)
        resetTransactionForm()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update transaction', variant: 'destructive' })
    }
  }
  
  const handleDeleteTransaction = async (id: string) => {
    try {
      const response = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
      if (response.ok) {
        toast({ title: 'Success', description: 'Transaction deleted' })
        loadData()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete transaction', variant: 'destructive' })
    }
  }
  
  const handleAddAccount = async () => {
    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...accountForm,
          balance: parseFloat(accountForm.balance) || 0
        })
      })
      
      if (response.ok) {
        toast({ title: 'Success', description: 'Account added' })
        loadData()
        setShowAccountDialog(false)
        resetAccountForm()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add account', variant: 'destructive' })
    }
  }
  
  const handleDeleteAccount = async (id: string) => {
    try {
      const response = await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
      if (response.ok) {
        toast({ title: 'Success', description: 'Account deleted' })
        loadData()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete account', variant: 'destructive' })
    }
  }
  
  const handleAddLoan = async () => {
    try {
      const response = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...loanForm,
          principalAmount: parseFloat(loanForm.principalAmount),
          interestRate: loanForm.interestRate ? parseFloat(loanForm.interestRate) : null,
          startDate: new Date(loanForm.startDate),
          dueDate: loanForm.dueDate ? new Date(loanForm.dueDate) : null
        })
      })
      
      if (response.ok) {
        toast({ title: 'Success', description: 'Loan added' })
        loadData()
        setShowLoanDialog(false)
        resetLoanForm()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add loan', variant: 'destructive' })
    }
  }
  
  const handleDeleteLoan = async (id: string) => {
    try {
      const response = await fetch(`/api/loans/${id}`, { method: 'DELETE' })
      if (response.ok) {
        toast({ title: 'Success', description: 'Loan deleted' })
        loadData()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete loan', variant: 'destructive' })
    }
  }
  
  const handleAddDebt = async () => {
    try {
      const response = await fetch('/api/debts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...debtForm,
          amount: parseFloat(debtForm.amount),
          remainingAmount: parseFloat(debtForm.amount),
          dueDate: debtForm.dueDate ? new Date(debtForm.dueDate) : null
        })
      })
      
      if (response.ok) {
        toast({ title: 'Success', description: 'Debt added' })
        loadData()
        setShowDebtDialog(false)
        resetDebtForm()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add debt', variant: 'destructive' })
    }
  }
  
  const handleDeleteDebt = async (id: string) => {
    try {
      const response = await fetch(`/api/debts/${id}`, { method: 'DELETE' })
      if (response.ok) {
        toast({ title: 'Success', description: 'Debt deleted' })
        loadData()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete debt', variant: 'destructive' })
    }
  }
  
  const handleAddScheduled = async () => {
    try {
      const response = await fetch('/api/scheduled-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...scheduledForm,
          amount: parseFloat(scheduledForm.amount),
          customDays: scheduledForm.customDays ? parseInt(scheduledForm.customDays) : null,
          startDate: new Date(scheduledForm.startDate),
          nextDueDate: new Date(scheduledForm.nextDueDate)
        })
      })
      
      if (response.ok) {
        toast({ title: 'Success', description: 'Scheduled payment added' })
        loadData()
        setShowScheduledDialog(false)
        resetScheduledForm()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add scheduled payment', variant: 'destructive' })
    }
  }
  
  const handleDeleteScheduled = async (id: string) => {
    try {
      const response = await fetch(`/api/scheduled-payments/${id}`, { method: 'DELETE' })
      if (response.ok) {
        toast({ title: 'Success', description: 'Scheduled payment deleted' })
        loadData()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete scheduled payment', variant: 'destructive' })
    }
  }
  
  const handleAddContact = async () => {
    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm)
      })
      
      if (response.ok) {
        toast({ title: 'Success', description: 'Contact added' })
        loadData()
        setShowContactDialog(false)
        resetContactForm()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add contact', variant: 'destructive' })
    }
  }

  // Reset forms
  const resetTransactionForm = () => {
    setTransactionForm({
      type: 'expense',
      amount: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      accountId: accounts.find(a => a.isDefault)?.id || accounts[0]?.id || '',
      categoryId: '',
      notes: '',
      tags: ''
    })
  }
  
  const resetAccountForm = () => {
    setAccountForm({ name: '', type: 'bank', balance: '', currency: 'USD', color: '#3b82f6' })
  }
  
  const resetLoanForm = () => {
    setLoanForm({
      type: 'taken',
      principalAmount: '',
      interestRate: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      dueDate: '',
      description: '',
      contactId: '',
      accountId: ''
    })
  }
  
  const resetDebtForm = () => {
    setDebtForm({
      type: 'payable',
      amount: '',
      dueDate: '',
      description: '',
      contactId: ''
    })
  }
  
  const resetScheduledForm = () => {
    setScheduledForm({
      name: '',
      type: 'expense',
      amount: '',
      frequency: 'monthly',
      customDays: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      nextDueDate: format(new Date(), 'yyyy-MM-dd'),
      accountId: accounts.find(a => a.isDefault)?.id || accounts[0]?.id || '',
      categoryId: '',
      description: ''
    })
  }
  
  const resetContactForm = () => {
    setContactForm({ name: '', email: '', phone: '', type: 'person', notes: '' })
  }

  // Open edit dialogs
  const openEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setTransactionForm({
      type: transaction.type,
      amount: transaction.amount.toString(),
      description: transaction.description || '',
      date: format(new Date(transaction.date), 'yyyy-MM-dd'),
      accountId: transaction.accountId,
      categoryId: transaction.categoryId || '',
      notes: transaction.notes || '',
      tags: transaction.tags || ''
    })
    setShowTransactionDialog(true)
  }

  // Initialize default account
  useEffect(() => {
    if (accounts.length > 0 && !transactionForm.accountId) {
      setTransactionForm(prev => ({
        ...prev,
        accountId: accounts.find(a => a.isDefault)?.id || accounts[0].id
      }))
      setScheduledForm(prev => ({
        ...prev,
        accountId: accounts.find(a => a.isDefault)?.id || accounts[0].id
      }))
    }
  }, [accounts])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 pb-20 md:pb-6">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              FinTrack
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={loadData}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsContent value="dashboard" className="space-y-4 mt-0">
            {/* Overview Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-emerald-100 text-xs font-medium">Total Balance</p>
                    <Wallet className="w-4 h-4 text-emerald-200" />
                  </div>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(totalBalance)}</p>
                  <p className="text-emerald-100 text-xs mt-1">{accounts.length} accounts</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-blue-100 text-xs font-medium">Monthly Income</p>
                    <TrendingUp className="w-4 h-4 text-blue-200" />
                  </div>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(monthlyIncome)}</p>
                  <p className="text-blue-100 text-xs mt-1">{format(new Date(), 'MMMM yyyy')}</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white border-0">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-amber-100 text-xs font-medium">Monthly Expenses</p>
                    <TrendingDown className="w-4 h-4 text-amber-200" />
                  </div>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(monthlyExpenses)}</p>
                  <p className="text-amber-100 text-xs mt-1">{format(new Date(), 'MMMM yyyy')}</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-500 to-violet-600 text-white border-0">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-purple-100 text-xs font-medium">Net Worth</p>
                    <PiggyBank className="w-4 h-4 text-purple-200" />
                  </div>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(totalBalance + totalDebtsReceivable - totalDebtsPayable - totalLoansTaken + totalLoansGiven)}</p>
                  <p className="text-purple-100 text-xs mt-1">After all debts</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Income vs Expenses Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Income vs Expenses</CardTitle>
                  <CardDescription>Last 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={last6Months}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis className="text-xs" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income" />
                        <Bar dataKey="expense" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Expense" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Expenses by Category */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Expenses by Category</CardTitle>
                  <CardDescription>This month</CardDescription>
                </CardHeader>
                <CardContent>
                  {expensesByCategory.length > 0 ? (
                    <ChartContainer config={{}} className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={expensesByCategory}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {expensesByCategory.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-slate-400">
                      No expenses this month
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2">
                  <Dialog open={showTransactionDialog} onOpenChange={(open) => { setShowTransactionDialog(open); if (!open) { setEditingTransaction(null); resetTransactionForm(); } }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="h-auto py-3 flex-col gap-1">
                        <Plus className="w-5 h-5 text-emerald-500" />
                        <span className="text-xs">Add Transaction</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>{editingTransaction ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant={transactionForm.type === 'income' ? 'default' : 'outline'}
                            className={transactionForm.type === 'income' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                            onClick={() => setTransactionForm(prev => ({ ...prev, type: 'income' }))}
                          >
                            <TrendingUp className="w-4 h-4 mr-1" /> Income
                          </Button>
                          <Button
                            variant={transactionForm.type === 'expense' ? 'default' : 'outline'}
                            className={transactionForm.type === 'expense' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                            onClick={() => setTransactionForm(prev => ({ ...prev, type: 'expense' }))}
                          >
                            <TrendingDown className="w-4 h-4 mr-1" /> Expense
                          </Button>
                        </div>
                        <div>
                          <Label>Amount</Label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={transactionForm.amount}
                            onChange={e => setTransactionForm(prev => ({ ...prev, amount: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Input
                            placeholder="What was this for?"
                            value={transactionForm.description}
                            onChange={e => setTransactionForm(prev => ({ ...prev, description: e.target.value }))}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label>Date</Label>
                            <Input
                              type="date"
                              value={transactionForm.date}
                              onChange={e => setTransactionForm(prev => ({ ...prev, date: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label>Account</Label>
                            <Select value={transactionForm.accountId} onValueChange={v => setTransactionForm(prev => ({ ...prev, accountId: v }))}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select account" />
                              </SelectTrigger>
                              <SelectContent>
                                {accounts.map(acc => (
                                  <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label>Category</Label>
                          <Select value={transactionForm.categoryId} onValueChange={v => setTransactionForm(prev => ({ ...prev, categoryId: v }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.filter(c => c.type === transactionForm.type).map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Notes (optional)</Label>
                          <Textarea
                            placeholder="Additional notes..."
                            value={transactionForm.notes}
                            onChange={e => setTransactionForm(prev => ({ ...prev, notes: e.target.value }))}
                            rows={2}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => { setShowTransactionDialog(false); setEditingTransaction(null); resetTransactionForm(); }}>Cancel</Button>
                        <Button onClick={editingTransaction ? handleUpdateTransaction : handleAddTransaction}>
                          {editingTransaction ? 'Update' : 'Add'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showAccountDialog} onOpenChange={(open) => { setShowAccountDialog(open); if (!open) resetAccountForm(); }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="h-auto py-3 flex-col gap-1">
                        <Landmark className="w-5 h-5 text-blue-500" />
                        <span className="text-xs">Add Account</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add Account</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Account Name</Label>
                          <Input
                            placeholder="e.g., Main Checking"
                            value={accountForm.name}
                            onChange={e => setAccountForm(prev => ({ ...prev, name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Account Type</Label>
                          <Select value={accountForm.type} onValueChange={v => setAccountForm(prev => ({ ...prev, type: v }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bank">Bank Account</SelectItem>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="credit_card">Credit Card</SelectItem>
                              <SelectItem value="investment">Investment</SelectItem>
                              <SelectItem value="savings">Savings</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label>Initial Balance</Label>
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={accountForm.balance}
                              onChange={e => setAccountForm(prev => ({ ...prev, balance: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label>Currency</Label>
                            <Select value={accountForm.currency} onValueChange={v => setAccountForm(prev => ({ ...prev, currency: v }))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="EUR">EUR</SelectItem>
                                <SelectItem value="GBP">GBP</SelectItem>
                                <SelectItem value="IRR">IRR</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAccountDialog(false)}>Cancel</Button>
                        <Button onClick={handleAddAccount}>Add Account</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showLoanDialog} onOpenChange={(open) => { setShowLoanDialog(open); if (!open) resetLoanForm(); }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="h-auto py-3 flex-col gap-1">
                        <HandCoins className="w-5 h-5 text-purple-500" />
                        <span className="text-xs">Add Loan</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add Loan</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant={loanForm.type === 'taken' ? 'default' : 'outline'}
                            className={loanForm.type === 'taken' ? 'bg-red-500 hover:bg-red-600' : ''}
                            onClick={() => setLoanForm(prev => ({ ...prev, type: 'taken' }))}
                          >
                            I Borrowed
                          </Button>
                          <Button
                            variant={loanForm.type === 'given' ? 'default' : 'outline'}
                            className={loanForm.type === 'given' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                            onClick={() => setLoanForm(prev => ({ ...prev, type: 'given' }))}
                          >
                            I Lent
                          </Button>
                        </div>
                        <div>
                          <Label>Amount</Label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={loanForm.principalAmount}
                            onChange={e => setLoanForm(prev => ({ ...prev, principalAmount: e.target.value }))}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label>Interest Rate (%)</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={loanForm.interestRate}
                              onChange={e => setLoanForm(prev => ({ ...prev, interestRate: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label>Due Date</Label>
                            <Input
                              type="date"
                              value={loanForm.dueDate}
                              onChange={e => setLoanForm(prev => ({ ...prev, dueDate: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Contact (optional)</Label>
                          <Select value={loanForm.contactId} onValueChange={v => setLoanForm(prev => ({ ...prev, contactId: v }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select contact" />
                            </SelectTrigger>
                            <SelectContent>
                              {contacts.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            placeholder="Loan details..."
                            value={loanForm.description}
                            onChange={e => setLoanForm(prev => ({ ...prev, description: e.target.value }))}
                            rows={2}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowLoanDialog(false)}>Cancel</Button>
                        <Button onClick={handleAddLoan}>Add Loan</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showDebtDialog} onOpenChange={(open) => { setShowDebtDialog(open); if (!open) resetDebtForm(); }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="h-auto py-3 flex-col gap-1">
                        <CreditCard className="w-5 h-5 text-red-500" />
                        <span className="text-xs">Add Debt</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add Debt/Receivable</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant={debtForm.type === 'payable' ? 'default' : 'outline'}
                            className={debtForm.type === 'payable' ? 'bg-red-500 hover:bg-red-600' : ''}
                            onClick={() => setDebtForm(prev => ({ ...prev, type: 'payable' }))}
                          >
                            I Owe
                          </Button>
                          <Button
                            variant={debtForm.type === 'receivable' ? 'default' : 'outline'}
                            className={debtForm.type === 'receivable' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                            onClick={() => setDebtForm(prev => ({ ...prev, type: 'receivable' }))}
                          >
                            Owed to Me
                          </Button>
                        </div>
                        <div>
                          <Label>Amount</Label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={debtForm.amount}
                            onChange={e => setDebtForm(prev => ({ ...prev, amount: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Due Date</Label>
                          <Input
                            type="date"
                            value={debtForm.dueDate}
                            onChange={e => setDebtForm(prev => ({ ...prev, dueDate: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Contact (optional)</Label>
                          <Select value={debtForm.contactId} onValueChange={v => setDebtForm(prev => ({ ...prev, contactId: v }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select contact" />
                            </SelectTrigger>
                            <SelectContent>
                              {contacts.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            placeholder="Details..."
                            value={debtForm.description}
                            onChange={e => setDebtForm(prev => ({ ...prev, description: e.target.value }))}
                            rows={2}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDebtDialog(false)}>Cancel</Button>
                        <Button onClick={handleAddDebt}>Add</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Recent Transactions</CardTitle>
                  <CardDescription>Last 10 transactions</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('transactions')}>
                  View All <ChevronRight className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  {transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                      <Receipt className="w-12 h-12 mb-2" />
                      <p>No transactions yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {transactions.slice(0, 10).map(t => (
                        <div key={t.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                            }`}>
                              {t.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{t.description || 'Transaction'}</p>
                              <p className="text-xs text-slate-500">{format(new Date(t.date), 'MMM d, yyyy')}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className={`font-semibold ${t.type === 'income' ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                            </p>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTransaction(t)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Accounts Overview */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Accounts</CardTitle>
                  <CardDescription>Your financial accounts</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('accounts')}>
                  Manage <ChevronRight className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {accounts.slice(0, 6).map(acc => {
                    const Icon = getAccountIcon(acc.type)
                    return (
                      <div key={acc.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: acc.color || '#3b82f6' }}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{acc.name}</p>
                            <p className="text-xs text-slate-500">{acc.type.replace('_', ' ')}</p>
                          </div>
                        </div>
                        <p className={`text-lg font-bold ${acc.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCurrency(acc.balance, acc.currency)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4 mt-0">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Transactions</CardTitle>
                    <CardDescription>{transactions.length} transactions</CardDescription>
                  </div>
                  <Dialog open={showTransactionDialog} onOpenChange={(open) => { setShowTransactionDialog(open); if (!open) { setEditingTransaction(null); resetTransactionForm(); } }}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-1" /> Add
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>{editingTransaction ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant={transactionForm.type === 'income' ? 'default' : 'outline'}
                            className={transactionForm.type === 'income' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                            onClick={() => setTransactionForm(prev => ({ ...prev, type: 'income' }))}
                          >
                            <TrendingUp className="w-4 h-4 mr-1" /> Income
                          </Button>
                          <Button
                            variant={transactionForm.type === 'expense' ? 'default' : 'outline'}
                            className={transactionForm.type === 'expense' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                            onClick={() => setTransactionForm(prev => ({ ...prev, type: 'expense' }))}
                          >
                            <TrendingDown className="w-4 h-4 mr-1" /> Expense
                          </Button>
                        </div>
                        <div>
                          <Label>Amount</Label>
                          <Input type="number" placeholder="0.00" value={transactionForm.amount} onChange={e => setTransactionForm(prev => ({ ...prev, amount: e.target.value }))} />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Input placeholder="What was this for?" value={transactionForm.description} onChange={e => setTransactionForm(prev => ({ ...prev, description: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label>Date</Label>
                            <Input type="date" value={transactionForm.date} onChange={e => setTransactionForm(prev => ({ ...prev, date: e.target.value }))} />
                          </div>
                          <div>
                            <Label>Account</Label>
                            <Select value={transactionForm.accountId} onValueChange={v => setTransactionForm(prev => ({ ...prev, accountId: v }))}>
                              <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                              <SelectContent>
                                {accounts.map(acc => (<SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label>Category</Label>
                          <Select value={transactionForm.categoryId} onValueChange={v => setTransactionForm(prev => ({ ...prev, categoryId: v }))}>
                            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                            <SelectContent>
                              {categories.filter(c => c.type === transactionForm.type).map(cat => (<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Notes (optional)</Label>
                          <Textarea placeholder="Additional notes..." value={transactionForm.notes} onChange={e => setTransactionForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => { setShowTransactionDialog(false); setEditingTransaction(null); resetTransactionForm(); }}>Cancel</Button>
                        <Button onClick={editingTransaction ? handleUpdateTransaction : handleAddTransaction}>{editingTransaction ? 'Update' : 'Add'}</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[60vh]">
                  {transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                      <Receipt className="w-12 h-12 mb-2" />
                      <p>No transactions yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {transactions.map(t => (
                        <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                              {t.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="font-medium">{t.description || 'Transaction'}</p>
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span>{format(new Date(t.date), 'MMM d, yyyy')}</span>
                                <span>•</span>
                                <span>{accounts.find(a => a.id === t.accountId)?.name || 'Unknown'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className={`font-semibold ${t.type === 'income' ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                            </p>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTransaction(t)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                                  <AlertDialogDescription>Are you sure you want to delete this transaction?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={() => handleDeleteTransaction(t.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Loans & Debts Tab */}
          <TabsContent value="loans" className="space-y-4 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Loans */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Loans</CardTitle>
                      <CardDescription>Money lent or borrowed</CardDescription>
                    </div>
                    <Dialog open={showLoanDialog} onOpenChange={(open) => { setShowLoanDialog(open); if (!open) resetLoanForm(); }}>
                      <DialogTrigger asChild>
                        <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader><DialogTitle>Add Loan</DialogTitle></DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-2">
                            <Button variant={loanForm.type === 'taken' ? 'default' : 'outline'} className={loanForm.type === 'taken' ? 'bg-red-500 hover:bg-red-600' : ''} onClick={() => setLoanForm(prev => ({ ...prev, type: 'taken' }))}>I Borrowed</Button>
                            <Button variant={loanForm.type === 'given' ? 'default' : 'outline'} className={loanForm.type === 'given' ? 'bg-emerald-500 hover:bg-emerald-600' : ''} onClick={() => setLoanForm(prev => ({ ...prev, type: 'given' }))}>I Lent</Button>
                          </div>
                          <div><Label>Amount</Label><Input type="number" placeholder="0.00" value={loanForm.principalAmount} onChange={e => setLoanForm(prev => ({ ...prev, principalAmount: e.target.value }))} /></div>
                          <div className="grid grid-cols-2 gap-2">
                            <div><Label>Interest Rate (%)</Label><Input type="number" placeholder="0" value={loanForm.interestRate} onChange={e => setLoanForm(prev => ({ ...prev, interestRate: e.target.value }))} /></div>
                            <div><Label>Due Date</Label><Input type="date" value={loanForm.dueDate} onChange={e => setLoanForm(prev => ({ ...prev, dueDate: e.target.value }))} /></div>
                          </div>
                          <div><Label>Contact</Label><Select value={loanForm.contactId} onValueChange={v => setLoanForm(prev => ({ ...prev, contactId: v }))}><SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger><SelectContent>{contacts.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select></div>
                          <div><Label>Description</Label><Textarea placeholder="Loan details..." value={loanForm.description} onChange={e => setLoanForm(prev => ({ ...prev, description: e.target.value }))} rows={2} /></div>
                        </div>
                        <DialogFooter><Button variant="outline" onClick={() => setShowLoanDialog(false)}>Cancel</Button><Button onClick={handleAddLoan}>Add</Button></DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {loans.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <HandCoins className="w-12 h-12 mx-auto mb-2" />
                        <p>No loans yet</p>
                      </div>
                    ) : (
                      loans.map(loan => {
                        const paid = loan.payments.reduce((s, p) => s + p.principal, 0)
                        const remaining = loan.principalAmount - paid
                        const progress = (paid / loan.principalAmount) * 100
                        return (
                          <div key={loan.id} className="p-3 rounded-lg border">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant={loan.type === 'given' ? 'default' : 'destructive'} className={loan.type === 'given' ? 'bg-emerald-500' : ''}>
                                  {loan.type === 'given' ? 'Lent' : 'Borrowed'}
                                </Badge>
                                <Badge variant="outline">{loan.status}</Badge>
                              </div>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader><AlertDialogTitle>Delete Loan</AlertDialogTitle><AlertDialogDescription>Are you sure?</AlertDialogDescription></AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={() => handleDeleteLoan(loan.id)}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                            <p className="font-semibold text-lg">{formatCurrency(remaining)} remaining</p>
                            <p className="text-sm text-slate-500">of {formatCurrency(loan.principalAmount)}</p>
                            <Progress value={progress} className="h-2 mt-2" />
                            {loan.dueDate && (
                              <p className="text-xs text-slate-500 mt-2">Due: {format(new Date(loan.dueDate), 'MMM d, yyyy')}</p>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Debts */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Debts & Receivables</CardTitle>
                      <CardDescription>Money owed or owing</CardDescription>
                    </div>
                    <Dialog open={showDebtDialog} onOpenChange={(open) => { setShowDebtDialog(open); if (!open) resetDebtForm(); }}>
                      <DialogTrigger asChild>
                        <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader><DialogTitle>Add Debt/Receivable</DialogTitle></DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-2">
                            <Button variant={debtForm.type === 'payable' ? 'default' : 'outline'} className={debtForm.type === 'payable' ? 'bg-red-500 hover:bg-red-600' : ''} onClick={() => setDebtForm(prev => ({ ...prev, type: 'payable' }))}>I Owe</Button>
                            <Button variant={debtForm.type === 'receivable' ? 'default' : 'outline'} className={debtForm.type === 'receivable' ? 'bg-emerald-500 hover:bg-emerald-600' : ''} onClick={() => setDebtForm(prev => ({ ...prev, type: 'receivable' }))}>Owed to Me</Button>
                          </div>
                          <div><Label>Amount</Label><Input type="number" placeholder="0.00" value={debtForm.amount} onChange={e => setDebtForm(prev => ({ ...prev, amount: e.target.value }))} /></div>
                          <div><Label>Due Date</Label><Input type="date" value={debtForm.dueDate} onChange={e => setDebtForm(prev => ({ ...prev, dueDate: e.target.value }))} /></div>
                          <div><Label>Contact</Label><Select value={debtForm.contactId} onValueChange={v => setDebtForm(prev => ({ ...prev, contactId: v }))}><SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger><SelectContent>{contacts.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select></div>
                          <div><Label>Description</Label><Textarea placeholder="Details..." value={debtForm.description} onChange={e => setDebtForm(prev => ({ ...prev, description: e.target.value }))} rows={2} /></div>
                        </div>
                        <DialogFooter><Button variant="outline" onClick={() => setShowDebtDialog(false)}>Cancel</Button><Button onClick={handleAddDebt}>Add</Button></DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {debts.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <CreditCard className="w-12 h-12 mx-auto mb-2" />
                        <p>No debts yet</p>
                      </div>
                    ) : (
                      debts.map(debt => (
                        <div key={debt.id} className="p-3 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant={debt.type === 'receivable' ? 'default' : 'destructive'} className={debt.type === 'receivable' ? 'bg-emerald-500' : ''}>
                              {debt.type === 'receivable' ? 'Receivable' : 'Payable'}
                            </Badge>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Delete Debt</AlertDialogTitle><AlertDialogDescription>Are you sure?</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={() => handleDeleteDebt(debt.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                          <p className="font-semibold text-lg">{formatCurrency(debt.remainingAmount)}</p>
                          <Progress value={((debt.amount - debt.remainingAmount) / debt.amount) * 100} className="h-2 mt-2" />
                          {debt.dueDate && (
                            <p className="text-xs text-slate-500 mt-2">Due: {format(new Date(debt.dueDate), 'MMM d, yyyy')}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
                <CardContent className="p-4">
                  <p className="text-red-100 text-xs">Loans Borrowed</p>
                  <p className="text-xl font-bold">{formatCurrency(totalLoansTaken)}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                <CardContent className="p-4">
                  <p className="text-emerald-100 text-xs">Loans Given</p>
                  <p className="text-xl font-bold">{formatCurrency(totalLoansGiven)}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                <CardContent className="p-4">
                  <p className="text-orange-100 text-xs">Debts to Pay</p>
                  <p className="text-xl font-bold">{formatCurrency(totalDebtsPayable)}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white">
                <CardContent className="p-4">
                  <p className="text-teal-100 text-xs">Receivables</p>
                  <p className="text-xl font-bold">{formatCurrency(totalDebtsReceivable)}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Scheduled Payments Tab */}
          <TabsContent value="scheduled" className="space-y-4 mt-0">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Scheduled Payments</CardTitle>
                    <CardDescription>Recurring income and expenses</CardDescription>
                  </div>
                  <Dialog open={showScheduledDialog} onOpenChange={(open) => { setShowScheduledDialog(open); if (!open) resetScheduledForm(); }}>
                    <DialogTrigger asChild>
                      <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader><DialogTitle>Add Scheduled Payment</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <div><Label>Name</Label><Input placeholder="e.g., Rent, Salary" value={scheduledForm.name} onChange={e => setScheduledForm(prev => ({ ...prev, name: e.target.value }))} /></div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant={scheduledForm.type === 'income' ? 'default' : 'outline'} className={scheduledForm.type === 'income' ? 'bg-emerald-500 hover:bg-emerald-600' : ''} onClick={() => setScheduledForm(prev => ({ ...prev, type: 'income' }))}>Income</Button>
                          <Button variant={scheduledForm.type === 'expense' ? 'default' : 'outline'} className={scheduledForm.type === 'expense' ? 'bg-amber-500 hover:bg-amber-600' : ''} onClick={() => setScheduledForm(prev => ({ ...prev, type: 'expense' }))}>Expense</Button>
                        </div>
                        <div><Label>Amount</Label><Input type="number" placeholder="0.00" value={scheduledForm.amount} onChange={e => setScheduledForm(prev => ({ ...prev, amount: e.target.value }))} /></div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label>Frequency</Label>
                            <Select value={scheduledForm.frequency} onValueChange={v => setScheduledForm(prev => ({ ...prev, frequency: v }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="yearly">Yearly</SelectItem>
                                <SelectItem value="custom">Custom</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {scheduledForm.frequency === 'custom' && (
                            <div><Label>Days</Label><Input type="number" placeholder="30" value={scheduledForm.customDays} onChange={e => setScheduledForm(prev => ({ ...prev, customDays: e.target.value }))} /></div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div><Label>Start Date</Label><Input type="date" value={scheduledForm.startDate} onChange={e => setScheduledForm(prev => ({ ...prev, startDate: e.target.value }))} /></div>
                          <div><Label>Next Due</Label><Input type="date" value={scheduledForm.nextDueDate} onChange={e => setScheduledForm(prev => ({ ...prev, nextDueDate: e.target.value }))} /></div>
                        </div>
                        <div><Label>Account</Label><Select value={scheduledForm.accountId} onValueChange={v => setScheduledForm(prev => ({ ...prev, accountId: v }))}><SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger><SelectContent>{accounts.map(acc => (<SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>))}</SelectContent></Select></div>
                        <div><Label>Description</Label><Textarea placeholder="Details..." value={scheduledForm.description} onChange={e => setScheduledForm(prev => ({ ...prev, description: e.target.value }))} rows={2} /></div>
                      </div>
                      <DialogFooter><Button variant="outline" onClick={() => setShowScheduledDialog(false)}>Cancel</Button><Button onClick={handleAddScheduled}>Add</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {scheduledPayments.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <CalendarClock className="w-12 h-12 mx-auto mb-2" />
                      <p>No scheduled payments yet</p>
                    </div>
                  ) : (
                    scheduledPayments.map(sp => (
                      <div key={sp.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${sp.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                            <CalendarClock className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium">{sp.name}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Badge variant="outline" className="text-xs">{sp.frequency}</Badge>
                              <span>Next: {format(new Date(sp.nextDueDate), 'MMM d')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className={`font-semibold ${sp.type === 'income' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {sp.type === 'income' ? '+' : '-'}{formatCurrency(sp.amount)}
                          </p>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Delete Scheduled Payment</AlertDialogTitle><AlertDialogDescription>Are you sure?</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={() => handleDeleteScheduled(sp.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Accounts Tab */}
          <TabsContent value="accounts" className="space-y-4 mt-0">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Your Accounts</CardTitle>
                    <CardDescription>Manage your financial accounts</CardDescription>
                  </div>
                  <Dialog open={showAccountDialog} onOpenChange={(open) => { setShowAccountDialog(open); if (!open) resetAccountForm(); }}>
                    <DialogTrigger asChild>
                      <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Account</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader><DialogTitle>Add Account</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <div><Label>Account Name</Label><Input placeholder="e.g., Main Checking" value={accountForm.name} onChange={e => setAccountForm(prev => ({ ...prev, name: e.target.value }))} /></div>
                        <div><Label>Account Type</Label><Select value={accountForm.type} onValueChange={v => setAccountForm(prev => ({ ...prev, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                          <SelectItem value="bank">Bank Account</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="credit_card">Credit Card</SelectItem>
                          <SelectItem value="investment">Investment</SelectItem>
                          <SelectItem value="savings">Savings</SelectItem>
                        </SelectContent></Select></div>
                        <div className="grid grid-cols-2 gap-2">
                          <div><Label>Initial Balance</Label><Input type="number" placeholder="0.00" value={accountForm.balance} onChange={e => setAccountForm(prev => ({ ...prev, balance: e.target.value }))} /></div>
                          <div><Label>Currency</Label><Select value={accountForm.currency} onValueChange={v => setAccountForm(prev => ({ ...prev, currency: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                            <SelectItem value="IRR">IRR</SelectItem>
                          </SelectContent></Select></div>
                        </div>
                      </div>
                      <DialogFooter><Button variant="outline" onClick={() => setShowAccountDialog(false)}>Cancel</Button><Button onClick={handleAddAccount}>Add</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {accounts.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-slate-400">
                      <Landmark className="w-12 h-12 mx-auto mb-2" />
                      <p>No accounts yet</p>
                    </div>
                  ) : (
                    accounts.map(acc => {
                      const Icon = getAccountIcon(acc.type)
                      return (
                        <div key={acc.id} className="p-4 rounded-xl border flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: acc.color || '#3b82f6' }}>
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <p className="font-semibold">{acc.name}</p>
                              <p className="text-sm text-slate-500 capitalize">{acc.type.replace('_', ' ')}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${acc.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {formatCurrency(acc.balance, acc.currency)}
                            </p>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Delete Account</AlertDialogTitle><AlertDialogDescription>Are you sure? This will also delete all associated transactions.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={() => handleDeleteAccount(acc.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Contacts Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Contacts</CardTitle>
                    <CardDescription>People and entities for loans/debts</CardDescription>
                  </div>
                  <Dialog open={showContactDialog} onOpenChange={(open) => { setShowContactDialog(open); if (!open) resetContactForm(); }}>
                    <DialogTrigger asChild>
                      <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Contact</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <div><Label>Name</Label><Input placeholder="Contact name" value={contactForm.name} onChange={e => setContactForm(prev => ({ ...prev, name: e.target.value }))} /></div>
                        <div className="grid grid-cols-2 gap-2">
                          <div><Label>Email</Label><Input type="email" placeholder="email@example.com" value={contactForm.email} onChange={e => setContactForm(prev => ({ ...prev, email: e.target.value }))} /></div>
                          <div><Label>Phone</Label><Input type="tel" placeholder="+1234567890" value={contactForm.phone} onChange={e => setContactForm(prev => ({ ...prev, phone: e.target.value }))} /></div>
                        </div>
                        <div><Label>Type</Label><Select value={contactForm.type} onValueChange={v => setContactForm(prev => ({ ...prev, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                          <SelectItem value="person">Person</SelectItem>
                          <SelectItem value="company">Company</SelectItem>
                        </SelectContent></Select></div>
                        <div><Label>Notes</Label><Textarea placeholder="Additional notes..." value={contactForm.notes} onChange={e => setContactForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} /></div>
                      </div>
                      <DialogFooter><Button variant="outline" onClick={() => setShowContactDialog(false)}>Cancel</Button><Button onClick={handleAddContact}>Add</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {contacts.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-slate-400">
                      <Users className="w-12 h-12 mx-auto mb-2" />
                      <p>No contacts yet</p>
                    </div>
                  ) : (
                    contacts.map(contact => (
                      <div key={contact.id} className="p-3 rounded-lg border flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          {contact.type === 'person' ? <User className="w-5 h-5" /> : <Building className="w-5 h-5" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{contact.name}</p>
                          <p className="text-xs text-slate-500">{contact.email || contact.phone || 'No contact info'}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4 mt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <CardContent className="p-4">
                  <p className="text-emerald-100 text-xs">Total Income</p>
                  <p className="text-xl font-bold">{formatCurrency(transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0))}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                <CardContent className="p-4">
                  <p className="text-amber-100 text-xs">Total Expenses</p>
                  <p className="text-xl font-bold">{formatCurrency(transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0))}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                <CardContent className="p-4">
                  <p className="text-blue-100 text-xs">Avg Monthly Income</p>
                  <p className="text-xl font-bold">{formatCurrency(last6Months.reduce((s, m) => s + m.income, 0) / 6)}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-500 to-violet-600 text-white">
                <CardContent className="p-4">
                  <p className="text-purple-100 text-xs">Avg Monthly Expenses</p>
                  <p className="text-xl font-bold">{formatCurrency(last6Months.reduce((s, m) => s + m.expense, 0) / 6)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Trend</CardTitle>
                <CardDescription>Income and Expenses over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={last6Months}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} name="Income" />
                      <Line type="monotone" dataKey="expense" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b' }} name="Expense" />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Spending by Category</CardTitle>
                <CardDescription>Where your money goes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {expensesByCategory.map((cat, i) => (
                    <div key={cat.name} className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: cat.color }} />
                      <span className="flex-1">{cat.name}</span>
                      <span className="font-medium">{formatCurrency(cat.value)}</span>
                      <span className="text-sm text-slate-500">{((cat.value / monthlyExpenses) * 100 || 0).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t md:hidden z-50">
        <div className="grid grid-cols-5 h-16">
          <Button variant="ghost" className="flex-col gap-1 h-full rounded-none" onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard className={`w-5 h-5 ${activeTab === 'dashboard' ? 'text-emerald-500' : ''}`} />
            <span className="text-xs">Dashboard</span>
          </Button>
          <Button variant="ghost" className="flex-col gap-1 h-full rounded-none" onClick={() => setActiveTab('transactions')}>
            <Receipt className={`w-5 h-5 ${activeTab === 'transactions' ? 'text-emerald-500' : ''}`} />
            <span className="text-xs">Transactions</span>
          </Button>
          <Button variant="ghost" className="flex-col gap-1 h-full rounded-none" onClick={() => setActiveTab('loans')}>
            <HandCoins className={`w-5 h-5 ${activeTab === 'loans' ? 'text-emerald-500' : ''}`} />
            <span className="text-xs">Loans</span>
          </Button>
          <Button variant="ghost" className="flex-col gap-1 h-full rounded-none" onClick={() => setActiveTab('scheduled')}>
            <CalendarClock className={`w-5 h-5 ${activeTab === 'scheduled' ? 'text-emerald-500' : ''}`} />
            <span className="text-xs">Scheduled</span>
          </Button>
          <Button variant="ghost" className="flex-col gap-1 h-full rounded-none" onClick={() => setActiveTab('reports')}>
            <BarChart3 className={`w-5 h-5 ${activeTab === 'reports' ? 'text-emerald-500' : ''}`} />
            <span className="text-xs">Reports</span>
          </Button>
        </div>
      </nav>
    </div>
  )
}
