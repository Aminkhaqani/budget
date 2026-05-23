import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// DELETE loan
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Delete loan payments first
    await db.loanPayment.deleteMany({
      where: { loanId: id }
    })
    
    // Delete the loan
    await db.loan.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting loan:', error)
    return NextResponse.json({ error: 'Failed to delete loan' }, { status: 500 })
  }
}
