'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, subQuarters, startOfYear, endOfYear, subYears, isWithinInterval } from 'date-fns'
import { useToast } from '@/hooks/use-toast'

// UI Components
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

// Icons
import { 
  Wallet, TrendingUp, TrendingDown, CreditCard, PiggyBank, ArrowUpRight, ArrowDownRight,
  Plus, RefreshCw, Calendar, Clock, Users, Building, User, ChevronRight, ChevronLeft,
  HandCoins, CalendarClock, Landmark, BarChart3, Home, Receipt,
  Edit, Trash2, DollarSign, Banknote, ArrowRightLeft, AlertCircle, X, Check
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
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

export default function BudgetApp() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isLoading, setIsLoading] = useState(true)
  const [period, setPeriod] = useState<'month' | 'season' | 'year'>('month')
  
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
  
  // Form errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  
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

  // Period calculations
  const getPeriodRange = (p: 'month' | 'season' | 'year') => {
    const now = new Date()
    switch (p) {
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) }
      case 'season':
        return { start: startOfQuarter(now), end: endOfQuarter(now) }
      case 'year':
        return { start: startOfYear(now), end: endOfYear(now) }
    }
  }
  
  const getPreviousPeriodRange = (p: 'month' | 'season' | 'year') => {
    const now = new Date()
    switch (p) {
      case 'month':
        const lastMonth = subMonths(now, 1)
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) }
      case 'season':
        const lastQuarter = subQuarters(now, 1)
        return { start: startOfQuarter(lastQuarter), end: endOfQuarter(lastQuarter) }
      case 'year':
        const lastYear = subYears(now, 1)
        return { start: startOfYear(lastYear), end: endOfYear(lastYear) }
    }
  }

  // Calculate totals for current period
  const currentPeriod = getPeriodRange(period)
  const previousPeriod = getPreviousPeriodRange(period)
  
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0)
  
  const currentIncome = transactions
    .filter(t => t.type === 'income' && isWithinInterval(new Date(t.date), currentPeriod))
    .reduce((sum, t) => sum + t.amount, 0)
  
  const currentExpenses = transactions
    .filter(t => t.type === 'expense' && isWithinInterval(new Date(t.date), currentPeriod))
    .reduce((sum, t) => sum + t.amount, 0)
  
  const previousIncome = transactions
    .filter(t => t.type === 'income' && isWithinInterval(new Date(t.date), previousPeriod))
    .reduce((sum, t) => sum + t.amount, 0)
  
  const previousExpenses = transactions
    .filter(t => t.type === 'expense' && isWithinInterval(new Date(t.date), previousPeriod))
    .reduce((sum, t) => sum + t.amount, 0)
  
  const incomeChange = previousIncome > 0 ? ((currentIncome - previousIncome) / previousIncome) * 100 : 0
  const expenseChange = previousExpenses > 0 ? ((currentExpenses - previousExpenses) / previousExpenses) * 100 : 0

  // Chart data for expenses by category
  const expensesByCategory = categories
    .filter(c => c.type === 'expense')
    .map(cat => {
      const total = transactions
        .filter(t => t.categoryId === cat.id && t.type === 'expense' && isWithinInterval(new Date(t.date), currentPeriod))
        .reduce((sum, t) => sum + t.amount, 0)
      return { name: cat.name, value: total, color: cat.color || '#3b82f6' }
    })
    .filter(d => d.value > 0)

  // Loan calculations
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

  // Validation function for transaction form
  const validateTransactionForm = () => {
    const errors: Record<string, string> = {}
    
    if (!transactionForm.date) {
      errors.date = 'Date is required'
    }
    if (!transactionForm.categoryId) {
      errors.category = 'Category is required'
    }
    if (!transactionForm.amount || parseFloat(transactionForm.amount) <= 0) {
      errors.amount = 'Amount must be greater than 0'
    }
    if (!transactionForm.accountId) {
      errors.account = 'Account is required'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // CRUD Operations
  const handleAddTransaction = async () => {
    if (!validateTransactionForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields: Date, Category, and Amount',
        variant: 'destructive'
      })
      return
    }
    
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
    if (!validateTransactionForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields: Date, Category, and Amount',
        variant: 'destructive'
      })
      return
    }
    
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
    if (!accountForm.name) {
      toast({ title: 'Error', description: 'Account name is required', variant: 'destructive' })
      return
    }
    
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
    if (!loanForm.principalAmount || parseFloat(loanForm.principalAmount) <= 0) {
      toast({ title: 'Error', description: 'Amount is required', variant: 'destructive' })
      return
    }
    
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
    if (!debtForm.amount || parseFloat(debtForm.amount) <= 0) {
      toast({ title: 'Error', description: 'Amount is required', variant: 'destructive' })
      return
    }
    
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
    if (!scheduledForm.name || !scheduledForm.amount) {
      toast({ title: 'Error', description: 'Name and amount are required', variant: 'destructive' })
      return
    }
    
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
    if (!contactForm.name) {
      toast({ title: 'Error', description: 'Contact name is required', variant: 'destructive' })
      return
    }
    
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
    setFormErrors({})
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

  // Open edit transaction dialog
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
    setFormErrors({})
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

  // Navigate home
  const goHome = () => setActiveTab('dashboard')

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 bg-white dark:bg-slate-900 border-b px-4 py-2 flex items-center justify-between z-40">
        <div className="flex items-center gap-2">
          {activeTab !== 'dashboard' && (
            <Button variant="ghost" size="icon" onClick={goHome} className="h-8 w-8">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white">Budget</h1>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={loadData} className="h-8 w-8">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </header>

      {/* Main Content - No page scroll, only inner components scroll */}
      <main className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden">
            <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
              {/* Period Selector */}
              <div className="flex-shrink-0 flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {(['month', 'season', 'year'] as const).map(p => (
                  <Button
                    key={p}
                    variant={period === p ? 'default' : 'ghost'}
                    size="sm"
                    className={`flex-1 rounded-lg text-sm ${period === p ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}`}
                    onClick={() => setPeriod(p)}
                  >
                    {p === 'month' ? 'Month' : p === 'season' ? 'Season' : 'Year'}
                  </Button>
                ))}
              </div>

              {/* Balance Cards */}
              <div className="flex-shrink-0 space-y-3">
                {/* Main Balance Card */}
                <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0 shadow-lg">
                  <CardContent className="p-5">
                    <p className="text-emerald-100 text-sm font-medium">Total Balance</p>
                    <p className="text-3xl font-bold mt-1">{formatCurrency(totalBalance)}</p>
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <span className="text-emerald-100">{accounts.length} accounts</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Income & Expenses Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <Card className="bg-white dark:bg-slate-900 border shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-xs text-slate-500">Income</span>
                      </div>
                      <p className="text-xl font-bold text-blue-600">{formatCurrency(currentIncome)}</p>
                      <div className="flex items-center gap-1 mt-2 text-xs">
                        {previousIncome > 0 && (
                          <>
                            {incomeChange >= 0 ? (
                              <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3 text-red-500" />
                            )}
                            <span className={incomeChange >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                              {Math.abs(incomeChange).toFixed(0)}%
                            </span>
                            <span className="text-slate-400">vs prev</span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white dark:bg-slate-900 border shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                          <TrendingDown className="w-4 h-4 text-amber-600" />
                        </div>
                        <span className="text-xs text-slate-500">Expenses</span>
                      </div>
                      <p className="text-xl font-bold text-amber-600">{formatCurrency(currentExpenses)}</p>
                      <div className="flex items-center gap-1 mt-2 text-xs">
                        {previousExpenses > 0 && (
                          <>
                            {expenseChange <= 0 ? (
                              <ArrowDownRight className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3 text-red-500" />
                            )}
                            <span className={expenseChange <= 0 ? 'text-emerald-500' : 'text-red-500'}>
                              {Math.abs(expenseChange).toFixed(0)}%
                            </span>
                            <span className="text-slate-400">vs prev</span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Previous Period Summary */}
                <Card className="bg-slate-100 dark:bg-slate-800 border-0">
                  <CardContent className="p-3">
                    <p className="text-xs text-slate-500 mb-2">Previous Period</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Income:</span>
                        <span className="ml-2 font-medium text-slate-700 dark:text-slate-300">{formatCurrency(previousIncome)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Expenses:</span>
                        <span className="ml-2 font-medium text-slate-700 dark:text-slate-300">{formatCurrency(previousExpenses)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Transactions - Scrollable */}
              <div className="flex-1 min-h-0">
                <Card className="h-full flex flex-col">
                  <CardContent className="flex-1 flex flex-col p-3 min-h-0">
                    <div className="flex items-center justify-between mb-2 flex-shrink-0">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Recent Transactions</span>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setActiveTab('transactions')}>
                        View All <ChevronRight className="w-3 h-3" />
                      </Button>
                    </div>
                    <ScrollArea className="flex-1">
                      {transactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 py-8">
                          <Receipt className="w-10 h-10 mb-2" />
                          <p className="text-sm">No transactions yet</p>
                        </div>
                      ) : (
                        <div className="space-y-2 pr-2">
                          {transactions.slice(0, 10).map(t => (
                            <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                                  t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                                }`}>
                                  {t.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                </div>
                                <div>
                                  <p className="font-medium text-sm truncate max-w-[120px]">{t.description || 'Transaction'}</p>
                                  <p className="text-xs text-slate-500">{format(new Date(t.date), 'MMM d')}</p>
                                </div>
                              </div>
                              <p className={`font-semibold text-sm ${t.type === 'income' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden">
            <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
              <div className="flex items-center justify-between flex-shrink-0">
                <h2 className="text-lg font-semibold">Transactions</h2>
                <Badge variant="secondary">{transactions.length}</Badge>
              </div>
              
              <div className="flex-1 min-h-0">
                <ScrollArea className="h-full">
                  {transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 py-8">
                      <Receipt className="w-12 h-12 mb-2" />
                      <p>No transactions yet</p>
                      <p className="text-sm">Tap the + button to add one</p>
                    </div>
                  ) : (
                    <div className="space-y-2 pr-2">
                      {transactions.map(t => (
                        <div key={t.id} className="flex items-center justify-between p-3 rounded-xl border bg-white dark:bg-slate-900">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                            }`}>
                              {t.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="font-medium">{t.description || 'Transaction'}</p>
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span>{format(new Date(t.date), 'MMM d, yyyy')}</span>
                                <span>•</span>
                                <span>{categories.find(c => c.id === t.categoryId)?.name || 'Uncategorized'}</span>
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
              </div>
            </div>
          </TabsContent>

          {/* Loans & Debts Tab */}
          <TabsContent value="loans" className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden">
            <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
              <div className="flex items-center justify-between flex-shrink-0">
                <h2 className="text-lg font-semibold">Loans & Debts</h2>
              </div>
              
              {/* Summary Cards */}
              <div className="flex-shrink-0 grid grid-cols-2 gap-3">
                <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
                  <CardContent className="p-3">
                    <p className="text-red-100 text-xs">To Pay</p>
                    <p className="text-lg font-bold">{formatCurrency(totalLoansTaken + totalDebtsPayable)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                  <CardContent className="p-3">
                    <p className="text-emerald-100 text-xs">To Receive</p>
                    <p className="text-lg font-bold">{formatCurrency(totalLoansGiven + totalDebtsReceivable)}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex-1 min-h-0">
                <ScrollArea className="h-full">
                  <div className="space-y-4 pr-2">
                    {/* Loans Section */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-500">Loans</span>
                        <Button variant="outline" size="sm" onClick={() => setShowLoanDialog(true)}>
                          <Plus className="w-4 h-4 mr-1" /> Add
                        </Button>
                      </div>
                      {loans.length === 0 ? (
                        <Card className="border-dashed">
                          <CardContent className="p-4 text-center text-slate-400">
                            <HandCoins className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-sm">No loans yet</p>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="space-y-2">
                          {loans.map(loan => {
                            const paid = loan.payments.reduce((s, p) => s + p.principal, 0)
                            const remaining = loan.principalAmount - paid
                            const progress = (paid / loan.principalAmount) * 100
                            return (
                              <Card key={loan.id}>
                                <CardContent className="p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <Badge variant={loan.type === 'given' ? 'default' : 'destructive'} className={loan.type === 'given' ? 'bg-emerald-500' : ''}>
                                      {loan.type === 'given' ? 'Lent' : 'Borrowed'}
                                    </Badge>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500"><Trash2 className="w-3 h-3" /></Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Delete Loan</AlertDialogTitle></AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction className="bg-red-500" onClick={() => handleDeleteLoan(loan.id)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                  <p className="font-semibold">{formatCurrency(remaining)} remaining</p>
                                  <Progress value={progress} className="h-1.5 mt-2" />
                                </CardContent>
                              </Card>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Debts Section */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-500">Debts</span>
                        <Button variant="outline" size="sm" onClick={() => setShowDebtDialog(true)}>
                          <Plus className="w-4 h-4 mr-1" /> Add
                        </Button>
                      </div>
                      {debts.length === 0 ? (
                        <Card className="border-dashed">
                          <CardContent className="p-4 text-center text-slate-400">
                            <CreditCard className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-sm">No debts yet</p>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="space-y-2">
                          {debts.map(debt => (
                            <Card key={debt.id}>
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <Badge variant={debt.type === 'receivable' ? 'default' : 'destructive'} className={debt.type === 'receivable' ? 'bg-emerald-500' : ''}>
                                    {debt.type === 'receivable' ? 'Receivable' : 'Payable'}
                                  </Badge>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500"><Trash2 className="w-3 h-3" /></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader><AlertDialogTitle>Delete Debt</AlertDialogTitle></AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction className="bg-red-500" onClick={() => handleDeleteDebt(debt.id)}>Delete</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                                <p className="font-semibold">{formatCurrency(debt.remainingAmount)}</p>
                                <Progress value={((debt.amount - debt.remainingAmount) / debt.amount) * 100} className="h-1.5 mt-2" />
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>

          {/* Scheduled Payments Tab */}
          <TabsContent value="scheduled" className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden">
            <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
              <div className="flex items-center justify-between flex-shrink-0">
                <h2 className="text-lg font-semibold">Scheduled Payments</h2>
                <Button variant="outline" size="sm" onClick={() => setShowScheduledDialog(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
              
              <div className="flex-1 min-h-0">
                <ScrollArea className="h-full">
                  {scheduledPayments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 py-8">
                      <CalendarClock className="w-12 h-12 mb-2" />
                      <p>No scheduled payments</p>
                    </div>
                  ) : (
                    <div className="space-y-2 pr-2">
                      {scheduledPayments.map(sp => (
                        <Card key={sp.id}>
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${sp.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                  <CalendarClock className="w-4 h-4" />
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
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500"><Trash2 className="w-3 h-3" /></Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Delete</AlertDialogTitle></AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction className="bg-red-500" onClick={() => handleDeleteScheduled(sp.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </TabsContent>

          {/* Accounts Tab */}
          <TabsContent value="accounts" className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden">
            <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
              <div className="flex items-center justify-between flex-shrink-0">
                <h2 className="text-lg font-semibold">Accounts</h2>
                <Button variant="outline" size="sm" onClick={() => setShowAccountDialog(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
              
              <div className="flex-1 min-h-0">
                <ScrollArea className="h-full">
                  {accounts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 py-8">
                      <Landmark className="w-12 h-12 mb-2" />
                      <p>No accounts yet</p>
                      <p className="text-sm">Add one to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-2 pr-2">
                      {accounts.map(acc => {
                        const Icon = getAccountIcon(acc.type)
                        return (
                          <Card key={acc.id}>
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: acc.color || '#3b82f6' }}>
                                    <Icon className="w-5 h-5 text-white" />
                                  </div>
                                  <div>
                                    <p className="font-medium">{acc.name}</p>
                                    <p className="text-xs text-slate-500 capitalize">{acc.type.replace('_', ' ')}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <p className={`font-bold ${acc.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {formatCurrency(acc.balance, acc.currency)}
                                  </p>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader><AlertDialogTitle>Delete Account</AlertDialogTitle><AlertDialogDescription>This will also delete all transactions.</AlertDialogDescription></AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction className="bg-red-500" onClick={() => handleDeleteAccount(acc.id)}>Delete</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Contacts Section */}
              <div className="flex-shrink-0 pt-2 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-500">Contacts</span>
                  <Button variant="ghost" size="sm" onClick={() => setShowContactDialog(true)}>
                    <Plus className="w-3 h-3 mr-1" /> Add
                  </Button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {contacts.length === 0 ? (
                    <p className="text-xs text-slate-400">No contacts</p>
                  ) : (
                    contacts.map(contact => (
                      <div key={contact.id} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                          {contact.type === 'person' ? <User className="w-3 h-3" /> : <Building className="w-3 h-3" />}
                        </div>
                        <span className="text-sm">{contact.name}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden">
            <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
              <h2 className="text-lg font-semibold flex-shrink-0">Reports</h2>
              
              {/* Summary Stats */}
              <div className="flex-shrink-0 grid grid-cols-2 gap-3">
                <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                  <CardContent className="p-3">
                    <p className="text-emerald-100 text-xs">Total Income</p>
                    <p className="text-lg font-bold">{formatCurrency(transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0))}</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                  <CardContent className="p-3">
                    <p className="text-amber-100 text-xs">Total Expenses</p>
                    <p className="text-lg font-bold">{formatCurrency(transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0))}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Expense by Category Chart */}
              <div className="flex-1 min-h-0">
                <Card className="h-full">
                  <CardContent className="h-full flex flex-col p-3">
                    <p className="text-sm font-medium mb-2 flex-shrink-0">Expenses by Category</p>
                    <div className="flex-1 min-h-0">
                      {expensesByCategory.length > 0 ? (
                        <ChartContainer config={{}} className="h-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={expensesByCategory}
                                cx="50%"
                                cy="50%"
                                innerRadius="40%"
                                outerRadius="70%"
                                dataKey="value"
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
                        <div className="h-full flex items-center justify-center text-slate-400">
                          No expense data
                        </div>
                      )}
                    </div>
                    {/* Category Legend */}
                    <div className="flex-shrink-0 mt-2 flex flex-wrap gap-2">
                      {expensesByCategory.slice(0, 4).map((cat, i) => (
                        <div key={i} className="flex items-center gap-1 text-xs">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="text-slate-600 dark:text-slate-400">{cat.name}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Floating Add Button - Always visible */}
      <Button
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-lg bg-emerald-500 hover:bg-emerald-600 z-50 md:bottom-4"
        size="icon"
        onClick={() => { resetTransactionForm(); setShowTransactionDialog(true); setEditingTransaction(null); }}
      >
        <Plus className="w-6 h-6 text-white" />
      </Button>

      {/* Mobile Bottom Navigation */}
      <nav className="flex-shrink-0 bg-white dark:bg-slate-900 border-t z-40">
        <div className="grid grid-cols-5 h-14">
          <Button variant="ghost" className="flex-col gap-0.5 h-full rounded-none" onClick={() => setActiveTab('dashboard')}>
            <Home className={`w-5 h-5 ${activeTab === 'dashboard' ? 'text-emerald-500' : ''}`} />
            <span className="text-[10px]">Home</span>
          </Button>
          <Button variant="ghost" className="flex-col gap-0.5 h-full rounded-none" onClick={() => setActiveTab('transactions')}>
            <Receipt className={`w-5 h-5 ${activeTab === 'transactions' ? 'text-emerald-500' : ''}`} />
            <span className="text-[10px]">Trans</span>
          </Button>
          <Button variant="ghost" className="flex-col gap-0.5 h-full rounded-none" onClick={() => setActiveTab('loans')}>
            <HandCoins className={`w-5 h-5 ${activeTab === 'loans' ? 'text-emerald-500' : ''}`} />
            <span className="text-[10px]">Loans</span>
          </Button>
          <Button variant="ghost" className="flex-col gap-0.5 h-full rounded-none" onClick={() => setActiveTab('scheduled')}>
            <CalendarClock className={`w-5 h-5 ${activeTab === 'scheduled' ? 'text-emerald-500' : ''}`} />
            <span className="text-[10px]">Schedule</span>
          </Button>
          <Button variant="ghost" className="flex-col gap-0.5 h-full rounded-none" onClick={() => setActiveTab('accounts')}>
            <Landmark className={`w-5 h-5 ${activeTab === 'accounts' ? 'text-emerald-500' : ''}`} />
            <span className="text-[10px]">Accounts</span>
          </Button>
        </div>
      </nav>

      {/* Transaction Dialog */}
      <Dialog open={showTransactionDialog} onOpenChange={(open) => { setShowTransactionDialog(open); if (!open) { setEditingTransaction(null); resetTransactionForm(); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingTransaction ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Validation Errors Summary */}
            {Object.keys(formErrors).length > 0 && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Please fix the following:</span>
                </div>
                <ul className="mt-1 text-xs text-red-500 list-disc list-inside">
                  {Object.values(formErrors).map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Type Selection */}
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
                onClick={() => setTransactionForm(prev => ({ ...prev, type: 'expense', categoryId: '' }))}
              >
                <TrendingDown className="w-4 h-4 mr-1" /> Expense
              </Button>
            </div>

            {/* Amount - Required */}
            <div>
              <Label className="flex items-center gap-1">
                Amount <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                placeholder="0.00"
                value={transactionForm.amount}
                onChange={e => setTransactionForm(prev => ({ ...prev, amount: e.target.value }))}
                className={formErrors.amount ? 'border-red-500' : ''}
              />
              {formErrors.amount && <p className="text-xs text-red-500 mt-1">{formErrors.amount}</p>}
            </div>

            {/* Date - Required */}
            <div>
              <Label className="flex items-center gap-1">
                Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={transactionForm.date}
                onChange={e => setTransactionForm(prev => ({ ...prev, date: e.target.value }))}
                className={formErrors.date ? 'border-red-500' : ''}
              />
              {formErrors.date && <p className="text-xs text-red-500 mt-1">{formErrors.date}</p>}
            </div>

            {/* Category - Required */}
            <div>
              <Label className="flex items-center gap-1">
                Category <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={transactionForm.categoryId} 
                onValueChange={v => setTransactionForm(prev => ({ ...prev, categoryId: v }))}
              >
                <SelectTrigger className={formErrors.category ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.filter(c => c.type === transactionForm.type).map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.category && <p className="text-xs text-red-500 mt-1">{formErrors.category}</p>}
            </div>

            {/* Account */}
            <div>
              <Label>Account</Label>
              <Select 
                value={transactionForm.accountId} 
                onValueChange={v => setTransactionForm(prev => ({ ...prev, accountId: v }))}
              >
                <SelectTrigger className={formErrors.account ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.account && <p className="text-xs text-red-500 mt-1">{formErrors.account}</p>}
            </div>

            {/* Description */}
            <div>
              <Label>Description</Label>
              <Input
                placeholder="What was this for?"
                value={transactionForm.description}
                onChange={e => setTransactionForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            {/* Notes */}
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

      {/* Account Dialog */}
      <Dialog open={showAccountDialog} onOpenChange={(open) => { setShowAccountDialog(open); if (!open) resetAccountForm(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Account</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Account Name</Label>
              <Input placeholder="e.g., Main Checking" value={accountForm.name} onChange={e => setAccountForm(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div>
              <Label>Account Type</Label>
              <Select value={accountForm.type} onValueChange={v => setAccountForm(prev => ({ ...prev, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Input type="number" placeholder="0.00" value={accountForm.balance} onChange={e => setAccountForm(prev => ({ ...prev, balance: e.target.value }))} />
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={accountForm.currency} onValueChange={v => setAccountForm(prev => ({ ...prev, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
            <Button onClick={handleAddAccount}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loan Dialog */}
      <Dialog open={showLoanDialog} onOpenChange={(open) => { setShowLoanDialog(open); if (!open) resetLoanForm(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Loan</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button variant={loanForm.type === 'taken' ? 'default' : 'outline'} className={loanForm.type === 'taken' ? 'bg-red-500 hover:bg-red-600' : ''} onClick={() => setLoanForm(prev => ({ ...prev, type: 'taken' }))}>I Borrowed</Button>
              <Button variant={loanForm.type === 'given' ? 'default' : 'outline'} className={loanForm.type === 'given' ? 'bg-emerald-500 hover:bg-emerald-600' : ''} onClick={() => setLoanForm(prev => ({ ...prev, type: 'given' }))}>I Lent</Button>
            </div>
            <div>
              <Label>Amount</Label>
              <Input type="number" placeholder="0.00" value={loanForm.principalAmount} onChange={e => setLoanForm(prev => ({ ...prev, principalAmount: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Interest Rate (%)</Label>
                <Input type="number" placeholder="0" value={loanForm.interestRate} onChange={e => setLoanForm(prev => ({ ...prev, interestRate: e.target.value }))} />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={loanForm.dueDate} onChange={e => setLoanForm(prev => ({ ...prev, dueDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Contact (optional)</Label>
              <Select value={loanForm.contactId} onValueChange={v => setLoanForm(prev => ({ ...prev, contactId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                <SelectContent>
                  {contacts.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea placeholder="Loan details..." value={loanForm.description} onChange={e => setLoanForm(prev => ({ ...prev, description: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoanDialog(false)}>Cancel</Button>
            <Button onClick={handleAddLoan}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Debt Dialog */}
      <Dialog open={showDebtDialog} onOpenChange={(open) => { setShowDebtDialog(open); if (!open) resetDebtForm(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Debt/Receivable</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button variant={debtForm.type === 'payable' ? 'default' : 'outline'} className={debtForm.type === 'payable' ? 'bg-red-500 hover:bg-red-600' : ''} onClick={() => setDebtForm(prev => ({ ...prev, type: 'payable' }))}>I Owe</Button>
              <Button variant={debtForm.type === 'receivable' ? 'default' : 'outline'} className={debtForm.type === 'receivable' ? 'bg-emerald-500 hover:bg-emerald-600' : ''} onClick={() => setDebtForm(prev => ({ ...prev, type: 'receivable' }))}>Owed to Me</Button>
            </div>
            <div>
              <Label>Amount</Label>
              <Input type="number" placeholder="0.00" value={debtForm.amount} onChange={e => setDebtForm(prev => ({ ...prev, amount: e.target.value }))} />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={debtForm.dueDate} onChange={e => setDebtForm(prev => ({ ...prev, dueDate: e.target.value }))} />
            </div>
            <div>
              <Label>Contact (optional)</Label>
              <Select value={debtForm.contactId} onValueChange={v => setDebtForm(prev => ({ ...prev, contactId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                <SelectContent>
                  {contacts.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea placeholder="Details..." value={debtForm.description} onChange={e => setDebtForm(prev => ({ ...prev, description: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDebtDialog(false)}>Cancel</Button>
            <Button onClick={handleAddDebt}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scheduled Payment Dialog */}
      <Dialog open={showScheduledDialog} onOpenChange={(open) => { setShowScheduledDialog(open); if (!open) resetScheduledForm(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Scheduled Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input placeholder="e.g., Rent, Salary" value={scheduledForm.name} onChange={e => setScheduledForm(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant={scheduledForm.type === 'income' ? 'default' : 'outline'} className={scheduledForm.type === 'income' ? 'bg-emerald-500 hover:bg-emerald-600' : ''} onClick={() => setScheduledForm(prev => ({ ...prev, type: 'income' }))}>Income</Button>
              <Button variant={scheduledForm.type === 'expense' ? 'default' : 'outline'} className={scheduledForm.type === 'expense' ? 'bg-amber-500 hover:bg-amber-600' : ''} onClick={() => setScheduledForm(prev => ({ ...prev, type: 'expense' }))}>Expense</Button>
            </div>
            <div>
              <Label>Amount</Label>
              <Input type="number" placeholder="0.00" value={scheduledForm.amount} onChange={e => setScheduledForm(prev => ({ ...prev, amount: e.target.value }))} />
            </div>
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
                <div>
                  <Label>Days</Label>
                  <Input type="number" placeholder="30" value={scheduledForm.customDays} onChange={e => setScheduledForm(prev => ({ ...prev, customDays: e.target.value }))} />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={scheduledForm.startDate} onChange={e => setScheduledForm(prev => ({ ...prev, startDate: e.target.value }))} />
              </div>
              <div>
                <Label>Next Due</Label>
                <Input type="date" value={scheduledForm.nextDueDate} onChange={e => setScheduledForm(prev => ({ ...prev, nextDueDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Account</Label>
              <Select value={scheduledForm.accountId} onValueChange={v => setScheduledForm(prev => ({ ...prev, accountId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(acc => (<SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea placeholder="Details..." value={scheduledForm.description} onChange={e => setScheduledForm(prev => ({ ...prev, description: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduledDialog(false)}>Cancel</Button>
            <Button onClick={handleAddScheduled}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Dialog */}
      <Dialog open={showContactDialog} onOpenChange={(open) => { setShowContactDialog(open); if (!open) resetContactForm(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input placeholder="Contact name" value={contactForm.name} onChange={e => setContactForm(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Email</Label>
                <Input type="email" placeholder="email@example.com" value={contactForm.email} onChange={e => setContactForm(prev => ({ ...prev, email: e.target.value }))} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input type="tel" placeholder="+1234567890" value={contactForm.phone} onChange={e => setContactForm(prev => ({ ...prev, phone: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={contactForm.type} onValueChange={v => setContactForm(prev => ({ ...prev, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="person">Person</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea placeholder="Additional notes..." value={contactForm.notes} onChange={e => setContactForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContactDialog(false)}>Cancel</Button>
            <Button onClick={handleAddContact}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
