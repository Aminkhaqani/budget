import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET all loans
export async function GET() {
  try {
    const loans = await db.loan.findMany({
      include: {
        payments: true
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(loans)
  } catch (error) {
    console.error('Error fetching loans:', error)
    return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 })
  }
}

// POST create new loan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, principalAmount, interestRate, startDate, dueDate, description, fromAccountId, toAccountId, lenderContactId, borrowerContactId } = body
    
    const loan = await db.loan.create({
      data: {
        type,
        principalAmount: parseFloat(principalAmount),
        interestRate: interestRate ? parseFloat(interestRate) : null,
        startDate: new Date(startDate),
        dueDate: dueDate ? new Date(dueDate) : null,
        description,
        status: 'active',
        fromAccountId: fromAccountId || null,
        toAccountId: toAccountId || null,
        lenderContactId: lenderContactId || null,
        borrowerContactId: borrowerContactId || null
      },
      include: {
        payments: true
      }
    })
    
    return NextResponse.json(loan)
  } catch (error) {
    console.error('Error creating loan:', error)
    return NextResponse.json({ error: 'Failed to create loan' }, { status: 500 })
  }
}
