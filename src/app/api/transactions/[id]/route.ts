import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// DELETE transaction
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get transaction to reverse balance
    const transaction = await db.transaction.findUnique({
      where: { id },
      include: { account: true }
    })
    
    if (transaction && transaction.account) {
      // Reverse the balance change
      const newBalance = transaction.type === 'income'
        ? transaction.account.balance - transaction.amount
        : transaction.account.balance + transaction.amount
      
      await db.account.update({
        where: { id: transaction.accountId },
        data: { balance: newBalance }
      })
    }
    
    // Delete the transaction
    await db.transaction.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 })
  }
}

// PUT update transaction
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { type, amount, description, date, accountId, categoryId, notes, tags, isRecurring } = body
    
    // Get old transaction
    const oldTransaction = await db.transaction.findUnique({
      where: { id }
    })
    
    if (!oldTransaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }
    
    const newAmount = parseFloat(amount)
    
    // Reverse old balance change
    if (oldTransaction.accountId) {
      const oldAccount = await db.account.findUnique({
        where: { id: oldTransaction.accountId }
      })
      if (oldAccount) {
        const revertedBalance = oldTransaction.type === 'income'
          ? oldAccount.balance - oldTransaction.amount
          : oldAccount.balance + oldTransaction.amount
        
        await db.account.update({
          where: { id: oldTransaction.accountId },
          data: { balance: revertedBalance }
        })
      }
    }
    
    // Update transaction
    const transaction = await db.transaction.update({
      where: { id },
      data: {
        type,
        amount: newAmount,
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
    
    // Apply new balance change
    const newAccount = await db.account.findUnique({
      where: { id: accountId }
    })
    if (newAccount) {
      const updatedBalance = type === 'income'
        ? newAccount.balance + newAmount
        : newAccount.balance - newAmount
      
      await db.account.update({
        where: { id: accountId },
        data: { balance: updatedBalance }
      })
    }
    
    return NextResponse.json(transaction)
  } catch (error) {
    console.error('Error updating transaction:', error)
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
  }
}
