import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET all debts
export async function GET() {
  try {
    const debts = await db.debt.findMany({
      include: {
        payments: true
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(debts)
  } catch (error) {
    console.error('Error fetching debts:', error)
    return NextResponse.json({ error: 'Failed to fetch debts' }, { status: 500 })
  }
}

// POST create new debt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, amount, remainingAmount, dueDate, description, creditorId, debtorId } = body
    
    const debt = await db.debt.create({
      data: {
        type,
        amount: parseFloat(amount),
        remainingAmount: parseFloat(remainingAmount),
        dueDate: dueDate ? new Date(dueDate) : null,
        description,
        status: 'pending',
        creditorId: creditorId || null,
        debtorId: debtorId || null
      },
      include: {
        payments: true
      }
    })
    
    return NextResponse.json(debt)
  } catch (error) {
    console.error('Error creating debt:', error)
    return NextResponse.json({ error: 'Failed to create debt' }, { status: 500 })
  }
}
