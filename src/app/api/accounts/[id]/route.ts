import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// DELETE account
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // First delete all transactions for this account
    await db.transaction.deleteMany({
      where: { accountId: id }
    })
    
    // Delete scheduled payments for this account
    await db.scheduledPayment.deleteMany({
      where: { accountId: id }
    })
    
    // Delete the account
    await db.account.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting account:', error)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}

// PUT update account
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, type, balance, currency, color, icon, isDefault, isActive } = body
    
    // If this is set as default, remove default from other accounts
    if (isDefault) {
      await db.account.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false }
      })
    }
    
    const account = await db.account.update({
      where: { id },
      data: {
        name,
        type,
        balance: balance !== undefined ? parseFloat(balance) : undefined,
        currency,
        color,
        icon,
        isDefault,
        isActive
      }
    })
    
    return NextResponse.json(account)
  } catch (error) {
    console.error('Error updating account:', error)
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 })
  }
}
