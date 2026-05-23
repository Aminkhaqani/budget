import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// DELETE debt
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Delete debt payments first
    await db.debtPayment.deleteMany({
      where: { debtId: id }
    })
    
    // Delete the debt
    await db.debt.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting debt:', error)
    return NextResponse.json({ error: 'Failed to delete debt' }, { status: 500 })
  }
}
