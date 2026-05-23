import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET all transactions
export async function GET() {
  try {
    const transactions = await db.transaction.findMany({
      include: {
        account: true,
        category: true
      },
      orderBy: { date: 'desc' }
    })
    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}

// POST create new transaction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, amount, description, date, accountId, categoryId, notes, tags, isRecurring } = body
    
    const transactionAmount = parseFloat(amount)
    
    // Create transaction
    const transaction = await db.transaction.create({
      data: {
        type,
        amount: transactionAmount,
        description,
        date: new Date(date),
        accountId,
        categoryId: categoryId || null,
        notes: notes || null,
        tags: tags || null,
        isRecurring: isRecurring || false
      },
      include: {
        account: true,
        category: true
      }
    })
    
    // Update account balance
    const account = await db.account.findUnique({
      where: { id: accountId }
    })
    
    if (account) {
      const newBalance = type === 'income' 
        ? account.balance + transactionAmount 
        : account.balance - transactionAmount
      
      await db.account.update({
        where: { id: accountId },
        data: { balance: newBalance }
      })
    }
    
    return NextResponse.json(transaction)
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
}
