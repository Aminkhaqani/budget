import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// DELETE scheduled payment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    await db.scheduledPayment.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting scheduled payment:', error)
    return NextResponse.json({ error: 'Failed to delete scheduled payment' }, { status: 500 })
  }
}
